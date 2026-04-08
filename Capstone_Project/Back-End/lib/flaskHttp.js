/**
 * Forward HTTP requests to the Flask (Python) app — same paths, cookies preserved.
 */
const http = require('http');
const https = require('https');
const { URL } = require('url');

function normalizeBase(base) {
  return String(base || '').replace(/\/$/, '');
}

function collectSetCookies(incomingMessage) {
  const out = [];
  const raw = incomingMessage.rawHeaders || [];
  for (let i = 0; i < raw.length; i += 2) {
    if (String(raw[i]).toLowerCase() === 'set-cookie') {
      out.push(raw[i + 1]);
    }
  }
  return out;
}

/**
 * @param {string} baseUrl - e.g. http://127.0.0.1:3001
 * @param {string} method
 * @param {string} pathWithQuery - e.g. /api/court
 * @param {{ body?: string|Buffer|null, cookie?: string, contentType?: string }} opts
 * @returns {Promise<{ statusCode: number, headers: Record<string,string>, body: string, setCookies: string[] }>}
 */
function proxyToFlask(baseUrl, method, pathWithQuery, opts = {}) {
  const base = normalizeBase(baseUrl);
  if (!base) {
    return Promise.reject(new Error('No Flask base URL'));
  }
  const path = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
  const u = new URL(path, `${base}/`);
  const lib = u.protocol === 'https:' ? https : http;
  const port = u.port ? Number(u.port, 10) : u.protocol === 'https:' ? 443 : 80;

  let bodyBuf = null;
  if (opts.body != null && opts.body !== '') {
    bodyBuf = Buffer.isBuffer(opts.body) ? opts.body : Buffer.from(String(opts.body), 'utf8');
  }

  const headers = {};
  if (opts.cookie) {
    headers.Cookie = opts.cookie;
  }
  if (bodyBuf && bodyBuf.length) {
    headers['Content-Type'] = opts.contentType || 'application/json';
    headers['Content-Length'] = bodyBuf.length;
  }

  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: u.hostname,
        port,
        path: u.pathname + (u.search || ''),
        method: String(method || 'GET').toUpperCase(),
        headers,
      },
      (flaskRes) => {
        const chunks = [];
        flaskRes.on('data', (c) => chunks.push(c));
        flaskRes.on('end', () => {
          const setCookies = collectSetCookies(flaskRes);
          const outHeaders = {};
          const ct = flaskRes.headers['content-type'];
          if (ct) {
            outHeaders['content-type'] = ct;
          }
          resolve({
            statusCode: flaskRes.statusCode || 502,
            headers: outHeaders,
            body: Buffer.concat(chunks).toString('utf8'),
            setCookies,
          });
        });
      }
    );
    req.on('error', reject);
    if (bodyBuf && bodyBuf.length) {
      req.write(bodyBuf);
    }
    req.end();
  });
}

/**
 * @param {import('http').ServerResponse} res
 * @param {{ statusCode: number, headers?: Record<string,string>, body: string, setCookies?: string[] }} upstream
 */
function writeFlaskResponse(res, upstream) {
  const headers = {
    'Content-Type': upstream.headers['content-type'] || 'text/plain; charset=utf-8',
  };
  const cookies = upstream.setCookies && upstream.setCookies.length ? upstream.setCookies : [];
  if (cookies.length) {
    res.writeHead(upstream.statusCode, { ...headers, 'Set-Cookie': cookies });
  } else {
    res.writeHead(upstream.statusCode, headers);
  }
  res.end(upstream.body);
}

module.exports = { proxyToFlask, writeFlaskResponse, normalizeBase };
