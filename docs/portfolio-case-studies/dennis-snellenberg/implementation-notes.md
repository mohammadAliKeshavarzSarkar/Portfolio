# Implementation notes — reusable motion without copying the portfolio

These are **original teaching examples**, not Dennis Snellenberg's source or a replacement website. They isolate five lessons from the [study](README.md). Names, durations and sample content below are illustrative. Adapt and test them in your own application; no production integration is implied.

## 1. Give scroll effects one coordinate system

**Concept.** A visual section position and a scroll-trigger position must describe the same viewport. On Dennis's desktop site, section transforms move while `window.scrollY` remains zero. Reading only `scrollY` would produce incorrect progress.

Start with native scrolling. This dependency-free example derives progress from viewport geometry and uses a nested element's transform. Call `refresh()` after content or font changes that alter layout without a scroll/resize event. Do not put the transform on the measured section itself.

```js
function mountSectionMotion(section, visual) {
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let disposed = false;
  const originalTransform = visual.style.transform;

  function draw() {
    frame = 0;
    if (preference.matches) {
      visual.style.transform = originalTransform;
      return;
    }
    const rect = section.getBoundingClientRect();
    const distance = innerHeight + rect.height;
    const progress =
      distance > 0
        ? Math.max(0, Math.min(1, (innerHeight - rect.top) / distance))
        : 0;
    visual.style.transform = `translateY(${(0.5 - progress) * 32}px)`;
  }
  function refresh() {
    if (!disposed && !frame) frame = requestAnimationFrame(draw);
  }
  const events = new AbortController();
  window.addEventListener("scroll", refresh, {
    passive: true,
    signal: events.signal,
  });
  window.addEventListener("resize", refresh, { signal: events.signal });
  preference.addEventListener("change", refresh, { signal: events.signal });
  refresh();
  return {
    refresh,
    dispose() {
      disposed = true;
      events.abort();
      cancelAnimationFrame(frame);
      visual.style.transform = originalTransform;
    },
  };
}
```

**Contract:** native vertical scrolling, a dedicated decorative `visual`, and modern browser support for abortable listeners. Content remains readable without this function. It performs one batched rectangle read and style write per scheduled frame. A transformed scroll library requires subscribing to that library's updates instead of relying on native scroll events.

For GSAP plus a virtual scroller, use the following integration contract. This is **pseudocode**, not current Locomotive API documentation:

```text
mount page:
  create one scroll adapter for this page
  install a ScrollTrigger proxy on this page's scroll element:
    read position -> adapter.position
    write position -> adapter.jumpTo(position)
    bounds -> viewport bounds in the same coordinate system
    pin strategy -> appropriate to the actual transformed ancestor
  subscribe adapter scroll -> ScrollTrigger.update
  create only this page's triggers, with an explicit scroller
  after layout settles -> update adapter geometry; refresh triggers

dispose page:
  cancel queued refresh work
  kill this page's triggers and animations
  unsubscribe scroll and refresh callbacks
  remove the proxy using the installed GSAP version's supported mechanism
  destroy adapter; restore native scroll styles
```

**Trade-off:** virtual scrolling can unify effects but adds focus, anchor, history, nested-scroller and mobile responsibilities. Never select it only because a reference website used it. Verify pinning with a minimal pinned section before combining it with route transitions.

## 2. Own every resource created by a page

**Concept.** Killing scroll triggers does not remove unrelated document listeners or repeating cursor animations. A page must return a disposer for each resource it creates.

```js
function createPageScope() {
  const events = new AbortController();
  const cleanups = [];
  let disposed = false;
  return {
    signal: events.signal,
    own(cleanup) {
      if (disposed) cleanup();
      else cleanups.push(cleanup);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      events.abort();
      const errors = [];
      // Reverse creation order: children stop before their dependencies.
      while (cleanups.length) {
        try {
          cleanups.pop()();
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length)
        throw new AggregateError(errors, "Page cleanup failed");
    },
  };
}
```

Use `scope.signal` on listeners, and register cleanup immediately after acquiring a resource: `scope.own(() => timeline.kill())` or `scope.own(effect.dispose)`. If mounting throws halfway through, dispose the partially constructed scope. A failed cleanup must not prevent the remaining resources from being released.

