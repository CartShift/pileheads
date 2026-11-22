'use strict';
// Browser acceptance checks. Run from the repository root after npm run build.
// CI: npm install --no-save playwright@1.56.1 && npx playwright install --with-deps chromium
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require('playwright');
const PORT=43177,URL='http://127.0.0.1:'+PORT+'/pilehead/index.html';
async function ready(){
 for(let i=0;i<60;i++){
  try{const response=await fetch(URL);if(response.ok)return}catch{}
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 throw Error('Local STACK server did not start');
}
async function state(page){
 return page.evaluate(()=>JSON.parse(localStorage.getItem('pilehead-playtest-v11')).g);
}
async function stage(page,{seed=489,mode='bots',seat=0,snap=false,finale=false}={}){
 await page.evaluate(({seed,mode,seat,snap,finale})=>{
  const E=globalThis.PileheadEngine,g=E.create({seed,players:2});
  if(mode==='bots')E.autoSetup(g,1);
  E.start(g);g.turn=seat;g.startedAt=Date.now()-5000;
  if(finale){
   g.people[1].hand.push(...g.stock.splice(0));
   g.pile.push(g.people[1].hand.pop());
   g.turn=0;g.limit=null;
  }
  if(snap){
   const rank=6,ids=E.deck().filter(c=>c.rank===rank).slice(0,2).map(c=>c.id);
   const zones=[g.stock,g.pile,g.ashes,...g.people.flatMap(p=>[p.hand,p.up,p.down])];
   const relocate=(dest,id)=>{const z=zones.find(x=>x.some(c=>c.id===id));dest.push(z.splice(z.findIndex(c=>c.id===id),1)[0])};
   relocate(g.pile,ids[0]);relocate(g.people[0].hand,ids[1]);
   g.limit={type:'min',value:6};g.slamOpen=true;
   g.followUp={seat:0,rank,ids:[ids[1]]};
  }
  E.invariant(g);
  localStorage.setItem('pilehead-playtest-v11',JSON.stringify({
   g,mode,seats:2,setupSeat:1,covered:mode==='hotseat',notice:'',lastMove:null}));
 },{seed,mode,seat,snap,finale});
 await page.reload({waitUntil:'domcontentloaded'});
}
async function run(browser,width,height,mobile){
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,
  reducedMotion:'reduce'});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(URL,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('stack-classic')),
   true,'Classic enhancement must be scoped to the local simulator');
  assert.ok(await page.locator('[data-do="create"]').count(),'new game available');
  await page.locator('#seat-count').selectOption('2');
  await page.locator('[data-do="create"]').click();
  assert.ok(await page.locator('[data-do="ready"]').count(),'game setup appeared');
  await page.locator('[data-do="ready"]').click();
  await page.locator('.table').waitFor();
  await stage(page,{mode:'bots',seed:117});
  let before=await state(page);
  assert.equal(before.moves,0);
  assert.equal(await page.locator('.stack-progress-step').count(),3,'three physical card layers are visible');
  assert.equal(await page.locator('.stack-progress-step.is-current strong').innerText(),'In hand');
  const first=page.locator('.hand-area button[data-card]').first();
  await first.click();
  assert.ok(await page.locator('.stack-classic-preview').count(),'selected-card preview is visible');
  assert.ok(await page.locator('.stack-classic-preview').innerText(),'preview is legible');
  assert.equal(await page.locator('.hand-area button[aria-pressed="true"]').count(),1,'tap selects one card');
  await page.locator('[data-play-target]').click({position:{x:9,y:9}});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pilehead-playtest-v11')).g.moves>=1);
  assert.equal((await state(page)).moves,1,'pile click commits selected card');
  // Undo returns the *entire* authoritative local state, including the stock,
  // last action and any bot response. It never constructs a reverse move.
  await page.locator('.playtest-tools summary').click();
  await page.locator('[data-do="undo"]').click();
  assert.deepEqual(await state(page),before,'solo Undo must restore every deterministic card ID and turn');
  await page.locator('#new').click();
  assert.ok(await page.locator('.stack-classic-dialog').count(),'restarting shows a designed confirmation');
  await page.locator('[data-do="cancel-new"]').click();
  assert.deepEqual(await state(page),before,'cancelled restart preserves current game');
  // One-key commands activate exactly the same Play and Take buttons.
  await page.locator('.hand-area button[data-card]').first().click();
  await page.keyboard.press('p');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pilehead-playtest-v11')).g.moves>=1);
  assert.equal((await state(page)).moves,1,'P shortcut submits a validated card play');
  await stage(page,{mode:'bots',seed:119});
  await page.locator('.hand-area button[data-card]').first().dragTo(page.locator('[data-play-target]'));
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pilehead-playtest-v11')).g.moves>=1);
  assert.equal((await state(page)).moves,1,'drag-and-drop commits one card');
  await stage(page,{mode:'hotseat',seat:1,seed:119,snap:true});
  assert.ok(await page.locator('.overlay [data-do="hot-snap"]').count(),'SNAP available without stopping next turn');
  await page.locator('.overlay [data-do="reveal"]').click();
  assert.ok((await page.locator('.pilehead-table-hud .hud-status').innerText()).includes('YOUR TURN'),'shared screen follows the active player');
  before=await state(page);
  assert.equal(before.turn,1);
  await page.locator('[data-do="hot-snap"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pilehead-playtest-v11')).g.moves===1);
  const after=await state(page);
  assert.equal(after.turn,1,'out-of-turn SNAP does not steal next turn');
  assert.equal(after.events.at(-1).reason,'snap');
  assert.equal(await page.locator('.overlay [data-do="reveal"]').count(),0,
   'out-of-turn SNAP must not re-cover the current seat');
  await stage(page,{mode:'bots',seed:3207,finale:true});
  assert.ok(await page.getByText(/FINAL DUEL · Two players remain/).count(),
   'final-duel rule is communicated when it activates');
  const beforePickup=await state(page),lastTop=beforePickup.pile.at(-1).id;
  await page.locator('[data-do="take"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pilehead-playtest-v11')).g.moves===1);
  const afterPickup=await state(page);
  assert.equal(afterPickup.events.at(-1).erodedCount,1,'top card burns before pickup');
  assert.ok(afterPickup.ashes.some(c=>c.id===lastTop),'burned top card reaches ashes');
  assert.ok(!afterPickup.people[0].hand.some(c=>c.id===lastTop),'top card is not handed back');
  // A first-time player can learn in a real two-player bot round, not a modal tutorial.
  await page.evaluate(()=>localStorage.removeItem('pilehead-playtest-v11'));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('[data-do="practice"]').click();
  assert.ok(await page.locator('.stack-practice-setup').count(),'practice explains the real opening-hand swap');
  await page.locator('[data-do="ready"]').click();
  await page.locator('.stack-practice-coach').waitFor();
  assert.ok(await page.locator('.stack-rules-peek summary').count(),'in-game quick rules are available');
  if(mobile){
   assert.equal(await page.locator('.stack-classic-hotkeys').isVisible(),false,
    'keyboard hints do not crowd the phone table');
   const bounds=await page.locator('.stack-classic-progress').boundingBox();
   assert.ok(bounds&&bounds.x>=-2&&bounds.x+bounds.width<=width+2,
    'mobile progress stays inside the viewport');
   const dock=await page.locator('.table-actions').evaluate(el=>getComputedStyle(el).position);
   assert.equal(dock,'fixed','phone actions stay reachable while navigating the table');
   const overlay=await page.evaluate(()=>getComputedStyle(document.querySelector('.stack-rules-peek')).position);
   assert.equal(overlay,'relative','the rules menu anchors to its own summary');
  }
  await page.locator('.stack-starter-reveal').waitFor({state:'hidden'});
  await page.locator('[data-stack-dismiss-coach]').click();
  assert.equal(await page.locator('.stack-practice-coach').count(),0,'coaching can be dismissed');
  assert.ok(errors.length===0,'browser errors: '+errors.join('; '));
  console.log('PASS browser '+width+'x'+height+' '+(mobile?'touch':'desktop')+
   ': premium HUD, layer progress, selection preview, Undo, restart, shortcut, drag, hotseat SNAP/privacy');
 }catch(error){
  fs.mkdirSync('artifacts/browser',{recursive:true});
  await page.screenshot({path:path.resolve('artifacts/browser/failure-'+width+'.png'),fullPage:true}).catch(()=>{});
  throw error;
 }finally{await context.close()}
}
async function main(){
 const child=spawn(process.execPath,['scripts/render-server.cjs'],{env:{...process.env,PORT:String(PORT)},stdio:'ignore'});
 let browser;
 try{
  await ready();
  browser=await chromium.launch({headless:true});
  await run(browser,1280,850,false);
  await run(browser,390,844,true);
  await run(browser,360,740,true);
 }finally{
  if(browser)await browser.close();
  child.kill('SIGTERM');
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
