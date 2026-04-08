/**
 * Customer auth, waiver registration (proxied to Flask), password reset, /api/customer-me
 */
const { proxyToFlask, writeFlaskResponse } = require('../lib/flaskHttp');

function flaskBase(config) {
  return (config && (config.flaskApiBaseUrl || config.flaskWaiverBaseUrl)) || '';
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

  const base = flaskBase(config);
  const cookieHeader = req.headers.cookie || '';

  if (req.method === 'POST' && pathname === '/api/customer-login') {
    let data = {};
    try {
      data = await parseBody(req);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
      return true;
    }
    if (base) {
      try {
        const upstream = await proxyToFlask(base, 'POST', '/api/customer-login', {
          body: JSON.stringify(data),
          cookie: cookieHeader,
          contentType: 'application/json',
        });
        if (upstream.statusCode === 200) {
          const nodeCustomerCookie =
            'customer_session=' +
            encodeURIComponent(CUSTOMER_SESSION_VALUE) +
            '; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax';
          const cookies = [...upstream.setCookies, nodeCustomerCookie];
          res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': cookies });
          res.end(
            JSON.stringify({
              success: true,
              message: (upstream.body || '').trim() || 'Login successful!',
            })
          );
          return true;
        }
        const msg = (upstream.body || '').trim() || 'Invalid email or password';
        const code =
          upstream.statusCode >= 400 && upstream.statusCode < 600 ? upstream.statusCode : 401;
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: msg }));
        return true;
      } catch (err) {
        console.error('[customer-login] Flask:', err.message);
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            message:
              'Could not reach customer login (Flask). Start flask_server.py on port 3001.',
          })
        );
        return true;
      }
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
    if (base) {
      try {
        const upstream = await proxyToFlask(base, 'POST', '/api/customer-logout', {
          body: null,
          cookie: cookieHeader,
        });
        const clearNode = 'customer_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax';
        const cookies = [...upstream.setCookies, clearNode];
        res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': cookies });
        res.end(JSON.stringify({ success: true }));
        return true;
      } catch (err) {
        console.error('[customer-logout] Flask:', err.message);
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Could not reach Flask.' }));
        return true;
      }
    }
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
        sendJson(503, {
          success: false,
          message: 'Waiver registration is not configured (set FLASK_API_URL or FLASK_WAIVER_URL).',
        });
        return true;
      }
      let upstream;
      try {
        upstream = await proxyToFlask(base, 'POST', '/api/waiver-register', {
          body: JSON.stringify(data),
          contentType: 'application/json',
        });
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
      if (upstream.statusCode === 201) {
        const cookies = [
          ...upstream.setCookies,
          'customer_session=' +
            encodeURIComponent(CUSTOMER_SESSION_VALUE) +
            '; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax',
        ];
        res.writeHead(201, { 'Content-Type': 'application/json', 'Set-Cookie': cookies });
        res.end(JSON.stringify({ success: true, message: msg || 'Customer created successfully!' }));
        return true;
      }
      const status =
        upstream.statusCode >= 400 && upstream.statusCode < 600 ? upstream.statusCode : 502;
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

  if ((req.method === 'PATCH' || req.method === 'DELETE') && pathname === '/api/customer') {
    if (!base) {
      return false;
    }
    try {
      let bodyOpt = null;
      let contentType;
      if (req.method === 'PATCH') {
        const data = await parseBody(req);
        bodyOpt = JSON.stringify(data);
        contentType = 'application/json';
      }
      const upstream = await proxyToFlask(base, req.method, '/api/customer', {
        body: bodyOpt,
        cookie: cookieHeader,
        contentType,
      });
      writeFlaskResponse(res, upstream);
      return true;
    } catch (err) {
      console.error('[api/customer]', err.message);
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Unable to reach Flask.');
      return true;
    }
  }

  return false;
};
