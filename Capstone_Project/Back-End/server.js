/**
 * Houston Badminton Center — Backend server
 * Serves the Front-End; HTTP APIs live under ./api/ (see api/index.js).
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
const popularTimesPdf = require('./lib/popularTimesPdf');
const membershipPricing = require('./lib/membershipPricing');
const membershipSpecials = require('./lib/membershipSpecials');
const { parseBody, readBodyWithLimit } = require('./lib/httpBody');
const { handleApi } = require('./api');

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

const server = http.createServer(async (req, res) => {
  const pathname = (req.url || '').split('?')[0];

  const apiCtx = {
    pathname,
    parseBody,
    readBodyWithLimit,
    hasAdminSessionCookie,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    CUSTOMER_EMAIL,
    CUSTOMER_PASSWORD,
    CUSTOMER_SESSION_VALUE,
    customerPassword,
    sendPasswordResetEmail,
    upcomingEvents,
    popularTimesPdf,
    membershipPricing,
    membershipSpecials,
    db,
    config,
  };
  if (await handleApi(req, res, apiCtx)) {
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
    urlPath === '/membership-page-pricing.js' ||
    urlPath === '/admin-membership-pricing.js' ||
    urlPath === '/upcoming-events-home.js' ||
    urlPath === '/admin-marketing.js' ||
    urlPath === '/admin-popular-times.js' ||
    urlPath === '/availability-popular-times.js' ||
    urlPath === '/admin-membership-specials.js' ||
    urlPath === '/membership-specials-display.js' ||
    urlPath === '/membership-pricing-lightbox.js'
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
