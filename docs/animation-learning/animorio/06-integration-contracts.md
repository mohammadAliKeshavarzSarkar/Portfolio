# Lesson 6 — Integration contracts

**23 November 2026 · Asia/Tehran.** This document gathers the ownership rules demonstrated by the original exercises. It is a review specification for a future portfolio integration. The follow-up [history restoration exercise](06-history-restoration.md) verifies a local Chromium routing fixture. A full application, framework-adapter review and real-device performance results remain outside this document.

## Assign one owner to each resource

| Resource           | Owner                       | Contract                                                           |
| ------------------ | --------------------------- | ------------------------------------------------------------------ |
| Document scrolling | Application shell           | Choose native scrolling or one smoothing instance; initialize once |
| Scroll measurement | Local section controller    | Read stationary anchors on refresh; declare invalidation events    |
| Animated property  | One visual layer/controller | Nest layers for independent effects; restore owned declarations    |
| RAF clock          | Frame owner                 | One pending callback; stop before disposing renderer resources     |
| Modal scroll lock  | Shared lock manager         | Acquire/release handles; final release restores exact prior state  |
| Focus              | Navigation controller       | Move deliberately on navigation; preserve native activation        |
| GPU resources      | Renderer instance           | Allocate per context; rebuild after loss; release on teardown      |
| Readable content   | Semantic document           | Available before enhancement and after failure                     |

The tests for individual lessons establish local contracts, not that several controllers can safely write the same page. Before composing them, draw the owner relationships and identify shared resources explicitly.

## Setup and teardown order

1. Render meaningful baseline content and working destinations.
2. Read preferences and validate required APIs.
3. Allocate local resources; retain an idempotent cleanup for every allocation.
4. Measure after relevant fonts/images are ready, with a finite fallback policy.
5. Attach local events/observers and start one eligible clock.
6. On teardown, mark the component disposed and invalidate outstanding asynchronous generations.
7. Cancel clocks and animation jobs before deleting the resources they use.
8. Detach listeners/observers; restore owned styles and attributes; release locks.

A failed setup must unwind the resources already acquired. Promise completion after unmount must check its generation before writing styles, uploading textures or restoring focus. Avoid global cleanup APIs that kill another component's triggers.

## Layout and navigation refresh

A font/image load, breakpoint change, dynamic content update or upstream layout shift can invalidate scroll geometry. Recompute document start/end and repeat widths together, then render from current scroll position. Avoid a refresh loop in which assigning section height continually resizes an observed box.

For anchor navigation, browser back/forward and restored routes, define who owns scroll restoration. Restore content and layout before applying a saved position. If a chapter stage replaces normal layout in reduced motion, decide whether to preserve a content identifier or a numeric scroll offset; the identifier usually communicates intent more reliably across different layouts. Test this decision rather than assuming the browser and a smoothing library coordinate automatically.

Do not retain focus inside an outgoing or hidden chapter. Decorative previews should have no focus targets. A real project gallery with links needs to bring the focused item into view or retain native overflow; the figure-only lesson fixture does not solve that integration automatically.

## Preference and failure transitions

Preference changes are runtime events, not only initialization flags. Switching to reduced motion must cancel continuous work and expose a stable usable state. Returning to normal motion should rebuild at current layout/scroll state without replaying an obstructive intro. A context loss should pause the clock before handles are discarded, and restoration should rebuild before resuming.

For GPU draw failure, use a latched fallback until explicit recovery. Do not let every resize restart a broken effect. For decorative intros, the baseline must remain reachable if scripts, fonts or assets fail. Essential navigation should never wait for shader readiness.

## Evidence required before application use

| Check                                  | Current evidence                                        | Still needed                                                          |
| -------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| Pointer and scroll ownership           | Original numeric/Chromium exercises                     | Composed-page interactions and real input devices                     |
| Keyboard and modal behavior            | Native-dialog learning fixture                          | Full application focus order and assistive-technology review          |
| Text/chapter interruption              | Original Chromium fixture                               | Actual content, fonts, Persian shaping and long translations          |
| GPU lifecycle                          | Static and moving shader exercises in software Chromium | Hardware GPUs, mobile devices and other engines                       |
| Context restoration and reduced motion | Original renderer exercises                             | Real browser/device matrix and hidden-tab behavior                    |
| Route/history restoration              | Contract only                                           | Actual router implementation and browser back/forward checks          |
| Performance budget                     | Texture/draw calculations only                          | Frame-time distributions, memory and input response on target devices |

Record test dates, browser/device versions, content size and active effects. A calculated memory budget is not a measured GPU-memory total. A passing software-renderer test is not a mobile frame-rate result. Set performance thresholds from the future portfolio's needs and target hardware; do not invent a universal acceptable draw count.

The next step is a focused validation session on an integrated learning fixture, followed by hardware and cross-browser measurements where available. Preserve failures and unverified rows in the record. The catalog inventory remains a selection tool; completing these lessons does not mean all 1,957 entries have been implemented or tested.
