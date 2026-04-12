/**
 * GET /api/customer-activity — reservation timeline for the logged-in customer (Node session cookie).
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

function titleFor(row, kind) {
  var court = Number(row.court_id) || 0;
  var label = 'Court ' + court;
  switch (kind) {
    case 'upcoming_pending':
      return 'Upcoming reservation (pending approval): ' + label;
    case 'upcoming':
      return 'Upcoming reservation: ' + label;
    case 'completed':
      return 'Completed booking: ' + label;
    case 'canceled':
      return 'Canceled reservation: ' + label;
    case 'denied':
      return 'Request not approved: ' + label;
    case 'stale_pending':
      return 'Past pending request: ' + label;
    default:
      return 'Reservation: ' + label;
  }
}

function classifyRow(row, todayYmd, nowMins) {
  var dateYmd = formatDate(row.reservation_date);
  var endM = timeToMinutes(formatTime(row.reservation_end_time));
  var st = Number(row.reservation_status);
  var isPastDate = dateYmd < todayYmd;
  var isToday = dateYmd === todayYmd;
  var slotEndedToday = isToday && endM <= nowMins;
  var isPast = isPastDate || slotEndedToday;

  if (st === 4) return { slot: 'past', kind: 'canceled' };
  if (st === 3) return { slot: 'past', kind: 'denied' };
  if (!isPast && st === 1) return { slot: 'upcoming', kind: 'upcoming_pending' };
  if (!isPast && st === 2) return { slot: 'upcoming', kind: 'upcoming' };
  if (isPast && st === 2) return { slot: 'past', kind: 'completed' };
  if (isPast && st === 1) return { slot: 'past', kind: 'stale_pending' };
  return { slot: 'past', kind: 'completed' };
}

function buildActivities(rows) {
  var todayYmd = todayYmdLocal();
  var nowMins = nowMinutesLocal();
  var upcoming = [];
  var past = [];

  (rows || []).forEach(function (row) {
    var c = classifyRow(row, todayYmd, nowMins);
    var detail = formatDetailLine(row.reservation_date, row.reservation_start_time, row.reservation_end_time);
    var dateYmd = formatDate(row.reservation_date);
    var startM = timeToMinutes(formatTime(row.reservation_start_time));
    var item = {
      title: titleFor(row, c.kind),
      detail: detail,
      _dateYmd: dateYmd,
      _startM: startM,
    };
    if (c.slot === 'upcoming') upcoming.push(item);
    else past.push(item);
  });

  upcoming.sort(function (a, b) {
    if (a._dateYmd !== b._dateYmd) return String(a._dateYmd).localeCompare(String(b._dateYmd));
    return (a._startM || 0) - (b._startM || 0);
  });
  past.sort(function (a, b) {
    if (a._dateYmd !== b._dateYmd) return String(b._dateYmd).localeCompare(String(a._dateYmd));
    return (b._startM || 0) - (a._startM || 0);
  });

  var out = [];
  upcoming.slice(0, 5).forEach(function (x) {
    out.push({ title: x.title, detail: x.detail });
  });
  past.slice(0, 6).forEach(function (x) {
    out.push({ title: x.title, detail: x.detail });
  });
  return out;
}

module.exports = async function handleCustomerActivity(req, res, ctx) {
  var pathname = ctx.pathname;
  if (req.method !== 'GET' || pathname !== '/api/customer-activity') {
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
    console.error('[customer-activity] lookup:', err.message);
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
      'SELECT court_id, reservation_date, reservation_start_time, reservation_end_time, reservation_status FROM reservation WHERE customer_id = ? ORDER BY reservation_date DESC, reservation_start_time DESC LIMIT 40',
      [customerId]
    );
    rows = q2.rows || [];
  } catch (err2) {
    console.error('[customer-activity] reservations:', err2.message);
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: 'Database error' }));
    return true;
  }

  var activities = buildActivities(rows);
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ success: true, activities: activities }));
  return true;
};
