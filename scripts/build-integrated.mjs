import path from 'node:path';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function run(label, command, args, env = process.env) {
  console.log('[PILEHEADS build] ' + label);
  const result = spawnSync(command, args, {cwd: root, stdio: 'inherit', env});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
// Render still uses "npm run build" on its existing service. Install the
// Next UI only when needed; never require a second web service/runtime.
if (!fs.existsSync(path.join(root, 'apps/web/node_modules/next/package.json'))) {
  run('Install Next.js frontend dependencies', npm, ['ci', '--prefix', 'apps/web', '--no-audit', '--no-fund']);
}
run('Publish shared deck, rules and lab assets', process.execPath, ['scripts/build-vercel.mjs']);
// Guarantee same-origin HTTP/WebSocket even if an obsolete env var is
// present in the existing Render service configuration.
run('Export Next.js React tabletop', npm, ['run', 'build', '--prefix', 'apps/web'],
  {...process.env, NEXT_PUBLIC_STACK_API_ORIGIN: ''});
run('Publish the sole Next static export', process.execPath, ['scripts/publish-next.mjs']);
console.log('[PILEHEADS build] Integrated single-Render build completed');
