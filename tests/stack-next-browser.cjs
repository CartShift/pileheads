"use strict";
/**
 * Production Next React tabletop acceptance, with a real Node/WebSocket
 * backend and isolated deterministic mock Neon.
 */
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { fork } = require("node:child_process");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const WEB_PORT = 44291;
const WEB = "http://127.0.0.1:" + WEB_PORT;
const API = WEB; // One Render Node runtime hosts Next static pages, API and WebSocket.
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitReady(url, logs) {
  for (let attempt = 0; attempt < 120; attempt++) {
    try { const response = await fetch(url); if (response.ok) return; } catch {}
    await sleep(200);
  }
  throw Error("Server did not start: " + url + "\n" + logs().slice(-5000));
}
function readGame(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("stack-next-local-save-v1") || "null")?.game);
}

async function endgameSettingsAndBridge(browser) {
  const Engine = require("../dist/pilehead/engine.js");
  // Never rely on a random deal to expose a rare final-hand + face-up bridge.
  const g = Engine.create({players:2,seed:852239,endgameRule:"classic"});
  Engine.autoSetup(g,1);
  Engine.start(g);
  g.ashes.push(...g.stock.splice(0));
  const p = g.people[0];
  const first = p.hand[0];
  g.ashes.push(...p.hand.splice(1));
  const sameFace = c => c.kind === first.kind &&
    (c.kind === "number" ? c.rank === first.rank : c.action === first.action);
  if (!sameFace(p.up[0])) {
    const zones = [g.ashes, g.pile, p.up, p.down,
      g.people[1].hand, g.people[1].up, g.people[1].down];
    let swapped = false;
    for (const zone of zones) {
      const index = zone.findIndex(sameFace);
      if (index < 0) continue;
      [p.up[0],zone[index]]=[zone[index],p.up[0]];
      swapped = true;
      break;
    }
    assert.ok(swapped, "must find matching face-up number/action for bridge fixture");
  }
  g.turn=0;
  Engine.invariant(g);
  const context=await browser.newContext({
    viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:"reduce"
  });
  await context.addInitScript(data=>{
    localStorage.setItem("stack-next-local-save-v1",JSON.stringify({version:1,game:data}));
  },g);
  const page=await context.newPage();
  try {
    await page.goto(WEB + "/play");
    await page.getByRole("button",{name:"Resume game"}).click();
    const faceup=page.locator(".faceup-row .visible-up .card-hit");
    const expectedBridgeCards = p.up.filter(sameFace).length;
    assert.equal(await faceup.count(),expectedBridgeCards,
      "only genuinely matching face-up cards can be selected for a bridge");
    await faceup.first().click();
    assert.equal(await page.locator(".player-hand .playing-card.is-selected").count(),1,
      "selecting a face-up bridge automatically selects the entire last hand");
    assert.equal(await page.locator(".faceup-row .playing-card.is-selected").count(),1);
    await page.getByRole("button",{name:/Play cards/}).click();
    await page.waitForFunction(() => JSON.parse(
      localStorage.getItem("stack-next-local-save-v1") || "null")?.game?.moves>=1);
    assert.notEqual((await readGame(page)).people[0].hand.length,1,
      "final hand and face-up bridge must resolve as one legal engine move");
    console.log("PASS Next Classic parity: last-hand plus face-up card bridge is playable");
  } finally {await context.close()}

  const standard=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const regular=await standard.newPage();
  try {
    await regular.goto(WEB + "/play");
    await regular.getByRole("button",{name:"Game settings"}).click();
    const settings=regular.getByRole("dialog",{name:"Game settings"});
    const input=settings.getByRole("checkbox");
    assert.equal(await input.isChecked(),false,"Final Duel defaults OFF in clean local storage");
    await input.check();
    await settings.getByRole("button",{name:"Done"}).click();
    await regular.getByRole("button",{name:/Start game/}).click();
    assert.equal((await readGame(regular)).endgameRule,"final-duel",
      "chosen Final Duel rule must be in actual local engine state");
    await regular.getByRole("button",{name:"Settings"}).click();
    const inMatch=regular.getByRole("dialog",{name:"Game settings"}).getByRole("checkbox");
    assert.equal(await inMatch.isChecked(),true);
    await inMatch.uncheck();
    assert.equal((await readGame(regular)).endgameRule,"classic",
      "setup settings must update current match, not only future preference");
    await regular.getByRole("button",{name:"Back to table"}).click();
    await regular.getByRole("button",{name:"Start round"}).click();
    await regular.getByRole("button",{name:"Settings"}).click();
    assert.equal(await regular.getByRole("dialog",{name:"Game settings"})
      .getByRole("checkbox").isDisabled(),true,"live round rules must be locked");
    await regular.reload();
    await regular.getByRole("button",{name:"Resume game"}).click();
    assert.equal((await readGame(regular)).endgameRule,"classic",
      "saved games preserve the rule last selected during setup");
    console.log("PASS Next Settings: default OFF, opt-in, setup changes, round lock and persistence");
  } finally {await standard.close()}
}