For navigation, await the animation's real completion. The original site's 495 ms wait is closely coupled to its 0.5-second cover segment. A later duration change can break that coordination.

```text
on eligible same-origin link:
  preserve ordinary behavior for modifiers, downloads, targets and external URLs
  acquire navigation lock; retain old content until destination is validated
  concurrently fetch destination and await cover animation completion
  dispose old page; replace main; update title and history once
  mount destination; establish its scroll position; refresh geometry
  await reveal completion
  focus destination heading (tabindex=-1), with preventScroll
finally:
  release input lock and clear transition overlay
on failure:
  before replacement: keep old page usable and offer retry
  after replacement: perform ordinary navigation to the requested URL
```

**Trade-off:** this is an application integration outline. It deliberately omits a router implementation. Choose Barba, native navigation or another router and let that owner manage history; do not layer a second `pushState` call on top. Back/Forward restoration and cancellation need explicit tests.

## 3. Separate pointer position, reveal scale and image selection

**Concept.** The original floating preview has independent position, image strip and button/label layers. Their different delays create trailing motion. A reusable version should keep those transformations on different elements:

```text
fixed position wrapper -> translate to smoothed pointer position
  reveal wrapper      -> scale / opacity
    clipped viewport
      image strip     -> translate to the active project's image
```

Two pure helpers make the math reviewable:

```js
function follow(current, target, elapsedMs, timeConstantMs = 90) {
  const alpha = 1 - Math.exp(-Math.max(0, elapsedMs) / timeConstantMs);
  return current + (target - current) * alpha;
}

function previewOffset(projectIds, activeId) {
  const index = projectIds.indexOf(activeId);
  // Null means hide the preview: no selection or no matching project.
  return index < 0 ? null : (-100 * index) / projectIds.length;
}
```

`follow()` assumes a positive time constant. Apply it separately to x/y inside `requestAnimationFrame`, using timestamp differences. Unlike a fixed fraction per frame, the same elapsed time gives the same convergence at 60 Hz and 120 Hz. On activation, initialize to the actual pointer; after a hidden-tab pause, reset the timestamp or snap to the target. Stop requesting frames when settled; restart on pointer movement and cancel on page disposal.

`previewOffset()` returns a percentage of the **whole strip's height**. With five equal-height images, image index 2 needs `-40%`, not `-200%`. All visible images must have equal height and the same ordering as the visible links. Using project IDs avoids attaching the wrong image after filtering. An alternative with one image element eliminates strip arithmetic but needs image decoding and a transition policy.

The inspected original uses a repeating GSAP tween with approximate interval 0.00833 seconds and position-divisors 12, 7 and 6 for the image, button and label. Those values explain different lag; they are not a measured 120 FPS claim. The new helper above is elapsed-time based and does not reproduce that scheduling.

For magnetic buttons, measure a **stationary outer hit target**, normalize pointer coordinates around its center, and move only an inner visual. For example, horizontal displacement can be `(pointerX - centerX) / width * strength`, clamped to half the strength in either direction. Moving the element used for measurement introduces feedback into the next measurement. Keep normal activation and focus behavior on the outer button/link.

**Trade-off:** enable decorative pointer motion only for a fine pointer with hover and no reduced-motion preference. Respond to preference changes, not just initial load. Keep `pointer-events: none` on the overlay; mark decorative duplicates `aria-hidden="true"`. Touch users need visible project imagery, and keyboard focus must not depend on pointer coordinates.

## 4. Derive rows, tiles and preview order from one state

**Concept.** Filtering changes content geometry and preview indices. Layout preference and category are separate state. Dennis's code updates multiple DOM representations and persists only the row/column view.

```js
function projectView(projects, category, storedView) {
  const view = storedView === "columns" ? "columns" : "rows";
  const visible = projects.filter(
    (project) => category === "all" || project.categories.includes(category),
  );
  return { view, visible, previewIds: visible.map((project) => project.id) };
}

function readView(storage) {
  try {
    return storage.getItem("portfolio-view") === "columns" ? "columns" : "rows";
  } catch {
    return "rows";
  }
}

function saveView(storage, view) {
  try {
    storage.setItem("portfolio-view", view === "columns" ? "columns" : "rows");
  } catch {
    /* The in-memory selection still works when persistence is unavailable. */
  }
}
```

