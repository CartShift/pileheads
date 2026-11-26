# Creative Studio: deterministic static social drafts

This is a local creative-production starter, not a social publishing integration. It uses exact existing RC3 artwork derivatives and the existing display font; never redraws characters, changes the card border, or synthesizes customer imagery. The Drive remains the source of truth for approved creative direction. Working briefs, finished exports, approval records and real publication records belong in private storage, not this public repository.

## Produce and review

```sh
node scripts/creative-studio.cjs render examples/creative/action-spotlight.json /private/new-review-directory --png
```

The optional PNG renderer uses the same pinned Playwright/Chromium used by browser QA (install via existing CI browser setup). Without it, the command emits self-contained HTML previews only. Each run creates a new directory and outputs 1080x1350, 1080x1920 and 1080x1080 drafts, plus manifest with source hashes, output hashes, caption, alt text and review state. Review the actual pixels, platform crop, wording, exact art, rights, font and game claims; automated bounds checks are not visual approval. No real product photo or gameplay claim can be invented. Example is a draft, not an approved post.

```sh
node scripts/creative-studio.cjs approve /private/new-review-directory reviewer --rights-confirmed --claims-checked
node scripts/creative-studio.cjs schedule /private/new-review-directory instagram YYYY-MM-DDTHH:MM:SSZ
node scripts/creative-studio.cjs record /private/new-review-directory https://www.instagram.com/p/ACTUAL_POST_ID/
```

Approval requires all PNGs and explicit operator review. Scheduling creates a manual queue record only; no platform credentials, background work, posting, or API calls. Recording publication is an operator assertion, not remote verification. Any changed output or brief must be rerendered and reviewed. Keep approval files in access-controlled storage; checksums detect accidental changes, not malicious tampering. Static format is supported for Instagram; TikTok and YouTube require distinct video production and actual platform preview. A native scheduler/adapter and performance import are future work, not claimed by this tool.

## Formats

- spotlight: one action or number card, large composition.
- crew: three original card faces.
- punchline: two-card editorial visual, no regenerated characters.

Keep copy short and use only approved RC3 masters. For gameplay puzzles, verify a real engine state and answer before creative production. For real footage and motion, use the existing playtest and brand playbook; do not generate fake reactions. No bulk content generation until individual templates receive creative approval.
