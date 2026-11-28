import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const playwrightVersion = '1.56.1';
const npmCli = process.env.npm_execpath;
const npm = (...args) => npmCli
  ? [process.execPath, npmCli, ...args]
  : [process.platform === 'win32' ? 'npm.cmd' : 'npm', ...args];
const node = (...args) => [process.execPath, ...args];

const stages = {
  install: [
    npm('ci', '--no-audit', '--no-fund'),
    npm('ci', '--prefix', 'apps/web', '--no-audit', '--no-fund'),
  ],
  fast: [
    npm('run', 'typecheck', '--prefix', 'apps/web'),
    npm('test'),
    npm('run', 'build:shared-assets'),
    'shared-boundaries',
  ],
  build: [npm('run', 'build')],
  'full-core': [
    npm('run', 'typecheck', '--prefix', 'apps/web'),
    npm('run', 'build'),
    npm('test'),
    npm('run', 'test:integrated'),
  ],
  'browser-setup': [
    npm('install', '--no-save', '--no-audit', '--no-fund', 'playwright@' + playwrightVersion),
    npm('exec', '--', 'playwright', 'install', ...(process.platform === 'linux' ? ['--with-deps'] : []), '--only-shell', 'chromium'),
  ],
  'browser-test': [
    node('tests/stack-homepage-browser.cjs'),
    node('tests/stack-pwa-browser.cjs'),
    node('tests/stack-launch-performance.cjs'),
    node('tests/stack-next-browser.cjs'),
    node('tests/stack-player-profile-browser.cjs'),
    node('tests/creative-studio-browser.cjs'),
  ],
};
stages.full = [...stages['full-core'], ...stages['browser-setup'], ...stages['browser-test']];

function checkSharedBoundaries() {
  for (const name of ['pilehead/playtest.html', 'pilehead/assets/stack-sheet.webp']) {
    const file = path.join(root, 'vercel-static', name);
    if (!existsSync(file) || !statSync(file).isFile()) throw new Error('Missing shared file: ' + name);
  }
  for (const name of ['pilehead/index.html', 'pilehead/app.js', 'tilt', 'engine-v5.js']) {
    if (existsSync(path.join(root, 'vercel-static', name))) throw new Error('Unexpected legacy output: ' + name);
  }
}

const args = process.argv.slice(2);
const mode = args.shift();
if (!Object.hasOwn(stages, mode) || args.some(arg => arg !== '--plan')) {
  console.error('Usage: npm run ci:' + Object.keys(stages).join(' | ci:') + ' [-- --plan]');
  process.exit(2);
}
for (const step of stages[mode]) {
  console.log('[PILEHEADS CI] ' + (typeof step === 'string' ? step : step.join(' ')));
  if (args.includes('--plan')) continue;
  if (step === 'shared-boundaries') {
    checkSharedBoundaries();
    continue;
  }
  const [command, ...commandArgs] = step;
  // Exercise the flagged PWA only in CI's isolated integrated build.
  // Normal npm run build (Vercel/Render) retains the default-off flag.
  const pwaTestBuild = ['build','full-core','full'].includes(mode) && commandArgs.slice(-2).join(' ') === 'run build';
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, CI: 'true', NEXT_TELEMETRY_DISABLED: '1', ...(pwaTestBuild ? {NEXT_PUBLIC_PILEHEADS_PWA:'1'} : {}) },
    shell: process.platform === 'win32' && command === 'npm.cmd',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
