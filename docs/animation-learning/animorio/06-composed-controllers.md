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

The test shell sequences these operations explicitly. It is not a general-purpose navigation orchestrator: arbitrary overlapping shell navigation requests would need a shared generation token or cancellation policy. Local controllers' individual generation guards do not automatically protect the shell's asynchronous coordination.

## Route preparation and commitment

The fixture prepares the new route detached from the live page. On commit it destroys the old GPU owner, replaces the route's main element and mounts the new GPU instance. Cloned canvas markup resets to a hidden baseline before mounting; copying an enhanced visible canvas does not copy its GPU content or lifecycle.

The persistent menu lives outside the route's main element. Replacing a route must not remove an open dialog while leaving its lock handle owned by an unreachable controller. The fixture closes the menu before intentional route navigation. Browser history changes also need an explicit close policy in a real application; the test traverses history with the menu already closed.

History readiness, focus movement and scroll restoration remain the adapter's responsibilities. The route fixture has immediate known-height content; the separate history exercise covers delayed height readiness and repeated-path scroll positions. Do not infer that combining these controllers validates every possible route-loading sequence.

## Verification

Run `node docs/animation-learning/animorio/verify-composed-browser.cjs`. It fulfills a reserved `.test` origin in Playwright without external requests. It extracts the existing lesson code directly and checks:

- The shell pause keeps draw counters stable while the modal is open.
- Reduced-motion changes release/rebuild resources without losing that pause.
- Closing and releasing the shell pause resumes drawing.
- A new route mounts a new GPU owner and the old owner stays stopped.
- Actual browser back navigation rebuilds the expected route.
- Disposal during modal opening leaves no open dialog, lock or drawing loop and restores native history restoration.

These pass in Chromium with software WebGL. They are functional ownership checks, not a rendering-performance benchmark. Other engines, physical devices, screen readers, bfcache, browser restart persistence, navigation during an open modal and arbitrary concurrent shell requests remain unverified. The static GPU, scheduler and history exercises retain their own narrower checks.

The next useful step is to record a coverage matrix and prioritize these remaining boundaries before selecting more visual variants. The documented mechanisms now span pointer response, scroll geometry, text/chapter state, modal transitions, GPU lifecycle and local route composition. Catalog-only entries still need their own source review before implementation claims.
