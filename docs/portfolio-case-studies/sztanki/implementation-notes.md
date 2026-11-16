# Implementation notes — five transferable skills

These are **original teaching examples**, informed by the [case study](README.md). They are not copied source, a reproduction of Sztanki's design, or production-ready components. Pure JavaScript examples are checked as described in [evidence.json](evidence.json); Three.js/router adapters and HTML integration are not browser-tested here.

## 1. Map input to a coherent camera signal

**Concept:** separate the target progress from displayed progress. Wheel/touch input changes the target; a time-based filter updates the displayed value. The renderer then evaluates a camera path. The inspected site implements this separation with momentum, damping, path evaluation and separate look targets.

**Why it matters:** fixed interpolation per frame produces different motion on 60 Hz and 120 Hz displays. A time-constant formulation gives a more predictable response.

```js
export function approach(current, target, dtSeconds, timeConstant = 0.18) {
  if (timeConstant <= 0) return target;
  const dt = Math.max(0, dtSeconds);
  const alpha = -Math.expm1(-dt / timeConstant);
  return current + (target - current) * alpha;
}

export function transitionProgress(progress, start = 0.8) {
  if (!(start >= 0 && start < 1)) throw new RangeError("Invalid start");
  return Math.min(1, Math.max(0, (progress - start) / (1 - start)));
}
```

`0.8` is an illustrative boundary, not the site's computed transition zone. For an uninterrupted target, two 1/120-second updates should equal one 1/60-second update within floating-point tolerance. When returning from a hidden tab, deliberately decide whether to snap, clamp elapsed time, or resume smoothly; do not accidentally simulate several seconds of motion.

With Three.js, a path adapter can use `curve.getPointAt(progress)` for distance-oriented traversal and `camera.lookAt(lookTarget)` for orientation. Keep the look target away from the camera position. Path distance, perceived reading speed and input sensitivity are separate design variables. Reduced motion can use direct placement or a static composition.

**Alternatives:** use native scroll geometry to drive a decorative camera while leaving content in document flow; use a CSS transform for a simpler depth effect. A custom scroll owner brings responsibility for keyboard, touch, zoom and history behavior.

**Exercise:** plot target and displayed progress after one input pulse at 30, 60 and 120 updates per second. Compare the values at the same elapsed time, then change the time constant. This teaches input response without needing 3D artwork.

## 2. Define readiness beyond downloading files

**Concept:** preparation includes loading, decoding, scene construction and shader compilation. The next scene should participate in a transition only after the required stages resolve. The site's `preparePage` and `readyPages` architecture is a useful reference for this contract.

An original promise cache avoids duplicate work and allows retry after failure:

```js
export function preparationCache(build) {
  const pending = new Map();
  return function prepare(key) {
    if (!pending.has(key)) {
      const task = Promise.resolve()
        .then(() => build(key))
        .catch((error) => {
          pending.delete(key);
          throw error;
        });
      pending.set(key, task);
    }
    return pending.get(key);
  };
}
```

The `build` adapter must resolve with a renderable scene, not just a fetched response. A timeout should produce a useful fallback/error state, not add an unprepared scene to the ready set. This small cache has no eviction or cancellation policy; add those when retaining decoded textures or when users change destination rapidly.

**Transition ownership:** render the current and incoming scenes to two targets, derive a bounded blend progress, and commit the destination once the transition finishes. A newer request must invalidate an older pending commit. Keep the previous scene available during preparation. The original site's warp/burn styling is optional; first verify a simple crossfade and correct navigation state.

**Tools:** promises, AbortController where the loader supports it, a navigation generation counter, Three.js render targets and renderer compilation APIs appropriate to the installed renderer/version.

**Exercise:** use a fake loader that fails once, then succeeds. Confirm simultaneous requests share one build, a rejection is observable, and the next request retries. Then add two destinations that resolve out of order and ensure only the newest request can commit.

## 3. Separate compatibility checks from quality selection

**Concept:** “can create an adapter,” “can render the required scene” and “can render it comfortably” are different questions. The study's software-WebGPU attempt passed the first and failed later. Source quality tiers adjust workload; they do not demonstrate a universal compatibility fallback.

An original enhancement boundary:

```js
export async function tryGraphics(createRuntime, reportFailure) {
  let runtime;
  try {
    runtime = await createRuntime();
    // Adapter contract: this checks the features/shaders the experience needs.
    await runtime.probeRequiredFeatures();
    await runtime.start();
    return runtime;
  } catch (error) {
    try {
      await runtime?.dispose();
    } catch (cleanupError) {
      reportFailure(cleanupError);
    }
    reportFailure(error);
    return null; // The ordinary HTML presentation remains available.
  }
}
```

