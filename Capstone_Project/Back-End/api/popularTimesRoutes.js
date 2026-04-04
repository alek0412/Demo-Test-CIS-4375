/**
 * Public Popular Times asset URL (PDF or image) + admin upload / reset to default.
 */
module.exports = async function handlePopularTimesRoutes(req, res, ctx) {
  const { pathname, readBodyWithLimit, hasAdminSessionCookie, popularTimesPdf } = ctx;

  if (req.method === 'GET' && pathname === '/api/popular-times-pdf') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(popularTimesPdf.getPublicPayload()));
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/admin/popular-times-pdf') {
    if (!hasAdminSessionCookie(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Not authenticated' }));
      return true;
    }
    let raw;
    try {
      const limit = Math.ceil((popularTimesPdf.MAX_UPLOAD_BYTES * 4) / 3) + 65536;
      raw = await readBodyWithLimit(req, limit);
    } catch (e) {
      if (e && e.message === 'too_large') {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'File too large.' }));
        return true;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
      return true;
    }
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid JSON' }));
      return true;
    }
    const opNorm =
      typeof data.op === 'string' ? data.op.trim().toLowerCase().replace(/\s+/g, '') : '';
    if (opNorm === 'clear' || data.clear === true) {
      const out = popularTimesPdf.clearCustom();
      if (!out.ok) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: out.error || 'Could not reset.' }));
        return true;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...popularTimesPdf.getPublicPayload() }));
      return true;
    }
    const out = popularTimesPdf.setFromDataUrl(data.dataUrl);
    if (!out.ok) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: out.error || 'Could not save file.' }));
      return true;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, ...popularTimesPdf.getPublicPayload() }));
    return true;
  }

  return false;
};