async function sameOriginNavigation(browser) {
  const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page = await context.newPage();
  try {
    await page.goto(WEB + "/stack", {waitUntil:"domcontentloaded"});
    await page.getByRole("link",{name:/Enter the table/}).click();
    await page.getByRole("button",{name:/Start game/}).waitFor();
    assert.equal(new URL(page.url()).pathname,"/play","Next landing should lead to the real playable table");
    await page.locator(".game-header .logo").click();
    await page.getByRole("heading",{name:/Play your cards/}).waitFor();
    assert.equal(new URL(page.url()).pathname,"/stack","logo returns to Next landing, not Classic redirect");
    const classic=page.getByRole("link",{name:/Original Classic/});
    assert.equal(new URL(await classic.getAttribute("href"), WEB).pathname,
      "/pilehead/index.html","Classic remains available on same origin");
    console.log("PASS one-server Next route transitions: /stack → /play → /stack, Classic link preserved");
  } finally { await context.close(); }
}
async function localScenarios(browser) {
  for (const device of [
    { width: 1280, height: 860, mobile: false },
    { width: 390, height: 844, mobile: true },
    { width: 360, height: 740, mobile: true }
  ]) {
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      isMobile: device.mobile, hasTouch: device.mobile, reducedMotion: "reduce"
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      await page.goto(WEB + "/play", { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Learn with a bot" }).click();
      await page.getByRole("button", { name: "Start round" }).click();
      await page.getByRole("heading", { name: "Your move." }).waitFor({ timeout: 10000 });
      const hand = page.locator(".player-hand .card-hit");
      assert.equal(await hand.count(), 3, "opening hand holds three cards");
      // DUMP intentionally asks for a target in 3+ player matches. Avoid
      // assuming that the first randomly dealt card is a simple immediate play.
      const safeFirst = page.locator('.player-hand .card-hit:not([aria-label^="DUMP"])').first();
      await safeFirst.click();
      const play = page.getByRole("button", { name: /Play cards/ });
      assert.equal(await play.isEnabled(), true, "first opening card is legal");
      await play.click();
      await page.waitForFunction(() =>
        JSON.parse(localStorage.getItem("stack-next-local-save-v1") || "null")?.game?.moves >= 1
      );
      await page.getByRole("button", { name: "Undo" }).click();
      await page.waitForFunction(() =>
        JSON.parse(localStorage.getItem("stack-next-local-save-v1") || "null")?.game?.moves === 0
      );
      assert.equal((await readGame(page)).moves, 0, "Undo restores previous turn");
      // Drag directly from a real card onto the center pile, without a Play click.
      const target = page.getByRole("button", { name: "Play selected cards onto the pile" });
      await page.locator('.player-hand .card-hit:not([aria-label^="DUMP"])').first().dragTo(target, { timeout: 10000 });
      await page.waitForFunction(() =>
        JSON.parse(localStorage.getItem("stack-next-local-save-v1") || "null")?.game?.moves >= 1
      );
      await page.getByRole("button", { name: "Undo" }).click();
      await page.waitForFunction(() =>
        JSON.parse(localStorage.getItem("stack-next-local-save-v1") || "null")?.game?.moves === 0
      );
      await page.getByRole("button", { name: "Rules" }).click();
      await page.getByRole("dialog", { name: "STACK quick rules" }).waitFor();
      assert.ok(await page.getByText("Final Duel:", { exact: false }).count(), "rules explain duel");
      await page.getByRole("button", { name: "Back to table" }).click();
      await page.getByRole("combobox", { name: "Deck style" }).selectOption("original");
      assert.equal(await page.locator(".player-hand .playing-card.theme-original").count(), 3);
      assert.equal(await page.evaluate(() => localStorage.getItem("stack-next-deck-theme-v1")), "original");
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Resume game" }).click();
      assert.equal((await readGame(page)).moves, 0, "resume recovers saved state");
      assert.equal(await page.locator(".player-hand .playing-card.theme-original").count(), 3);
      const geometry = await page.evaluate(() => {
        // Atomic snapshot, not two async measurements while Motion is still
        // settling a restored hand.
        const hand = document.querySelector(".player-hand")?.getBoundingClientRect();
        const dock = document.querySelector(".control-panel")?.getBoundingClientRect();
        const tabletop = document.querySelector(".tabletop")?.getBoundingClientRect();
        return hand && dock && tabletop ? {
          handBottom: hand.bottom, dockTop: dock.top, tableBottom: tabletop.bottom,
          handHeight: hand.height, dockPosition: getComputedStyle(document.querySelector(".control-panel")).position
        } : null;
      });
      assert.ok(geometry && geometry.dockTop >= geometry.handBottom - 2,
        "action dock must never obstruct hand cards: " + JSON.stringify(geometry));
      const drawBack = await page.locator(".pile-zone .playing-card.is-back .card-art").first()
        .evaluate(el => getComputedStyle(el).backgroundImage);
      assert.match(drawBack, /stack-back\.webp/, "draw pile uses a real card back, not the face sprite");
      const viewport = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        page: document.documentElement.scrollWidth
      }));
      assert.ok(viewport.page <= viewport.viewport + 2,
        "table horizontally overflows: " + JSON.stringify(viewport));
      await page.screenshot({
        path: path.resolve(ROOT, "artifacts/next/local-" + device.width + ".png"),
        fullPage: true
      });
      assert.deepEqual(errors, [], "no local client exceptions");
      console.log("PASS Next local " + device.width + "x" + device.height +
        ": play, undo, resume, themes, rules, layout");
    } finally { await context.close(); }
  }
}


