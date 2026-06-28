const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../../migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('Migrations directory not found, skipping migrations');
    return;
  }

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    try {
      await pool.query(sql);
      console.log(`✓ Migration: ${file}`);
    } catch (err) {
      // Ignore errors about columns/tables that already exist
      if (err.message && (err.message.includes('already exists') || err.message.includes('duplicate'))) {
        console.log(`→ Migration ${file}: ${err.message}`);
      } else {
        console.error(`✗ Migration failed: ${file}`, err.message);
        throw err;
      }
    }
  }
}

module.exports = { runMigrations };
