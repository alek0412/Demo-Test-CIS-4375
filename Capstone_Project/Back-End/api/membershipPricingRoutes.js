/**
 * Public membership pricing asset URL + admin upload / reset.
 */
module.exports = async function handleMembershipPricingRoutes(req, res, ctx) {
  const { pathname, readBodyWithLimit, hasAdminSessionCookie, membershipPricing } = ctx;

  if (req.method === 'GET' && pathname === '/api/membership-pricing') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(membershipPricing.getPublicPayload()));
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/admin/membership-pricing') {
    if (!hasAdminSessionCookie(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Not authenticated' }));
      return true;
    }
    let raw;
    try {
      const limit = Math.ceil((membershipPricing.MAX_UPLOAD_BYTES * 4) / 3) + 65536;
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
      const out = membershipPricing.clearCustom();
      if (!out.ok) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: out.error || 'Could not reset.' }));
        return true;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...membershipPricing.getPublicPayload() }));
      return true;
    }
    const out = membershipPricing.setFromDataUrl(data.dataUrl);
    if (!out.ok) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: out.error || 'Could not save file.' }));
      return true;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, ...membershipPricing.getPublicPayload() }));
    return true;
  }

  return false;
};
