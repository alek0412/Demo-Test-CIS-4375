/**
 * Admin session: login, logout, /api/me
 */
module.exports = async function handleAdminAuth(req, res, ctx) {
  const { pathname, parseBody, ADMIN_EMAIL, ADMIN_PASSWORD, hasAdminSessionCookie } = ctx;

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
    const valid = email === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD;
    if (valid) {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': 'admin_session=loggedin; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax',
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
      'Set-Cookie': 'admin_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
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

  return false;
};
