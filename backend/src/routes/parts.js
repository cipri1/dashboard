const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');
const { logAudit } = require('./audit');

router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM parts ORDER BY name');
  res.json(rows);
});

router.post('/', auth, adminOnly, async (req, res) => {
  const { name, sku, qty, min_stock, unit_cost } = req.body;
  if (!name || !sku) return res.status(400).json({ error: 'Name and SKU required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO parts (name,sku,qty,min_stock,unit_cost) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, sku, qty || 0, min_stock || 0, unit_cost || 0]
    );
    await logAudit(req.user.id, req.user.username, req.user.role, 'create', `Part: ${name}`, `SKU ${sku}, qty ${qty}`);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'SKU already exists' });
    throw err;
  }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, sku, qty, min_stock, unit_cost } = req.body;
  const { rows } = await pool.query(
    'UPDATE parts SET name=$1,sku=$2,qty=$3,min_stock=$4,unit_cost=$5 WHERE id=$6 RETURNING *',
    [name, sku, qty, min_stock, unit_cost, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  await logAudit(req.user.id, req.user.username, req.user.role, 'edit', `Part: ${name}`, `Qty: ${qty}, cost: ${unit_cost}`);
  res.json(rows[0]);
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM parts WHERE id=$1 RETURNING *', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    await logAudit(req.user.id, req.user.username, req.user.role, 'delete', `Part: ${rows[0].name}`, 'Deleted');
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Cannot delete part because it is used in a product BOM.' });
    }
    throw err;
  }
});

module.exports = router;
