# Lesson 6 — Compose controllers under one shell

**23 November 2026 · Asia/Tehran.** This original in-memory learning fixture combines the [modal adapter](04-browser-adapter.md), [moving GPU example](05-browser-renderer.md), [frame owner](05-animation-ownership.md) and [History adapter](06-history-restoration.md). No site is deployed or portfolio page created.

## A shared event needs a single coordinator

Opening a modal does not automatically pause background rendering. Native dialog makes background content inert for interaction, but a background RAF loop can still run. The shell therefore acquires an explicit renderer pause before opening the menu and releases it only after closing completes.

| Boundary                               | Shell responsibility                          | Local controller responsibility                            |
| -------------------------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| Open modal                             | Pause background renderer first               | Dialog focus, animation and scroll-lock handle             |
| Motion preference changes during modal | Retain the pause intent                       | Release/rebuild GPU resources without clearing shell pause |
| Close modal                            | Release pause after close completes           | Restore focus and release local lock                       |
| Commit a new route                     | Destroy old renderer before replacing its DOM | New renderer allocates its own context resources           |
| Browser back/forward                   | Let History adapter choose destination        | Commit new content without retaining old GPU callbacks     |
| Unmount shell                          | Destroy menu, router and renderer owners      | Detach events, release locks and stop frame callbacks      |

The renderer now exposes `setPaused(boolean)`. Resource reconstruction checks that persistent flag before making its frame owner eligible. This prevents a preference change from unintentionally resuming animation behind an open modal. There is one shell pause owner in the fixture; several overlapping pause sources require tokens or an aggregate eligibility policy instead of multiple writers to the same boolean.

The test shell sequences these operations explicitly. The extension below puts route preparation under the History adapter's generation guard. New menu-open requests during loading still require an application policy; local controller guards alone do not define it.

## Route preparation and commitment

The fixture prepares the new route detached from the live page. On commit it destroys the old GPU owner, replaces the route's main element and mounts the new GPU instance. Cloned canvas markup resets to a hidden baseline before mounting; copying an enhanced visible canvas does not copy its GPU content or lifecycle.

The persistent menu lives outside the route's main element. Replacing a route must not remove an open dialog while leaving its lock handle owned by an unreachable controller. The fixture closes the menu before intentional route navigation. Browser history changes follow the same close-during-preparation policy in the extended test below.

History readiness, focus movement and scroll restoration remain the adapter's responsibilities. The route fixture has immediate known-height content; the separate history exercise covers delayed height readiness and repeated-path scroll positions. Do not infer that combining these controllers validates every possible route-loading sequence.

## Verification

Run `node docs/animation-learning/animorio/verify-composed-browser.cjs`. It fulfills a reserved `.test` origin in Playwright without external requests. It extracts the existing lesson code directly and checks:

- The shell pause keeps draw counters stable while the modal is open.
- Reduced-motion changes release/rebuild resources without losing that pause.
- Closing and releasing the shell pause resumes drawing.
- A new route mounts a new GPU owner and the old owner stays stopped.
- Actual browser back navigation rebuilds the expected route.
- Disposal during modal opening leaves no open dialog, lock or drawing loop and restores native history restoration.

These pass in Chromium with software WebGL. They are functional ownership checks, not a rendering-performance benchmark. Other engines, physical devices, screen readers, bfcache, browser restart persistence, failed route preparation and reopening the menu during route loading remain unverified. The static GPU, scheduler and history exercises retain their own narrower checks.

The next useful step is to record a coverage matrix and prioritize these remaining boundaries before selecting more visual variants. The documented mechanisms now span pointer response, scroll geometry, text/chapter state, modal transitions, GPU lifecycle and local route composition. Catalog-only entries still need their own source review before implementation claims.

## Close the modal inside route preparation

The fixture now closes the menu inside the History adapter's `prepare` operation, after that adapter increments its navigation generation. This applies to both deliberate navigation and `popstate` restoration. Closing the menu outside the router and only then requesting navigation would leave the asynchronous close request outside the router's stale-work guard.

The preparation order is: pause the current renderer, await the menu's close request, build detached route content, and return its commit/readiness/focus adapter. The router checks the generation before commit. Replacement destroys the paused old renderer; the new renderer starts with its own lifecycle. If preparation fails, the application's error policy must decide whether to resume the old renderer or retain the fallback. The fixture's tested paths do not include a failed route preparation.

The new checks start two route requests while the menu is open, deliberately delay the older `/slow` route, and assert that `/latest` remains the displayed/focused route after both settle. They then open the menu and use actual browser Back. The menu closes and its lock releases before the destination is installed.

A superseded request still creates a History entry in this teaching router. Therefore Back can visit `/slow` even though its first preparation never committed. That is an explicit behavior of push-before-prepare navigation, not a guarantee required of every router. A production router may instead commit its URL after loading, with its own error and cancellation policy.

These checks close the specific concurrent-route and open-modal history gaps above. They do not arbitrate a new menu-open request arriving during route loading, preparation failure, external navigation or nested modals. Keep those cases in the coverage matrix.

The follow-up [loading-gate exercise](06-navigation-failures.md) now implements the failed-loader and menu-reopening policy mentioned above and extends this same browser fixture. Error-renderer failure and direct bypass of shell APIs remain outside the checked contract.
