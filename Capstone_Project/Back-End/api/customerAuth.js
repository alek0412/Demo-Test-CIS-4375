/**
 * Customer auth, waiver registration, password reset, /api/customer-me
 */
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
          return true;
        }
        if (result.code === 'invalid') {
          sendJson(400, { success: false, message: 'Check your email and password (at least 8 characters).' });
          return true;
        }
        sendJson(503, {
          success: false,
          message:
            'Could not complete registration. Confirm the database migration is applied and column names match your customer table.',
        });
        return true;
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie':
          'customer_session=' + encodeURIComponent(CUSTOMER_SESSION_VALUE) + '; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax',
      });
      res.end(JSON.stringify({ success: true }));
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
