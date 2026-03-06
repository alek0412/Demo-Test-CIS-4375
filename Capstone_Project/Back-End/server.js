/**
 * Houston Badminton Center — Backend server
 * Serves the Front-End and can host API routes.
 * Run from this folder: node server.js
 * Then open http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

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

const server = http.createServer((req, res) => {
  // Optional: API routes go here later
  // if (req.url.startsWith('/api/')) { ... return; }

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
