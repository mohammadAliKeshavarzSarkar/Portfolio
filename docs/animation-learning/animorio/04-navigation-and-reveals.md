# Lesson 4 — Navigation state and SVG reveals

**22 November 2026 · Asia/Tehran.** Original engineering notes following [Lesson 3](03-text-progress-and-state.md). References: [Menu from its button](https://animorio.com/en/animations/menu-from-its-button/) and [Scribble that reveals](https://animorio.com/en/animations/scribble-that-reveals/). The source findings and captured versions are in [SOURCE-REVIEW.md](SOURCE-REVIEW.md) and [evidence.json](evidence.json). This lesson adds independently written state and geometry exercises, not copies of those implementations.

## Separate appearance from interaction

A circular clip is only the visual part of a menu. Opening also changes focus, background interaction and scroll ownership. Closing has to reverse those changes even if the animation is interrupted or fails. Treat the visual transition as an optional layer around a usable navigation system.

The reviewed menu grows a circle from its trigger and cancels previous timelines when reversing. It includes keyboard opening, Escape handling and focus restoration. Its closed-menu inertness does not by itself establish background inertness for a real page. The scribble reference uses a broad SVG stroke and dash offset, not a shader; its full-page cover makes failure behavior especially important.

| State   | Menu interaction                    | Background           | Visual work          |
| ------- | ----------------------------------- | -------------------- | -------------------- |
| Closed  | Hidden from interaction             | Available            | None                 |
| Opening | Available; focus moves deliberately | Modal policy applies | Reveal toward open   |
| Open    | Available                           | Modal policy applies | None                 |
| Closing | Remains modal until final close     | Still protected      | Reveal toward closed |

Reopening during closing must retain the existing focus/scroll ownership. It must not briefly unlock the document or restore focus behind the overlay. A new request replaces the old animation, not the semantic responsibilities of the overlay.

## 1. Cover the farthest corner

```js
function revealRadius(x, y, width, height, overscan = 1) {
  if (
    ![x, y, width, height, overscan].every(Number.isFinite) ||
    width < 0 ||
    height < 0 ||
    overscan < 0
  )
    throw new RangeError("Invalid reveal geometry");
  return (
    Math.hypot(
      Math.max(Math.abs(x), Math.abs(width - x)),
      Math.max(Math.abs(y), Math.abs(height - y)),
    ) + overscan
  );
}

function strokeOffset(progress) {
  if (!Number.isFinite(progress))
    throw new TypeError("Finite progress required");
  return 1 - Math.max(0, Math.min(1, progress));
}
```

Measure the trigger center relative to the overlay, not the entire document. If both rectangles come from `getBoundingClientRect()`, subtract their left/top coordinates. The radius formula also handles centers outside the overlay. Recalculate after resize; retain current normalized progress rather than restarting at zero. Rotated or scaled ancestors require coordinate conversion rather than simply subtracting rectangles.

For a normalized SVG path, `pathLength="1"`, `stroke-dasharray="1"` and a dash offset from one to zero draw the line progressively. That does not guarantee screen coverage. A covering path also needs a stroke wide enough to cover the largest gaps and corners at every supported aspect ratio. Test landscape as well as portrait. Distinguish drawing a decorative line from retracting a cover over essential content.

## 2. Let the latest request own completion

This controller is a small adapter exercise. It does not implement a DOM menu. Its adapter must supply the interaction policy described below. It deliberately leaves focus and scroll behavior out of a generic animation helper.

```js
function createRevealController(adapter) {
  let revision = 0;
  let active = null;
  let disposed = false;
  let state = "closed";

  function cancel() {
    if (active) active.cancel();
    active = null;
  }
  async function request(open) {
    if (disposed) return;
    const token = ++revision;
    // Sample before cancellation removes animation-owned styles.
    const pose = adapter.sample();
    cancel();
    state = open ? "opening" : "closing";
    try {
      adapter.prepare(open);
      const job = adapter.animate(pose, open);
      active = job;
      await job.finished;
      if (disposed || token !== revision) return;
      active = null;
      adapter.commit(open);
      state = open ? "open" : "closed";
    } catch (error) {
      if (disposed || token !== revision) return;
      cancel();
      // Failure ends the cover and releases modal resources.
      adapter.recover(error);
      state = "closed";
    }
  }
  return {
    request,
    get state() {
      return state;
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      revision++;
      cancel();
      adapter.dispose();
      state = "closed";
    },
  };
}
```

`animate()` returns `{ finished: Promise, cancel() }`. A Web Animations adapter can return an Animation object. A GSAP adapter needs a promise wrapper with explicit cancellation settlement. Cancellation may reject the old promise; the revision check prevents that rejection from triggering recovery for the new transition. It also prevents an obsolete completion from hiding a reopened menu.

Adapter contracts matter: `sample()` and `cancel()` must be synchronous and nonthrowing; `recover()` and `dispose()` must be idempotent and nonthrowing. This helper handles rejected animation work, not arbitrary failures in those fundamental cleanup operations. Recovery must expose the page and release owned modal resources even when animation dependencies are unavailable.

## 3. Define the DOM adapter before integrating

| Adapter operation     | Required behavior                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `sample()`            | Read the current visual radius/opacity before canceling the previous animation               |
| `prepare(true)`       | Expose menu, set expanded state, acquire modal/scroll ownership once; choose initial focus   |
| `prepare(false)`      | Keep the overlay's interaction protection until closing commits                              |
| `animate(pose, open)` | Animate only visual properties; reduced motion may resolve immediately                       |
| `commit(true)`        | Establish the final open appearance; do not unexpectedly move focus again                    |
| `commit(false)`       | Close interaction, restore background and scroll ownership, then return focus if appropriate |
| `recover(error)`      | Remove any cover, restore interaction and provide ordinary navigation                        |
| `dispose()`           | Cancel local resources, restore changed styles/attributes and remove listeners               |

Prefer native `<dialog>.showModal()` when the navigation truly behaves as a modal. It supplies top-layer placement and background inertness, but the integration still needs a close policy, sensible initial focus, accessible naming and scroll testing. For a custom overlay, explicitly manage background inertness and focus containment; `aria-modal="true"` alone does neither.

Store the opener when opening. Restore it only if it still exists and is an appropriate destination. If a menu link navigates to a new page or section, the destination may be the correct focus target instead. Handle Escape through the same close request as the visible close control. Avoid global keyboard handlers that swallow ordinary link activation.

Scroll locking needs an owner. Save the exact inline properties being modified and restore them on the final release, not on every intermediate close request. A shared lock manager should issue one release handle per overlay so closing a nested dialog cannot unlock a still-open parent. Body-fixed techniques also need scroll-position restoration and real mobile testing; setting `overflow: hidden` is not proof of universal behavior.

## 4. Make covers optional and failure-safe

The baseline HTML must expose content before enhancement. Create a decorative cover only after required APIs and measurements are ready. Do not place an opaque, interaction-blocking cover in baseline CSS and rely on a successful JavaScript download to remove it.

For a decorative reveal, use `aria-hidden`, no focusable children and `pointer-events: none`. Provide a finite completion path and a recovery path. If assets are optional, start with available content; a missing image must not become an indefinite loading screen. If initialization fails, remove the cover and retain native links.

A reduced-motion preference change during a reveal should cancel the current job and commit a static usable state. Route changes and unmount should dispose the local controller. Resize should remeasure cover geometry without replaying the introduction. Repeated replay requests should use the same revision ownership as menu transitions.

## 5. Verification and remaining work

Run `node docs/animation-learning/animorio/verify-navigation-lesson.cjs`. The tests execute the Markdown JavaScript directly and cover off-center/external-center radius, normalized stroke progress, latest-request completion, stale rejection, failure recovery and destruction during a pending transition.

These are **geometry and asynchronous-state tests**, not browser tests of a complete menu. The DOM adapter above is a specification. Focus containment, Escape, real scroll locking, native-dialog behavior, resize coverage and SVG rendering still require a browser implementation and validation. The earlier live menu observations remain limited to their recorded scope in [BROWSER-CHECKS.md](BROWSER-CHECKS.md).

The follow-up [browser adapter](04-browser-adapter.md) now implements a native-dialog exercise with keyboard, reduced-motion, interruption, SVG stroke and cleanup checks. Those checks complete the scoped modal exercise; a full-screen scribble cover and cross-browser/physical-device validation remain separate work.
