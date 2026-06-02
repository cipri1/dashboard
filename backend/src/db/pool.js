const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'db',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'manufacturing',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

pool.on('error', (err) => {
  console.error('Unexpected DB error', err);
});

module.exports = pool;
