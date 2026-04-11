/**
 * Public read-only schedule: same active rows as the admin day view — pending (1) and confirmed (2).
 * Canceled/denied (3,4) are excluded so the grid reflects real availability.
 */
const db = require('../db/connection');

function getUrlQuery(req) {
  try {
    return new URL(req.url || '/', 'http://localhost').searchParams;
  } catch (e) {
    return new URLSearchParams();
  }
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

module.exports = async function handlePublicScheduleReservations(req, res, ctx) {
  const { pathname } = ctx;
  if (req.method !== 'GET' || pathname !== '/api/schedule-reservations') {
    return false;
  }

  const dateStr = (getUrlQuery(req).get('date') || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: 'Query "date" must be YYYY-MM-DD' }));
    return true;
  }

  try {
    const { rows } = await db.query(
      `SELECT r.reservation_id, r.court_id, r.customer_id, r.reservation_date,
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
      reservation_date: formatDate(row.reservation_date),
      reservation_start_time: formatTime(row.reservation_start_time),
      reservation_end_time: formatTime(row.reservation_end_time),
      reservation_status: row.reservation_status,
      customer_first_name: row.customer_first_name,
      customer_last_name: row.customer_last_name,
    }));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, reservations }));
  } catch (e) {
    console.error('[public schedule-reservations]', e.message);
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: 'Unable to load schedule' }));
  }
  return true;
};
