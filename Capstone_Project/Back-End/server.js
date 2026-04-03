/**
 * Houston Badminton Center — Backend server
 * Serves the Front-End and can host API routes.
 * Run from this folder: node server.js
 * Then open http://localhost:3000
 *
 * Admin login credentials (change in production):
 *   Email:    admin@example.com
 *   Password: Admin123!
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const http = require('http');
const fs = require('fs');
const db = require('./db/connection');
const config = require('./config');
const customerPassword = require('./lib/customerPassword');
const { sendPasswordResetEmail } = require('./lib/resetMail');
const upcomingEvents = require('./lib/upcomingEvents');

const PORT = process.env.PORT || 3000;

// Admin credentials (use env vars or a real DB in production)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

// Customer login — set CUSTOMER_EMAIL and CUSTOMER_PASSWORD in .env (required for production; optional dev default below)
const CUSTOMER_EMAIL = (process.env.CUSTOMER_EMAIL || 'alekespi0412@gmail.com').trim().toLowerCase();
const CUSTOMER_PASSWORD = process.env.CUSTOMER_PASSWORD || 'Espi22735@';

// Session secret so cookies from before this server started are invalid (shows "Log in" on fresh start)
const CUSTOMER_SESSION_SECRET = process.env.CUSTOMER_SESSION_SECRET || require('crypto').randomBytes(16).toString('hex');
const CUSTOMER_SESSION_VALUE = 'loggedin:' + CUSTOMER_SESSION_SECRET;

// Front-End folder is one level up from Back-End
const FRONT_END = path.join(__dirname, '..', 'Front-End');

/** Match admin_session=loggedin as its own cookie (avoids substring false positives). */
function hasAdminSessionCookie(req) {
  const c = req.headers.cookie || '';
  return /(?:^|;\s*)admin_session=loggedin(?:\s|;|$)/.test(c);
}

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

