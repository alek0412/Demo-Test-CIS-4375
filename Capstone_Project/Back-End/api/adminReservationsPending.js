/**
 * Pending court booking requests (reservation_status = 1) for admin UI.
 * Uses Node admin session + MySQL — same DB as Flask reservation routes.
 */
const db = require('../db/connection');

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
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }
  return String(val);
}

module.exports = async function handleAdminReservationsPending(req, res, ctx) {
  const { pathname, parseBody, hasAdminSessionCookie } = ctx;

  const isPendingGet = req.method === 'GET' && pathname === '/api/admin/pending-reservations';
  const isPendingPatch = req.method === 'PATCH' && pathname === '/api/admin/pending-reservations';
  if (!isPendingGet && !isPendingPatch) {
    return false;
  }

  if (!hasAdminSessionCookie(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: 'Unauthorized' }));
    return true;
  }

  if (isPendingGet) {
    try {
      const { rows } = await db.query(
        `SELECT r.reservation_id, r.court_id, r.customer_id, r.waiver_id, r.reservation_date,
                r.reservation_start_time, r.reservation_end_time, r.reservation_status,
                c.customer_first_name, c.customer_last_name, c.phone, c.email
         FROM reservation r
         LEFT JOIN customer c ON c.customer_id = r.customer_id
         WHERE r.reservation_status = 1
         ORDER BY r.reservation_date ASC, r.reservation_start_time ASC`
      );
      const items = (rows || []).map(function (row) {
        return {
          reservation_id: row.reservation_id,
          court_id: row.court_id,
          customer_id: row.customer_id,
          waiver_id: row.waiver_id,
          reservation_date: formatDate(row.reservation_date),
          reservation_start_time: formatTime(row.reservation_start_time),
          reservation_end_time: formatTime(row.reservation_end_time),
          customer_first_name: row.customer_first_name,
          customer_last_name: row.customer_last_name,
          phone: row.phone,
          email: row.email,
        };
      });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, count: items.length, reservations: items }));
    } catch (e) {
      console.error('[admin pending-reservations]', e.message);
      res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: 'Unable to load pending reservations' }));
    }
    return true;
  }

  if (isPendingPatch) {
    let body = {};
    try {
      body = await parseBody(req);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: 'Invalid request body' }));
      return true;
    }
    const reservationId = body.reservation_id;
    const action = body.action;
    const employeeIdRaw = getCookie(req, 'admin_employee_id');
    const employeeId = employeeIdRaw != null && employeeIdRaw !== '' ? parseInt(employeeIdRaw, 10) : NaN;
    if (!Number.isFinite(employeeId)) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: 'Sign out and sign in again to approve requests.' }));
      return true;
    }
    if (typeof reservationId !== 'number' && typeof reservationId !== 'string') {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: 'Missing reservation_id' }));
      return true;
    }
    const rid = parseInt(String(reservationId), 10);
    if (!Number.isFinite(rid)) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: 'Invalid reservation_id' }));
      return true;
    }
    const newStatus = action === 'approve' ? 2 : action === 'deny' ? 3 : null;
    if (newStatus === null) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: 'action must be approve or deny' }));
      return true;
    }

    const conn = await db.getClient();
    try {
      await conn.beginTransaction();
      const [sel] = await conn.execute(
        'SELECT reservation_id, reservation_status, waiver_id, customer_id FROM reservation WHERE reservation_id = ?',
        [rid]
      );
      if (!sel.length) {
        await conn.rollback();
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: 'Reservation not found' }));
        return true;
      }
      if (Number(sel[0].reservation_status) !== 1) {
        await conn.rollback();
        res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: 'This request is no longer pending' }));
        return true;
      }
      const customerId = sel[0].customer_id;
      const [upd] = await conn.execute(
        'UPDATE reservation SET reservation_status = ?, employee_id = ? WHERE reservation_id = ? AND reservation_status = 1',
        [newStatus, employeeId, rid]
      );
      if (upd.affectedRows !== 1) {
        await conn.rollback();
        res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: 'Could not update reservation' }));
        return true;
      }
      // Deny → reservation_status 3 (per DB lookup). Always clear waiver by customer so customer can book again
      // (even if reservation.waiver_id was null or pointed at a stale row).
      if (action === 'deny' && customerId != null) {
        await conn.execute('UPDATE waiver SET waiver_status = 1 WHERE customer_id = ?', [customerId]);
      }
      await conn.commit();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, reservation_id: rid, reservation_status: newStatus }));
    } catch (e) {
      try {
        await conn.rollback();
      } catch (_) {}
      console.error('[admin pending-reservations PATCH]', e.message);
      res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: 'Unable to update reservation' }));
    } finally {
      conn.release();
    }
    return true;
  }

  return false;
};