Storage is injected for testing. Accessing `window.localStorage` can itself throw; acquire it inside a `try` and fall back to a no-op storage object before passing it to these helpers. This example uses local storage for illustration; the original uses a cookie.

Render a single semantic list when practical, switching grid CSS for rows/columns. Use actual buttons with `aria-pressed` for filters/view controls. Keep a short result-count status, clear the active preview when its project disappears, and keep focus on the initiating control. If separate DOM presentations are necessary, hide inactive content from both layout and keyboard access.

After the render, update the scroll adapter's dimensions and refresh triggers once. Reserve image space with `aspect-ratio`; refresh again only if later media/font layout changes demand it. Prefer animation completion over several hard-coded timeouts. Rapid repeated filter clicks should cancel or supersede the previous transition.

**Trade-off:** two independent visual trees offer art-direction flexibility but multiply state synchronization and accessibility work. Array derivation is easier to test than class mutations spread across unrelated selectors.

## 5. Treat motion and menu access as enhancement

**Concept.** Content availability, navigation and decorative motion need separate failure modes. The inspected no-JavaScript page remained covered by its loader. A new loader should be hidden in baseline CSS and shown only after its controlling code is ready; recover from both initialization failure and timeout. A reduced-motion stylesheet alone cannot cancel JavaScript loops or release a scroll lock.

A simple accessible menu can use native dialog behavior:

```html
<button
  id="menu-open"
  type="button"
  aria-haspopup="dialog"
  aria-controls="menu-dialog"
>
  Menu
</button>
<dialog id="menu-dialog" aria-labelledby="menu-heading">
  <h2 id="menu-heading">Navigation</h2>
  <button id="menu-close" type="button" autofocus>Close menu</button>
  <nav aria-label="Main">
    <a href="/work">Work</a>
    <a href="/about">About</a>
  </nav>
</dialog>
```

```js
function mountMenu(opener, dialog, closeButton) {
  const events = new AbortController();
  opener.addEventListener(
    "click",
    () => {
      if (!dialog.open) dialog.showModal();
    },
    { signal: events.signal },
  );
  closeButton.addEventListener("click", () => dialog.close(), {
    signal: events.signal,
  });
  dialog.addEventListener(
    "close",
    () => {
      if (opener.isConnected) opener.focus({ preventScroll: true });
    },
    { signal: events.signal },
  );
  return () => {
    // Avoid focusing a control belonging to a page being removed.
    events.abort();
    if (dialog.open) dialog.close();
  };
}
```

The dialog supplies modal focus containment and Escape cancellation in supporting browsers. A router must close/dispose it before removing the page. This snippet does not animate the menu or implement a scroll adapter's lock; those are separate responsibilities. Keep ordinary navigation links available outside the dialog as the no-JavaScript baseline.

For decorative motion, evaluate `prefers-reduced-motion`, `hover` and `pointer` media queries, listen for changes, and remount/dispose affected enhancements. Reduced motion should bypass the large route sweep and looping text, use native scrolling and reveal content immediately. Do not “reduce” an indefinite loader while leaving its input lock active.

## Exercises and checks

**25-minute exercise:** create a five-item project list with original placeholder content. Implement `projectView()` and `previewOffset()`, then add row/column buttons and an ordinary link per item. Filter out the first two items and verify that hovering/focusing the new first item cannot select an old image. Keep keyboard and touch access usable without a floating preview.

For a longer scroll/lifecycle exercise, mount the section effect, dispose it, and mount it again. Toggle reduced motion while open; remove the page while a frame is queued. Confirm that no detached element receives later style writes and the original transform is restored.

Validation for these documentation examples is recorded in [evidence.json](evidence.json). Parsing and small automated checks are not certification of a complete application. The integration pseudocode has not been executed as a router or a virtual-scroll adapter.

## Further reading

- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) and [scrollerProxy](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.scrollerProxy/)
- [Barba lifecycle hooks](https://barba.js.org/docs/advanced/hooks/) and [transitions](https://barba.js.org/docs/advanced/transitions/)
- [Locomotive Scroll repository](https://github.com/locomotivemtl/locomotive-scroll): consult documentation for the specific installed version
- [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController), [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), [dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)
- [Reduced-motion media query](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
