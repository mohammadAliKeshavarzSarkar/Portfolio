# Original code notes: the mechanics beneath the effects

These small teaching examples are independently written around general mathematical and browser concepts. They are not extracted from Animorio and do not reproduce its demos. They form a starting point for the phased lessons; they are not a complete animation framework.

## 1. Keep measurements and moving visuals separate

A viewport pointer coordinate (`clientX`) can be compared directly with a viewport rectangle (`getBoundingClientRect()`). A document scroll position cannot be subtracted from that rectangle without explicitly converting coordinate systems.

For a simple, untransformed interaction wrapper:

```js
function pointerFromCenter(clientX, clientY, rect) {
  return {
    x: clientX - (rect.left + rect.width / 2),
    y: clientY - (rect.top + rect.height / 2),
  };
}
```

Measure the stationary wrapper and transform a child. A bounding rectangle is axis-aligned: this helper does not invert rotation, skew or perspective transforms. For a transformed interaction plane, use an inverse transform or keep the hit region untransformed. Refresh cached rectangles after layout changes, font loading and relevant ancestor scrolling.

| Value                | Space / unit     | Owner                  |
| -------------------- | ---------------- | ---------------------- |
| Pointer coordinates  | viewport pixels  | pointer event          |
| Hit-region rectangle | viewport pixels  | layout measurement     |
| Desired displacement | local CSS pixels | interaction controller |
| Current displacement | local CSS pixels | animation update       |
| Visible transform    | CSS transform    | one visual layer       |

Do not let a hover tween, scroll tween and layout transition all write the same element's transform. Use nested layers or compose their numeric state in one renderer.

## 2. Progress is a mapping, not a scroll engine

```js
function progressAt(position, start, end) {
  if (![position, start, end].every(Number.isFinite) || end <= start) {
    return 0; // Explicit policy: no travel means no animated progress.
  }
  return Math.min(1, Math.max(0, (position - start) / (end - start)));
}

function chapterAt(progress, count) {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError("A chapter sequence needs at least one chapter");
  }
  if (!Number.isFinite(progress))
    throw new TypeError("Finite progress required");
  return Math.min(count - 1, Math.floor(Math.max(0, progress) * count));
}
```

`progressAt(400, 100, 700)` is `0.5`. For a sticky stage, the usable travel often equals containing-section height minus stage height, with offsets added according to the actual layout. ScrollTrigger can perform the measurement/mapping, but the model should be understandable without it.

Use progress directly for continuously scrubbed motion. Use `chapterAt` to choose a state, then start a timed transition **only when the index changes**. At progress 1 the chapter index must remain `count - 1`, not `count`.

This distinction explains why a chapter sequence can finish its entrance after the user stops scrolling, while a directly scrubbed reveal stops with the scroll position. Neither requires a smooth-scroll library. Add a smooth-scroll owner only after native behavior is correct; do not run two RAF owners for the same smoothing instance.

## 3. Elapsed-time damping

```js
function damp(current, target, elapsedSeconds, halfLifeSeconds) {
  if (
    ![current, target, elapsedSeconds, halfLifeSeconds].every(Number.isFinite)
  ) {
    throw new TypeError("Finite values required");
  }
  if (elapsedSeconds < 0 || halfLifeSeconds <= 0) {
    throw new RangeError(
      "Elapsed time must be nonnegative; half-life positive",
    );
  }
  const remaining = 2 ** (-elapsedSeconds / halfLifeSeconds);
  return target + (current - target) * remaining;
}
```

With a stationary target, half the error remains after one half-life. Calling this at 30, 60 or 120 updates per second yields the same endpoint after the same elapsed time, within floating-point error. Changing targets and sampled input can still differ across update rates.

For pure decay, use `damp(value, 0, dt, halfLife)`. Multiplying a value by a fixed constant each frame changes decay duration with refresh rate. Updating displacement with `speed * dt` only fixes displacement units; every other time-dependent component also needs a consistent time model.

This follower does not overshoot. A spring needs velocity as state and acceleration proportional to displacement plus damping. Numerically integrate a spring with controlled timesteps; specify what happens after a long suspended tab. Capping elapsed time intentionally slows recovery relative to wall-clock time, so apply that policy knowingly rather than calling the result exact time independence.

## 4. Cover geometry and periodic motion

```js
function coverRadius(x, y, width, height) {
  const horizontal = Math.max(Math.abs(x), Math.abs(width - x));
  const vertical = Math.max(Math.abs(y), Math.abs(height - y));
  return Math.hypot(horizontal, vertical);
}

function wrapOffset(position, repeatWidth) {
  if (
    !Number.isFinite(position) ||
    !Number.isFinite(repeatWidth) ||
    repeatWidth <= 0
  ) {
    throw new RangeError("Finite position and positive repeat width required");
  }
  const remainder = ((position % repeatWidth) + repeatWidth) % repeatWidth;
  return remainder === 0 ? 0 : remainder - repeatWidth;
}
```

`coverRadius` expects a center and nonnegative dimensions in the same coordinate space. It reaches the farthest corner even when the center is outside the rectangle; add a small overscan margin if rasterization exposes a seam. Recalculate on resize and interpolate from the current radius when reversing a reveal.

`wrapOffset` maps equivalent positions into `(-repeatWidth, 0]`. The seam is invisible only when rendered copies repeat exactly and fill the viewport plus the travel region. Measure the actual repeat unit after fonts resolve. Rebuild coverage after a wider resize; updating the modulus alone does not create the missing copies. Decorative clones must not add duplicate focus targets or accessible announcements.

For an SVG draw effect, set a normalized `pathLength` and map progress to stroke coverage. For a screen-covering SVG stroke, path coverage and stroke width must also account for viewport aspect ratio. A length animation alone cannot guarantee every corner is covered.

## 5. Own the lifecycle

```js
function createScope() {
  const controller = new AbortController();
  const cleanups = [];
  let disposed = false;

  return {
    listen(target, type, handler, options = {}) {
      if (disposed) throw new Error("Scope already disposed");
      target.addEventListener(type, handler, {
        ...options,
        signal: controller.signal,
      });
    },
    own(cleanup) {
      if (disposed) cleanup();
      else cleanups.push(cleanup);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      const failures = [];
      while (cleanups.length) {
        try {
          cleanups.pop()();
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length) throw new AggregateError(failures, "Cleanup failed");
    },
  };
}
```

Event cleanup is only one part. Register explicit cleanup for RAF loops, GSAP ticker callbacks and local triggers, observers, timers, smooth-scroll instances and GPU resources. Reverse-order disposal helps dependent resources release before their owners. Never globally kill other components' triggers during a local unmount.

This utility does not cancel arbitrary promises or restore changed styles. Guard asynchronous completion against a disposed scope, and register restoration when an enhancement modifies baseline content. Listen for `matchMedia` changes as well as checking its initial value; rebuilding between animated and static modes must first dispose the previous mode.

## Validation of these notes

The JavaScript blocks were extracted and executed with Node's built-in assertions during this study. Checks covered centered pointer coordinates; progress endpoints and invalid travel; chapter clamping; equal damping endpoints across 30/60/120 Hz; cover distance; positive/negative wrapping; event removal; idempotent disposal; reverse-order cleanup; and cleanup continuation after an error. This validates the teaching primitives, not a browser integration or an Animorio implementation.

Continue with [Lesson 1: pointer geometry and springs](01-pointer-and-springs.md), which connects scalar motion to a documented interaction model and browser-checked lifecycle. Do not treat a passing numeric assertion as proof of accessible focus behavior or visual smoothness.
