"use strict";
/**
 * Production Next React tabletop acceptance, with a real Node/WebSocket
 * backend and isolated deterministic mock Neon.
 */
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { spawn, fork } = require("node:child_process");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const WEB_PORT = 44291, API_PORT = 44292;
const WEB = "http://127.0.0.1:" + WEB_PORT;
const API = "http://127.0.0.1:" + API_PORT;
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
      await page.getByRole("button", { name: /Start game/ }).click();
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
      const handRect = await page.locator(".player-hand").boundingBox();
      const dockRect = await page.locator(".control-panel").boundingBox();
      assert.ok(handRect && dockRect &&
        dockRect.y >= handRect.y + handRect.height - 2,
        "action dock must never obstruct hand cards on any viewport");
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
async function onlineScenarios(browser, server) {
  const hostCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const guestCtx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  const host = await hostCtx.newPage(), guest = await guestCtx.newPage();
  const errors = [];
  for (const page of [host, guest]) page.on("pageerror", e => errors.push(e.message));
  try {
    await host.goto(WEB + "/play");
    await host.getByRole("textbox", { name: "Your name" }).fill("Host");
    await host.getByRole("button", { name: /Create a room/ }).click();
    await host.waitForURL(/room=[A-HJ-NP-Z2-9]{8}/, { timeout: 14000 });
    const code = new URL(host.url()).searchParams.get("room");
    assert.match(code, /^[A-HJ-NP-Z2-9]{8}$/);
    await guest.goto(WEB + "/play?room=" + code);
    await guest.getByRole("textbox", { name: "Your name" }).fill("Guest");
    await guest.getByRole("button", { name: "Join" }).click();
    await guest.getByRole("button", { name: "I'm ready" }).waitFor();
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
      const hit = await page.getByRole("button", { name: "I'm ready" }).evaluate(button => {
        const bounds = button.getBoundingClientRect();
        const target = document.elementFromPoint(bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2);
        return target === button || button.contains(target);
      });
      assert.equal(hit, true, label + " Ready button is covered by the table");
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
    await host.getByRole("button", { name: "SNAP" }).waitFor({ timeout: 10000 });
    await guest.getByRole("button", { name: "Take pile" }).waitFor({ timeout: 12000 });
    await guest.getByRole("button", { name: "Take pile" }).click();
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
      const response=await fetch("http://127.0.0.1:44292/api/pilehead",{
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
    await page.getByRole("button", { name: /Start game/ }).click();
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

async function main() {
  fs.mkdirSync(path.resolve(ROOT, "artifacts/next"), {recursive:true});
  const webProc = spawn(process.execPath, [
    path.resolve(ROOT, "apps/web/node_modules/next/dist/bin/next"), "start", "-p", String(WEB_PORT)
  ], {
    cwd: path.resolve(ROOT, "apps/web"),
    env: { ...process.env, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const apiProc = fork(path.resolve(ROOT, "scripts/render-server.cjs"), [], {
    execArgv: ["--require", path.resolve(ROOT, "tests/fixtures/mock-neon-room.cjs")],
    env: { ...process.env, NODE_ENV: "test", PORT: String(API_PORT),
      STACK_WEB_ORIGIN: WEB, PILEHEAD_DATABASE_URL: "postgresql://fake:fake@neon.invalid/stack",
      STACK_TEST_WS_HEARTBEAT_MS: "200" },
    stdio: ["ignore", "pipe", "pipe", "ipc"]
  });
  let webLog = "", apiLog = "";
  webProc.stdout.on("data", b => webLog += b.toString());
  webProc.stderr.on("data", b => webLog += b.toString());
  apiProc.stdout.on("data", b => apiLog += b.toString());
  apiProc.stderr.on("data", b => apiLog += b.toString());
  let browser;
  try {
    await Promise.all([waitReady(WEB + "/play", () => webLog), waitReady(API + "/livez", () => apiLog)]);
    browser = await chromium.launch({ headless: true });
    await localScenarios(browser);
    await guidedPracticeScenario(browser);
    await onlineScenarios(browser, apiProc);
    await mixedBotScenarios(browser);
    await abandonedRoomScenario(browser);
  } catch (e) {
    console.error("Next browser acceptance failed:", e);
    console.error("WEB LOGS", webLog.slice(-6000));
    console.error("API LOGS", apiLog.slice(-6000));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    webProc.kill("SIGTERM");
    apiProc.kill("SIGTERM");
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
