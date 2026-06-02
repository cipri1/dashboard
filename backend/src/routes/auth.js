const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { SECRET } = require('../middleware/auth');
const { logAudit } = require('./audit');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username = $1', [username]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { id: user.id, username: user.username, fullname: user.fullname, role: user.role },
      SECRET,
      { expiresIn: '8h' }
    );

    await logAudit(user.id, user.username, user.role, 'login', 'Session', 'Logged in');

    res.json({
      token,
      user: { id: user.id, username: user.username, fullname: user.fullname, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