async function adaptiveHandFitScenarios(browser) {
  const Engine = require("../dist/pilehead/engine.js");
  const cases = [
    {width:360,height:740,count:6},
    {width:360,height:740,count:9},
    {width:360,height:740,count:16},
    {width:360,height:740,count:24},
    {width:390,height:844,count:6},
    {width:390,height:844,count:16},
    {width:390,height:844,count:24},
    {width:1280,height:860,count:24}
  ];
  for (const {width,height,count} of cases) {
    const game=Engine.create({players:2,seed:920000+count+width,endgameRule:"classic"});
    Engine.autoSetup(game,1);
    Engine.start(game);
    game.turn=0;
    const player=game.people[0];
    player.hand.push(...game.stock.splice(0,count-player.hand.length));
    Engine.invariant(game);
    const context=await browser.newContext({
      viewport:{width,height},isMobile:width<720,hasTouch:width<720,reducedMotion:"reduce"
    });
    await context.addInitScript(saved=>{
      localStorage.setItem("stack-next-local-save-v1",JSON.stringify({version:1,game:saved}));
    },game);
    const page=await context.newPage();
    const errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    try {
      await page.goto(WEB+"/play");
      await page.getByRole("button",{name:"Resume game"}).click();
      const cards=page.locator(".player-hand .card-hit");
      assert.equal(await cards.count(),count,"fixture must show every saved hand card");
      await page.locator(".hand-stage").scrollIntoViewIfNeeded();
      await page.waitForFunction(expected=>{
        const hand=document.querySelector(".player-hand.is-adaptive");
        return hand?.children.length===expected && hand?.clientWidth>50;
      },count);
      // Let Motion settle before checking actual mobile hit regions.
      await page.waitForTimeout(120);
      const dimensions=await page.evaluate(()=>{
        const stage=document.querySelector(".hand-stage");
        const outer=stage.getBoundingClientRect();
        const hand=stage.querySelector(".player-hand");
        const cards=[...stage.querySelectorAll(".playing-card")].map(card=>{
          const r=card.getBoundingClientRect();
          const probe=document.elementFromPoint(r.left+Math.min(8,r.width/4),r.top+10);
          return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,
            accessible:probe===card.querySelector(".card-hit")||card.contains(probe)};
        });
        const dock=document.querySelector(".control-panel").getBoundingClientRect();
        return {outer:{left:outer.left,right:outer.right,bottom:outer.bottom},
          hand:{width:hand.getBoundingClientRect().width,
            columns:Number(hand.dataset.handColumns),rows:Number(hand.dataset.handRows)},
          cards,dockTop:dock.top,
          viewport:document.documentElement.clientWidth,
          pageWidth:document.documentElement.scrollWidth};
      });
      assert.equal(dimensions.cards.length,count,"all hand cards are rendered");
      assert.ok(dimensions.cards.every(r=>r.left>=dimensions.outer.left-3 &&
        r.right<=dimensions.outer.right+3),
        "all full card faces stay within the hand container: "+
          JSON.stringify({width,count,stage:dimensions.outer,cards:dimensions.cards}));
      assert.ok(dimensions.cards.every(r=>r.accessible),
        "every overlapped card must retain a visible tap target: "+JSON.stringify({width,count}));
      assert.ok(dimensions.pageWidth<=dimensions.viewport+2,
        "no page horizontal overflow: "+JSON.stringify({width,count,dimensions}));
      assert.ok(dimensions.dockTop>=dimensions.outer.bottom-2,
        "the action panel may not cover an expanded hand");
      if(width<=390 && count>=16)
        assert.ok(dimensions.hand.rows>=2,"large hands must use compact overlapping rows");
      const last=cards.last();
      await last.click({position:{x:8,y:10}});
      assert.equal(await last.getAttribute("aria-pressed"),"true",
        "last hand card can be selected on mobile");
      if(width===360 && (count===6||count===24)) {
        await page.screenshot({
          path:path.resolve(ROOT,"artifacts/next/adaptive-hand-"+width+"-"+count+".png"),
          fullPage:true
        });
      }
      assert.deepEqual(errors,[],"adaptive layout must not crash the client");
      console.log("PASS adaptive hand: "+count+" cards fitted at "+width+
        "px ("+dimensions.hand.rows+" rows)");
    } finally {await context.close()}
  }
}

async function seatLayoutScenarios(browser) {
  for (const players of [2, 3, 5]) {
    const context = await browser.newContext({
      viewport: {width:360,height:740},isMobile:true,hasTouch:true,
      reducedMotion:"reduce"
    });
    const page = await context.newPage();
    try {
      await page.goto(WEB + "/play");
      await page.getByRole("combobox", {name:"Players"}).selectOption(String(players));
      await page.getByRole("button", {name:/Start game/}).click();
      await page.getByRole("button", {name:"Start round"}).click();
      assert.equal(await page.locator(".opponent-seat").count(), players - 1,
        "the correct number of opponents must appear");
      const measurements = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        width: document.documentElement.scrollWidth,
        opponentCount: document.querySelectorAll(".opponent-seat").length,
        cards: document.querySelectorAll(".player-hand .playing-card").length
      }));
      assert.ok(measurements.width <= measurements.viewport + 2,
        players + "-seat match overflows narrow mobile: " + JSON.stringify(measurements));
      assert.ok(measurements.cards > 0, "own hand is present");
      if(players===5) {
        await page.screenshot({
          path:path.resolve(ROOT,"artifacts/next/five-players-360.png"),fullPage:true
        });
      }
      console.log("PASS Next local: " + players + " seats on 360px mobile without overflow");
    } finally {await context.close()}
  }
}

