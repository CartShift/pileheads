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
async function stage(page,{seed=489,mode='bots',seat=0,snap=false}={}){
 await page.evaluate(({seed,mode,seat,snap})=>{
  const E=globalThis.PileheadEngine,g=E.create({seed,players:2});
  if(mode==='bots')E.autoSetup(g,1);
  E.start(g);g.turn=seat;g.startedAt=Date.now()-5000;
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
 },{seed,mode,seat,snap});
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
  assert.ok(await page.locator('[data-do="create"]').count(),'new game available');
  await page.locator('#seat-count').selectOption('2');
  await page.locator('[data-do="create"]').click();
  assert.ok(await page.locator('[data-do="ready"]').count(),'game setup appeared');
  await page.locator('[data-do="ready"]').click();
  await page.locator('.table').waitFor();
  await stage(page,{mode:'bots',seed:117});
  let before=await state(page);
  assert.equal(before.moves,0);
  const first=page.locator('.hand-area button[data-card]').first();
  await first.click();
  assert.equal(await page.locator('.hand-area button[aria-pressed="true"]').count(),1,'tap selects one card');
  await page.locator('[data-play-target]').click({position:{x:9,y:9}});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pilehead-playtest-v11')).g.moves>=1);
  assert.equal((await state(page)).moves,1,'pile click commits selected card');
  await stage(page,{mode:'bots',seed:119});
  await page.locator('.hand-area button[data-card]').first().dragTo(page.locator('[data-play-target]'));
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pilehead-playtest-v11')).g.moves>=1);
  assert.equal((await state(page)).moves,1,'drag-and-drop commits one card');
  await stage(page,{mode:'hotseat',seat:1,seed:119,snap:true});
  assert.ok(await page.locator('.overlay [data-do="hot-snap"]').count(),'SNAP available without stopping next turn');
  await page.locator('.overlay [data-do="reveal"]').click();
  assert.ok((await page.locator('.pitch h1').innerText()).includes('Player 2'),'view follows actual turn');
  before=await state(page);
  assert.equal(before.turn,1);
  await page.locator('[data-do="hot-snap"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pilehead-playtest-v11')).g.moves===1);
  const after=await state(page);
  assert.equal(after.turn,1,'out-of-turn SNAP does not steal next turn');
  assert.equal(after.events.at(-1).reason,'snap');
  assert.ok(errors.length===0,'browser errors: '+errors.join('; '));
  console.log('PASS browser '+width+'x'+height+' '+(mobile?'touch':'desktop')+
   ': deal, tap/pile, drag, hotseat SNAP/turn/privacy');
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
