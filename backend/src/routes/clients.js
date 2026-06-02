const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');
const { logAudit } = require('./audit');

async function insertClient({ name, company, email, phone, address, postcode }) {
  try {
    return await pool.query(
      'INSERT INTO clients (name,company,email,phone,address,postcode) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, company || '', email || '', phone || '', address || '', postcode || '']
    );
  } catch (err) {
    if (err.code === '42703' || err.message?.includes('postcode')) {
      return await pool.query(
        'INSERT INTO clients (name,company,email,phone,address) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [name, company || '', email || '', phone || '', address || '']
      );
    }
    throw err;
  }
}

async function updateClient({ name, company, email, phone, address, postcode }, id) {
  try {
    return await pool.query(
      'UPDATE clients SET name=$1,company=$2,email=$3,phone=$4,address=$5,postcode=$6 WHERE id=$7 RETURNING *',
      [name, company || '', email || '', phone || '', address || '', postcode || '', id]
    );
  } catch (err) {
    if (err.code === '42703' || err.message?.includes('postcode')) {
      return await pool.query(
        'UPDATE clients SET name=$1,company=$2,email=$3,phone=$4,address=$5 WHERE id=$6 RETURNING *',
        [name, company || '', email || '', phone || '', address || '', id]
      );
    }
    throw err;
  }
}

router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM clients ORDER BY name');
  res.json(rows);
});

router.post('/', auth, async (req, res) => {
  const { name, company, email, phone, address, postcode } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const { rows } = await insertClient({ name, company, email, phone, address, postcode });
  await logAudit(req.user.id, req.user.username, req.user.role, 'create', `Client: ${name}`, company || '');
  res.status(201).json(rows[0]);
});

router.put('/:id', auth, async (req, res) => {
  const { name, company, email, phone, address, postcode } = req.body;
  const { rows } = await updateClient({ name, company, email, phone, address, postcode }, req.params.id);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  await logAudit(req.user.id, req.user.username, req.user.role, 'edit', `Client: ${name}`, 'Updated');
  res.json(rows[0]);
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  const { rows } = await pool.query('DELETE FROM clients WHERE id=$1 RETURNING *', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  await logAudit(req.user.id, req.user.username, req.user.role, 'delete', `Client: ${rows[0].name}`, 'Deleted');
  res.json({ ok: true });
});

module.exports = router;
