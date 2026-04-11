/**
 * Admin schedule: list / cancel / clear-day for court reservations (MySQL).
 * Active calendar: reservation_status 1 (pending) and 2 (approved).
 * Cancel sets reservation_status = 4 (canceled) — rows are kept for history.
 *
 * Waiver: 1 = Available to book, 2 = Pending/hold (active reservation). When the last active
 * reservation is canceled, set waiver back to 1.
 */
const db = require('../db/connection');

/** After canceling a row, set waiver to 2 only if customer has no other reservation in (1,2). */
async function restoreBookingEligibilityIfNoActiveReservations(conn, customerId) {
  if (customerId == null) return;
  const [cntRows] = await conn.execute(
    'SELECT COUNT(*) AS c FROM reservation WHERE customer_id = ? AND reservation_status IN (1, 2)',
    [customerId]
  );
  const n = Number(cntRows[0] && cntRows[0].c);
  if (n === 0) {
    await conn.execute('UPDATE waiver SET waiver_status = 1 WHERE customer_id = ?', [customerId]);
  }
}

function getCookie(req, name) {
  const c = req.headers.cookie || '';
  const parts = c.split(';');
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].trim();
    if (p.startsWith(name + '=')) return decodeURIComponent(p.slice(name.length + 1).trim());
  }
  return null;
}

