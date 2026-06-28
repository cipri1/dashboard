const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');
const { logAudit } = require('./audit');

// GET all settings as a flat object
router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT key, value FROM settings ORDER BY key');
  const obj = {};
  rows.forEach(r => { obj[r.key] = r.value; });
  res.json(obj);
});

// PUT update settings (admin only)
router.put('/', auth, adminOnly, async (req, res) => {
  const allowed = ['company_name','company_address','company_postcode','company_city','company_country','company_phone','company_email'];
  
  // Validate postal code if provided
  if (req.body.company_postcode !== undefined && req.body.company_postcode !== '') {
    if (!/^\d{6}$/.test(req.body.company_postcode)) {
      return res.status(400).json({ error: 'Postal code must be exactly 6 numeric digits' });
    }
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        await client.query(
          'INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2',
          [key, req.body[key]]
        );
      }
    }
    await client.query('COMMIT');
    await logAudit(req.user.id, req.user.username, req.user.role, 'edit', 'Settings', 'Updated company/expeditor info');
    const { rows } = await pool.query('SELECT key, value FROM settings ORDER BY key');
    const obj = {};
    rows.forEach(r => { obj[r.key] = r.value; });
    res.json(obj);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

module.exports = router;
