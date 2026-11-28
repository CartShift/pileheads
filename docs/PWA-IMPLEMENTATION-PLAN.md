# PILEHEADS Progressive Web App

Status: implementation in progress; issue #173; not released. Canonical React /play only. Web-first, mobile-first, native-ready.

## 1. Install foundation (this PR)
- Build official logo-based 192/512 PNG, maskable 512, Apple touch 180; manifest stable ID, /play start URL, standalone, brand colors.
- Contextual install control in the non-active lobby; no automatic prompt, no account, iOS Safari instructions; hide in standalone. Feature flag NEXT_PUBLIC_PILEHEADS_PWA=1 is build-time opt-in for preview only until acceptance.
- Worker registration only after an explicit install interaction. Network-first public root/play navigation, no query strings, no Cache Storage, no API or private data interception. Offline notice only; no offline play promise.
- No forced activation or reload; existing games continue. Worker updates follow browser lifecycle. No notification permissions.

## 2. Device acceptance
Check manifest/icon sizes, contrast and maskable crop; install Chromium Android, desktop and iOS Safari; standalone safe areas, orientation, keyboard, 2–5 player tables, invitations, reconnect, lock/foreground and Wi-Fi switch. Confirm normal browsers remain unchanged. Test actual production-like HTTPS preview, unsupported browsers, blocked storage and worker failures. Keep flag off publicly until accepted.

## 3. Opt-in offline bots (separate PR)
Reuse #91 historical allowlist concepts, not Classic UI. Generate a release-specific allowlist for canonical /play export and required immutable chunks, artwork/audio/font; validate complete download before marking ready; versioned cache with explicit removal and storage quota recovery. Never cache requests with query strings unless exact approved public asset URL, authenticated/private pages, API, payment, player/profile/customer/room data or responses marked private/no-store. Never cache cross-origin resources. No automatic navigation reload, background sync, or queued multiplayer moves. Offline local-only practice with versioned existing saves, no server progression. Test complete games in airplane mode, multiple tabs/update, storage failure, removal and online recovery. Keep disabled until real device acceptance.

## 4. Retention and notifications (separate product decision)
Opt-in useful invitations/rematch notifications only after permission/privacy and backend subscription lifecycle review. No push request on arrival. iOS requires installed Home Screen web app for Web Push. No paid infrastructure by default.

## Release / rollback
Do not merge without exact-SHA checks. No new dependencies. Preview with flag on; production defaults off. If worker has already been installed, disabling UI is not worker removal: ship a same-URL retirement worker and validate lifecycle/unregister separately. No production changes claimed here.
