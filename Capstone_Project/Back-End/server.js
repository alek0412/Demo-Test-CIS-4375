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

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Admin credentials (use env vars or a real DB in production)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

// Front-End folder is one level up from Back-End
const FRONT_END = path.join(__dirname, '..', 'Front-End');

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
    res.writeHead(200, { 'Content-Type': contentType });
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

const server = http.createServer(async (req, res) => {
  // POST /api/login — validate admin credentials and set session cookie
  if (req.method === 'POST' && req.url === '/api/login') {
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

  // GET /api/me — check if admin is logged in (for dashboard redirect)
  if (req.method === 'GET' && req.url === '/api/me') {
    const cookie = req.headers.cookie || '';
    const loggedIn = cookie.includes('admin_session=loggedin');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ loggedIn }));
    return;
  }

  // Redirect root to client dashboard
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(302, { Location: '/client/Client_Dashboard.html' });
    res.end();
    return;
  }

  let urlPath = req.url.split('?')[0];
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