async function onlineScenarios(browser, server) {
  const hostCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const guestCtx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  const host = await hostCtx.newPage(), guest = await guestCtx.newPage();
  // Capture the real browser sockets without changing the WebSocket protocol.
  // Closing a socket must recover automatically with the same seat/session.
  await host.addInitScript(() => {
    const Native = window.WebSocket;
    window.__stackTestSockets = [];
    window.WebSocket = class TrackedSocket extends Native {
      constructor(...args) {
        super(...args);
        window.__stackTestSockets.push(this);
      }
    };
  });
  const errors = [];
  for (const page of [host, guest]) page.on("pageerror", e => errors.push(e.message));
  try {
    await host.goto(WEB + "/play");
    await host.getByRole("textbox", { name: "Your name" }).fill("Host");
    await host.getByRole("button", { name: /Create a room/ }).click();
    await host.waitForURL(/room=[A-HJ-NP-Z2-9]{8}/, { timeout: 14000 });
    const code = new URL(host.url()).searchParams.get("room");
    assert.match(code, /^[A-HJ-NP-Z2-9]{8}$/);
    // Invite-copy is a real user action and must produce a usable room URL,
    // not merely change its button label or depend on browser alerts.
    await hostCtx.grantPermissions(["clipboard-read","clipboard-write"], {origin:WEB});
    await host.getByRole("button", {name:"Copy invitation for room " + code}).click();
    await host.getByText("Copied",{exact:true}).waitFor();
    const invite = await host.evaluate(() => navigator.clipboard.readText());
    assert.equal(invite, WEB + "/play?room=" + code, "invite URL is shareable");
    await guest.goto(WEB + "/play?room=" + code);
    await guest.getByRole("textbox", { name: "Your name" }).fill("Guest");
    await guest.getByRole("button", { name: "Join" }).click();
    await guest.getByRole("button", { name: "I'm ready" }).waitFor();
    // Settings are server-owned, host-only during setup, and off by default.
    await host.getByRole("button", { name: "Settings" }).click();
    const hostRule = host.getByRole("dialog", { name: "Game settings" }).getByRole("checkbox");
    assert.equal(await hostRule.isChecked(), false, "online Final Duel starts OFF");
    await hostRule.check();
    await host.getByRole("dialog", { name: "Game settings" })
      .getByRole("button", { name: "Back to table" }).click();
    await host.waitForFunction(() => {
      const element = document.querySelector(".game-header");
      return !!element && !document.querySelector('[role="dialog"]');
    });
    await guest.getByRole("button", { name: "Settings" }).click();
    const guestRule = guest.getByRole("dialog", { name: "Game settings" }).getByRole("checkbox");
    await guest.waitForFunction(() => {
      const box = document.querySelector('.game-modal [type="checkbox"]');
      return !!box && box.checked && box.disabled;
    }, null, { timeout: 14000 });
    await guest.getByRole("dialog", { name: "Game settings" })
      .getByRole("button", { name: "Back to table" }).click();
    await host.getByRole("button", { name: "Settings" }).click();
    await host.getByRole("dialog", { name: "Game settings" }).getByRole("checkbox").uncheck();
    await host.getByRole("dialog", { name: "Game settings" })
      .getByRole("button", { name: "Back to table" }).click();
    await guest.getByRole("button", { name: "Settings" }).click();
    await guest.waitForFunction(() => {
      const box = document.querySelector('.game-modal [type="checkbox"]');
      return !!box && !box.checked && box.disabled;
    }, null, { timeout: 14000 });
    await guest.getByRole("dialog", { name: "Game settings" })
      .getByRole("button", { name: "Back to table" }).click();

    // The full online header is wider than the offline one; prevent
    // overflow-induced scroll/visual viewport hit-testing bugs at 360px.
    for (const [browser, label] of [[host, "host"], [guest, "guest"]]) {
      const geometry = await browser.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      }));
      assert.ok(geometry.scrollWidth <= geometry.viewport + 2,
        label + " online room overflows its viewport: " + JSON.stringify(geometry));
    }
    await host.screenshot({path:path.resolve(ROOT,"artifacts/next/setup-host.png"),fullPage:true});
    await guest.screenshot({path:path.resolve(ROOT,"artifacts/next/setup-guest.png"),fullPage:true});
    // Regression: the opponent's Ready button must remain a real tap target
    // even after the host receives a revision and updates the lobby.
    async function assertReadyTapTarget(page, label) {
      // Playwright trial-click performs the same scroll and hit testing as a
      // human tap but does not commit Ready. elementFromPoint on an offscreen
      // button is not a meaningful clickability test.
      try {
        await page.getByRole("button", { name: "I'm ready" })
          .click({ trial: true, timeout: 8000 });
      } catch (error) {
        throw new Error(label + " Ready is not an actionable mobile tap target", { cause: error });
      }
    }
    await assertReadyTapTarget(host, "Host");
    await assertReadyTapTarget(guest, "Guest");
    await host.getByRole("button", { name: "I'm ready" }).click();
    await assertReadyTapTarget(guest, "Guest after host Ready");
    await guest.getByRole("button", { name: "I'm ready" }).click({timeout:12000});
    const start = host.getByRole("button", { name: "Start round" });
    await start.waitFor({ state: "visible" });
    await host.waitForFunction(() =>
      [...document.querySelectorAll("button")].some(b => b.textContent === "Start round" && !b.disabled),
      null, { timeout: 14000 });
    await start.click();
    await host.getByRole("heading", { name: "Your move." }).waitFor({ timeout: 14000 });
    await host.locator(".connection-chip.is-online").waitFor({ timeout: 12000 });
    await host.evaluate(() => window.__stackTestSockets.at(-1).close());
    await host.locator(".connection-chip.is-offline").waitFor({ timeout: 4000 });
    await host.locator(".connection-chip.is-online").waitFor({ timeout: 10000 });
    assert.ok(await host.evaluate(() => window.__stackTestSockets.length) >= 2,
      "live room should establish a replacement WebSocket without reload");
    await host.screenshot({path:path.resolve(ROOT,"artifacts/next/online-host.png"),fullPage:true});
    await guest.locator(".player-hand .playing-card").first().waitFor();

    const guestView = await guest.evaluate(async args => {
      const token = localStorage.getItem("stack-next-room-" + args.code);
      const response = await fetch(args.endpoint + "/api/pilehead", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ action: "state", code: args.code })
      });
      return { token, status: response.status, data: await response.json() };
    }, { code, endpoint: API });
    assert.equal(guestView.status, 200, "CORS + authenticated state");
    assert.equal(guestView.data.game.players[0].hand, undefined, "other player's hand must be private");
    assert.equal(guestView.data.game.players[0].blindSlots, undefined, "blind card identities must be private");
    assert.ok(Array.isArray(guestView.data.game.players[1].hand));
    assert.ok(!host.url().includes(guestView.token), "no bearer token in room link");

    await guest.getByRole("button", { name: "Send a reaction" }).click();
    await guest.getByRole("button", { name: "React fire" }).click();
    await host.locator(".opponent-seat .seat-reaction").first().waitFor({ timeout: 12000 });

    await host.locator(".player-hand .card-hit").first().click();
    await host.getByRole("button", { name: /Play cards/ }).click();
    // The authoritative pile is visible immediately on both displays.
    // A duplicate flying card would imply the actor played twice.
    // The Take button exists even while disabled. Wait for both actually
    // committed table snapshots, rather than asserting during socket transit.
    await Promise.all([host,guest].map(page=>page.waitForFunction(()=>
      document.querySelectorAll(".pile-slot.played .pile-layer").length > 0,
      null,{timeout:14000})));
    const views=await Promise.all([host,guest].map(page=>page.evaluate(()=>({
      pile:document.querySelectorAll(".pile-slot.played .pile-layer").length,
      ghosts:document.querySelectorAll(".move-story-flight").length,
      obsolete:document.querySelectorAll('.move-story-overlay[data-kind="number"]').length
    }))));
    assert.ok(views[0].pile>0 && views[0].pile===views[1].pile,
      "both players must see the same actual played pile");
    assert.ok(views.every(view=>view.ghosts===0 && view.obsolete===0),
      "ordinary cards must not spawn duplicate or delayed animations");
    console.log("PASS Next multiplayer: synchronized real played pile without ghosts");
    await host.getByRole("button", { name: "SNAP" }).waitFor({ timeout: 10000 });
    await guest.getByRole("button", { name: "Take pile" }).waitFor({ timeout: 12000 });
    await guest.getByRole("button", { name: "Take pile" }).click();
    const guestPickup=guest.locator('.move-story-overlay[data-kind="pickup"]');
    const hostPickup=host.locator('.move-story-overlay[data-kind="pickup"]');
    await Promise.all([guestPickup.waitFor({timeout:8500}),hostPickup.waitFor({timeout:8500})]);
    assert.ok(await hostPickup.locator(".move-story-transfer").count(),
      "remote player sees pile flying to the recipient's hand");
    console.log("PASS Next multiplayer motion: pickup is visible on both screens");
    await host.getByRole("button", { name: "SNAP" }).waitFor({ state: "hidden", timeout: 13000 });
    await guest.reload({ waitUntil: "domcontentloaded" });
    await guest.locator(".tabletop").waitFor({ timeout: 14000 });
    assert.ok(await guest.locator(".player-hand .playing-card").count() > 0,
      "reconnect restores seat");
    // A real server-side finish should render the same results to both seats,
    // and the existing room/session must survive a rematch.
    server.send({ type: "finish", code });
    await host.getByRole("button", { name: "Play another round" }).waitFor({ timeout: 16000 });
    await host.getByRole("region", { name: "Round results" }).waitFor();
    const resultsGeometry = await host.evaluate(() => {
      const table = document.querySelector(".tabletop").getBoundingClientRect();
      const result = document.querySelector(".results-overlay").getBoundingClientRect();
      return {
        deltaX: Math.abs((result.left + result.width / 2) - (table.left + table.width / 2)),
        deltaY: Math.abs((result.top + result.height / 2) - (table.top + table.height / 2)),
        resultWidth: result.width, tableWidth: table.width
      };
    });
    assert.ok(resultsGeometry.deltaX < 10 && resultsGeometry.deltaY < 30,
      "round results must be centered in the table: " + JSON.stringify(resultsGeometry));
    assert.ok(resultsGeometry.resultWidth <= resultsGeometry.tableWidth,
      "round results must fit in mobile table");
    await host.screenshot({
      path:path.resolve(ROOT, "artifacts/next/online-results.png"),fullPage:true
    });
    await host.getByRole("button", { name: "Play another round" }).click();
    await host.getByRole("button", { name: "Deal again" }).click();
    await host.getByRole("button", { name: "I'm ready" }).waitFor({ timeout: 15000 });
    assert.equal(new URL(host.url()).searchParams.get("room"), code,
      "rematch must preserve private room identity");
    await host.getByRole("button", { name: "Settings" }).click();
    assert.equal(await host.getByRole("dialog", { name: "Game settings" })
      .getByRole("checkbox").isChecked(), false,
      "room rematch must preserve the authoritative Classic rule");
    await host.getByRole("dialog", { name: "Game settings" })
      .getByRole("button", { name: "Back to table" }).click();
    assert.deepEqual(errors, [], "no multiplayer client exceptions");
    console.log("PASS Next online: dual mobile seats, CORS, private hands, SNAP race, reconnect");
  } finally { await Promise.all([hostCtx.close(), guestCtx.close()]); }
}
async function guidedPracticeScenario(browser) {
  const context=await browser.newContext({
    viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:"reduce"
  });
  const page=await context.newPage();
  try {
    await page.goto(WEB+"/play");
    await page.getByRole("button",{name:"Learn with a bot"}).click();
    await page.getByRole("complementary",{name:"Learning coach"}).waitFor();
    assert.equal(await page.locator(".opponent-seat").count(),1,"practice uses one opponent");
    await page.getByRole("button",{name:"Start round"}).click();
    await page.getByRole("heading",{name:"Your move."}).waitFor();
    const coaching=await page.getByRole("complementary",{name:"Learning coach"}).innerText();
    assert.match(coaching,/select a card/i,"coach teaches a real opening move");
    await page.getByRole("button",{name:"Hide tips"}).click();
    assert.equal(await page.getByRole("complementary",{name:"Learning coach"}).count(),0);
    console.log("PASS Next practice: guided first move, one bot, dismissible coaching");
  } finally {await context.close()}
}
async function mixedBotScenarios(browser) {
  const context = await browser.newContext({
    viewport: {width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:"reduce"
  });
  const page = await context.newPage();
  const errors=[];
  page.on("pageerror", err=>errors.push(err.message));
  try {
    await page.goto(WEB + "/play");
    await page.getByRole("textbox", {name:"Your name"}).fill("Solo with bot");
    await page.getByRole("combobox", {name:"Humans"}).selectOption("1");
    await page.getByRole("combobox", {name:"Bots"}).selectOption("1");
    await page.getByRole("button", {name:/Create a room/}).click();
    await page.getByRole("button", {name:"I'm ready"}).click();
    await page.getByRole("button", {name:"Start round"}).click();
    await page.getByRole("heading", {name:"Your move."}).waitFor({timeout:13000});
    // The seeded fixture makes the first card playable and SNAP available.
    const first=page.locator(".player-hand .card-hit").first();
    await first.click();
    await page.getByRole("button", {name:/Play cards/}).click();
    await page.waitForFunction(()=>{
      const status=document.querySelector(".game-meta h1")?.textContent||"";
      return status.includes("Bot")||status.includes("Your move.");
    },null,{timeout:11000});
    // Check the authoritative server has taken the bot turn; browser never
    // receives the bot hand, and no client can silently perform a bot move.
    const code=new URL(page.url()).searchParams.get("room");
    await page.waitForFunction(async code=>{
      const token=localStorage.getItem("stack-next-room-"+code);
      const response=await fetch("/api/pilehead",{
        method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
        body:JSON.stringify({action:"state",code})
      });
      const data=await response.json();
      return data.ok && data.game.moves>=2 && data.game.players[1].hand===undefined;
    },code,{timeout:12000});
    assert.deepEqual(errors,[],"no mixed bot room client exceptions");
    console.log("PASS Next online: authoritative server bot completes turn in mixed human+bot room");
  } finally {await context.close()}
}


/** Actual animated cards, not just event labels, in both client viewports. */
async function sharedMoveAnimationScenarios(browser) {
 const E=require("../dist/pilehead/engine.js");
 const actions=["burn","dump","under","reset","ghost"];
 for(const [i,action] of actions.entries()){
  const g=E.create({players:2,seed:20261123+i});
  E.start(g);
  const destination=g.people[0].hand, zones=[g.stock,g.pile,g.ashes,
   ...g.people.flatMap(p=>[p.hand,p.up,p.down])];
  const source=zones.find(arr=>arr.some(card=>card.action===action));
  assert.ok(source,"fixture must contain "+action);
  const index=source.findIndex(card=>card.action===action);
  [source[index],destination[0]]=[destination[0],source[index]];
  g.pile.push(g.stock.pop());
  E.invariant(g);
  const context=await browser.newContext({
   viewport:{width:390,height:844},isMobile:true,hasTouch:true,
   reducedMotion:"no-preference"
  });
  await context.addInitScript(game=>{
   localStorage.setItem("stack-next-local-save-v1",JSON.stringify({version:1,game}));
  },g);
  const page=await context.newPage();
  try{
   await page.goto(WEB+"/play");
   await page.getByRole("button",{name:"Resume game"}).click();
   await page.getByRole("button",{name:new RegExp("^"+action.toUpperCase()+":")}).click();
   await page.getByRole("button",{name:/Play cards/}).click();
   const theater=page.locator('.move-story-overlay[data-kind="'+action+'"]');
   await theater.waitFor({timeout:6000});
   assert.equal(await theater.locator(".move-story-flight").count(),0,
     "the committed action card is already on the table");
   const measured=await theater.evaluate(el=>{
     const sigil=el.querySelector(".move-story-sigil");
     const caption=el.querySelector(".move-story-caption");
     const transfer=el.querySelector(".move-story-transfer");
     return{animation:getComputedStyle(sigil).animationName,
       caption:caption.textContent,hasTransfer:!!transfer,
       transferAnimation:transfer?getComputedStyle(transfer).animationName:null};
   });
   assert.match(measured.animation,/stack-stable-sigil/,
     "effect markers should be short and bound to the real table");
   assert.match(measured.caption,new RegExp(action.toUpperCase(),"i"));
   assert.ok(measured.caption.length<=6,"effect cue contains no instructional prose");
   if(["burn","dump"].includes(action)){
     assert.ok(measured.hasTransfer,action+" should move the public pile");
     assert.match(measured.transferAnimation,/stack-stable-transfer/);
   }else assert.equal(measured.hasTransfer,false,
     "rule-only effects never invent a pile transfer");
   if(action==="under"){
     // The next bot reacts before the old 2.1-second animation would finish.
     // Never leave UNDER animating after the next committed move.
     await page.waitForFunction(()=>
       JSON.parse(localStorage.getItem("stack-next-local-save-v1")||"null")?.game?.moves>=2,
       null,{timeout:12000});
     assert.equal(await page.locator('.move-story-overlay[data-move="1"]').count(),0,
       "a newer authoritative bot move must immediately retire the old effect");
     console.log("PASS Next motion concurrency: bot move cancels outdated UNDER animation");
   }
   console.log("PASS Next motion: "+action.toUpperCase()+" visible card movement and effect");
  }finally{await context.close()}
 }
 // Ordinary plays should update the actual pile without visual replay.
 const normal=E.create({players:2,seed:20261188});
 E.start(normal);
 const hand=normal.people[0].hand;
 const zonesQuiet=[normal.stock,normal.ashes,...normal.people.flatMap(p=>[p.hand,p.up,p.down])];
 if(!hand.some(card=>card.kind==="number" && card.rank<10)){
  const found=zonesQuiet.find(arr=>arr.some(card=>card.kind==="number" && card.rank<10));
  const index=found.findIndex(card=>card.kind==="number" && card.rank<10);
  [found[index],hand[0]]=[hand[0],found[index]];
 }
 normal.limit=null;normal.turn=0;
 E.invariant(normal);
 const quiet=await browser.newContext({viewport:{width:390,height:844},
   isMobile:true,hasTouch:true,reducedMotion:"no-preference"});
 await quiet.addInitScript(game=>localStorage.setItem("stack-next-local-save-v1",
   JSON.stringify({version:1,game})),normal);
 const quietPage=await quiet.newPage();
 try{
  await quietPage.goto(WEB+"/play");
  await quietPage.getByRole("button",{name:"Resume game"}).click();
  const rank=hand.find(card=>card.kind==="number"&&card.rank<10).rank;
  await quietPage.getByRole("button",{name:"Number "+rank,exact:true}).first().click();
  await quietPage.getByRole("button",{name:/Play cards/}).click();
  await quietPage.waitForFunction(()=>
    JSON.parse(localStorage.getItem("stack-next-local-save-v1"))?.game?.moves>=1);
  assert.equal(await quietPage.locator(".move-story-overlay").count(),0,
    "ordinary play should have no ghost scene");
  assert.equal(await quietPage.locator(".pile-slot.played .pile-layer").count(),1,
    "real played card appears exactly once");
  assert.equal(await quietPage.locator(".event-banner").count(),0);
  const moving=await quietPage.locator(".player-hand .playing-card").first().evaluate(el=>
    el.getAnimations().filter(anim=>anim.effect?.getKeyframes().some(frame=>
      frame.transform!==undefined)).length);
  assert.equal(moving,0,"hand cards never spring/shake after a committed move");
  console.log("PASS Next stable normal play: one card, zero ghost flights");
 }finally{await quiet.close()}
 // Force an illegal blind card without leaking its identity before the flip.
 const fail=E.create({players:2,seed:33497});
 E.start(fail);
 const down=fail.people[0].down;
 fail.ashes.push(...fail.stock.splice(0),...fail.people[0].hand.splice(0),
  ...fail.people[0].up.splice(0),...down.splice(1));
 if(!(down[0].kind==="number"&&down[0].rank<10)){
  const zones=[fail.ashes,fail.pile,...fail.people.flatMap(p=>[p.hand,p.up,p.down])];
  const source=zones.find(arr=>arr.some(c=>c.kind==="number"&&c.rank===1));
  const index=source.findIndex(c=>c.kind==="number"&&c.rank===1);
  [source[index],down[0]]=[down[0],source[index]];
 }
 fail.limit={type:"min",value:10};
 fail.pile.push(fail.ashes.pop());
 E.invariant(fail);
 const blindCtx=await browser.newContext({viewport:{width:390,height:844},
  reducedMotion:"no-preference",isMobile:true,hasTouch:true});
 await blindCtx.addInitScript(game=>localStorage.setItem("stack-next-local-save-v1",
  JSON.stringify({version:1,game})),fail);
 const blindPage=await blindCtx.newPage();
 try{
  await blindPage.goto(WEB+"/play");
  await blindPage.getByRole("button",{name:"Resume game"}).click();
  await blindPage.locator(".faceup-row .blind-under .card-hit").first().click();
  const scene=blindPage.locator('.move-story-overlay[data-kind="reject"]');
  await scene.waitFor({timeout:6000});
  assert.equal(await scene.locator(".move-story-flight").count(),0);
  assert.equal(await scene.locator(".move-story-flip .playing-card:not(.is-back)").count(),1,
    "the real face is publicly revealed once on the central pile");
    const late=await scene.locator(".move-story-transfer").evaluate(el=>
   getComputedStyle(el).animationDelay);
  assert.equal(late,"0.75s","the red rejection comes before pile collection");
  console.log("PASS Next blind flip: revealed face, red rejection, then pile pickup");
 }finally{await blindCtx.close()}
 // System reduced motion still communicates what happened, without flying cards.
 const g=E.create({players:2,seed:28111});
 E.start(g);
 const zones=[g.stock,...g.people.flatMap(p=>[p.hand,p.up,p.down])];
 const z=zones.find(list=>list.some(c=>c.action==="burn"));
 const j=z.findIndex(c=>c.action==="burn");
 [z[j],g.people[0].hand[0]]=[g.people[0].hand[0],z[j]];
 const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"});
 await c.addInitScript(game=>localStorage.setItem("stack-next-local-save-v1",
  JSON.stringify({version:1,game})),g);
 const page=await c.newPage();
 try{
  await page.goto(WEB+"/play");
  await page.getByRole("button",{name:"Resume game"}).click();
  await page.getByRole("button",{name:/^BURN:/}).click();
  await page.getByRole("button",{name:/Play cards/}).click();
  const theater=page.locator('.move-story-overlay[data-kind="burn"]');
  await theater.waitFor({timeout:7000});
  const style=await theater.evaluate(el=>({
   caption:getComputedStyle(el.querySelector(".move-story-caption")).opacity,
   flying:getComputedStyle(el.querySelector(".move-story-transfer")).display
  }));
  assert.equal(style.flying,"none");
  assert.equal(style.caption,"1","reduced-motion users still see a readable action");
  console.log("PASS Next reduced motion: public action stays readable without animated flights");
 }finally{await c.close()}
}

async function abandonedRoomScenario(browser) {
  // A slow move from an abandoned room must never resurrect its table after
  // the user moves on to a new offline game. No server-side move is retried.
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce"
  });
  const page = await context.newPage();
  let releaseMove;
  const releaseGate = new Promise(resolve => { releaseMove = resolve; });
  let notifyHeld;
  const moveHeld = new Promise(resolve => { notifyHeld = resolve; });
  try {
    await page.goto(WEB + "/play");
    await page.getByRole("textbox", { name: "Your name" }).fill("Network race");
    await page.getByRole("combobox", { name: "Humans" }).selectOption("1");
    await page.getByRole("combobox", { name: "Bots" }).selectOption("1");
    await page.getByRole("button", { name: /Create a room/ }).click();
    await page.getByRole("button", { name: "I'm ready" }).click();
    await page.getByRole("button", { name: "Start round" }).click();
    await page.getByRole("heading", { name: "Your move." }).waitFor({ timeout: 14000 });
    await page.route(API + "/api/pilehead", async route => {
      if (route.request().method() === "POST") {
        let body;
        try { body = route.request().postDataJSON(); } catch { body = null; }
        if (body?.action === "move") {
          notifyHeld();
          await releaseGate;
        }
      }
      await route.continue();
    });
    await page.locator(".player-hand .card-hit").first().click();
    await page.getByRole("button", { name: /Play cards/ }).click();
    await moveHeld;
    await page.getByRole("button", { name: "Leave table" }).click();
    await page.getByRole("button", { name: "Learn with a bot" }).click();
    await page.getByRole("heading", { name: "Choose your opening cards" }).waitFor();
    releaseMove();
    await page.waitForTimeout(650);
    assert.equal(await page.locator(".room-code").count(), 0,
      "late online response must not resurrect abandoned room");
    await page.getByRole("button", { name: "Start round" }).click();
    await page.getByRole("heading", { name: "Your move." }).waitFor();
    console.log("PASS Next recovery: late online request cannot overwrite a new local session");
  } finally {
    releaseMove();
    await context.close();
  }
}


