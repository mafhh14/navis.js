/**
 * Run all Navis.js verification scripts
 * v6.0: Unified test runner
 */

const { spawnSync } = require('child_process');
const path = require('path');

const scripts = [
  'verify-v5.8.3.js',
  'verify-v5.9.js',
  'verify-v6.0.js',
];

let failed = 0;

console.log('Running Navis.js verification suite...\n');

for (const script of scripts) {
  const scriptPath = path.join(__dirname, script);
  console.log(`> node scripts/${script}`);
  const result = spawnSync(process.execPath, [scriptPath], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });

  if (result.status !== 0) {
    failed += 1;
  }

  console.log('');
}

if (failed > 0) {
  console.error(`Verification failed (${failed} suite(s)).`);
  process.exit(1);
}

console.log('All verification suites passed.');
