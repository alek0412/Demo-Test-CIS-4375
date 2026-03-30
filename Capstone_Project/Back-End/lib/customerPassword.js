/**
 * Customer password: DB lookup, bcrypt, password-reset tokens.
 * Uses `customer`.`password` for bcrypt hashes (your schema); `salt` unused for bcrypt.
 * Requires migrations/001_customer_password_reset.sql for reset_token columns.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db/connection');

const BCRYPT_ROUNDS = 10;
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function findCustomerByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  try {
    const { rows } = await db.query(
      'SELECT customer_id, email, `password` AS pwd FROM customer WHERE LOWER(TRIM(email)) = ? LIMIT 1',
      [normalized]
    );
    return rows[0] || null;
  } catch (e) {
    console.error('[customerPassword] findCustomerByEmail:', e.message);
    return null;
  }
}

async function findCustomerByResetToken(token) {
  const t = String(token || '').trim();
  if (!/^[a-f0-9]{64}$/i.test(t)) return null;
  try {
    const { rows } = await db.query(
      'SELECT customer_id, email FROM customer WHERE reset_token = ? AND reset_token_expires > NOW() LIMIT 1',
      [t]
    );
    return rows[0] || null;
  } catch (e) {
    console.error('[customerPassword] findCustomerByResetToken:', e.message);
    return null;
  }
}

/**
 * @param {string} envEmail
 * @param {string} envPassword
 */
async function validateCustomerLogin(email, password, envEmail, envPassword) {
  const normalized = normalizeEmail(email);
  const row = await findCustomerByEmail(normalized);
  if (row && row.pwd) {
    try {
      return bcrypt.compareSync(password, row.pwd);
    } catch (_) {
      return false;
    }
  }
  if (normalized === normalizeEmail(envEmail) && password === envPassword) {
    return true;
  }
  return false;
}

async function startPasswordReset(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return { ok: true, genericMessage: true };
  }
  let row;
  try {
    row = (
      await db.query(
        'SELECT customer_id, email FROM customer WHERE LOWER(TRIM(email)) = ? LIMIT 1',
        [normalized]
      )
    ).rows[0];
  } catch (e) {
    console.error('[customerPassword] startPasswordReset lookup:', e.message);
    return { ok: false, error: 'database' };
  }
  if (!row) {
    return { ok: true, genericMessage: true };
  }
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + RESET_TTL_MS);
  const pool = db.getPool();
  try {
    const [header] = await pool.execute(
      'UPDATE customer SET reset_token = ?, reset_token_expires = ? WHERE customer_id = ?',
      [token, expires, row.customer_id]
    );
    if (header.affectedRows !== 1) {
      return { ok: false, error: 'database' };
    }
  } catch (e) {
    console.error('[customerPassword] startPasswordReset update:', e.message);
    return { ok: false, error: 'database' };
  }
  return { ok: true, token, email: row.email };
}

async function completePasswordReset(token, newPassword) {
  const t = String(token || '').trim();
  if (!t) {
    return { ok: false, message: 'Invalid or expired link.' };
  }
  if (String(newPassword || '').length < 8) {
    return { ok: false, message: 'Password must be at least 8 characters.' };
  }
  const row = await findCustomerByResetToken(t);
  if (!row) {
    return { ok: false, message: 'Invalid or expired link.' };
  }
  const hash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);
  const pool = db.getPool();
  try {
    const [header] = await pool.execute(
      'UPDATE customer SET `password` = ?, reset_token = NULL, reset_token_expires = NULL WHERE customer_id = ? AND reset_token = ?',
      [hash, row.customer_id, t]
    );
    if (header.affectedRows !== 1) {
      return { ok: false, message: 'Invalid or expired link.' };
    }
  } catch (e) {
    console.error('[customerPassword] completePasswordReset:', e.message);
    return { ok: false, message: 'Could not update password. Try again later.' };
  }
  return { ok: true };
}

/**
 * First-time signup from waiver: insert customer with bcrypt hash in `password`.
 */
async function registerNewCustomer({ email, password, firstName, lastName, phone }) {
  const normalized = normalizeEmail(email);
  if (!normalized || String(password || '').length < 8) {
    return { ok: false, code: 'invalid' };
  }
  const existing = await findCustomerByEmail(normalized);
  if (existing) {
    return { ok: false, code: 'exists' };
  }
  const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  const pool = db.getPool();
  try {
    const [header] = await pool.execute(
      'INSERT INTO customer (customer_first_name, customer_last_name, phone, email, `password`) VALUES (?, ?, ?, ?, ?)',
      [
        String(firstName || '').trim(),
        String(lastName || '').trim(),
        phone ? String(phone).trim() : null,
        normalized,
        hash,
      ]
    );
    if (header.affectedRows !== 1) {
      return { ok: false, code: 'database' };
    }
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return { ok: false, code: 'exists' };
    }
    console.error('[registerNewCustomer]', e.message);
    return { ok: false, code: 'database' };
  }
  return { ok: true };
}

module.exports = {
  normalizeEmail,
  findCustomerByEmail,
  validateCustomerLogin,
  startPasswordReset,
  completePasswordReset,
  registerNewCustomer,
};