/**
 * Real React-browser parity: a bot can interrupt on a human turn, and
 * SNAP that completes a four-card run must communicate the resulting BURN.
 * Inject full valid engine states via localStorage, not synthetic UI events.
 */

async function localStarterAndRematchScenario(browser) {
  const E=require("../dist/pilehead/engine.js");
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  try {
    await page.addInitScript(()=>{Math.random=()=>0.65});
    await page.goto(WEB+"/play");
    await page.getByRole("button",{name:/Start game/}).click();
    await page.waitForFunction(()=>
      JSON.parse(localStorage.getItem("stack-next-local-save-v1")||"null")?.game?.phase==="setup",
      null,{timeout:5000});
    const first=await readGame(page);
    assert.equal(first.starterSeat,2,"regular 4-player games draw a nonzero starter");
    assert.equal(first.starterReason,"draw");
  }finally{await context.close()}
  const finished=E.create({players:3,seed:2026112377});
  E.start(finished);
  for(const seat of [2,0]){
    const player=finished.people[seat];
    finished.ashes.push(...player.hand.splice(0),...player.up.splice(0),...player.down.splice(0));
    player.out=true;
  }
  finished.finishedOrder=[2,0];finished.phase="over";finished.loser=1;finished.turn=1;
  E.invariant(finished);
  const replayCtx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const replay=await replayCtx.newPage();
  await replay.addInitScript(serialized=>{
    localStorage.setItem("stack-next-local-save-v1",serialized);
  },JSON.stringify({version:1,game:finished}));
  try {
    await replay.goto(WEB+"/play");
    await replay.getByRole("button",{name:"Resume game"}).click();
    await replay.getByRole("button",{name:"Play another round"}).click();
    await replay.getByRole("button",{name:"Deal again"}).click();
    await replay.waitForFunction(()=>{
      const saved=JSON.parse(localStorage.getItem("stack-next-local-save-v1")||"null");
      return saved?.game?.phase==="setup"&&saved.game.starterReason==="winner";
    },null,{timeout:5000});
    const next=await readGame(replay);
    assert.equal(next.starterSeat,2,"first player out wins the next round's opener");
    assert.equal(next.starterReason,"winner");
    console.log("PASS React parity: randomized opener and winner-first local rematch");
  }finally{await replayCtx.close()}
}

