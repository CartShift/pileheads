'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { DECKS, DEFAULT_DECK, isDeckTheme, resolveDeckTheme, deckPlayHref } = require('../apps/web/lib/deck-registry.ts');
assert.equal(new Set(DECKS.map(d => d.id)).size, DECKS.length);
assert.equal(DEFAULT_DECK, 'refined');
assert.equal(resolveDeckTheme(null, null), DEFAULT_DECK);
assert.equal(resolveDeckTheme('refined', 'original'), 'refined');
assert.equal(resolveDeckTheme('original', 'characters'), 'original');
assert.equal(resolveDeckTheme('unknown', 'original'), 'original');
assert.equal(resolveDeckTheme('__proto__', null), DEFAULT_DECK);
assert.equal(isDeckTheme(null), false);
assert.equal(isDeckTheme('premium'), false);
for (const deck of DECKS) {
  assert.equal(deck.access, 'free');
  assert.equal(deck.rulesetId, 'classic');
  assert.equal(deck.status, 'published');
  assert.equal(deckPlayHref(deck.id), '/play?deck=' + deck.id);
  assert.ok(fs.existsSync('dist' + deck.artwork), 'missing artwork: ' + deck.artwork);
}
console.log('Commercial deck registry checks passed');
