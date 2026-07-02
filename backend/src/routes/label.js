const router = require('express').Router();
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');
const { generateLabel } = require('../label');

router.get('/sales/:id/label', auth, async (req, res) => {
  try {
    const lang = req.query.lang || 'en';
    
    // Check if postcode column exists
    const { rows: columnCheck } = await pool.query(`
      SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='clients' AND column_name='postcode'
      ) as postcode_exists
    `);
    
    const postcodeExists = columnCheck[0]?.postcode_exists || false;
    
    // Fetch sale with client
    const { rows: saleRows } = await pool.query(`
      SELECT s.*, c.name AS client_name, c.company, c.address, ${postcodeExists ? 'c.postcode' : 'NULL::varchar as postcode'}, c.phone, c.email
      FROM sales s
      JOIN clients c ON c.id = s.client_id
      WHERE s.id = $1
    `, [req.params.id]);

    if (!saleRows.length) return res.status(404).json({ error: 'Sale not found' });

    const sale = saleRows[0];

    // Fetch all items for this sale
    const { rows: items } = await pool.query(`
      SELECT si.*, p.name AS product_name, p.sku
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = $1
    `, [req.params.id]);

    // Fetch company settings
    const { rows: settingRows } = await pool.query('SELECT key, value FROM settings');
    const company = {};
    settingRows.forEach(r => { company[r.key] = r.value; });

    const pdf = generateLabel({
      sale: {
        id:   sale.id,
        date: sale.date,
      },
      items: items.map(item => ({
        name: item.product_name,
        sku: item.sku,
        qty: item.qty,
      })),
      client: {
        name:    sale.client_name,
        company: sale.company,
        address: sale.address,
        postcode: sale.postcode,
        phone:   sale.phone,
        email:   sale.email,
      },
      company,
      lang,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="label_sale_${sale.id}.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Label generation failed: ' + err.message });
  }
});

module.exports = router;
