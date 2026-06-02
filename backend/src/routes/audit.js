const router = require('express').Router();
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

async function logAudit(userId, username, role, action, entity, detail) {
  try {
    await pool.query(
      'INSERT INTO audit_log (user_id, username, role, action, entity, detail) VALUES ($1,$2,$3,$4,$5,$6)',
      [userId, username, role, action, entity, detail]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

router.get('/', auth, async (req, res) => {
  const { action } = req.query;
  let q = 'SELECT * FROM audit_log';
  const params = [];
  if (action) { q += ' WHERE action = $1'; params.push(action); }
  q += ' ORDER BY ts DESC LIMIT 200';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

module.exports = router;
module.exports.logAudit = logAudit;
