const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');
const { logAudit } = require('./audit');

router.get('/', auth, async (req, res) => {
  const { rows: products } = await pool.query('SELECT * FROM products ORDER BY name');
  const { rows: bom } = await pool.query('SELECT * FROM bom ORDER BY product_id');
  res.json(products.map(p => ({
    ...p,
    bom: bom.filter(b => b.product_id === p.id)
  })));
});

router.post('/', auth, adminOnly, async (req, res) => {
  const { name, sku, price, description, qty, bom } = req.body;
  if (!name || !sku) return res.status(400).json({ error: 'Name and SKU required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO products (name,sku,price,description,qty) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, sku, price || 0, description || '', qty || 0]
    );
    const product = rows[0];
    if (bom?.length) {
      for (const b of bom) {
        await client.query(
          'INSERT INTO bom (product_id,part_id,qty) VALUES ($1,$2,$3)',
          [product.id, b.part_id, b.qty]
        );
      }
    }
    await client.query('COMMIT');
    await logAudit(req.user.id, req.user.username, req.user.role, 'create', `Product: ${name}`, `SKU ${sku}, ${bom?.length || 0} part(s)`);
    res.status(201).json({ ...product, bom: bom || [] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'SKU already exists' });
    throw err;
  } finally {
    client.release();
  }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, sku, price, description, qty, bom } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'UPDATE products SET name=$1,sku=$2,price=$3,description=$4,qty=$5 WHERE id=$6 RETURNING *',
      [name, sku, price, description, qty || 0, req.params.id]
    );
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    await client.query('DELETE FROM bom WHERE product_id=$1', [req.params.id]);
    if (bom?.length) {
      for (const b of bom) {
        await client.query(
          'INSERT INTO bom (product_id,part_id,qty) VALUES ($1,$2,$3)',
          [req.params.id, b.part_id, b.qty]
        );
      }
    }
    await client.query('COMMIT');
    await logAudit(req.user.id, req.user.username, req.user.role, 'edit', `Product: ${name}`, 'Updated product and BOM');
    res.json({ ...rows[0], bom: bom || [] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM products WHERE id=$1 RETURNING *', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    await logAudit(req.user.id, req.user.username, req.user.role, 'delete', `Product: ${rows[0].name}`, 'Deleted');
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Cannot delete product because it is referenced by existing sales.' });
    }
    throw err;
  }
});

module.exports = router;
