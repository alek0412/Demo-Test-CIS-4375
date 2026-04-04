/**
 * Public membership specials (teaser + items) + admin save / reset.
 */
module.exports = async function handleMembershipSpecialsRoutes(req, res, ctx) {
  const { pathname, readBodyWithLimit, hasAdminSessionCookie, membershipSpecials } = ctx;

  if (req.method === 'GET' && pathname === '/api/membership-specials-teaser') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(membershipSpecials.getPublicPayload()));
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/admin/membership-specials-teaser') {
    if (!hasAdminSessionCookie(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Not authenticated' }));
      return true;
    }
    let raw;
    try {
      raw = await readBodyWithLimit(req, 512 * 1024);
    } catch (e) {
      if (e && e.message === 'too_large') {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Request too large.' }));
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
    if (opNorm === 'reset' || data.clear === true) {
      membershipSpecials.resetToDefault();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...membershipSpecials.getPublicPayload() }));
      return true;
    }
    const out = membershipSpecials.setFullState({
      teaserText: data.teaserText,
      items: data.items,
    });
    if (!out.ok) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: out.error || 'Could not save.' }));
      return true;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, ...membershipSpecials.getPublicPayload() }));
    return true;
  }

  return false;
};
