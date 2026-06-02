const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function ensureReportlab() {
  const check = spawnSync('python3', ['-c', 'import reportlab'], { encoding: 'utf8' });
  if (check.status !== 0) {
    console.log('Installing reportlab...');
    execSync('pip3 install reportlab --break-system-packages --quiet');
  }
}

function generateLabel({ sale, product, client, company }) {
  ensureReportlab();

  const outPath = path.join(os.tmpdir(), `label_sale_${sale.id}_${Date.now()}.pdf`);
  const scriptPath = path.join(__dirname, 'generate_label.py');
  const payload = JSON.stringify({ sale, product, client, company });

  const result = spawnSync('python3', [scriptPath, payload, outPath], {
    encoding: 'utf8',
    timeout: 20000,
  });

  if (result.status !== 0) {
    console.error('Label generation error:', result.stderr);
    throw new Error('Failed to generate label: ' + (result.stderr || 'unknown error'));
  }

  const pdf = fs.readFileSync(outPath);
  try { fs.unlinkSync(outPath); } catch {}
  return pdf;
}

module.exports = { generateLabel };
