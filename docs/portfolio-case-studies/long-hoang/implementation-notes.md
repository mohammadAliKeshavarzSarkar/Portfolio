# Implementation notes — five patterns to reuse

These are **original educational examples**, not code copied from Long Hoang's portfolio. They isolate concepts supported by the [study](README.md). They do not build a game or reproduce the original visual design. The integration outlines are deliberately labeled pseudocode.

## 1. Track sections inside the correct scroll container

The original uses a fixed document, an independently scrolling project column and a separate scrolling contents list. Geometry must be relative to the project column. Measuring against the window would confuse these coordinate systems.

This native-scrolling example expects ordered section elements and one corresponding button per section. Its `refresh()` method also serves as an integration point for a virtual scroller. No layout reads happen in the event callback; they are coalesced into an animation frame.

```js
function mountContents(scroller, sections, buttons) {
  if (sections.length !== buttons.length)
    throw new Error("Mismatched contents");
  const events = new AbortController();
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let disposed = false;

  function update() {
    frame = 0;
    const top = scroller.getBoundingClientRect().top + scroller.clientTop;
    let active = 0;
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top - top <= 80) active = i;
    }
    buttons.forEach((button, i) => {
      if (i === active) button.setAttribute("aria-current", "location");
      else button.removeAttribute("aria-current");
    });
  }
  function refresh() {
    if (!disposed && !frame) frame = requestAnimationFrame(update);
  }
  buttons.forEach((button, i) => {
    button.addEventListener(
      "click",
      () => {
        const top =
          scroller.scrollTop +
          sections[i].getBoundingClientRect().top -
          scroller.getBoundingClientRect().top -
          scroller.clientTop;
        scroller.scrollTo({
          top,
          behavior: motion.matches ? "instant" : "smooth",
        });
      },
      { signal: events.signal },
    );
  });
  scroller.addEventListener("scroll", refresh, {
    passive: true,
    signal: events.signal,
  });
  window.addEventListener("resize", refresh, { signal: events.signal });
  refresh();
  return {
    refresh,
    dispose() {
      disposed = true;
      events.abort();
      cancelAnimationFrame(frame);
    },
  };
}
```

**Assumptions:** ordinary vertical layout, no transforms on the measured scroller, no fixed/sticky section positioning, and modern abortable-event support. Call `refresh()` after image/font changes, or use a suitably scoped `ResizeObserver`. Preserve image dimensions to avoid unnecessary layout movement. An empty section/button pair is allowed and produces no selection.

If Lenis owns the column, use its `scrollTo` and scroll events instead of starting a competing native smooth animation. GSAP ticker time is in seconds and Lenis `raf` expects milliseconds. Register one callback per instance and remove it before destroying that instance. Reduced motion must select instant movement in **both** the TOC action and scroll engine policy.

Do not automatically recenter the TOC while a reader is manually scrolling that list. Track user interaction separately, then resume following when appropriate. Test wheel input over both scroll containers.

## 2. Reconcile the visible panel from the URL

The tested Back mismatch demonstrates why “Back closes the modal” is insufficient when multiple projects share one modal. A small route parser makes desired state explicit:

```js
function resolvePortfolioRoute(pathname, projectIds) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { kind: "world" };
  if (path === "/about") return { kind: "about" };
  const match = /^\/work\/([^/]+)$/.exec(path);
  if (match && projectIds.has(match[1])) {
    return { kind: "project", id: match[1] };
  }
  return { kind: "not-found" };
}
```

These example IDs are URL-safe slugs; the function intentionally does not decode arbitrary paths or silently show the first project for an unknown URL. Add `/work` as an explicit index route if your information architecture needs it.

```text
on eligible internal project link:
  validate route
  push a history entry once
  reconcile current URL

on popstate:
  reconcile current URL without pushState

reconcile:
  parse URL into desired state
  invalidate any older in-flight panel request
  if project: import panel, select project, update title/canonical, show it
  if world: close panel and restore appropriate world/input state
  if unknown: show a useful not-found state
  discard an import result if a newer navigation superseded it
```

For production, provide real `href` links and server support for direct URLs. Store scroll positions by history-entry identity, not only by pathname; two visits to the same project may need different positions. A generation counter can prevent stale async results from rendering, but it does not cancel module downloads or dispose already-created resources.

## 3. Use independently owned pause leases

A boolean `paused` becomes ambiguous when settings, a project panel and an orientation overlay overlap. Releasing one must not resume the game while another still needs it paused.

```js
function createPauseLeases(apply) {
  const leases = new Map();
  function publish() {
    apply({
      inputPaused: leases.size > 0,
      renderPaused: [...leases.values()].some((value) => value.render),
    });
  }
  return {
    acquire({ render = false } = {}) {
      const token = Symbol("pause-owner");
      leases.set(token, { render });
      publish();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        leases.delete(token);
        publish();
      };
    },
  };
}
```

`apply` must be a synchronous, non-throwing adapter. It can set the world root's `inert` property, stop game input and pause rendering independently. Keep the active panel **outside** the inert root. A unique token avoids collisions between two instances of the same panel; each owner retains its release function.

Acquire when a panel actually opens. Release on close, disposal and failure, preferably in a `finally` path. Release only once. Pausing a renderer does not automatically pause physics, audio, pointer lock or key state: define those policies explicitly and clear held inputs on blur. On resume, reset the simulation clock so time spent reading a case study does not become a large physics jump.

Native `<dialog>` can supply modal focus behavior, but it still needs coordination with the game. When custom dialog behavior is necessary, implement initial focus, Escape, Tab wrapping, connected-opener restoration and background isolation together. Labels alone do not supply those behaviors.

