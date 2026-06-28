const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');
const { logAudit } = require('./audit');

/* ── helpers ── */
async function checkStock(client, productId, qty) {
  const { rows } = await client.query(
    `SELECT p.name, p.qty AS have
     FROM products p
     WHERE p.id = $1`,
    [productId]
  );
  const product = rows[0];
  if (!product) return { ok: false, issues: ['Product not found'] };
  const issues = product.have < qty ? [`${product.name}: need ${qty}, have ${product.have}`] : [];
  return { ok: issues.length === 0, issues };
}

async function deductStock(client, productId, qty) {
  await client.query(
    'UPDATE products SET qty = qty - $2 WHERE id = $1',
    [productId, qty]
  );
}

async function restoreStock(client, productId, qty) {
  await client.query(
    'UPDATE products SET qty = qty + $2 WHERE id = $1',
    [productId, qty]
  );
}

/* ── GET all sales ── */
router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT s.id, s.date, s.client_id, s.status, s.stock_deducted, s.recorded_by, s.created_at,
           c.name AS client_name, u.username AS recorded_by_name,
           json_agg(json_build_object('id', si.id, 'product_id', si.product_id, 'product_name', p.name, 'qty', si.qty, 'price', si.price)) AS items
    FROM sales s
    LEFT JOIN sale_items si ON si.sale_id = s.id
    LEFT JOIN products p ON p.id = si.product_id
    LEFT JOIN clients c ON c.id = s.client_id
    LEFT JOIN users u ON u.id = s.recorded_by
    GROUP BY s.id, c.id, u.id
    ORDER BY s.date DESC, s.id DESC
  `);
  res.json(rows);
});

/* ── POST create sale ── */
router.post('/', auth, async (req, res) => {
  const { date, status, client_id } = req.body;
  let items = req.body.items; // Array of {product_id, qty, price}
  
  // Handle backward compatibility: if single product is sent
  if (!items && req.body.product_id) {
    items = [{
      product_id: parseInt(req.body.product_id),
      qty: parseInt(req.body.qty),
      price: parseFloat(req.body.price)
    }];
  }

  const client_id_int = parseInt(client_id);
  if (!client_id_int || !items || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'client_id and items array required' });

  const validStatuses = ['Pending', 'Paid'];
  const saleStatus = validStatuses.includes(status) ? status : 'Pending';

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    // Create sale
    const { rows: saleRows } = await dbClient.query(
      `INSERT INTO sales (date, client_id, status, stock_deducted, recorded_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [date || new Date(), client_id_int, saleStatus, false, req.user.id]
    );
    const sale = saleRows[0];

    // Add items and check stock
    let stockDeducted = false;
    const allItems = [];
    
    for (const item of items) {
      const product_id = parseInt(item.product_id);
      const qty = parseInt(item.qty);
      const price = parseFloat(item.price);

      if (!product_id || !qty || isNaN(price)) {
        await dbClient.query('ROLLBACK');
        return res.status(400).json({ error: 'Each item requires product_id, qty, price' });
      }

      const stock = await checkStock(dbClient, product_id, qty);
      if (!stock.ok) {
        await dbClient.query('ROLLBACK');
        return res.status(409).json({ error: 'Insufficient stock', issues: stock.issues });
      }

      if (saleStatus === 'Paid') {
        await deductStock(dbClient, product_id, qty);
        stockDeducted = true;
      }

      const { rows: itemRows } = await dbClient.query(
        `INSERT INTO sale_items (sale_id, product_id, qty, price)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [sale.id, product_id, qty, price]
      );
      allItems.push(itemRows[0]);
    }

    // Update stock_deducted flag
    if (stockDeducted) {
      await dbClient.query('UPDATE sales SET stock_deducted=$1 WHERE id=$2', [true, sale.id]);
    }

    await dbClient.query('COMMIT');

    // Log audit
    const { rows: cRows } = await pool.query('SELECT name FROM clients WHERE id=$1', [client_id_int]);
    const itemSummary = items.map((it, i) => {
      const product = allItems[i];
      return `${product.product_id} × ${product.qty}`;
    }).join(', ');
    await logAudit(req.user.id, req.user.username, req.user.role, 'create', `Sale #${sale.id}`,
      `${itemSummary} for ${cRows[0]?.name} — ${saleStatus}${stockDeducted ? ' (stock deducted)' : ''}`);

    res.status(201).json({ ...sale, items: allItems });
  } catch (err) {
    await dbClient.query('ROLLBACK');
    throw err;
  } finally {
    dbClient.release();
  }
});

/* ── PATCH update status ── */
router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  const allowed = ['Paid', 'Aborted', 'Refunded'];
  if (!allowed.includes(status))
    return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    const { rows: saleRows } = await dbClient.query(
      'SELECT * FROM sales WHERE id=$1 FOR UPDATE',
      [req.params.id]
    );
    const sale = saleRows[0];
    if (!sale) { await dbClient.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }

    // Get all items for this sale
    const { rows: items } = await dbClient.query(
      'SELECT * FROM sale_items WHERE sale_id=$1',
      [sale.id]
    );

    // Validate transitions
    const from = sale.status;
    const validTransitions = {
      Pending:  ['Paid', 'Aborted'],
      Paid:     ['Refunded'],
      Aborted:  [],
      Refunded: [],
    };
    if (!validTransitions[from]?.includes(status)) {
      await dbClient.query('ROLLBACK');
      return res.status(409).json({ error: `Cannot transition from ${from} to ${status}` });
    }

    let detail = `${from} → ${status}`;

    if (status === 'Paid' && !sale.stock_deducted) {
      // Check stock for all items
      for (const item of items) {
        const stock = await checkStock(dbClient, item.product_id, item.qty);
        if (!stock.ok) {
          await dbClient.query('ROLLBACK');
          return res.status(409).json({ error: 'Insufficient stock', issues: stock.issues });
        }
      }
      // Deduct stock for all items
      for (const item of items) {
        await deductStock(dbClient, item.product_id, item.qty);
      }
      await dbClient.query('UPDATE sales SET status=$1, stock_deducted=true WHERE id=$2', [status, sale.id]);
      detail += ' (stock deducted)';
    } else if (status === 'Refunded' && sale.stock_deducted) {
      // Restore stock for all items
      for (const item of items) {
        await restoreStock(dbClient, item.product_id, item.qty);
      }
      await dbClient.query('UPDATE sales SET status=$1, stock_deducted=false WHERE id=$2', [status, sale.id]);
      detail += ' (stock restored)';
    } else {
      await dbClient.query('UPDATE sales SET status=$1 WHERE id=$2', [status, sale.id]);
    }

    await dbClient.query('COMMIT');
    await logAudit(req.user.id, req.user.username, req.user.role, 'status', `Sale #${sale.id}`, detail);

    const { rows: updated } = await pool.query('SELECT * FROM sales WHERE id=$1', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    await dbClient.query('ROLLBACK');
    throw err;
  } finally {
    dbClient.release();
  }
});

/* ── DELETE (admin only, locked sales) ── */
router.delete('/:id', auth, adminOnly, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM sales WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  if (rows[0].stock_deducted)
    return res.status(409).json({ error: 'Cannot delete a sale with deducted stock. Refund it first.' });
  await pool.query('DELETE FROM sales WHERE id=$1', [req.params.id]);
  await logAudit(req.user.id, req.user.username, req.user.role, 'delete', `Sale #${req.params.id}`, 'Deleted');
  res.json({ ok: true });
});

module.exports = router;
