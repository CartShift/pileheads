/**
 * Non-destructive STACK production smoke test.
 *
 * This runs on the GitHub deploy workflow AFTER mirroring main to the branch
 * watched by Render. It checks the actual public service, deployed commit,
 * readiness of the existing Neon room database, and both published UIs.
 * It never creates rooms, writes data, or requires credentials.
 */
const DEFAULT_ORIGIN = "https://stack-card-game-t7vx.onrender.com";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export function normalizedOrigin(value = DEFAULT_ORIGIN) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password ||
      url.search || url.hash || url.pathname !== "/") {
    throw Error("STACK_RENDER_URL must be a bare HTTPS origin");
  }
  return url.origin;
}

function assertJson(body, description) {
  let json;
  try { json = JSON.parse(body); }
  catch { throw Error(description + " did not return JSON"); }
  if (json?.ok !== true) throw Error(description + " is not ready");
  return json;
}

export async function probeOnce({
  origin = DEFAULT_ORIGIN,
  expectedSha = "",
  fetchImpl = fetch,
  timeoutMs = 15000
} = {}) {
  const url = normalizedOrigin(origin);
  async function get(path) {
    const res = await fetchImpl(url + path, {
      method: "GET",
      headers: { "Accept": path === "/livez" || path === "/readyz"
        ? "application/json" : "text/html" },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) throw Error(path + " HTTP " + res.status);
    return res.text();
  }

  // Check deployed revision before testing the rest of the service. A green
  // GitHub mirror job alone does not prove Render finished deploying that SHA.
  const live = assertJson(await get("/livez"), "/livez");
  if (live.service !== "stack" || live.websocket !== true)
    throw Error("/livez missing STACK WebSocket readiness");
  if (expectedSha && live.commit !== expectedSha)
    throw Error("Render has not deployed the expected Git SHA (currently " +
      String(live.commit || "unknown").slice(0,12) + ")");
  const ready = assertJson(await get("/readyz"), "/readyz");
  if (ready.service !== "pilehead-rooms")
    throw Error("/readyz did not check the room database");
  const classic = await get("/pilehead/index.html");
  if (!/Pilehead|STACK/i.test(classic))
    throw Error("Classic HTML is missing the game");
  const react = await get("/play");
  if (!/\/_next\/static\//.test(react))
    throw Error("React /play is not serving the integrated Next.js bundle");
  return Object.freeze({
    origin:url,
    commit:live.commit || null,
    websocket:true,
    database:true,
    classic:true,
    react:true
  });
}

export async function waitForProduction({
  origin = DEFAULT_ORIGIN,
  expectedSha = "",
  maxAttempts = 21,
  retryMs = 12000,
  fetchImpl = fetch,
  log = console.log,
  sleep = pause
} = {}) {
  let lastError;
  for (let i=1; i<=maxAttempts; i++) {
    try {
      const result=await probeOnce({origin,expectedSha,fetchImpl});
      log("PASS Render production smoke on attempt "+i+": "+
        JSON.stringify(result));
      return result;
    } catch (error) {
      lastError=error;
      log("Render not ready ("+i+"/"+maxAttempts+"): "+error.message);
      if (i < maxAttempts) await sleep(retryMs);
    }
  }
  throw Error("Render production smoke failed after "+maxAttempts+
    " attempts: "+lastError.message);
}

if (process.argv[1] && new URL(import.meta.url).pathname ===
    new URL("file://" + process.argv[1]).pathname) {
  waitForProduction({
    origin: process.env.STACK_RENDER_URL || DEFAULT_ORIGIN,
    expectedSha: process.env.GITHUB_SHA || "",
    maxAttempts: Number(process.env.STACK_SMOKE_ATTEMPTS || 21)
  }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