async function localInterruptParityScenarios(browser) {
  const E=require("../dist/pilehead/engine.js");
  const rankCards=rank=>E.deck().filter(c=>c.kind==="number"&&c.rank===rank);
  const transfer=(g,id,to)=>{
    const zones=[g.stock,g.pile,g.ashes,...g.people.flatMap(p=>[p.hand,p.up,p.down])];
    const from=zones.find(zone=>zone.some(c=>c.id===id));
    assert.ok(from,"card must exist: "+id);
    if(from===to)return;
    to.push(from.splice(from.findIndex(c=>c.id===id),1)[0]);
  };
  const open=seed=>{
    const g=E.create({players:2,seed});
    E.autoSetup(g,1);E.start(g);g.turn=0;
    return g;
  };
  async function runSaved(game,exercise) {
    E.invariant(game);
    const context=await browser.newContext({viewport:{width:390,height:844},
      isMobile:true,hasTouch:true,reducedMotion:"reduce"});
    const page=await context.newPage();
    await page.addInitScript(serialized=>{
      localStorage.setItem("stack-next-local-save-v1",serialized);
    },JSON.stringify({version:1,game}));
    try{
      await page.goto(WEB+"/play");
      await page.getByRole("button",{name:"Resume game"}).click();
      await exercise(page);
    }finally{await context.close()}
  }
  const slam=open(2026112301);
  for(const card of rankCards(7))transfer(slam,card.id,slam.people[1].hand);
  const filler=slam.stock.find(c=>c.kind==="number"&&c.rank!==7);
  assert.ok(filler);
  transfer(slam,filler.id,slam.pile);
  slam.slamOpen=false;slam.turn=0;
  assert.ok(E.slamOptions(slam,1).length,"bot has an off-turn four-of-kind");
  await runSaved(slam,async page=>{
    await page.waitForFunction(()=>
      JSON.parse(localStorage.getItem("stack-next-local-save-v1")||"null")
        ?.game?.events?.some(e=>e.type==="slam"&&e.seat===1),
      null,{timeout:5500});
    const committed=await readGame(page);
    assert.ok(committed.ashes.length>0,"off-turn bot SLAM burns the pile");
  });
  const snap=open(2026112302);
  const cards=rankCards(6);
  for(const card of cards.slice(0,3))transfer(snap,card.id,snap.pile);
  transfer(snap,cards[3].id,snap.people[0].hand);
  snap.turn=1;snap.slamOpen=true;
  snap.followUp={seat:0,rank:6,ids:[cards[3].id]};
  assert.equal(E.followUpOptions(snap,0).length,1);
  await runSaved(snap,async page=>{
    await page.getByRole("button",{name:"SNAP"}).click();
    const theater=page.locator('.move-story-overlay[data-kind="burn"]');
    await theater.waitFor({timeout:3000});
    assert.match(await theater.innerText(),/SNAP \+ BURN/);
    const committed=await readGame(page);
    assert.equal(committed.events.at(-1).burned,true);
    assert.equal(committed.pile.length,0,"four-number SNAP must clear pile");
  });
  const duel=E.create({seed:2026112303,players:2,endgameRule:"final-duel"});
  E.autoSetup(duel,1);E.start(duel);
  duel.ashes.push(...duel.stock.splice(0));
  duel.pile.push(...duel.people[1].hand.splice(0,2));
  duel.turn=0;
  await runSaved(duel,async page=>{
    await page.getByRole("button",{name:"Take pile"}).click();
    await page.locator('.move-story-erosion[data-kind="erosion"]').waitFor({state:"attached",timeout:3000});
    const committed=await readGame(page);
    assert.equal(committed.events.at(-1).erodedCount,1);
    assert.equal(committed.ashes.length,duel.ashes.length+1);
  });
  console.log("PASS React parity: off-turn bot SLAM, SNAP burn, Final Duel top-card erosion");
}

