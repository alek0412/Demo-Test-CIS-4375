/**
 * Customer auth, waiver registration, password reset, /api/customer-me
 */
const http = require('http');
const https = require('https');
const { URL } = require('url');

function proxyPostJson(targetUrl, jsonObj) {
  const body = Buffer.from(JSON.stringify(jsonObj), 'utf8');
  const u = new URL(targetUrl);
  const lib = u.protocol === 'https:' ? https : http;
  const port = u.port ? Number(u.port, 10) : u.protocol === 'https:' ? 443 : 80;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: u.hostname,
        port,
        path: u.pathname + (u.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': body.length,
        },
      },
      (r) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => {
          resolve({ status: r.statusCode || 502, body: Buffer.concat(chunks).toString('utf8') });
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = async function handleCustomerAuth(req, res, ctx) {
  const {
    pathname,
    parseBody,
    customerPassword,
    sendPasswordResetEmail,
    CUSTOMER_EMAIL,
    CUSTOMER_PASSWORD,
    CUSTOMER_PREVIEW_LOGIN,
    CUSTOMER_SESSION_VALUE,
    config,
  } = ctx;

  if (req.method === 'POST' && pathname === '/api/customer-login') {
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
    const valid = await customerPassword.validateCustomerLogin(
      email,
      password,
      CUSTOMER_EMAIL,
      CUSTOMER_PASSWORD,
      CUSTOMER_PREVIEW_LOGIN
    );
    if (valid) {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie':
          'customer_session=' + encodeURIComponent(CUSTOMER_SESSION_VALUE) + '; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax',
      });
      res.end(JSON.stringify({ success: true }));
      return true;
    }
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Invalid email or password' }));
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/customer-logout') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'customer_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
    });
    res.end(JSON.stringify({ success: true }));
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/waiver-register') {
    const sendJson = (status, obj) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };
    const base = (config && config.flaskWaiverBaseUrl) || '';
    try {
      let data = {};
      try {
        data = await parseBody(req);
      } catch (e) {
        sendJson(400, { success: false, message: 'Invalid request' });
        return true;
      }
      if (!data.agree) {
        sendJson(400, { success: false, message: 'You must agree to the waiver terms.' });
        return true;
      }
      const pw = data.password || '';
      const pw2 = data.password_confirm != null ? data.password_confirm : data.passwordConfirm;
      if (pw !== pw2) {
        sendJson(400, { success: false, message: 'Passwords do not match.' });
        return true;
      }
      if (!base) {
        sendJson(503, { success: false, message: 'Waiver registration is not configured (FLASK_WAIVER_URL).' });
        return true;
      }
      const target = new URL('/api/waiver-register', base.endsWith('/') ? base.slice(0, -1) : base).href;
      let upstream;
      try {
        upstream = await proxyPostJson(target, data);
      } catch (err) {
        console.error('[waiver-register] proxy:', err.message);
        sendJson(503, {
          success: false,
          message:
            'Could not reach the registration service. Start the Flask app (e.g. python flask_server.py on port 3001).',
        });
        return true;
      }
      const msg = (upstream.body || '').trim();
      if (upstream.status === 201) {
        res.writeHead(201, {
          'Content-Type': 'application/json',
          'Set-Cookie':
            'customer_session=' + encodeURIComponent(CUSTOMER_SESSION_VALUE) + '; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax',
        });
        res.end(JSON.stringify({ success: true, message: msg || 'Customer created successfully!' }));
        return true;
      }
      const status = upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502;
      sendJson(status, { success: false, message: msg || 'Registration failed.' });
    } catch (err) {
      console.error('[waiver-register]', err);
      sendJson(500, {
        success: false,
        message: 'Server error during registration. Check EC2 logs and database connection.',
      });
    }
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/forgot-password') {
    let data = {};
    try {
      data = await parseBody(req);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
      return true;
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
      return true;
    }
    if (result.ok && result.token && result.email) {
      try {
        await sendPasswordResetEmail({ to: result.email, token: result.token });
      } catch (e) {
        console.error('[forgot-password] send:', e);
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Could not send the reset email. Try again later.' }));
        return true;
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        message: 'If that email is registered, you will receive a link to reset your password.',
      })
    );
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/reset-password') {
    let data = {};
    try {
      data = await parseBody(req);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
      return true;
    }
    const token = data.token || '';
    const password = data.password || '';
    const out = await customerPassword.completePasswordReset(token, password);
    if (!out.ok) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: out.message || 'Could not reset password.' }));
      return true;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return true;
  }

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
    return true;
  }

  return false;
};