## 4. Separate fixed simulation time from visual frames

The original world uses fixed-step Rapier simulation with a catch-up bound and interpolation. This simplified helper exposes the same general concept without depending on a physics library:

```js
function createStepper(step, { dt = 1 / 60, maxSteps = 4 } = {}) {
  if (
    !(dt > 0) ||
    !Number.isFinite(dt) ||
    !Number.isInteger(maxSteps) ||
    maxSteps < 1
  ) {
    throw new Error("Invalid simulation policy");
  }
  let debt = 0;
  return {
    advance(elapsedSeconds) {
      if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
        throw new Error("Invalid elapsed time");
      }
      debt += elapsedSeconds;
      let steps = 0;
      while (debt >= dt && steps < maxSteps) {
        step(dt); // Save previous transforms, then advance physics once.
        debt -= dt;
        steps++;
      }
      // Drop excess whole steps after a stall; retain interpolation remainder.
      const droppedSteps = Math.floor(debt / dt);
      debt -= droppedSteps * dt;
      return { steps, droppedSteps, alpha: debt / dt };
    },
    reset() {
      debt = 0;
    },
  };
}
```

The `step` callback is expected not to throw. This is a real-time presentation policy: it intentionally loses simulation time after a long stall. It is unsuitable for authoritative deterministic replay without a different catch-up policy. A visual renderer can interpolate positions from previous to current state using `alpha`, and use quaternion interpolation for orientation. Do not write interpolated positions back into the physics world.

The example's four-step cap is illustrative; the inspected original configures five steps. Sampling player intent, applying forces, collision processing and rendering have distinct timing responsibilities. Keep interactions reproducible at different display refresh rates; do not apply a movement impulse once per rendered frame.

## 5. Gate readiness by capabilities and recover to content

Startup has more than one definition of “ready.” A model can be downloaded before decoding, physics setup and material preparation finish. Conversely, project content may be readable before any of those game stages complete.

```text
direct project URL:
  render readable project content
  load optional world only when needed

world entry:
  show accessible status and a permanent View projects link
  initialize renderer; load required assets; construct world
  await physics and required controls
  warm only what the initial view needs, yielding between batches
  await intro-specific resources
  expose Enter only when its required capabilities are ready

on failure or timeout:
  remove blocking loader and release input locks
  keep readable project links available
  offer an explicit retry for the optional experience
```

Progress weights should describe completed stages; do not label them byte accuracy. Deduplicate concurrent initialization with a shared promise, but clear a rejected cached promise before an intentional retry. Treat cancellation and timeout as outcomes with cleanup, not as percentages that eventually become 100.

A `noscript` block is useful only if CSS leaves it visible and scrollable. Baseline content should render without fixed full-screen loader layers. Add the blocking loader only after its controller is running, and remove it on failure. For an experience this complex, also test JavaScript **enabled with a failed module or GPU initialization**; that failure will not activate `noscript`.

### Keep the visual reveal separate from readiness

The live entry attempt showed a dotted transition over the world. The public world module also contains a separate full-screen transition renderer, a plane, progress/time uniforms and a node material. The general lesson is to animate a mask **after** readiness, rather than make the mask's elapsed duration the readiness condition.

This small **original GLSL function** illustrates an aspect-correct circular reveal with a dotted boundary. It is not the site's TSL material, noise system or two-phase transition. Supply normalized UVs, progress in `[0, 1]`, and positive viewport aspect ratio:

```glsl
float revealMask(vec2 uv, float progress, float aspect) {
  if (progress <= 0.0) return 0.0;
  if (progress >= 1.0) return 1.0;
  vec2 p = (uv - vec2(0.5)) * vec2(aspect, 1.0);
  float extent = 0.5 * length(vec2(aspect, 1.0));
  float radius = mix(-0.12, extent + 0.12, progress);
  float edge = radius - length(p);
  vec2 cell = fract(p * 70.0) - vec2(0.5);
  float dots = 1.0 - smoothstep(0.20, 0.30, length(cell));
  float band = 1.0 - smoothstep(0.04, 0.12, abs(edge));
  return smoothstep(-0.025, 0.025, edge + (dots - 0.5) * 0.10 * band);
}
```

Use the mask to blend two colors/textures, or invert it for cover opacity. Animate only the uniform; maintain the aspect ratio on resize. Cell spacing and edge softness are illustrative and need resolution-aware tuning to avoid aliasing. At reduced motion, skip the sweep and commit directly to the destination. Disposing the overlay should release its geometry/material/renderer resources and input lock even if an animation is interrupted.

## Exercises and validation

**25-minute exercise:** build a neutral three-section article inside an overflow container with ordinary TOC buttons. Use `mountContents()`, then place the container below a header so its top is not zero. Verify section tracking and jumps, toggle reduced motion, and dispose/recreate the controller. Use original text, not screenshot-based pages.

A second exercise is to model project navigation with `resolvePortfolioRoute()`: open A, then B, then Back. Assert that both URL and displayed project are A and that no new history entry is created during restoration.

The examples' syntax and focused behavior checks are recorded in [evidence.json](evidence.json). They do not establish a production router, game engine or complete accessible modal system. Integration pseudocode was not executed as a complete application.

## Documentation links

- [Lenis](https://github.com/darkroomengineering/lenis) and [GSAP ticker](https://gsap.com/docs/v3/GSAP/gsap.ticker/)
- [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API), [popstate](https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event)
- [Element scrolling](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTo), [inert](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert), [dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)
- [Rapier JavaScript documentation](https://rapier.rs/docs/user_guides/javascript/getting_started_js/)
- [Three.js WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html) and [reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