function formatDate(val) {
  if (val == null) return '';
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const s = String(val);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function formatTime(val) {
  if (val == null) return '';
  if (typeof val === 'string') return val.length > 5 ? val.slice(0, 5) : val;
  if (val instanceof Date) {
    const h = val.getHours();
    const m = val.getMinutes();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return String(val);
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function getUrlQuery(req) {
  try {
    const u = new URL(req.url || '/', 'http://localhost');
    return u.searchParams;
  } catch (e) {
    return new URLSearchParams();
  }
}

module.exports = async function handleAdminScheduleReservations(req, res, ctx) {
  const { pathname, parseBody, hasAdminSessionCookie } = ctx;

  const isGet =
    req.method === 'GET' &&
    (pathname === '/api/admin/schedule-reservations' || pathname === '/api/admin/schedule-reservations/');
  const isDelete =
    req.method === 'DELETE' &&
    (pathname === '/api/admin/schedule-reservations' || pathname === '/api/admin/schedule-reservations/');
  const isClearDay =
    req.method === 'POST' &&
    (pathname === '/api/admin/schedule-reservations/clear-day' ||
      pathname === '/api/admin/schedule-reservations/clear-day/');

  if (!isGet && !isDelete && !isClearDay) {
    return false;
  }

  if (!hasAdminSessionCookie(req)) {
    sendJson(res, 401, { success: false, message: 'Unauthorized' });
    return true;
  }

  if (isGet) {
    const dateStr = (getUrlQuery(req).get('date') || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      sendJson(res, 400, { success: false, message: 'Query "date" must be YYYY-MM-DD' });
      return true;
    }
    try {
      const { rows } = await db.query(
        `SELECT r.reservation_id, r.court_id, r.customer_id, r.waiver_id, r.reservation_date,
                r.reservation_start_time, r.reservation_end_time, r.reservation_status,
                c.customer_first_name, c.customer_last_name
         FROM reservation r
         LEFT JOIN customer c ON c.customer_id = r.customer_id
         WHERE r.reservation_date = ?
           AND r.reservation_status IN (1, 2)
         ORDER BY r.court_id ASC, r.reservation_start_time ASC`,
        [dateStr]
      );
      const reservations = (rows || []).map((row) => ({
        reservation_id: row.reservation_id,
        court_id: row.court_id,
        customer_id: row.customer_id,
        waiver_id: row.waiver_id,
        reservation_date: formatDate(row.reservation_date),
        reservation_start_time: formatTime(row.reservation_start_time),
        reservation_end_time: formatTime(row.reservation_end_time),
        reservation_status: row.reservation_status,
        customer_first_name: row.customer_first_name,
        customer_last_name: row.customer_last_name,
      }));
      sendJson(res, 200, { success: true, reservations });
    } catch (e) {
      console.error('[admin schedule-reservations GET]', e.message);
      sendJson(res, 503, { success: false, message: 'Unable to load schedule' });
    }
    return true;
  }

  if (isDelete) {
    let body = {};
    try {
      body = await parseBody(req);
    } catch (e) {
      sendJson(res, 400, { success: false, message: 'Invalid request body' });
      return true;
    }
    const rid = parseInt(String(body.reservation_id || ''), 10);
    if (!Number.isFinite(rid)) {
      sendJson(res, 400, { success: false, message: 'Missing or invalid reservation_id' });
      return true;
    }
    const employeeIdRaw = getCookie(req, 'admin_employee_id');
    const employeeId = employeeIdRaw != null && employeeIdRaw !== '' ? parseInt(employeeIdRaw, 10) : NaN;
    if (!Number.isFinite(employeeId)) {
      sendJson(res, 401, {
        success: false,
        message: 'Sign out and sign in again to cancel reservations.',
      });
      return true;
    }
    const conn = await db.getClient();
    try {
      await conn.beginTransaction();
      const [sel] = await conn.execute(
        'SELECT reservation_id, reservation_status, waiver_id, customer_id FROM reservation WHERE reservation_id = ? AND reservation_status IN (1, 2)',
        [rid]
      );
      if (!sel.length) {
        await conn.rollback();
        sendJson(res, 404, { success: false, message: 'Reservation not found or not active' });
        return true;
      }
      const customerId = sel[0].customer_id;
      const [upd] = await conn.execute(
        'UPDATE reservation SET reservation_status = 4, employee_id = ? WHERE reservation_id = ? AND reservation_status IN (1, 2)',
        [employeeId, rid]
      );
      if (!upd.affectedRows) {
        await conn.rollback();
        sendJson(res, 409, { success: false, message: 'Could not update reservation' });
        return true;
      }
      await restoreBookingEligibilityIfNoActiveReservations(conn, customerId);
      await conn.commit();
      sendJson(res, 200, { success: true, reservation_id: rid, reservation_status: 4 });
    } catch (e) {
      try {
        await conn.rollback();
      } catch (_) {}
      console.error('[admin schedule-reservations DELETE]', e.message);
      sendJson(res, 503, { success: false, message: 'Unable to cancel reservation' });
    } finally {
      conn.release();
    }
    return true;
  }

  if (isClearDay) {
    let body = {};
    try {
      body = await parseBody(req);
    } catch (e) {
      sendJson(res, 400, { success: false, message: 'Invalid request body' });
      return true;
    }
    const dateStr = String(body.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      sendJson(res, 400, { success: false, message: 'Body "date" must be YYYY-MM-DD' });
      return true;
    }
    const employeeIdRaw = getCookie(req, 'admin_employee_id');
    const employeeId = employeeIdRaw != null && employeeIdRaw !== '' ? parseInt(employeeIdRaw, 10) : NaN;
    if (!Number.isFinite(employeeId)) {
      sendJson(res, 401, {
        success: false,
        message: 'Sign out and sign in again to cancel reservations.',
      });
      return true;
    }
    const conn = await db.getClient();
    try {
      await conn.beginTransaction();
      const [rlist] = await conn.execute(
        'SELECT reservation_id, customer_id FROM reservation WHERE reservation_date = ? AND reservation_status IN (1, 2)',
        [dateStr]
      );
      for (let i = 0; i < rlist.length; i++) {
        const row = rlist[i];
        await conn.execute(
          'UPDATE reservation SET reservation_status = 4, employee_id = ? WHERE reservation_id = ?',
          [employeeId, row.reservation_id]
        );
        await restoreBookingEligibilityIfNoActiveReservations(conn, row.customer_id);
      }
      await conn.commit();
      sendJson(res, 200, {
        success: true,
        canceled: rlist.length,
        date: dateStr,
      });
    } catch (e) {
      try {
        await conn.rollback();
      } catch (_) {}
      console.error('[admin schedule-reservations clear-day]', e.message);
      sendJson(res, 503, { success: false, message: 'Unable to cancel reservations for this day' });
    } finally {
      conn.release();
    }
    return true;
  }

  return false;
};