function serveFile(filePath, res) {
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const headers = { 'Content-Type': contentType };
    if (ext === '.pdf') {
      headers['Content-Disposition'] = 'inline';
    }
    res.writeHead(200, headers);
    res.end(data);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function readBodyWithLimit(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let rejected = false;
    req.on('data', (chunk) => {
      if (rejected) return;
      total += chunk.length;
      if (total > maxBytes) {
        rejected = true;
        reject(new Error('too_large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (rejected) return;
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const pathname = (req.url || '').split('?')[0];

  // POST /api/login — validate admin credentials and set session cookie
  if (req.method === 'POST' && pathname === '/api/login') {
    let data = {};
    try {
      data = await parseBody(req);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
      return;
    }
    const email = (data.email || '').trim().toLowerCase();
    const password = data.password || '';
    const valid = email === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD;
    if (valid) {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': 'admin_session=loggedin; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax',
      });
      res.end(JSON.stringify({ success: true }));
      return;
    }
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Invalid email or password' }));
    return;
  }

  // POST /api/logout — clear admin session
  if (req.method === 'POST' && pathname === '/api/logout') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'admin_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
    });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // POST /api/customer-login — validate customer credentials and set session cookie
  if (req.method === 'POST' && pathname === '/api/customer-login') {
    let data = {};
    try {
      data = await parseBody(req);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
      return;
    }
    const email = (data.email || '').trim().toLowerCase();
    const password = data.password || '';
    const valid = await customerPassword.validateCustomerLogin(
      email,
      password,
      CUSTOMER_EMAIL,
      CUSTOMER_PASSWORD
    );
    if (valid) {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': 'customer_session=' + encodeURIComponent(CUSTOMER_SESSION_VALUE) + '; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax',
      });
      res.end(JSON.stringify({ success: true }));
      return;
    }
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Invalid email or password' }));
    return;
  }

  // POST /api/customer-logout — clear customer session
  if (req.method === 'POST' && pathname === '/api/customer-logout') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'customer_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
    });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // POST /api/waiver-register — create customer account (email + password) from public waiver form
  if (req.method === 'POST' && pathname === '/api/waiver-register') {
    const sendJson = (status, obj) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };
    try {
      let data = {};
      try {
        data = await parseBody(req);
      } catch (e) {
        sendJson(400, { success: false, message: 'Invalid request' });
        return;
      }
      if (!data.agree) {
        sendJson(400, { success: false, message: 'You must agree to the waiver terms.' });
        return;
      }
      const pw = data.password || '';
      const pw2 = data.password_confirm != null ? data.password_confirm : data.passwordConfirm;
      if (pw !== pw2) {
        sendJson(400, { success: false, message: 'Passwords do not match.' });
        return;
      }
      const result = await customerPassword.registerNewCustomer({
        email: data.email,
        password: pw,
        firstName: data.first_name,
        lastName: data.last_name,
        phone: data.mobile != null ? data.mobile : data.phone,
      });
      if (!result.ok) {
        if (result.code === 'exists') {
          sendJson(409, {
            success: false,
            message: 'An account with this email already exists. Log in or use Forgot password.',
          });
          return;
        }
        if (result.code === 'invalid') {
          sendJson(400, { success: false, message: 'Check your email and password (at least 8 characters).' });
          return;
        }
        sendJson(503, {
          success: false,
          message:
            'Could not complete registration. Confirm the database migration is applied and column names match your customer table.',
        });
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie':
          'customer_session=' + encodeURIComponent(CUSTOMER_SESSION_VALUE) + '; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax',
      });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      console.error('[waiver-register]', err);
      sendJson(500, { success: false, message: 'Server error during registration. Check EC2 logs and database connection.' });
    }
    return;
  }

  // POST /api/forgot-password — if email exists in customer table, send reset link (email or console)
  if (req.method === 'POST' && pathname === '/api/forgot-password') {
    let data = {};
    try {
      data = await parseBody(req);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
      return;
    }
    const result = await customerPassword.startPasswordReset(data.email);
    if (!result.ok && result.error === 'database') {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          message: 'Password reset is temporarily unavailable. Confirm the database migration is applied.',
        })
      );
      return;
    }
    if (result.ok && result.token && result.email) {
      try {
        await sendPasswordResetEmail({ to: result.email, token: result.token });
      } catch (e) {
        console.error('[forgot-password] send:', e);
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Could not send the reset email. Try again later.' }));
        return;
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        message:
          'If that email is registered, you will receive a link to reset your password.',
      })
    );
    return;
  }

  // POST /api/reset-password — set new password using token from email link
  if (req.method === 'POST' && pathname === '/api/reset-password') {
    let data = {};
    try {
      data = await parseBody(req);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
      return;
    }
    const token = data.token || '';
    const password = data.password || '';
    const out = await customerPassword.completePasswordReset(token, password);
    if (!out.ok) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: out.message || 'Could not reset password.' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // GET /api/customer-me — check if customer is logged in (only accepts session from this server run)
  if (req.method === 'GET' && pathname === '/api/customer-me') {
    const cookie = req.headers.cookie || '';
    let sessionValue = '';
    try {
      const match = cookie.match(/customer_session=([^;]*)/);
      sessionValue = match ? decodeURIComponent(match[1].trim()) : '';
    } catch (_) {}
    const loggedIn = sessionValue === CUSTOMER_SESSION_VALUE;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ loggedIn }));
    return;
  }

  // GET /api/me — check if admin is logged in (for dashboard redirect)
  if (req.method === 'GET' && pathname === '/api/me') {
    const loggedIn = hasAdminSessionCookie(req);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ loggedIn }));
    return;
  }

  // GET /api/upcoming-events — home dashboard promo images (public)
  if (req.method === 'GET' && pathname === '/api/upcoming-events') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(upcomingEvents.getPublicPayload()));
    return;
  }

  // POST /api/admin/upcoming-events — upload or clear a slot (admin only)
  if (req.method === 'POST' && pathname === '/api/admin/upcoming-events') {
    if (!hasAdminSessionCookie(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Not authenticated' }));
      return;
    }
    let raw;
    try {
      /* Base64 in JSON is ~4/3 decoded size; extra slack for JSON keys / alt text */
      const upcomingBodyLimit =
        Math.ceil((upcomingEvents.MAX_IMAGE_BYTES * 4) / 3) + 4 * 1024 * 1024;
      raw = await readBodyWithLimit(req, upcomingBodyLimit);
    } catch (e) {
      if (e && e.message === 'too_large') {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            message:
              'Request body too large (over ~1 GB image after encoding). Use a smaller file or compress the image.',
          })
        );
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
      return;
    }
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid JSON' }));
      return;
    }
    const opNorm =
      typeof data.op === 'string' ? data.op.trim().toLowerCase().replace(/\s+/g, '') : '';
    const wantsClear = opNorm === 'clear' || data.clear === true;
    const wantsSetCount = opNorm === 'setcount' || opNorm === 'setslotcount';

    if (wantsSetCount) {
      const out = upcomingEvents.setSlotCount(data.count);
      if (!out.ok) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: out.error || 'Could not update slot count.' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    /* Bare { count: N } without op/slot — same as setCount (avoids NaN slot → "Invalid slot 0–2") */
    if (
      !wantsClear &&
      data.count != null &&
      (data.dataUrl === undefined || data.dataUrl === null) &&
      (data.slot === undefined || data.slot === null || data.slot === '')
    ) {
      const out = upcomingEvents.setSlotCount(data.count);
      if (out.ok) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: out.error || 'Could not update slot count.' }));
      return;
    }

    const slot = typeof data.slot === 'number' && Number.isInteger(data.slot) ? data.slot : parseInt(data.slot, 10);
    if (wantsClear) {
      const out = upcomingEvents.clearSlot(slot);
      if (!out.ok) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: out.error || 'Could not clear slot.' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    if (!Number.isInteger(slot) || Number.isNaN(slot)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          message:
            'Invalid request. For changing how many images you use, pick a number in the dropdown and confirm. Restart the server if this keeps happening.',
        })
      );
      return;
    }

    const out = upcomingEvents.setSlotImage(slot, data.dataUrl, data.alt);
    if (!out.ok) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: out.error || 'Could not save image.' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // GET /api/db — return tables and rows from the database (for admin “View data”)
  if (req.method === 'GET' && pathname === '/api/db') {
    if (!hasAdminSessionCookie(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }
    const send = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };
    try {
      const dbName = config.db.database;
      const { rows: tableRows } = await db.query(
        'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
        [dbName]
      );
      const tables = {};
      for (const row of tableRows) {
        const tableName = row.TABLE_NAME;
        try {
          const { rows: dataRows } = await db.query('SELECT * FROM `' + tableName.replace(/`/g, '``') + '` LIMIT 500', []);
          tables[tableName] = dataRows;
        } catch (e) {
          tables[tableName] = [{ _error: String(e.message) }];
        }
      }
      send(200, { database: dbName, tables });
    } catch (err) {
      send(200, { database: config.db.database || null, error: err.message, tables: {} });
    }
    return;
  }

  // Redirect root to general (public) client dashboard
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(302, { Location: '/client/General_Dashboard.html' });
    res.end();
    return;
  }

  let urlPath = pathname;

  // Serve JS from Back-End/static (admin and client scripts live with backend)
  if (
    urlPath === '/admin-theme.js' ||
    urlPath === '/client-nav.js' ||
    urlPath === '/Client_Alternative.js' ||
    urlPath === '/membership-pricing-lightbox.js' ||
    urlPath === '/upcoming-events-home.js' ||
    urlPath === '/admin-marketing.js'
  ) {
    const staticPath = path.join(__dirname, 'static', path.basename(urlPath));
    fs.stat(staticPath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
      }
      serveFile(staticPath, res);
    });
    return;
  }

  const filePath = path.join(FRONT_END, path.normalize(urlPath));

  // Don't allow path traversal outside Front-End
  const realPath = path.resolve(filePath);
  const frontEndRoot = path.resolve(FRONT_END);
  if (!realPath.startsWith(frontEndRoot)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    serveFile(filePath, res);
  });
});

server.listen(PORT, () => {
  console.log('Server running at http://localhost:' + PORT + '/');
  console.log('  Front-End: ' + FRONT_END);
});
