/**
 * Database connection for MySQL (e.g. AWS RDS).
 * Uses config.js; requires: npm install mysql2
 */
const mysql = require('mysql2/promise');
const config = require('../config');

let pool = null;

function getPool() {
  if (pool) return pool;

  const { databaseUrl, db } = config;

  if (databaseUrl) {
    pool = mysql.createPool(databaseUrl);
  } else {
    pool = mysql.createPool({
      host: db.host,
      port: db.port,
      database: db.database,
      user: db.user,
      password: db.password,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  return pool;
}

async function query(text, params) {
  const client = getPool();
  const [rows] = await client.execute(text, params);
  return { rows, rowCount: rows?.length ?? 0 };
}

async function getClient() {
  return getPool().getConnection();
}

module.exports = {
  getPool,
  query,
  getClient,
};
