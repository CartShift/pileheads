# Creative Studio: footage-based vertical video

This local deterministic editing path requires FFmpeg and ffprobe with libx264, AAC and the drawtext filter. It does not create footage or validate that footage is genuine: the operator must review and approve actual game recordings or consenting playtest footage before processing. Never use synthetic reactions or a fake product photo. Use actual current gameplay and exact brand assets.

```sh
node scripts/creative-video.cjs render /private/brief.json /private/footage /private/new-video-review
```

A brief has the structure of examples/creative/gameplay-video.json; replace the illustrative filename and copy with the real approved capture. Select 1–8 segments, 2–15 seconds each, 6–45 seconds in total, source-relative path, start, duration, caption, gameplay/real_playtest kind, and source/mute audio. Source is fitted without cropping into the vertical frame. Mute or silent source gets silence, not fabricated sound. The renderer uses the original logo and font, safe-positioned title/captions, straightforward cuts and 1080×1920 H.264/AAC MP4 plus cover PNG. Output and source hashes are recorded. Review actual video, source rights, audio, mobile legibility, safe areas, rules, caption and each platform crop before approving.

```sh
node scripts/creative-video.cjs approve /private/new-video-review reviewer --rights-confirmed --claims-checked
node scripts/creative-video.cjs schedule /private/new-video-review instagram YYYY-MM-DDTHH:MM:SSZ
node scripts/creative-video.cjs record /private/new-video-review https://www.instagram.com/reel/ACTUAL_ID/
```

The scheduler records a manual action, not an actual scheduled job or API publication. Separate reviewed records are required for cross-posting. Instagram, TikTok and YouTube are supported queue categories only. No account setup, paid integration, auto-posting or synthetic social content. Retain all footage and approval manifests privately; never commit them to the public repository. The example is not an actual approved footage file.
