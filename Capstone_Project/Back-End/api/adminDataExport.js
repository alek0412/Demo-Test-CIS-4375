/**
 * Manager-only DB table exports (Excel / PDF).
 */
const db = require('../db/connection');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

function extractTableName(row) {
  if (!row || typeof row !== 'object') return '';
  const keys = Object.keys(row);
  if (!keys.length) return '';
  return String(row[keys[0]] || '').trim();
}

function toSafeCell(val) {
  if (val == null) return '';
  if (val instanceof Date) return val.toISOString();
  if (Buffer.isBuffer(val)) return val.toString('base64');
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch (e) {
      return String(val);
    }
  }
  return String(val);
}

function normalizeSheetName(name, used) {
  var base = String(name || 'Sheet').replace(/[:\\/?*\[\]]/g, '_').slice(0, 31) || 'Sheet';
  if (!used[base]) {
    used[base] = 1;
    return base;
  }
  var idx = used[base] + 1;
  used[base] = idx;
  var suffix = '_' + idx;
  return (base.slice(0, Math.max(1, 31 - suffix.length)) + suffix).slice(0, 31);
}

async function listAllTables() {
  const { rows } = await db.query('SHOW TABLES');
  return (rows || []).map(extractTableName).filter(Boolean).sort();
}

async function readTableRows(tableName) {
  const sql = 'SELECT * FROM `' + tableName.replace(/`/g, '``') + '`';
  const { rows } = await db.query(sql);
  return rows || [];
}

function buildExcelBuffer(tableMap) {
  const wb = XLSX.utils.book_new();
  const used = {};
  Object.keys(tableMap).forEach(function (tableName) {
    const rows = tableMap[tableName] || [];
    const normalized = rows.map(function (row) {
      var out = {};
      Object.keys(row || {}).forEach(function (k) {
        out[k] = toSafeCell(row[k]);
      });
      return out;
    });
    const ws = normalized.length
      ? XLSX.utils.json_to_sheet(normalized)
      : XLSX.utils.aoa_to_sheet([['No rows found']]);
    const sheetName = normalizeSheetName(tableName, used);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function buildPdfBuffer(tableMap) {
  return new Promise(function (resolve, reject) {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', function (c) { chunks.push(c); });
    doc.on('end', function () { resolve(Buffer.concat(chunks)); });
    doc.on('error', reject);

    const tables = Object.keys(tableMap);
    tables.forEach(function (tableName, idx) {
      if (idx > 0) doc.addPage();
      const rows = tableMap[tableName] || [];
      const cols = rows.length ? Object.keys(rows[0]) : [];
      doc.fontSize(16).text('Table: ' + tableName, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text('Rows: ' + rows.length);
      doc.moveDown(0.5);
      if (!rows.length) {
        doc.fontSize(10).text('No rows found.');
        return;
      }
      doc.font('Courier').fontSize(8);
      var maxRows = rows.length;
      for (var i = 0; i < maxRows; i++) {
        var line = cols.map(function (c) {
          return c + ': ' + toSafeCell(rows[i][c]);
        }).join(' | ');
        doc.text(line, { width: 520 });
        if (doc.y > 760 && i < maxRows - 1) doc.addPage();
      }
      doc.font('Helvetica');
    });
    doc.end();
  });
}

function stamp() {
  const d = new Date();
  return (
    String(d.getFullYear()) +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0') + '-' +
    String(d.getHours()).padStart(2, '0') +
    String(d.getMinutes()).padStart(2, '0') +
    String(d.getSeconds()).padStart(2, '0')
  );
}

module.exports = async function handleAdminDataExport(req, res, ctx) {
  const { pathname, parseBody, hasAdminSessionCookie, hasManagerSessionCookie } = ctx;
  const isList = req.method === 'GET' && pathname === '/api/admin/export/tables';
  const isExport = req.method === 'POST' && pathname === '/api/admin/export';
  if (!isList && !isExport) return false;

  if (!hasAdminSessionCookie(req) || !hasManagerSessionCookie(req)) {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: 'Manager access required' }));
    return true;
  }

  try {
    const allTables = await listAllTables();
    if (isList) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, tables: allTables }));
      return true;
    }

    let body = {};
    try {
      body = await parseBody(req);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: 'Invalid request body' }));
      return true;
    }
    const requested = Array.isArray(body.tables) ? body.tables.map(function (t) { return String(t || '').trim(); }) : [];
    const format = String(body.format || 'xlsx').toLowerCase();
    if (!requested.length) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: 'Select at least one table' }));
      return true;
    }
    if (format !== 'xlsx' && format !== 'pdf') {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: 'format must be xlsx or pdf' }));
      return true;
    }

    const allowed = {};
    allTables.forEach(function (t) { allowed[t] = true; });
    const selected = [];
    for (var i = 0; i < requested.length; i++) {
      if (allowed[requested[i]]) selected.push(requested[i]);
    }
    if (!selected.length) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: 'No valid tables selected' }));
      return true;
    }

    const tableMap = {};
    for (var j = 0; j < selected.length; j++) {
      tableMap[selected[j]] = await readTableRows(selected[j]);
    }

    const fileStamp = stamp();
    if (format === 'xlsx') {
      const buffer = buildExcelBuffer(tableMap);
      const fileName = 'hbc-db-export-' + fileStamp + '.xlsx';
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="' + fileName + '"',
      });
      res.end(buffer);
      return true;
    }

    const pdfBuffer = await buildPdfBuffer(tableMap);
    const fileNamePdf = 'hbc-db-export-' + fileStamp + '.pdf';
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="' + fileNamePdf + '"',
    });
    res.end(pdfBuffer);
    return true;
  } catch (err) {
    console.error('[admin export]', err.message);
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: 'Unable to export data right now' }));
    return true;
  }
};
