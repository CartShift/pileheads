'use strict';
/* Opt-in visual + interaction QA for STACK Tabletop Studio.
 * npm run build
 * npm install --no-save playwright@1.56.1
 * npx playwright install chromium
 * node tests/tabletop-studio-browser.cjs
 */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const PORT=43192;
const URL='http://127.0.0.1:'+PORT+'/pilehead/tabletop-studio.html';
async function waitForServer(){
 for(let i=0;i<75;i++){
   try{const res=await fetch(URL);if(res.ok)return;}catch{}
   await new Promise(resolve=>setTimeout(resolve,200));
 }
 throw Error('Local Render-compatible STACK static server is unavailable');
}
async function run(browser,width,height,isMobile){
 const context=await browser.newContext({viewport:{width,height},isMobile,hasTouch:isMobile,
   reducedMotion:'reduce',deviceScaleFactor:isMobile?2:1});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
   await page.goto(URL,{waitUntil:'domcontentloaded'});
   await page.locator('[data-do="create"]').waitFor();
   // Reproduce the actual customer failure: seven real cards in the pile.
   // Previously their CSS wrappers had width:0, Three.js skipped the cards,
   // and the game incorrectly LOOKED empty despite reporting "7 cards".
   await page.evaluate(() => {
     const E=window.PileheadEngine;
     const g=E.create({players:4,seed:20261121});
     for(let i=0;i<4;i++)E.autoSetup(g,i);
     E.start(g);g.turn=0;
     const placed=g.stock.splice(0,7);
     const numberIndex=placed.findIndex(c=>c.kind==='number');
     if(numberIndex<0)throw Error('Seed did not draw a numeric pile top');
     [placed[numberIndex],placed[6]]=[placed[6],placed[numberIndex]];
     g.pile.push(...placed);
     g.limit={type:'min',value:g.pile[g.pile.length-1].rank};
     E.invariant(g);
     localStorage.setItem('pilehead-playtest-v11',JSON.stringify({
       g,mode:'bots',seats:4,setupSeat:0,covered:false,notice:'',lastMove:null
     }));
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('.table.v3-ready').waitFor({timeout:10000});
   await page.locator('.stack-starter-reveal').waitFor({state:'hidden',timeout:9000});
   await page.waitForTimeout(450);
   const result=await page.evaluate(()=>{
     const get=sel=>{
       const el=document.querySelector(sel);
       if(!el)return null;
       const r=el.getBoundingClientRect();
       return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};
     };
     return {
       vw:innerWidth,scrollWidth:document.documentElement.scrollWidth,
       header:get('.layout>.top'),hud:get('.v3-topline .pilehead-table-hud'),
       room:get('.v3-room'),table:get('.v3-room .table'),
       opponents:get('.v3-room .opponents'),
       center:get('.v3-room .table-center'),up:get('.v3-room .zone.your-up'),
       hand:get('.v3-room .hand-area'),
       actions:get('.v3-controls'),canvas:get('.stack-beta-three-canvas'),
       canvases:document.querySelectorAll('.stack-beta-three-canvas').length,
       cardCount:document.querySelectorAll('.table .card.ph-card').length,
       statusColor:(()=>{const el=document.querySelector('.v3-topline .hud-status');return el?getComputedStyle(el).color:null;})(),
       studioV4:document.body.classList.contains('stack-tabletop-v4'),
       standalone:!!document.querySelector('.stack-tabletop-v3 .v3-shell'),
       semanticPlay:!!document.querySelector('[data-play-target="pile"]'),
       pile:(()=>{
         const e=document.querySelector('.stack[data-play-target] .pile-card');
         const wrap=e?.querySelector('.card-wrap:last-child');
         const card=wrap?.querySelector('.card.ph-card');
         if(!card||!wrap)return null;
         const r=card.getBoundingClientRect(),w=wrap.getBoundingClientRect();
         const pileRect=e.getBoundingClientRect();
         const style=getComputedStyle(card);
         return {
           count:e.querySelectorAll('.card-wrap').length,
           width:r.width,height:r.height,
           wrapperWidth:w.width,wrapperHeight:w.height,
           withinPile:Math.abs((r.left+r.right)/2-(pileRect.left+pileRect.right)/2)<pileRect.width*.75,
           visible:style.display!=='none'&&style.visibility!=='hidden',
           domFallback:document.querySelector('.table')?.classList.contains('studio-pile-2d')
         };
       })(),
       webgl:document.body.classList.contains('stack-3d-ready')
     };
   });
   assert(result.standalone,'dedicated tabletop composition mounted');
   assert(result.studioV4,'new independent Studio v4 styling must be active');
   assert(result.statusColor!=='rgb(15, 44, 34)'&&result.statusColor!=='rgb(19, 56, 39)',
     'status label must remain readable on dark background');
   assert(result.semanticPlay,'canonical card play target still present');
   assert(result.pile && result.pile.count===4,'seven-card pile must have four top DOM card wrappers');
   assert(result.pile.width>=45&&result.pile.height>=65,
     'nonempty pile card collapsed and would vanish in Three.js '+JSON.stringify(result.pile));
   assert(result.pile.wrapperWidth>=45&&result.pile.wrapperHeight>=65,
     'pile wrapper must have explicit nonzero size '+JSON.stringify(result.pile));
   assert(result.pile.visible&&result.pile.withinPile,
     'visible top pile card must sit inside physical pile area '+JSON.stringify(result.pile));
   assert(result.cardCount>=7,'table has real draw/pile/face-up/hand cards');
   assert(result.vw+2>=result.scrollWidth,'horizontal overflow '+JSON.stringify(result));
   assert(result.hud&&result.table,'table and authoritative HUD visible');
   if(isMobile){
     assert(result.header.height<85,'phone header too tall');
     assert(result.hud.bottom<=result.table.top+6,'HUD covers opponents');
     const areas=[result.opponents,result.center,result.up,result.hand];
     for(let i=0;i<areas.length-1;i++)
       assert(areas[i].bottom<=areas[i+1].top+8,'card zones collide '+i+' '+JSON.stringify(areas));
     assert(result.hand.bottom<=result.table.bottom+2,'hand clipped below physical table');
     assert(result.hand.bottom<=result.actions.top+4,'fixed action dock covers the hand');
     assert(result.actions.left>=-2&&result.actions.right<=width+2,'action dock clipped sideways');
     assert(result.actions.bottom<=height+2,'action dock not reachable at bottom of viewport');
   }
   const first=page.locator('.hand-area button[data-card]').first();
   await first.click();
   assert.equal(await page.locator('.hand-area button[aria-pressed="true"]').count(),1,
     'tapping a real card selects it');
   const out='artifacts/browser/tabletop-studio-'+width+'x'+height+'.png';
   fs.mkdirSync(path.dirname(out),{recursive:true});
   await page.screenshot({path:path.resolve(out),fullPage:true});
   assert.deepEqual(errors,[],'browser console errors: '+errors.join('; '));
   console.log('PASS Tabletop Studio '+width+'x'+height+(result.webgl?' (Three.js)':' (2D fallback)'));
 }catch(error){
   fs.mkdirSync('artifacts/browser',{recursive:true});
   await page.screenshot({path:'artifacts/browser/studio-failure-'+width+'.png',fullPage:true}).catch(()=>{});
   throw error;
 }finally{await context.close();}
}
async function main(){
 const child=spawn(process.execPath,['scripts/render-server.cjs'],{
   env:{...process.env,PORT:String(PORT)},stdio:'ignore'});
 let browser;
 try{
  await waitForServer();
  browser=await chromium.launch({headless:true});
  for(const [width,height,mobile] of [[360,740,true],[390,844,true],[430,932,true],[1440,900,false]]){
   await run(browser,width,height,mobile);
  }
 }finally{await browser?.close();child.kill('SIGTERM');}
}
main().catch(e=>{console.error(e);process.exitCode=1});