async function main() {
  fs.mkdirSync(path.resolve(ROOT, "artifacts/next"), {recursive:true});
  const apiProc = fork(path.resolve(ROOT, "scripts/render-server.cjs"), [], {
    execArgv: ["--require", path.resolve(ROOT, "tests/fixtures/mock-neon-room.cjs")],
    env: { ...process.env, NODE_ENV: "test", PORT: String(WEB_PORT),
      PILEHEAD_DATABASE_URL: "postgresql://fake:fake@neon.invalid/stack",
      STACK_TEST_WS_HEARTBEAT_MS: "200" },
    stdio: ["ignore", "pipe", "pipe", "ipc"]
  });
  let apiLog = "";
  apiProc.stdout.on("data", b => apiLog += b.toString());
  apiProc.stderr.on("data", b => apiLog += b.toString());
  let browser;
  try {
    await waitReady(WEB + "/livez", () => apiLog);
    for (const route of ["/", "/pilehead/index.html", "/play", "/play/", "/stack", "/stack/"]) {
      const response = await fetch(WEB + route);
      assert.equal(response.status, 200, "single-server route must work: " + route);
    }
    const classic = await (await fetch(WEB + "/pilehead/index.html")).text();
    assert.match(classic, /Pilehead|STACK/i, "Classic must still be available");
    const main = await (await fetch(WEB + "/")).text();
    assert.ok(!main.includes('id="__next"'), "root must remain the original Classic landing");
    const html = await (await fetch(WEB + "/play")).text();
    assert.match(html, /_next\/static\//, "Next scripts must be included");
    browser = await chromium.launch({ headless: true });
    console.log("PASS one Render server: Classic, /stack, /play, Next assets and API use one origin");
    await sameOriginNavigation(browser);
    await endgameSettingsAndBridge(browser);
    await localScenarios(browser);
    await seatLayoutScenarios(browser);
    await adaptiveHandFitScenarios(browser);
    await guidedPracticeScenario(browser);
    await localStarterAndRematchScenario(browser);
    await localInterruptParityScenarios(browser);
    await onlineScenarios(browser, apiProc);
    await sharedMoveAnimationScenarios(browser);
    await mixedBotScenarios(browser);
    await abandonedRoomScenario(browser);
  } catch (e) {
    console.error("Next browser acceptance failed:", e);
    console.error("INTEGRATED SERVER LOGS", apiLog.slice(-6000));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    apiProc.kill("SIGTERM");
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
