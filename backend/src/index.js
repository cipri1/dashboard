require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { runMigrations } = require('./db/migrate');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/parts',    require('./routes/parts'));
app.use('/api/products', require('./routes/products'));
app.use('/api/clients',  require('./routes/clients'));
app.use('/api/sales',    require('./routes/sales'));
app.use('/api/label',    require('./routes/label'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/audit',    require('./routes/audit'));
app.use('/api/users',    require('./routes/users'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await runMigrations();
    app.listen(PORT, () => console.log(`API listening on :${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
