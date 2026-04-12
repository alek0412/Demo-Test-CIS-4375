/**
 * GET /api/customer-bookings — full reservation list for My Bookings (Node session + email cookie).
 */
const db = require('../db/connection');

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

function formatHm12(hhmm) {
  const t = String(hhmm || '').slice(0, 5);
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return String(hhmm || '');
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return h + ':' + min + ' ' + ampm;
}

function formatDetailLine(dateVal, startVal, endVal) {
  const ymd = formatDate(dateVal);
  if (!ymd) return '';
  const parts = ymd.split('-');
  const y = parseInt(parts[0], 10);
  const mo = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const dt = new Date(y, mo - 1, d);
  const weekday = dt.toLocaleDateString('en-US', { weekday: 'long' });
  const datePart = dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const s = formatHm12(formatTime(startVal));
  const e = formatHm12(formatTime(endVal));
  return weekday + ', ' + datePart + ' · ' + s + ' – ' + e;
}

function timeToMinutes(hhmm) {
  const t = String(hhmm || '').slice(0, 5);
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function todayYmdLocal() {
  const n = new Date();
  const pad = function (x) {
    return String(x).padStart(2, '0');
  };
  return n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate());
}

function nowMinutesLocal() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function headlineFor(row, segment) {
  var court = Number(row.court_id) || 0;
  var label = 'Court ' + court;
  var st = Number(row.reservation_status);
  if (st === 4) return 'Canceled reservation: ' + label;
  if (st === 3) return 'Request not approved: ' + label;
  if (st === 1 && segment === 'upcoming') return 'Upcoming reservation (pending approval): ' + label;
  if (st === 2 && segment === 'upcoming') return 'Upcoming reservation: ' + label;
  if (st === 2 && segment === 'completed') return 'Completed booking: ' + label;
  if (st === 1 && segment === 'stale_pending') return 'Past pending request: ' + label;
  if (st === 1) return 'Reservation (pending approval): ' + label;
  if (st === 2) return 'Reservation: ' + label;
  return 'Reservation: ' + label;
}

function statusMeta(st) {
  var n = Number(st);
  if (n === 1) return { key: 'pending', label: 'Pending approval' };
  if (n === 2) return { key: 'confirmed', label: 'Confirmed' };
  if (n === 3) return { key: 'denied', label: 'Not approved' };
  if (n === 4) return { key: 'canceled', label: 'Canceled' };
  return { key: 'unknown', label: 'Unknown' };
}

function segmentFor(row, todayYmd, nowMins) {
  var st = Number(row.reservation_status);
  if (st === 4) return 'canceled';
  if (st === 3) return 'denied';
  var dateYmd = formatDate(row.reservation_date);
  var endM = timeToMinutes(formatTime(row.reservation_end_time));
  var isPast = dateYmd < todayYmd || (dateYmd === todayYmd && endM <= nowMins);
  if (!isPast && (st === 1 || st === 2)) return 'upcoming';
  if (isPast && st === 2) return 'completed';
  if (isPast && st === 1) return 'stale_pending';
  return 'other';
}

function mapRow(row, todayYmd, nowMins) {
  var seg = segmentFor(row, todayYmd, nowMins);
  var sm = statusMeta(row.reservation_status);
  var detail = formatDetailLine(row.reservation_date, row.reservation_start_time, row.reservation_end_time);
  return {
    reservationId: row.reservation_id,
    courtId: row.court_id,
    reservationDate: formatDate(row.reservation_date),
    startTime: formatTime(row.reservation_start_time),
    endTime: formatTime(row.reservation_end_time),
    reservationStatus: Number(row.reservation_status),
    statusKey: sm.key,
    statusLabel: sm.label,
    headline: headlineFor(row, seg),
    detailLine: detail,
    segment: seg,
  };
}

module.exports = async function handleCustomerBookings(req, res, ctx) {
  var pathname = ctx.pathname;
  if (req.method !== 'GET' || pathname !== '/api/customer-bookings') {
    return false;
  }

  var CUSTOMER_SESSION_VALUE = ctx.CUSTOMER_SESSION_VALUE;
  var sessionValue = '';
  try {
    var m = (req.headers.cookie || '').match(/customer_session=([^;]*)/);
    sessionValue = m ? decodeURIComponent(m[1].trim()) : '';
  } catch (e) {}
  if (sessionValue !== CUSTOMER_SESSION_VALUE) {
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: 'Unauthorized' }));
    return true;
  }

  var email = '';
  try {
    var em = (req.headers.cookie || '').match(/hbc_customer_email=([^;]*)/);
    email = em ? decodeURIComponent(em[1].trim()) : '';
  } catch (e2) {}
  var normalized = String(email || '')
    .trim()
    .toLowerCase();
  if (!normalized) {
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: 'Unauthorized' }));
    return true;
  }

  var customerId;
  try {
    var q1 = await db.query('SELECT customer_id FROM customer WHERE LOWER(TRIM(email)) = ? LIMIT 1', [normalized]);
    var rows1 = q1.rows || [];
    customerId = rows1[0] ? rows1[0].customer_id : null;
  } catch (err) {
    console.error('[customer-bookings] lookup:', err.message);
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: 'Database error' }));
    return true;
  }
  if (!customerId) {
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: 'Unauthorized' }));
    return true;
  }

  var rows;
  try {
    var q2 = await db.query(
      'SELECT reservation_id, court_id, reservation_date, reservation_start_time, reservation_end_time, reservation_status FROM reservation WHERE customer_id = ? ORDER BY reservation_date DESC, reservation_start_time DESC LIMIT 120',
      [customerId]
    );
    rows = q2.rows || [];
  } catch (err2) {
    console.error('[customer-bookings] query:', err2.message);
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: 'Database error' }));
    return true;
  }

  var todayYmd = todayYmdLocal();
  var nowMins = nowMinutesLocal();
  var reservations = rows.map(function (r) {
    return mapRow(r, todayYmd, nowMins);
  });

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ success: true, reservations: reservations }));
  return true;
};
