const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');
const { logAudit } = require('./audit');

/* ── helpers ── */
async function checkStock(client, productId, qty) {
  const { rows } = await client.query(
    `SELECT p.name, b.qty * $2 AS needed, pt.qty AS have, pt.name AS part_name
     FROM bom b
     JOIN parts pt ON pt.id = b.part_id
     JOIN products p ON p.id = b.product_id
     WHERE b.product_id = $1`,
    [productId, qty]
  );
  const issues = rows.filter(r => r.have < r.needed)
    .map(r => `${r.part_name}: need ${r.needed}, have ${r.have}`);
  return { ok: issues.length === 0, issues };
}

async function deductStock(client, productId, qty) {
  await client.query(
    `UPDATE parts SET qty = parts.qty - (b.qty * $2)
     FROM bom b
     WHERE parts.id = b.part_id AND b.product_id = $1`,
    [productId, qty]
  );
}

async function restoreStock(client, productId, qty) {
  await client.query(
    `UPDATE parts SET qty = parts.qty + (b.qty * $2)
     FROM bom b
     WHERE parts.id = b.part_id AND b.product_id = $1`,
    [productId, qty]
  );
}

/* ── GET all sales ── */
router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT s.*, p.name AS product_name, c.name AS client_name, u.username AS recorded_by_name
    FROM sales s
    LEFT JOIN products p ON p.id = s.product_id
    LEFT JOIN clients c ON c.id = s.client_id
    LEFT JOIN users u ON u.id = s.recorded_by
    ORDER BY s.date DESC, s.id DESC
  `);
  res.json(rows);
});

/* ── POST create sale ── */
router.post('/', auth, async (req, res) => {
  const { date, status } = req.body;
  const product_id = parseInt(req.body.product_id);
  const client_id  = parseInt(req.body.client_id);
  const qty        = parseInt(req.body.qty);
  const price      = parseFloat(req.body.price);

  if (!product_id || !client_id || !qty || isNaN(price))
    return res.status(400).json({ error: 'product_id, client_id, qty, price required' });
  const validStatuses = ['Pending', 'Paid'];
  const saleStatus = validStatuses.includes(status) ? status : 'Pending';

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    let stockDeducted = false;
    if (saleStatus === 'Paid') {
      const stock = await checkStock(dbClient, product_id, qty);
      if (!stock.ok) {
        await dbClient.query('ROLLBACK');
        return res.status(409).json({ error: 'Insufficient stock', issues: stock.issues });
      }
      await deductStock(dbClient, product_id, qty);
      stockDeducted = true;
    }

    const { rows } = await dbClient.query(
      `INSERT INTO sales (date,product_id,client_id,qty,price,status,stock_deducted,recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [date || new Date(), product_id, client_id, qty, price, saleStatus, stockDeducted, req.user.id]
    );
    await dbClient.query('COMMIT');

    const sale = rows[0];
    const { rows: pRows } = await pool.query('SELECT name FROM products WHERE id=$1', [product_id]);
    const { rows: cRows } = await pool.query('SELECT name FROM clients WHERE id=$1', [client_id]);
    await logAudit(req.user.id, req.user.username, req.user.role, 'create', `Sale #${sale.id}`,
      `${pRows[0]?.name} × ${qty} for ${cRows[0]?.name} — ${saleStatus}${stockDeducted ? ' (stock deducted)' : ''}`);

    res.status(201).json(sale);
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

    const { rows } = await dbClient.query(
      'SELECT s.*, p.name AS product_name FROM sales s JOIN products p ON p.id=s.product_id WHERE s.id=$1 FOR UPDATE',
      [req.params.id]
    );
    const sale = rows[0];
    if (!sale) { await dbClient.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }

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
      const stock = await checkStock(dbClient, sale.product_id, sale.qty);
      if (!stock.ok) {
        await dbClient.query('ROLLBACK');
        return res.status(409).json({ error: 'Insufficient stock', issues: stock.issues });
      }
      await deductStock(dbClient, sale.product_id, sale.qty);
      await dbClient.query('UPDATE sales SET status=$1, stock_deducted=true WHERE id=$2', [status, sale.id]);
      detail += ' (stock deducted)';
    } else if (status === 'Refunded' && sale.stock_deducted) {
      await restoreStock(dbClient, sale.product_id, sale.qty);
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
