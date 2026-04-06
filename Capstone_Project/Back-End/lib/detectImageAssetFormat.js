/**
 * Parse FileReader data URLs and detect PDF / image format from bytes (not declared MIME).
 * Handles mislabeled files (e.g. JPEG bytes with a .png name / image/png data URL).
 */

/**
 * @param {string} dataUrl
 * @returns {{ buf: Buffer } | null}
 */
function parseDataUrlToBuffer(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  const trimmed = dataUrl.trim();
  const comma = trimmed.indexOf(',');
  if (comma === -1) return null;
  const header = trimmed.slice(0, comma);
  const payload = trimmed.slice(comma + 1);
  const isBase64 = /;base64/i.test(header);
  let buf;
  try {
    if (isBase64) {
      buf = Buffer.from(payload, 'base64');
    } else {
      buf = Buffer.from(decodeURIComponent(payload.replace(/\+/g, ' ')), 'utf8');
    }
  } catch (e) {
    return null;
  }
  if (!Buffer.isBuffer(buf) || buf.length < 4) return null;
  return { buf };
}

/**
 * @param {Buffer} buf
 * @param {number} maxBytes
 * @returns {{ mime: string, ext: string } | null}
 */
function detectImageAssetFormat(buf, maxBytes) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) return null;
  if (buf.length > maxBytes) return null;

  const maxTxt = Math.min(buf.length, 65536);
  const s0 = buf.slice(0, maxTxt).toString('utf8');
  const tTrim = s0.replace(/^\uFEFF/, '').trim();
  if (/^<\?xml|^<svg/i.test(tTrim) && /<svg[\s/>]/i.test(s0)) {
    return { mime: 'image/svg+xml', ext: '.svg' };
  }

  const head = buf.slice(0, 24);
  const h = head.toString('latin1');

  if (h.slice(0, 5) === '%PDF-') {
    return { mime: 'application/pdf', ext: '.pdf' };
  }
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
    return { mime: 'image/png', ext: '.png' };
  }
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return { mime: 'image/jpeg', ext: '.jpg' };
  }
  if (h.slice(0, 6) === 'GIF87a' || h.slice(0, 6) === 'GIF89a') {
    return { mime: 'image/gif', ext: '.gif' };
  }
  if (buf.length >= 12 && h.slice(0, 4) === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') {
    return { mime: 'image/webp', ext: '.webp' };
  }
  if (head[0] === 0x42 && head[1] === 0x4d) {
    return { mime: 'image/bmp', ext: '.bmp' };
  }
  if (
    (head[0] === 0x49 && head[1] === 0x49 && head[2] === 0x2a && head[3] === 0x00) ||
    (head[0] === 0x4d && head[1] === 0x4d && head[2] === 0x00 && head[3] === 0x2a)
  ) {
    return { mime: 'image/tiff', ext: '.tiff' };
  }
  if (head[0] === 0x00 && head[1] === 0x00 && head[2] === 0x01 && head[3] === 0x00 && buf.length >= 22) {
    return { mime: 'image/x-icon', ext: '.ico' };
  }
  if (buf.length >= 12 && buf.slice(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.slice(8, 12).toString('ascii');
    if (brand === 'avif' || brand === 'avis') {
      return { mime: 'image/avif', ext: '.avif' };
    }
    if (brand === 'heic' || brand === 'heix' || brand === 'hevc' || brand === 'mif1' || brand === 'msf1') {
      return { mime: 'image/heic', ext: '.heic' };
    }
  }

  return null;
}

module.exports = {
  parseDataUrlToBuffer,
  detectImageAssetFormat,
};
