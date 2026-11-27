'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {fork}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),port=44295,base='http://127.0.0.1:'+port;
async function main(){
 const server=fork(path.join(root,'scripts/render-server.cjs'),[],{cwd:root,env:{...process.env,PORT:String(port),PILEHEAD_DATABASE_URL:'',PILEHEAD_PLAYER_DATABASE_URL:'',PILEHEAD_PLAYER_SCHEMA_READY:'0',PILEHEAD_PLAYER_ENABLED:'0'},stdio:['ignore','pipe','pipe','ipc']});
 let logs='',browser;
 server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
 try{
  let ready=false;
  for(let i=0;i<100;i++){try{if((await fetch(base+'/livez')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}
  assert.ok(ready,'profile server readiness: '+logs.slice(-1000));
  for(const route of ['/profile','/profile/'])assert.equal((await fetch(base+route)).status,200);
  const inactive=await fetch(base+'/api/player');assert.equal(inactive.status,200);
  assert.deepEqual(await inactive.json(),{enabled:false,profile:null});assert.match(inactive.headers.get('cache-control'),/no-store/);
  browser=await chromium.launch({headless:true});
  for(const width of [360,1280]){
   const context=await browser.newContext({viewport:{width,height:844},isMobile:width===360,hasTouch:width===360});
   try{
    const page=await context.newPage();
    await page.goto(base+'/play');
    await page.getByRole('link',{name:'Your profile',exact:true}).click();
    await page.getByText('Guest profiles are not available yet. You can still play for free.').waitFor();
    assert.equal(await page.getByRole('button',{name:'Create guest profile'}).count(),0);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'profile must not overflow');
    // UI contract only. Mock enabled profile API while the actual server remains disabled.
    let profile=null;const actions=[];
    await context.route('**/api/player',async route=>{
     const req=route.request();
     if(req.method()==='POST'){
      const input=req.postDataJSON();actions.push(input);
      if(input.action==='create')profile={kind:'guest',name:'Player',deck:'refined',expiresAt:'2027-02-25T00:00:00Z'};
      else if(input.action==='preferences'){assert.ok(profile);profile={...profile,name:input.name,deck:input.deck}}
      else if(input.action==='delete')profile=null;
      else throw Error('unexpected profile mutation');
     }
     await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:true,privacyUrl:base+'/privacy',profile})});
    });
    await page.reload();
    await page.getByRole('button',{name:'Create guest profile'}).waitFor();
    assert.equal(actions.length,0,'opening profile must not create data');
    await page.getByRole('button',{name:'Create guest profile'}).click();
    await page.getByLabel('Nickname').fill('Card Shark');
    await page.getByLabel('Favorite deck').selectOption('original');
    await page.getByRole('button',{name:'Save profile'}).click();
    await page.getByText('Profile saved.',{exact:true}).waitFor();
    assert.deepEqual(actions[1],{action:'preferences',name:'Card Shark',deck:'original'});
    await page.reload();await page.getByLabel('Nickname').waitFor();
    assert.equal(await page.getByLabel('Nickname').inputValue(),'Card Shark');
    assert.equal(await page.getByLabel('Favorite deck').inputValue(),'original');
    await page.getByRole('button',{name:'Play with saved preferences'}).click();
    await page.waitForURL('**/play');
    await page.waitForFunction(()=>document.querySelector('input[maxlength="24"]')?.value==='Card Shark');
    assert.equal(await page.evaluate(()=>localStorage.getItem('stack-next-deck-theme-v1')),'original');
    await page.getByRole('link',{name:'Your profile',exact:true}).click();
    await page.getByRole('button',{name:'Delete profile',exact:true}).click();
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    assert.equal(actions.length,2,'cancel must not delete');
    await page.getByRole('button',{name:'Delete profile',exact:true}).click();
    await page.getByRole('button',{name:'Delete profile permanently'}).click();
    await page.getByRole('button',{name:'Create guest profile'}).waitFor();
    assert.deepEqual(actions.map(x=>x.action),['create','preferences','delete']);
    console.log('PASS profile browser UI: '+width+'px, optional, preferences, reload, apply, delete');
   }finally{await context.close()}
  }
 }finally{if(browser)await browser.close();server.kill('SIGTERM')}
}
main().catch(e=>{console.error(e);process.exitCode=1});
