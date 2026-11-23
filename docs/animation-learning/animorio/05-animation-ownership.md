# Lesson 5 — Own the animation clock

**23 November 2026 · Asia/Tehran.** This original exercise builds on the [static GPU renderer](05-browser-renderer.md). A renderer needs one scheduling owner regardless of how often pointer, resize, visibility and restoration events arrive. This lesson supplies that owner and a browser binding; the function passed as `draw` can update a shader uniform, Canvas drawing or DOM transform.

## Scheduling invariants

| Condition                                                        | Expected work                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------- |
| Eligible, visible, normal motion                                 | At most one pending RAF callback                              |
| Hidden document, offscreen stage, reduced motion or lost context | Cancel the pending callback; retain no catch-up interval      |
| Eligible again                                                   | First callback has delta zero; subsequent deltas are capped   |
| Draw failure                                                     | Stop scheduling and expose a fallback through `onError`       |
| Destroyed                                                        | Ignore future start requests and release the pending callback |

A capped timestep deliberately discards wall-clock time during stalls. Resetting the clock on resume avoids simulating minutes of hidden-tab time. This policy suits decorative motion; a clock or time-critical simulation needs a different model.

```js
function createFrameOwner(draw, options = {}) {
  const request = options.request || requestAnimationFrame;
  const cancel = options.cancel || cancelAnimationFrame;
  const onError = options.onError || (() => {});
  let handle = null,
    previous = null,
    active = false,
    disposed = false;
  function tick(now) {
    handle = null;
    if (!active || disposed) return;
    const dt =
      previous === null
        ? 0
        : Math.min(0.04, Math.max(0, (now - previous) / 1000));
    previous = now;
    try {
      draw(dt, now);
    } catch (error) {
      active = false;
      previous = null;
      onError(error);
      return;
    }
    // Draw may itself pause or destroy the owner.
    if (active && !disposed && handle === null) handle = request(tick);
  }
  function stop() {
    active = false;
    previous = null;
    if (handle !== null) cancel(handle);
    handle = null;
  }
  return {
    setActive(value) {
      if (disposed) return;
      if (!value) {
        stop();
        return;
      }
      active = true;
      if (handle === null) handle = request(tick);
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      stop();
    },
  };
}

function bindFrameOwner(stage, draw, onError) {
  const events = new AbortController();
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const owner = createFrameOwner(draw, {
    onError: (error) => {
      failed = true;
      onError(error);
    },
  });
  let intersecting = false,
    contextReady = true,
    failed = false,
    disposed = false;
  function sync() {
    owner.setActive(
      !disposed &&
        !failed &&
        contextReady &&
        intersecting &&
        !document.hidden &&
        !motion.matches,
    );
  }
  const observer = new IntersectionObserver((entries) => {
    intersecting = entries.at(-1).isIntersecting;
    sync();
  });
  observer.observe(stage);
  document.addEventListener("visibilitychange", sync, {
    signal: events.signal,
  });
  motion.addEventListener("change", sync, { signal: events.signal });
  return {
    setContextReady(value) {
      contextReady = Boolean(value);
      sync();
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      events.abort();
      observer.disconnect();
      owner.destroy();
    },
  };
}
```

The browser binding starts conservatively: no drawing until IntersectionObserver reports the stage visible. A reduced-motion change cancels the loop. A hidden document cancels it independently of intersection. `setContextReady(false)` pauses during context loss or initialization; call it with true only after resources have been rebuilt. A draw failure is latched for this binding's lifetime, so unrelated resize or visibility events cannot restart a broken renderer. Recreate the binding after explicit recovery.

The owner has no synchronous callback during construction. The error hook must expose the readable fallback and must not throw. The `draw` callback owns only per-frame work; it must not create another RAF loop. If it calls `setActive` itself, the pending-handle check still prevents a duplicate loop. All scheduling APIs are assumed asynchronous, like browser RAF.

## Connecting it to a GPU renderer

The earlier static renderer deliberately draws once. For a moving renderer, factor it into resource initialization, `draw(dt)`, resource disposal and fallback activation. Initialize resources before making the frame binding context-ready. Animate a shader uniform from elapsed active time; do not compile shaders or allocate textures inside the frame callback.

On context loss: prevent default when restoration is supported, mark the binding context-unready, discard GPU handles and expose the baseline. On restoration: rebuild resources, reset the simulation and then mark it ready. On unmount: destroy the frame binding before deleting GPU resources. This ordering prevents a later callback from drawing into deleted objects.

The browser test uses a moving DOM marker to isolate lifecycle correctness from GPU capability. It verifies that position stops offscreen and in reduced motion, resumes, pauses for context readiness, and stays stopped after disposal. It complements the earlier static GPU/context-restoration checks; it does not claim an integrated animated WebGL renderer or fluid simulation.

## Verification

Run `node docs/animation-learning/animorio/verify-frame-owner.cjs` for deterministic scheduling tests; add `--browser` for Chromium observer/media-query checks. The deterministic tests cover duplicate starts, resume delta, long-frame caps, pause during draw, hidden-state policy through the binding contract, failure and disposal. The browser checks use actual intersection changes and live motion preference changes. Physical hidden-tab transitions, hardware frame timing and real mobile devices remain unverified.

Continuous decorative motion also needs a user pause/stop policy when applicable. Reduced motion is a preference signal, not a substitute for controls required by the interaction's duration and purpose. A future visible pause button can become one more eligibility condition without creating another clock.
