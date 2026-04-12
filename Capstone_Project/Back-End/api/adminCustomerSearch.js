/**
 * GET /api/admin/customers-search?q= — search customers by name or email (admin session).
 */
const db = require('../db/connection');

function getUrlQuery(req) {
  try {
    return new URL(req.url || '/', 'http://localhost').searchParams;
  } catch (e) {
    return new URLSearchParams();
  }
}

function escapeLikeFragment(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

module.exports = async function adminCustomerSearch(req, res, ctx) {
  const { pathname, hasAdminSessionCookie } = ctx;
  if (req.method !== 'GET' || pathname !== '/api/admin/customers-search') {
    return false;
  }

  if (!hasAdminSessionCookie(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: 'Unauthorized' }));
    return true;
  }

  const raw = (getUrlQuery(req).get('q') || '').trim();
  if (raw.length < 1) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: 'Enter a name or email to search' }));
    return true;
  }

  const like = `%${escapeLikeFragment(raw)}%`;

  try {
    const { rows } = await db.query(
      `SELECT customer_id, customer_first_name, customer_last_name, phone, email
       FROM customer
       WHERE LOWER(CONCAT(TRIM(customer_first_name), ' ', TRIM(customer_last_name))) LIKE LOWER(?)
          OR LOWER(TRIM(email)) LIKE LOWER(?)
       ORDER BY customer_last_name ASC, customer_first_name ASC
       LIMIT 40`,
      [like, like]
    );

    const customers = (rows || []).map((r) => ({
      customerId: r.customer_id,
      firstName: r.customer_first_name != null ? String(r.customer_first_name).trim() : '',
      lastName: r.customer_last_name != null ? String(r.customer_last_name).trim() : '',
      phone: r.phone != null ? String(r.phone).trim() : '',
      email: r.email != null ? String(r.email).trim() : '',
    }));

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, customers }));
  } catch (e) {
    console.error('[admin customers-search]', e.message);
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: 'Unable to search customers' }));
  }
  return true;
};
