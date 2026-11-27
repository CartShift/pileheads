'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {fork}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),port=44295,base='http://127.0.0.1:'+port;
async function main(){
 const server=fork(path.join(root,'scripts/render-server.cjs'),[],{cwd:root,execArgv:['--require',path.join(root,'tests/fixtures/mock-neon-room.cjs')],env:{...process.env,PORT:String(port),PILEHEAD_DATABASE_URL:'postgresql://fake:fake@neon.invalid/profile-browser',PILEHEAD_PLAYER_DATABASE_URL:'',PILEHEAD_PLAYER_SCHEMA_READY:'0',PILEHEAD_PLAYER_ENABLED:'0',PILEHEAD_ACCOUNT_SCHEMA_READY:'0',PILEHEAD_ACCOUNT_ENABLED:'0'},stdio:['ignore','pipe','pipe','ipc']});
 let logs='',browser;
 server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
 try{
  let ready=false;
  for(let i=0;i<100;i++){try{if((await fetch(base+'/livez')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}
  assert.ok(ready,'profile server readiness: '+logs.slice(-1000));
  for(const route of ['/profile','/profile/'])assert.equal((await fetch(base+route)).status,200);
  const inactive=await fetch(base+'/api/player');assert.equal(inactive.status,200);
  assert.deepEqual(await inactive.json(),{enabled:false,profile:null});assert.match(inactive.headers.get('cache-control'),/no-store/);
  const inactiveAccount=await fetch(base+'/api/account');assert.equal(inactiveAccount.status,200);assert.equal((await inactiveAccount.json()).enabled,false);
  const inactiveCallback=await fetch(base+'/api/account/callback',{redirect:'manual'});assert.equal(inactiveCallback.status,303);assert.equal(inactiveCallback.headers.get('location'),'/profile?login=unavailable');
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
    // Enabled account UI contract; simulated provider navigation never hits Google.
    let account=null;const accountActions=[];
    await context.route('**/api/account',async route=>{
     const req=route.request();
     if(req.method()==='POST'){
      const input=req.postDataJSON();
      if(input.action==='history')return route.fulfill({status:account?200:401,contentType:'application/json',body:JSON.stringify(account?{available:true,rounds:[
       {playedAt:'2026-11-27T18:00:00Z',round:2,players:3,humans:2,place:1,rulesVersion:'pilehead-1.7.0',endgameRule:'classic',roundLimit:3},
       {playedAt:'2026-11-26T18:00:00Z',round:1,players:2,humans:2,place:2,rulesVersion:'pilehead-1.7.0',endgameRule:'classic',roundLimit:null}
      ]}:{ok:false})});
      accountActions.push(input.action);
      if(input.action==='login')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({url:'https://accounts.google.com/o/oauth2/v2/auth?state=synthetic'})});
      if(input.action==='preferences'){assert.ok(account);account={...account,name:input.name,deck:input.deck}}
      else if(input.action==='import_guest')account={...account,name:'Guest Copy',deck:'characters'};
      else if(input.action==='logout'||input.action==='delete'){if(input.action==='delete')assert.equal(input.confirm,true);account=null}
      else throw Error('unexpected account mutation');
     }
     await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:true,privacyUrl:base+'/privacy',profile:account})});
    });
    await context.route('https://accounts.google.com/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<html><body>Simulated identity provider</body></html>'}));
    await page.reload();
    const section=page.getByRole('region',{name:'Persistent account'});
    await section.getByRole('button',{name:'Continue with Google'}).click();
    await page.waitForURL('https://accounts.google.com/o/oauth2/v2/auth?state=synthetic');
    account={kind:'account',name:'Player',deck:'refined',expiresAt:'2026-12-27T00:00:00Z'};
    await page.goto(base+'/profile');
    await section.getByLabel('Account nickname').fill('Pile Master');
    await section.getByLabel('Account deck').selectOption('original');
    await section.getByRole('button',{name:'Save account preferences'}).click();
    await section.getByText('Account preferences saved.',{exact:true}).waitFor();
    await page.reload();
    await section.getByLabel('Account nickname').waitFor();
    const savedHistory=section.getByRole('region',{name:'Saved round history'});
    await savedHistory.getByText('Tournament round 2/3',{exact:false}).waitFor();
    assert.equal(await savedHistory.locator('ol li').count(),2);
    assert.ok((await savedHistory.innerText()).includes('2 humans · 1 bot'));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'history fits profile viewport');
    assert.equal(await section.getByLabel('Account nickname').inputValue(),'Pile Master');
    await section.getByRole('button',{name:'Copy guest preferences to account'}).click();
    await page.waitForFunction(()=>document.querySelector('[aria-label="Persistent account"] input')?.value==='Guest Copy');
    await section.getByRole('button',{name:'Play with account preferences'}).click();
    await page.waitForURL('**/play');
    await page.waitForFunction(()=>document.querySelector('input[maxlength="24"]')?.value==='Guest Copy');
    assert.equal(await page.evaluate(()=>localStorage.getItem('stack-next-deck-theme-v1')),'characters');
    await page.getByRole('link',{name:'Your profile',exact:true}).click();
    await section.getByRole('button',{name:'Sign out'}).click();
    await section.getByRole('button',{name:'Continue with Google'}).waitFor();
    account={kind:'account',name:'Guest Copy',deck:'characters',expiresAt:'2026-12-27T00:00:00Z'};
    await page.reload();
    await section.getByRole('button',{name:'Delete account',exact:true}).click();
    await section.getByRole('button',{name:'Cancel account deletion'}).click();
    assert.equal(accountActions.includes('delete'),false);
    await section.getByRole('button',{name:'Delete account',exact:true}).click();
    await section.getByRole('button',{name:'Delete account permanently'}).click();
    await section.getByRole('button',{name:'Continue with Google'}).waitFor();
    assert.deepEqual(accountActions,['login','preferences','import_guest','logout','delete']);
    console.log('PASS account browser UI: '+width+'px, simulated provider, reload, import, apply, logout and delete');
    // Real mocked room server with the opt-in endpoint intercepted as a UI contract.
    // Server authorization and transaction semantics are covered by PostgreSQL CI.
    let linked=false,signedIn=true;const consentActions=[];
    await context.route('**/api/pilehead',async route=>{
     const req=route.request(),input=req.postDataJSON();
     if(['history-status','history-link','history-unlink'].includes(input.action)){
      assert.match(req.headers().authorization||'',/^Bearer [A-Za-z0-9_-]+$/);
      assert.equal(input.round,1);
      if(input.action!=='history-status'){
       assert.equal(input.confirm,true);assert.ok(Number.isInteger(input.revision));
       consentActions.push(input.action);linked=input.action==='history-link';
      }
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,signedIn,linked:signedIn&&linked})});
     }
     const response=await route.fetch(),value=await response.json();
     if(value.game)value.historyAvailable=true;
     await route.fulfill({response,json:value});
    });
    await page.goto(base+'/play');
    await page.getByRole('textbox',{name:'Your name'}).fill('History player');
    await page.getByRole('button',{name:/Create a room/}).click();
    await page.waitForURL(/room=[A-HJ-NP-Z2-9]{8}/);
    await page.getByRole('button',{name:'Settings',exact:true}).click();
    const modal=page.getByRole('dialog',{name:'Game settings'});
    const consent=modal.getByRole('region',{name:'Private round history'});
    await consent.getByRole('button',{name:'Save this round',exact:true}).waitFor();
    assert.deepEqual(consentActions,[],'opening settings must not opt in');
    await consent.getByRole('button',{name:'Save this round',exact:true}).click();
    await consent.getByText('This round is selected for your private history.').waitFor();
    await modal.getByRole('button',{name:'Back to table'}).click();
    await page.getByRole('button',{name:'Settings',exact:true}).click();
    await consent.getByRole('button',{name:'Do not save this round'}).click();
    await consent.getByText('This round is not selected for your account.').waitFor();
    signedIn=false;await consent.getByRole('button',{name:'Refresh history status'}).click();
    await consent.getByText('Sign in on the', {exact:false}).waitFor();
    assert.equal(await consent.getByRole('button',{name:'Save this round',exact:true}).count(),0);
    assert.deepEqual(consentActions,['history-link','history-unlink']);
    console.log('PASS private history UI: '+width+'px, no auto-consent, explicit opt-in/revocation, signed-out state');


   }finally{await context.close()}
  }
 }finally{if(browser)await browser.close();server.kill('SIGTERM')}
}
main().catch(e=>{console.error(e);process.exitCode=1});
