const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');
const { logAudit } = require('./audit');

router.get('/', auth, adminOnly, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, username, fullname, role, last_login, created_at FROM users ORDER BY id'
  );
  res.json(rows);
});

router.post('/', auth, adminOnly, async (req, res) => {
  const { username, fullname, password, role } = req.body;
  if (!username || !fullname || !password) return res.status(400).json({ error: 'All fields required' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (username,fullname,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id,username,fullname,role',
      [username, fullname, hash, role || 'user']
    );
    await logAudit(req.user.id, req.user.username, req.user.role, 'create', `User: ${username}`, `Role: ${role}`);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already taken' });
    throw err;
  }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'Cannot delete your own account' });
  const { rows } = await pool.query(
    'DELETE FROM users WHERE id=$1 RETURNING username', [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  await logAudit(req.user.id, req.user.username, req.user.role, 'delete', `User: ${rows[0].username}`, 'Removed');
  res.json({ ok: true });
});

module.exports = router;
