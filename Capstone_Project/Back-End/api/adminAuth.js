/**
 * Admin session: login, logout, /api/me
 */
const crypto = require('crypto');
const db = require('../db/connection');
const { proxyToFlask } = require('../lib/flaskHttp');

function flaskBaseUrl(config) {
  return (config && (config.flaskApiBaseUrl || config.flaskWaiverBaseUrl)) || '';
}

function verifyPythonPbkdf2Password(plain, pwdHex, saltHex) {
  if (!plain || !pwdHex || !saltHex || String(pwdHex).length !== 64) return false;
  try {
    const salt = Buffer.from(String(saltHex).trim(), 'hex');
    if (!salt.length) return false;
    const hashHex = crypto.pbkdf2Sync(String(plain), salt, 50000, 32, 'sha256').toString('hex');
    const a = Buffer.from(hashHex, 'hex');
    const b = Buffer.from(String(pwdHex).trim(), 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (_) {
    return false;
  }
}

module.exports = async function handleAdminAuth(req, res, ctx) {
  const {
    pathname,
    parseBody,
    hasAdminSessionCookie,
    hasManagerSessionCookie,
    config,
  } = ctx;

  if (req.method === 'POST' && pathname === '/api/admin/login') {
    let data = {};
    try {
      data = await parseBody(req);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
      return true;
    }
    const email = (data.email || '').trim().toLowerCase();
    const password = data.password || '';
    if (!email || !password) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid email or password' }));
      return true;
    }

    let employee = null;
    try {
      const { rows } = await db.query(
        'SELECT employee_id, employee_email, employee_password, employee_salt, employee_rank FROM employee WHERE LOWER(TRIM(employee_email)) = ? LIMIT 1',
        [email]
      );
      employee = rows[0] || null;
    } catch (e) {
      console.error('[adminAuth] employee lookup:', e.message);
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Unable to validate login right now' }));
      return true;
    }

    const valid =
      !!employee &&
      verifyPythonPbkdf2Password(password, employee.employee_password, employee.employee_salt);
    if (valid) {
      const adminCookie = 'admin_session=loggedin; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax';
      const managerCookie =
        'admin_manager_session=loggedin; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax';
      const idCookie = `admin_employee_id=${encodeURIComponent(String(employee.employee_id))}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`;
      const isManager = Number(employee.employee_rank) === 1;
      let cookies = isManager ? [adminCookie, managerCookie, idCookie] : [adminCookie, idCookie];

      const base = flaskBaseUrl(config);
      if (isManager && base) {
        try {
          const upstream = await proxyToFlask(base, 'POST', '/api/login', {
            body: JSON.stringify({ email, password }),
            contentType: 'application/json',
          });
          if (upstream.setCookies && upstream.setCookies.length) {
            cookies = cookies.concat(upstream.setCookies);
          }
        } catch (err) {
          console.error('[adminAuth] Flask /api/login sync:', err.message);
        }
      }

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': cookies,
      });
      res.end(JSON.stringify({ success: true }));
      return true;
    }
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Invalid email or password' }));
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/admin/logout') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': [
        'admin_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
        'admin_manager_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
        'admin_employee_id=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
      ],
    });
    res.end(JSON.stringify({ success: true }));
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/me') {
    const loggedIn = hasAdminSessionCookie(req);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ loggedIn }));
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/admin/manager-logout') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'admin_manager_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
    });
    res.end(JSON.stringify({ success: true }));
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/admin/manager-me') {
    const managerLoggedIn =
      hasAdminSessionCookie(req) && hasManagerSessionCookie(req);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ managerLoggedIn }));
    return true;
  }

  return false;
};
