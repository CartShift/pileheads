# Optional offline Classic table

The Next product landing page has an explicit Download offline table control. It installs a same-origin service worker only on request. The build hashes the allowlisted public Classic resources and worker template to produce versioned caches. Installation fails if any required asset is missing; old versions are removed only after activation. A network failure opening the React /play or /stack entry shows an offline page with a link to the cached Classic local table.

No account, checkout, API, query-string URLs or protected content are cached or intercepted. The worker does not record analytics. Online rooms are not promised offline; the Classic online UI still exists and network requests fail normally. The removal action unregisters the worker and deletes only STACK offline caches; reopen tabs afterwards. No background sync, polling, push or new hosting service.

Verify a successful first installation on real HTTPS, reload and airplane mode, local bot match completion, recovery to online play, version update with multiple tabs, storage quota failure and removal. Browser/OS install behavior and offline gameplay are not yet verified. Native iOS/Android packaging remains separate.
