/**
 * Public about-gallery JSON + admin uploads (Layout → Gallery, max 20 images).
 */
module.exports = async function handleAboutGalleryRoutes(req, res, ctx) {
  const { pathname, readBodyWithLimit, hasAdminSessionCookie, aboutGallery } = ctx;

  if (req.method === 'GET' && pathname === '/api/about-gallery-asset') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(aboutGallery.getPublicPayload()));
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/admin/about-gallery-asset') {
    if (!hasAdminSessionCookie(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Not authenticated' }));
      return true;
    }
    let raw;
    try {
      const bodyLimit = Math.ceil((aboutGallery.MAX_IMAGE_BYTES * 4) / 3) + 65536;
      raw = await readBodyWithLimit(req, bodyLimit);
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

    if (opNorm === 'clearall') {
      const out = aboutGallery.clearAllSlots();
      if (!out.ok) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: out.error || 'Could not clear.' }));
        return true;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...aboutGallery.getPublicPayload() }));
      return true;
    }

    const wantsSetCount = opNorm === 'setcount' || opNorm === 'setslotcount';

    if (wantsSetCount) {
      const out = aboutGallery.setSlotCount(data.count);
      if (!out.ok) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: out.error || 'Could not update slot count.' }));
        return true;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return true;
    }

    if (
      opNorm !== 'clear' &&
      data.count != null &&
      (data.dataUrl === undefined || data.dataUrl === null) &&
      (data.slot === undefined || data.slot === null || data.slot === '')
    ) {
      const out = aboutGallery.setSlotCount(data.count);
      if (out.ok) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return true;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: out.error || 'Could not update slot count.' }));
      return true;
    }

    const wantsClear = opNorm === 'clear' || data.clear === true;
    const slot =
      typeof data.slot === 'number' && Number.isInteger(data.slot) ? data.slot : parseInt(data.slot, 10);

    if (wantsClear) {
      const out = aboutGallery.clearSlot(slot);
      if (!out.ok) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: out.error || 'Could not clear slot.' }));
        return true;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return true;
    }

    if (!Number.isInteger(slot) || Number.isNaN(slot)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          message: 'Invalid request. Pick a slot and image, or set the number of picture slots.',
        })
      );
      return true;
    }

    const out = aboutGallery.setSlotImage(slot, data.dataUrl, data.alt);
    if (!out.ok) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: out.error || 'Could not save image.' }));
      return true;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return true;
  }

  return false;
};
