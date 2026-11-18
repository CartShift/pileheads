import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const tests = fs.readdirSync('tests').filter(name => /^pilehead-.*\.cjs$/.test(name)).sort();
if (!tests.length) throw new Error('No STACK tests discovered');
for (const name of tests) {
  console.log('\n> ' + name);
  const result = spawnSync(process.execPath, ['tests/' + name], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('\nAll ' + tests.length + ' STACK test files passed.');
