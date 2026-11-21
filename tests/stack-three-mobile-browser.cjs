'use strict';
/* Real-browser acceptance for the opt-in cinematic STACK beta.
 * npm run build
 * npm install --no-save playwright@1.56.1
 * npx playwright install chromium
 * node tests/stack-three-mobile-browser.cjs
 *
 * This script is deliberately outside npm test, which runs fast Node-only tests.
 * Saves desktop and mobile screenshots to artifacts/browser/ for inspection.
 */
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const port=43188;
const origin='http://127.0.0.1:'+port;
async function ready(){
  for(let n=0;n<60;n++){
    try{const r=await fetch(origin+'/pilehead/3d-beta.html');if(r.ok)return}catch{}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw Error('STACK beta local server did not start');
}
async function testViewport(browser,width,height,isMobile){
  const context=await browser.newContext({
    viewport:{width,height},isMobile,hasTouch:isMobile,
    deviceScaleFactor:isMobile?2:1,reducedMotion:'reduce'
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto(origin+'/pilehead/3d-beta.html',{waitUntil:'domcontentloaded'});
    await page.locator('[data-do="create"]').waitFor();
    // Make a seeded, valid local game with a six-card hand. This reproduces
    // the crowded state from the Android screenshot without relying on bots
    // or a random first-turn lottery.
    await page.evaluate(() => {
      const E=window.PileheadEngine;
      const g=E.create({players:4,seed:489});
      for(let i=1;i<4;i++)E.autoSetup(g,i);
      E.start(g);g.turn=0;g.startedAt=Date.now()-6000;
      for(let i=0;i<3;i++)g.people[0].hand.push(g.stock.pop());
      E.invariant(g);
      localStorage.setItem('pilehead-playtest-v11',JSON.stringify({
        g,mode:'bots',seats:4,setupSeat:0,covered:false,notice:'',lastMove:null
      }));
    });
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('.table.stack-beta-composed').waitFor();
    await page.locator('.stack-starter-reveal').waitFor({state:'hidden',timeout:9000});
    await page.waitForTimeout(500); // let WebGL/card layout settle; 2D fallback is acceptable.
    const metrics=await page.evaluate(()=>{
      const rect=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
      const table=rect('#app>.table')||rect('.table');
      return {
        viewport:{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth},
        table,header:rect('.layout>.top'),
        deckPicker:rect('.layout>.top .stack-deck-picker'),
        menuButton:rect('.layout>.top .table-menu-toggle'),
        toolbar:rect('#app>.toolbar.table-actions')||rect('.table-actions'),
        hud:rect('#app>.pilehead-table-hud')||rect('.pilehead-table-hud'),
        stock:rect('.table-center'),up:rect('.zone.your-up'),
        hand:rect('.hand-area'),
        toolbarParent:document.querySelector('.table-actions')?.parentElement?.id||'',
        hudParent:document.querySelector('.pilehead-table-hud')?.parentElement?.id||'',
        opponents:[...document.querySelectorAll('.opponent')].map(e=>{
          const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}
        })
      }
    });
    if(isMobile){
      assert(metrics.header&&metrics.header.height<=70,'mobile header should be one row, not '+JSON.stringify(metrics.header));
      if(metrics.deckPicker&&metrics.menuButton) {
        assert(Math.abs(metrics.deckPicker.top-metrics.menuButton.top)<15,'deck picker and menu should share header row');
      }
      assert.equal(metrics.toolbarParent,'app','toolbar must not be inside clipped table');
      assert.equal(metrics.hudParent,'app','turn HUD must sit above table');
      assert(metrics.viewport.scrollWidth<=width+3,'horizontal page overflow '+JSON.stringify(metrics));
      assert(metrics.hud.bottom<=metrics.table.top+6,'HUD overlaps table');
      assert(metrics.stock.bottom<=metrics.up.top+12,'pile overlaps face-up cards');
      assert(metrics.up.bottom<=metrics.hand.top+12,'face-up overlaps hand');
      assert(metrics.hand.bottom<=metrics.table.bottom+2,'hand clipped at table bottom');
      assert(metrics.toolbar.left>=-1&&metrics.toolbar.right<=width+1,'toolbar horizontally clipped');
      assert(metrics.toolbar.top>=-1&&metrics.toolbar.bottom<=height+2,'toolbar outside viewport');
      for(const op of metrics.opponents){
        assert(op.left>=-1&&op.right<=width+2,'opponent outside viewport');
        assert(op.bottom<=metrics.stock.top+12,'opponent overlaps pile');
      }
    }
    const first=page.locator('.hand-area button[data-card]').first();
    await first.click();
    assert.equal(await page.locator('.hand-area button[aria-pressed="true"]').count(),1,'card tap must select exactly one');
    fs.mkdirSync('artifacts/browser',{recursive:true});
    await page.screenshot({path:path.resolve('artifacts/browser/stack-three-beta-'+width+'x'+height+'.png'),fullPage:true});
    assert.deepEqual(errors,[],'browser errors: '+errors.join('; '));
    console.log('PASS 3D beta '+width+'x'+height+' '+(isMobile?'phone':'desktop')+
      (await page.locator('body.stack-3d-ready').count()?' WebGL':' classic fallback'));
  }finally{await context.close()}
}
async function main(){
  const server=spawn(process.execPath,['scripts/render-server.cjs'],{
    env:{...process.env,PORT:String(port)},stdio:'ignore'
  });
  let browser;
  try{
    await ready();browser=await chromium.launch({headless:true});
    for(const [w,h,mobile] of [[360,740,true],[390,844,true],[430,932,true],[1440,900,false]]) {
      await testViewport(browser,w,h,mobile);
    }
  }finally{
    if(browser)await browser.close();
    server.kill('SIGTERM');
  }
}
main().catch(e=>{console.error(e);process.exitCode=1});
