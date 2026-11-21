'use strict';
/* Manual browser acceptance (not included in fast npm test).
 * Install playwright and Chromium, then:
 * npm run build && node tests/stack-endgame-lab-browser.cjs
 * Captures screenshots in artifacts/browser.
 */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const PORT=43191,BASE='http://127.0.0.1:'+PORT;
async function ready(){
 for(let i=0;i<80;i++){
  try{const r=await fetch(BASE+'/pilehead/endgame-lab.html');if(r.ok)return;}catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 throw Error('Endgame Lab server did not start');
}
async function testMode(browser,rule,width,height){
 const ctx=await browser.newContext({
  viewport:{width,height},hasTouch:width<760,isMobile:width<760,
  deviceScaleFactor:width<760?2:1,reducedMotion:'reduce'
 });
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE+'/pilehead/endgame-lab.html?rule='+rule+'&seed=20261121',{waitUntil:'domcontentloaded'});
  await page.locator('#lab-rule').waitFor();
  assert.equal(await page.locator('#lab-rule').inputValue(),rule);
  const initial=await page.evaluate(()=>{
   localStorage.setItem('pilehead-playtest-v11','untouched-classic');
   return window.PileheadEngine.create({players:3,seed:20261121})
     .people.map(p=>p.hand.map(c=>c.id));
  });
  await page.locator('#seat-count').selectOption('3');
  await page.locator('[data-do="create"]').click();
  const match=await page.evaluate(()=>{
   const g=JSON.parse(localStorage.getItem('pilehead-endgame-lab-v1-'+window.StackEndgameLabMode+'-'+window.StackEndgameLabSeed)).g;
   return {seed:g.seed,rule:g.endgameRule,hand:g.people.map(p=>p.hand.map(c=>c.id)),
     classic:localStorage.getItem('pilehead-playtest-v11')};
  });
  assert.equal(match.seed,20261121);
  assert.equal(match.rule,rule);
  assert.deepEqual(match.hand[0],initial[0],'lab play must have deterministic starter hand');
  assert.equal(match.classic,'untouched-classic');

  // Authoritative local fixture: draw stock exhausted, 3 active players,
  // nonempty pile, and a usable hand. Real click must use the game controller.
  await page.evaluate(()=>{
   const E=window.PileheadEngine;
   const g=E.create({players:3,seed:20261121});
   for(let seat=0;seat<3;seat++)E.autoSetup(g,seat);
   E.start(g);g.turn=0;
   g.people[1].hand.push(...g.stock.splice(0));
   g.pile.push(...g.people[1].hand.splice(0,3));
   E.invariant(g);
   const key='pilehead-endgame-lab-v1-'+window.StackEndgameLabMode+'-'+window.StackEndgameLabSeed;
   localStorage.setItem(key,JSON.stringify({g,mode:'bots',seats:3,setupSeat:0,
     covered:false,notice:'',lastMove:null,practiceMode:false}));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('[data-do="take"]').waitFor({timeout:10000});
  const piles=await page.locator('.table-center .stack').count();
  assert.equal(piles,3,'draw, main pile, burned pile must all exist');
  await page.locator('[data-do="take"]').click();
  const state=await page.evaluate(()=>{
   const key='pilehead-endgame-lab-v1-'+window.StackEndgameLabMode+'-'+window.StackEndgameLabSeed;
   const g=JSON.parse(localStorage.getItem(key)).g;
   return {
    event:g.events.at(-1),pile:g.pile.length,ashes:g.ashes.length,
    conservation:window.PileheadEngine.count(g),
    burnedVisual:document.querySelector('.table-center .stack:last-child')?.textContent,
    classic:localStorage.getItem('pilehead-playtest-v11')
   };
  });
  const expected=rule==='final-burn'?1:0;
  assert.equal(state.event.erodedCount,expected,'erosion must follow activation rule');
  assert.equal(state.event.takenCount,3-expected);
  assert.equal(state.conservation,54);
  assert(state.burnedVisual.includes(expected+' burned'),'visual burned counter must match engine');
  assert.equal(state.classic,'untouched-classic');
  assert.deepEqual(errors,[],'page errors: '+errors.join('; '));
  fs.mkdirSync('artifacts/browser',{recursive:true});
  await page.screenshot({path:path.resolve('artifacts/browser/endgame-'+rule+'-'+width+'.png'),fullPage:true});
  console.log('PASS '+rule+' '+width+'px');
  if(rule==='final-burn'){
   await page.locator('#lab-rule').selectOption('final-duel');
   await page.waitForURL('**/endgame-lab.html?rule=final-duel&seed=20261121');
   assert.equal(await page.locator('#lab-rule').inputValue(),'final-duel','selector preserves deck seed');
  }
 }finally{await ctx.close();}
}
async function main(){
 const server=spawn(process.execPath,['scripts/render-server.cjs'],{
  env:{...process.env,PORT:String(PORT)},stdio:'ignore'});
 let browser;
 try{
  await ready();browser=await chromium.launch({headless:true});
  for(const [rule,width,height] of [
   ['final-burn',390,844],['final-duel',390,844],
   ['final-burn',1440,900],['final-duel',1440,900]
  ]) await testMode(browser,rule,width,height);
 }finally{await browser?.close();server.kill('SIGTERM');}
}
main().catch(e=>{console.error(e);process.exitCode=1});
