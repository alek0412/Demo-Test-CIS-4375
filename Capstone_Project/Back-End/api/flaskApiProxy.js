/**
 * Proxy Flask-owned routes (employee login/logout, employee-create, courts, reservations) so the browser
 * stays on the Node origin. Paths match Back-End/[Python]/routes/*.py without changing Python.
 */
const { proxyToFlask, writeFlaskResponse } = require('../lib/flaskHttp');

function flaskBase(ctx) {
  return (ctx.config && (ctx.config.flaskApiBaseUrl || ctx.config.flaskWaiverBaseUrl)) || '';
}

module.exports = async function flaskApiProxy(req, res, ctx) {
  const { pathname, parseBody, readBodyWithLimit } = ctx;
  const base = flaskBase(ctx);
  if (!base) {
    return false;
  }

  const cookie = req.headers.cookie || '';

  if (req.method === 'POST' && pathname === '/api/login') {
    let data = {};
    try {
      data = await parseBody(req);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
      return true;
    }
    try {
      const upstream = await proxyToFlask(base, 'POST', '/api/login', {
        body: JSON.stringify(data),
        cookie,
        contentType: 'application/json',
      });
      writeFlaskResponse(res, upstream);
    } catch (err) {
      console.error('[flask proxy] /api/login', err.message);
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Unable to reach Flask. Start flask_server.py (port 3001).');
    }
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/logout') {
    try {
      const upstream = await proxyToFlask(base, 'POST', '/api/logout', {
        body: null,
        cookie,
      });
      writeFlaskResponse(res, upstream);
    } catch (err) {
      console.error('[flask proxy] /api/logout', err.message);
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Unable to reach Flask.');
    }
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/employee-create') {
    let data = {};
    try {
      data = await parseBody(req);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
      return true;
    }
    try {
      const upstream = await proxyToFlask(base, 'POST', '/api/employee-create', {
        body: JSON.stringify(data),
        cookie,
        contentType: 'application/json',
      });
      writeFlaskResponse(res, upstream);
    } catch (err) {
      console.error('[flask proxy] /api/employee-create', err.message);
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Unable to reach Flask.');
    }
    return true;
  }

  if (pathname === '/api/court') {
    const m = req.method;
    if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(m)) {
      return false;
    }
    try {
      let bodyOpt = null;
      let contentType;
      if (m === 'POST' || m === 'PATCH') {
        const data = await parseBody(req);
        bodyOpt = JSON.stringify(data);
        contentType = 'application/json';
      } else {
        try {
          const raw = await readBodyWithLimit(req, 1 << 16);
          if (raw && raw.length) {
            bodyOpt = raw;
            contentType = 'application/json';
          }
        } catch (e) {
          if (e.message === 'too_large') {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Body too large' }));
            return true;
          }
          throw e;
        }
      }
      const upstream = await proxyToFlask(base, m, '/api/court', {
        body: bodyOpt,
        cookie,
        contentType,
      });
      writeFlaskResponse(res, upstream);
    } catch (err) {
      console.error('[flask proxy] /api/court', err.message);
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Unable to reach Flask.');
    }
    return true;
  }

  if (req.method === 'DELETE' && pathname === '/api/delete') {
    let data = {};
    try {
      data = await parseBody(req);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
      return true;
    }
    try {
      const upstream = await proxyToFlask(base, 'DELETE', '/api/delete', {
        body: JSON.stringify(data),
        cookie,
        contentType: 'application/json',
      });
      writeFlaskResponse(res, upstream);
    } catch (err) {
      console.error('[flask proxy] /api/delete', err.message);
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Unable to reach Flask.');
    }
    return true;
  }

  if (req.method === 'PATCH' && pathname === '/api/change-employee') {
    let data = {};
    try {
      data = await parseBody(req);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
      return true;
    }
    try {
      const upstream = await proxyToFlask(base, 'PATCH', '/api/change-employee', {
        body: JSON.stringify(data),
        cookie,
        contentType: 'application/json',
      });
      writeFlaskResponse(res, upstream);
    } catch (err) {
      console.error('[flask proxy] /api/change-employee', err.message);
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Unable to reach Flask.');
    }
    return true;
  }

  if (pathname === '/api/reservation') {
    const m = req.method;
    if (!['GET', 'POST', 'PATCH'].includes(m)) {
      return false;
    }
    try {
      let bodyOpt = null;
      let contentType;
      if (m === 'POST' || m === 'PATCH') {
        const data = await parseBody(req);
        bodyOpt = JSON.stringify(data);
        contentType = 'application/json';
      }
      const upstream = await proxyToFlask(base, m, '/api/reservation', {
        body: bodyOpt,
        cookie,
        contentType,
      });
      writeFlaskResponse(res, upstream);
    } catch (err) {
      console.error('[flask proxy] /api/reservation', err.message);
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Unable to reach Flask.');
    }
    return true;
  }

  return false;
};
