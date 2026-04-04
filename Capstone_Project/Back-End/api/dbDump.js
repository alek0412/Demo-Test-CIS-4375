/**
 * GET /api/db — admin-only table dump for “View data”.
 */
module.exports = async function handleDbDump(req, res, ctx) {
  const { pathname, hasAdminSessionCookie, db, config } = ctx;

  if (req.method !== 'GET' || pathname !== '/api/db') {
    return false;
  }

  if (!hasAdminSessionCookie(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not authenticated' }));
    return true;
  }
  const send = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  try {
    const dbName = config.db.database;
    const { rows: tableRows } = await db.query(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
      [dbName]
    );
    const tables = {};
    for (const row of tableRows) {
      const tableName = row.TABLE_NAME;
      try {
        const { rows: dataRows } = await db.query('SELECT * FROM `' + tableName.replace(/`/g, '``') + '` LIMIT 500', []);
        tables[tableName] = dataRows;
      } catch (e) {
        tables[tableName] = [{ _error: String(e.message) }];
      }
    }
    send(200, { database: dbName, tables });
  } catch (err) {
    send(200, { database: config.db.database || null, error: err.message, tables: {} });
  }
  return true;
};
