const router = require('express').Router();
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');
const { generateLabel } = require('../label');

router.get('/sales/:id/label', auth, async (req, res) => {
  try {
    // Fetch sale with product and client
    const { rows: saleRows } = await pool.query(`
      SELECT s.*, p.name AS product_name, p.sku AS product_sku,
             c.name AS client_name, c.company, c.address, c.phone, c.email
      FROM sales s
      JOIN products p ON p.id = s.product_id
      JOIN clients c ON c.id = s.client_id
      WHERE s.id = $1
    `, [req.params.id]);

    if (!saleRows.length) return res.status(404).json({ error: 'Sale not found' });

    const row = saleRows[0];

    // Fetch company settings
    const { rows: settingRows } = await pool.query('SELECT key, value FROM settings');
    const company = {};
    settingRows.forEach(r => { company[r.key] = r.value; });

    const pdf = generateLabel({
      sale: {
        id:   row.id,
        date: row.date,
        qty:  row.qty,
      },
      product: {
        name: row.product_name,
        sku:  row.product_sku,
      },
      client: {
        name:    row.client_name,
        company: row.company,
        address: row.address,
        phone:   row.phone,
        email:   row.email,
      },
      company,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="label_sale_${row.id}.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Label generation failed: ' + err.message });
  }
});

module.exports = router;
