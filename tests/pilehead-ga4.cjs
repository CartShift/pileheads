"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {pageFor,safeReferrer,isProductionHost,isMeasurementId,isPrivacyUrl}=require("../apps/web/lib/ga4-core.cjs");
test("public route allowlist and fixed attribution",()=>{
  assert.deepEqual(pageFor("/deck/","?utm_source=instagram&utm_campaign=launch&room=SECRET&email=private@example.com"),{page_title:"Deck",page_location:"https://pileheads.com/deck?utm_source=instagram&utm_campaign=launch"});
  assert.equal(pageFor("/","?utm_source=private@example.com").page_location,"https://pileheads.com/");
  for(const path of ["/play","/profile","/growth","/quick-play","/checkout","/constructor","/toString"])assert.equal(pageFor(path),null);
});
test("referrers never contain paths, credentials, query strings or fragments",()=>{
  assert.equal(safeReferrer("https://user:pass@example.org/private?room=secret#x"),"https://example.org/");
  assert.equal(safeReferrer("javascript:alert(1)"),"");
  assert.equal(safeReferrer(""),"");
});
test("activation prerequisites",()=>{
  assert.equal(isProductionHost("pileheads.com"),true);
  assert.equal(isProductionHost("preview.vercel.app"),false);
  assert.equal(isMeasurementId("G-ABC123"),true);
  assert.equal(isMeasurementId("G-ABC<script>"),false);
  assert.equal(isPrivacyUrl("https://pileheads.com/privacy"),true);
  assert.equal(isPrivacyUrl("https://pileheads.com/privacy?token=secret"),false);
});