This is an adapter contract, not a drop-in WebGPU detector. Probe scope, timeouts, device-loss handling and unmount cancellation still need implementation. `reportFailure` must not throw; it should record bounded diagnostics and expose a useful status; it should not send users into an endless reload loop.

**Quality policy:** first reduce expensive optional effects and resolution. A lower DPR reduces render-target area quadratically. Prefer profiling on representative devices over treating a user-agent label as a performance guarantee. The reference's cached benchmark and four-tier policy are source findings, not measured results from this study.

**Maintenance concern:** feature support can change after startup through context/device loss. Own resources explicitly and be able to return to a usable HTML presentation. Do not turn reduced-motion preference into a synonym for “slow device.”

**Exercise:** supply a fake runtime whose feature probe rejects. Verify disposal runs, the error is surfaced, and the result is `null`. Then simulate failure during startup. A successful adapter-creation test alone should not pass this exercise.

## 4. Keep content, typography roles and geometry independent

**Concept:** a scene should consume content and presentation roles rather than embed every sentence into mesh-construction code. The delivered site separates copy/project records, style aliases and layer geometry.

An original, deliberately small data model:

```js
const project = {
  id: "example-project",
  title: "A useful project title",
  summary: "A concise description of the problem and outcome.",
  href: "/work/example-project/",
};

const roles = {
  heading: { maxLineLength: 32, emphasis: "strong" },
  body: { maxLineLength: 65, emphasis: "normal" },
};

const scenePlacement = {
  contentId: project.id,
  position: [0, 0, -4],
  rotation: [0, 0, 0],
  role: "heading",
};
```

The HTML renderer and graphics renderer should consume the same project record. The example's role values are application conventions, not CSS or Three.js APIs. Font atlases require deliberate glyph coverage, wrapping and fallback; a visual role named `heading` does not create an HTML heading.

**Tools/alternatives:** a schema-validated JSON or TypeScript model, semantic HTML for copy, CSS typography tokens, and a font-atlas pipeline only where rendered 3D text is necessary. Add identifiers for content and shared assets so ownership and caching are clear.

**Exercise:** change one title to a much longer string and another to Persian text. Record the requirements for shaping, direction, wrapping and glyph coverage. Do not infer RTL support merely because a string is accepted by the data model. This exercise is especially relevant to later MAK content.

## 5. Keep meaningful navigation available independently of rendering

**Concept:** native links carry URL semantics, keyboard activation and browser affordances. Raycastable scene objects do not inherit those behaviors. The observed loader/failure states had no equivalent HTML navigation.

Original semantic foundation:

```html
<nav aria-label="Portfolio">
  <a href="/about/">About</a>
  <a href="/work/">Work</a>
  <a href="/contact/">Contact</a>
</nav>
<main id="content">
  <h1>Selected work</h1>
  <p>Readable project descriptions remain available here.</p>
</main>
<canvas id="decoration" aria-hidden="true"></canvas>
```

This labels the canvas as decorative **only because meaningful content and navigation are supplied elsewhere**. It is not a general instruction to hide an interactive canvas from assistive technology. If graphics contain unique information, provide an equivalent presentation and appropriate accessible interactions.

Route enhancement should preserve modified clicks, Back/Forward, direct URLs and meaningful focus placement. When the user enables reduced motion, stop continuous decorative motion and choose a direct or brief transition. Preserve the preference independently of the quality tier. Avoid maintaining two different navigation models: both raycast activation and a real link should dispatch the same intent.

**15–30-minute exercise:** begin with three HTML links and one content panel. Add a fake graphics initializer behind the `tryGraphics` contract, deliberately reject it, and verify keyboard access and readable content survive. Repeat with JavaScript disabled. Write down which test would have caught a blank-loader failure. This can be done without reproducing the reference design or obtaining its artwork.

## Validation and further reading

The pure math, promise-cache behavior and failure-boundary adapters were checked with Node assertions. All JavaScript fences were parsed. That does not establish Three.js rendering, routing integration, real browser accessibility or shader compatibility. The HTML example is an instructional structure; it was not shipped as a website.

- [Three.js WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html) and [RenderTarget](https://threejs.org/docs/pages/RenderTarget.html): verify APIs against the version actually installed.
- [Three.js Curve](https://threejs.org/docs/pages/Curve.html) and [Raycaster](https://threejs.org/docs/pages/Raycaster.html): path sampling and hit testing.
- [MDN: WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API): capability and lifecycle concepts.
- [MDN: History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API): browser navigation state.
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion): motion preference is a user constraint.
- [MDN: canvas accessibility](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas#accessibility): alternatives for bitmap-rendered content.
