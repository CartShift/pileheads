import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const mode = process.argv[2];
if (!['fast', 'full-core'].includes(mode)) {
  console.error('Usage: node scripts/ci.mjs fast|full-core');
  process.exit(2);
}
function run(command, args) {
  console.log('[CI]', command, ...args);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
const n = (...args) => run(npm, args);
n('ci', '--no-audit', '--no-fund');
n('ci', '--prefix', 'apps/web', '--no-audit', '--no-fund');
n('run', 'typecheck', '--prefix', 'apps/web');
if (mode === 'fast') {
  n('test');
  n('run', 'build:classic');
  for (const file of ['index.html', 'pilehead/index.html', 'pilehead/assets/stack-sheet.webp']) {
    if (!existsSync(resolve(root, 'vercel-static', file))) throw new Error('Missing published asset: ' + file);
  }
  for (const file of ['tilt', 'engine-v5.js']) {
    if (existsSync(resolve(root, 'vercel-static', file))) throw new Error('Unexpected published asset: ' + file);
  }
} else {
  n('run', 'build');
  n('test');
  run(process.execPath, ['tests/stack-single-service.cjs']);
}
