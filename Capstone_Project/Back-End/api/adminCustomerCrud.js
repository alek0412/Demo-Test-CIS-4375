/**
 * POST /api/admin/customer — admin-only update or delete customer row.
 * Body: { op: 'delete', customerId: number } | { op: 'update', customerId: number, ...fields }
 * Password updates use the same PBKDF2 scheme as Flask (`routes/customer.py`) so customer login works.
 */
const { hashPasswordLikePython } = require('../lib/customerPassword');

const UPDATE_WHITELIST = [
  'customer_first_name',
  'customer_last_name',
  'phone',
  'email',
  'street_address',
  'city',
  'state',
  'zip_code',
  'membership_status',
];

module.exports = async function handleAdminCustomerCrud(req, res, ctx) {
  const { pathname, hasAdminSessionCookie, db, parseBody } = ctx;

  if (req.method !== 'POST' || pathname !== '/api/admin/customer') {
    return false;
  }

  const send = (status, obj) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };

  if (!hasAdminSessionCookie(req)) {
    send(401, { success: false, message: 'Not authenticated' });
    return true;
  }

  let body = {};
  try {
    body = await parseBody(req);
  } catch (e) {
    send(400, { success: false, message: 'Invalid request body' });
    return true;
  }

  const op = (body.op || '').toLowerCase();
  const customerId = parseInt(body.customerId, 10);
  if (!Number.isFinite(customerId) || customerId < 1) {
    send(400, { success: false, message: 'Invalid customer id' });
    return true;
  }

  try {
    if (op === 'delete') {
      // Match Flask customer_remove: child rows first (FK-safe), same as routes/customer.py
      const conn = await db.getClient();
      try {
        await conn.beginTransaction();
        try {
          await conn.execute('DELETE FROM `emergency_contact` WHERE `customer_id` = ?', [customerId]);
        } catch (e) {
          if (e.code !== 'ER_NO_SUCH_TABLE' && e.errno !== 1146) throw e;
        }
        await conn.execute('DELETE FROM `reservation` WHERE `customer_id` = ?', [customerId]);
        // Break FK from customer -> waiver before deleting waiver rows.
        await conn.execute('UPDATE `customer` SET `waiver_id` = NULL WHERE `customer_id` = ?', [customerId]);
        await conn.execute('DELETE FROM `waiver` WHERE `customer_id` = ?', [customerId]);
        await conn.execute('DELETE FROM `customer` WHERE `customer_id` = ?', [customerId]);
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
      send(200, { success: true });
      return true;
    }

    if (op === 'update') {
      const sets = [];
      const params = [];
      for (const key of UPDATE_WHITELIST) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
          let v = body[key];
          if (key === 'membership_status') {
            const n = parseInt(v, 10);
            if (n !== 1 && n !== 2 && n !== 3) {
              send(400, {
                success: false,
                message: 'membership_status must be 1 (Junior), 2 (Adult), or 3 (Senior)',
              });
              return true;
            }
            v = n;
          } else if (key === 'email') {
            v = String(v || '').trim();
            if (!v) {
              send(400, { success: false, message: 'Email cannot be empty' });
              return true;
            }
          } else {
            v = v == null ? '' : String(v);
          }
          sets.push('`' + key.replace(/`/g, '``') + '` = ?');
          params.push(v);
        }
      }

      const newPassword = typeof body.newPassword === 'string' ? body.newPassword.trim() : '';
      if (newPassword) {
        if (newPassword.length < 8) {
          send(400, { success: false, message: 'New password must be at least 8 characters' });
          return true;
        }
        const { passwordHex, saltHex } = hashPasswordLikePython(newPassword);
        sets.push('`password` = ?');
        sets.push('`salt` = ?');
        params.push(passwordHex, saltHex);
      }

      if (sets.length === 0) {
        send(400, { success: false, message: 'No fields to update' });
        return true;
      }

      params.push(customerId);
      const sql = 'UPDATE `customer` SET ' + sets.join(', ') + ' WHERE `customer_id` = ?';
      await db.query(sql, params);
      send(200, { success: true });
      return true;
    }

    send(400, { success: false, message: 'Unknown op; use delete or update' });
    return true;
  } catch (err) {
    const msg = err.message || String(err);
    if (/ER_ROW_IS_REFERENCED|foreign key|Cannot delete/i.test(msg)) {
      send(409, { success: false, message: 'Cannot delete this customer: other records still reference them.' });
      return true;
    }
    send(500, { success: false, message: msg });
    return true;
  }
};
