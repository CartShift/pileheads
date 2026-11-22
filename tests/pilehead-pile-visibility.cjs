'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../dist/pilehead/engine.js');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
let groups = 0;
const check = (name, fn) => { fn(); groups++; console.log('PASS ' + name); };

check('two-player rooms deal a 52-card deck with no SKIP at any seat', () => {
 for (let seed=1; seed<=40; seed++) {
  const g=E.create({players:2,seed});
  assert.equal(g.omitSkip,true);
  assert.equal(E.effectiveDeck(g).length,52);
  assert.equal(E.count(g),52);
  assert.equal(g.stock.length,34);
  assert.equal([...g.stock,...g.people.flatMap(p=>[...p.hand,...p.up,...p.down])]
    .filter(c=>c.action==='skip').length,0);
  E.invariant(g);
 }
});
check('three-player games keep SKIP and legacy two-player rounds retain old identities', () => {
 const three=E.create({players:3,seed:43});
 assert.equal(three.omitSkip,false);
 assert.equal(E.count(three),54);
 assert.equal(E.effectiveDeck(three).filter(c=>c.action==='skip').length,2);
 const legacy=E.create({players:2,seed:43,omitSkip:false});
 assert.equal(E.count(legacy),54);
 delete legacy.omitSkip; // persisted pre-change games have no flag
 E.invariant(legacy);
 assert.equal(E.effectiveDeck(legacy).length,54);
});
check('both original controllers inspect only the publicly played pile', () => {
 for(const file of ['dist/pilehead/app.js','dist/pilehead/online.js']){
  const code=read(file);
  assert.match(code,/function pileInspector\(/);
  assert.match(code,/pile-inspect-grid/);
  assert.match(code,/data-do="inspect-pile"/);
  assert.match(code,/data-do="close-pile"/);
  assert.match(code,/\.map\(c=>card\(c\)\)/);
  assert.match(code,/function blindOverlay\(/);
  assert.match(code,/pile-blind-reveal/);
  assert.match(code,/is-invalid/);
 }
 const online=read('dist/pilehead/online.js');
 assert.doesNotMatch(online,/blindRevealBanner\(/,'text reveal banner must not duplicate pile reveal');
});
check('the API exposes face-down flips and public pile without the draw deck or opponent hands', () => {
 const code=read('api/pilehead.js');
 assert.match(code,/blindReveal:g\.blindReveal/);
 assert.match(code,/pile:g\.pile/);
 assert.match(code,/omitSkip:g\.omitSkip===true/);
 assert.match(code,/\.\.\.\(i===seat\?\{hand:p\.hand/);
 assert.doesNotMatch(code,/stock:g\.stock/);
});
check('React table renders flip and invalid flash directly on the pile, not a separate banner', () => {
 const code=read('apps/web/components/game-table.tsx');
 assert.match(code,/<MoveTheater gameKey=/);
 const theater=read('apps/web/components/move-theater.tsx');
 assert.match(theater,/move-story-flip/);
  assert.doesNotMatch(theater,/move-story-flight/,'do not duplicate already-committed played cards');
 assert.match(theater,/move-story-impact/);
 assert.match(theater,/move-story-transfer/);
 assert.match(theater,/blind-fail/);
 assert.match(code,/className="react-pile-backdrop"/);
 assert.match(code,/setPileOpen\(true\)/);
 assert.match(code,/g\.pile\.map\(card =>/);
 assert.match(code,/g\.omitSkip/);
 assert.doesNotMatch(code,/className="blind-flip"/);
 assert.match(theater,/event\.type === "blind-fail"/);
  assert.match(theater,/setScene\(null\)/);
  assert.match(theater,/const latest =/);
});
check('shared animations respect reduced motion and serialize invalid flip before pile pickup', () => {
 const css=read('dist/pilehead/table-feedback.css');
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/stack-blind-red/);
 assert.match(css,/pilehead-special-ring/);
 const reactCss=read('apps/web/app/globals.css');
 assert.match(reactCss,/react-blind-redflash/);
 assert.match(reactCss,/react-special-ring/);
 const fx=read('dist/pilehead/immersive.js');
 assert.match(fx,/ev\.type==='blind-fail'\?1220/);
 assert.match(fx,/function specialEffect\(/);
 assert.match(fx,/specialEffect\(table,'dump'/);
});
console.log('STACK pile visibility and two-seat rules: '+groups+' groups passed');
