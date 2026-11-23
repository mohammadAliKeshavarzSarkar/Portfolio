# Phased learning plan

The goal is to understand a small number of mechanisms deeply enough to adapt them later. Hundreds of differently styled demos can share the same mechanism. The initial order favors portfolio navigation, project browsing and reading over decorative GPU work.

The source review and curriculum are complete for this initial batch. The foundations, [pointer/spring lesson](01-pointer-and-springs.md), [sticky/scroll lesson](02-sticky-and-scroll-progress.md) and [text/chapter lesson](03-text-progress-and-state.md) now contain original, verified exercises. Phase 4 now has tested state/geometry exercises and a [browser-checked native-dialog adapter](04-browser-adapter.md); full-screen covers and physical-device validation remain separate work. Phase 5 now has tested transport and budgeting exercises; its [static renderer lifecycle](05-browser-renderer.md) is browser-checked, while moving-renderer and real-device gates remain pending. Phase 6 remains planned work. Browser results apply to the documented test scope, not to a production implementation. Advance by passing the completion gate, not by collecting screenshots.

## Phase 0 — Motion foundations

**Priority:** essential. **Prerequisites:** DOM events, CSS positioning, JavaScript functions.

Read [FOUNDATIONS.md](FOUNDATIONS.md). Learn the difference between document, viewport and element coordinates; CSS sticky and scripted pinning; elapsed time and scroll progress; continuous values and discrete states. Decide which layer owns each transform.

Exercises:

1. Calculate normalized section progress from a measured start and end. Describe why the denominator is not usually the entire section height.
2. Compare fixed-per-frame interpolation with exponential damping at 30, 60 and 120 updates per second.
3. Design a lifecycle with setup, measurement, update, reset and disposal. Specify the non-animated content state first.

**Deliverable:** coordinate diagram, units table and a small set of original, tested math helpers in documentation. **Gate:** explain an endpoint, a zero-travel case, a resize and an unmount without adding another animation library.

## Phase 1 — Pointer and hover mechanics

**Priority:** high. **Prerequisite:** Phase 0.

**Progress:** [Lesson 1](01-pointer-and-springs.md) documents stationary hit geometry, spring state, event policy and cleanup, with numeric and Chromium checks. Normal/reduced motion and desktop/touch emulation were tested independently. Real touch hardware, screen readers and a draggable SVG implementation remain unverified; the scalar SVG mapping is explained without claiming a complete component.

Read [Magnetic button](https://animorio.com/en/animations/magnetic-button/) first, then [Projects with elastic lines](https://animorio.com/en/animations/projects-with-elastic-lines/). The first separates a stable hit region from a moving visual; the second adds stateful spring motion and SVG geometry.

Exercises:

1. Document a hit region, a moving surface and a label with separate displacement amounts. Show why measuring the moving surface to drive its own target can create feedback.
2. Specify a scalar spring with position, velocity and target. Compare it with a damped follower: only the spring can overshoot naturally.
3. Define pointer enter/leave, focus, touch, cancel and lost-capture transitions. Keep the primary link action available.

**Deliverable:** [01-pointer-and-springs.md](01-pointer-and-springs.md), including original scalar examples and an event/state table. **Gate:** no hover-only information, no moving hit target, no blocked native vertical scrolling in a project list, and no leftover ticker after disposal. Test a coarse pointer separately from reduced motion.

## Phase 2 — Sticky positioning and scroll progress

**Priority:** highest for portfolio sections. **Prerequisites:** Phase 0; Phase 1 is useful but not required.

**Progress:** [Lesson 2](02-sticky-and-scroll-progress.md) verifies CSS sticky cards, pure decoration geometry and an original gallery controller. Chromium checks cover forward/reverse travel, endpoints, keyboard navigation, resize, runtime reduced motion, native overflow and no-JavaScript access. The card decoration controller itself, physical touch devices and screen-reader behavior remain outside this completed exercise's scope.

Study [Stacking cards](https://animorio.com/en/animations/stacking-cards/) before [Reportage horizontal gallery](https://animorio.com/en/animations/reportage-horizontal-gallery/). Both use CSS sticky; their JavaScript has different jobs. Cards respond to neighboring anchors. The gallery derives a composition from one shared progress value.

Exercises:

1. Draw the scroll container, sticky containing block, stationary measurement anchor and moving visual layer.
2. Derive two different travel distances: align the track's right edge versus center its final item. Explain why the formulas differ.
3. Design the gallery's reduced-motion branch as a native horizontal scroller with discoverable controls, then test keyboard access.
4. Specify font/image readiness and resize invalidation without reading layout on every frame.

**Deliverable:** [02-sticky-and-scroll-progress.md](02-sticky-and-scroll-progress.md), with geometry formulas and a refresh sequence. **Gate:** content works with native scrolling, the final item is reachable, reverse scrolling is correct, and resized measurements match the current layout. Only then evaluate whether smooth scrolling adds value.

## Phase 3 — Typography and scroll-driven state

**Priority:** high. **Prerequisite:** Phase 2.

**Progress:** [Lesson 3](03-text-progress-and-state.md) verifies continuous phrase emphasis, discrete chapter selection, cancellation during rapid reversal and a readable transcript. Numeric checks cover elapsed-time decay and repeat coverage. Variable-font layout/paint measurements, Persian visual shaping and a complete marquee component remain separate work; they are not claimed as completed browser exercises.

Compare [Manifesto that lights up word by word](https://animorio.com/en/animations/manifesto-that-lights-up-word-by-word-on-scroll/) with [Chapters that swap askew](https://animorio.com/en/animations/chapters-that-swap-askew-on-scroll/). One scrubs a timeline; the other crosses thresholds that launch timed transitions while separately applying continuous drift. Then examine [Marquee speeds up with scroll](https://animorio.com/en/animations/marquee-speeds-up-with-scroll/) as a velocity-driven system.

Exercises:

1. Document three inputs with units: progress (0–1), chapter index (integer), scroll velocity (pixels/second).
2. Explain width reservation for animated variable-font weight. Evaluate actual layout and paint cost before choosing blur or weight animation.
3. Interrupt a chapter transition by rapidly crossing two boundaries and reversing. Define which state wins and which previous timeline is canceled.
4. Replace per-frame decay in an original marquee calculation with elapsed-time decay; keep a single owner for shared scroll velocity. Recalculate clone coverage after a wider resize.
5. Plan Persian/RTL text handling. Do not split Persian words into independent Latin-style letter spans: shaping, joining and reading order need a separate design and actual font tests.

**Deliverable:** [03-text-progress-and-state.md](03-text-progress-and-state.md), including a transition table and text-accessibility notes. **Gate:** endpoints and fast reverse scroll work, text remains selectable/readable, reduced motion preserves every chapter, and 120 Hz does not change intended decay duration.

## Phase 4 — Navigation and SVG reveals

**Priority:** high for navigation; optional for introductory effects. **Prerequisites:** Phases 0–3.

Read [Menu from its button](https://animorio.com/en/animations/menu-from-its-button/) and [Scribble that reveals](https://animorio.com/en/animations/scribble-that-reveals/). Learn circular cover geometry, SVG path length, timeline overlaps and interruption before considering shader transitions.

Exercises:

1. Derive a circle radius that covers every viewport corner from any trigger location.
2. Define `closed → opening → open → closing` with reversible transitions. Separate visual state from focus, inertness, scroll lock and navigation.
3. Describe an SVG stroke reveal using normalized path length and an oversize covering stroke. Add a guaranteed content-visible state for failed initialization.
4. Test repeated open/close and replay requests during animation. For future route changes, decide when old content leaves, new content becomes ready, focus moves and scroll is restored.

**Deliverable:** [04-navigation-and-reveals.md](04-navigation-and-reveals.md), with original geometry and state examples. **Gate:** Escape, focus restoration, background interaction, interrupted transitions and failed asset loading all have defined outcomes. A decorative intro must never gate access indefinitely.

## Phase 5 — Optional WebGL rendering

**Priority:** advanced, after the interaction phases. **Prerequisites:** Phase 0, vectors, texture sampling, GLSL basics and resource lifecycle.

Read [Ink that reveals](https://animorio.com/en/animations/ink-that-reveals/). The relevant concepts are ping-pong render targets, velocity versus dye, pressure solving, height-map lighting and a CSS fallback. Do not start by trying to reproduce the entire fluid simulation.

Exercises:

1. Draw the render-pass graph and identify which texture each pass reads and writes.
2. Write a tiny original scalar or grid exercise explaining advection separately from pressure projection.
3. Estimate memory and draw-pass budgets at two resolutions. Account for aspect ratio, target count, format and pressure iterations.
4. Specify hidden-tab/offscreen pausing, context loss/restoration and disposal of programs, buffers, textures and observers.

**Deliverable:** [05-rendering-and-fallbacks.md](05-rendering-and-fallbacks.md), including pass graph and measured quality tradeoffs. **Gate:** a usable fallback works with WebGL unavailable, reduced motion stops ongoing fluid motion, and a real mobile device is tested before any performance claim.

[Melting sheet](https://animorio.com/en/animations/melting-sheet/) and [The glass word](https://animorio.com/en/animations/glass-word/) are **pending source access**, not reviewed examples of any specific technique. Revisit once accessible; then decide whether they add a new concept or duplicate this phase.

## Phase 6 — Integration and reusable documentation

**Priority:** mandatory before future portfolio use. **Prerequisites:** the phases relevant to the chosen effect; WebGL is optional.

This phase specifies integration contracts; it does not authorize or require building the portfolio now. Compare standalone examples with framework adapters only after reading those adapters separately.

**Deliverable:** `06-integration-contracts.md`: one scroll owner, one owner per animated property, local selectors, cleanup, font/layout invalidation, motion-preference changes, route lifecycle, content fallback and a measured performance budget.

**Gate:** repeated mount/unmount causes no duplicate listeners, triggers or tickers; keyboard and touch remain usable; preference changes work without reload; anchor links and browser back/forward restore sensible positions. Record Chromium/Firefox/WebKit and real-device results separately, including failures.

## The next session

Continue with **Phase 5: rendering and fallbacks**, starting with the Ink reveal pass graph and resource ownership. The scoped Phase 4 dialog exercise is checked; a full-screen scribble implementation remains optional follow-up. Reuse Lesson 3's cancellation and state-ownership principles, adding focus restoration, background interaction, scroll-lock ownership and content-visible failure paths. The existing first ten reviews provide the reading material.

For subsequent catalog entries, select one example only when it introduces a new input model, geometry, renderer or meaningful edge case. Group visual variants under that mechanism. Use this lesson template:

1. Reference URL, date and exact evidence scope.
2. Intended experience and when it is useful.
3. DOM/layer diagram; input → state → output mapping with units.
4. Independently written code explanation and edge cases.
5. Keyboard, touch, reduced-motion and failure behavior.
6. Measurement, cleanup and performance observations.
7. Completed checks, remaining limitations and reuse decision.
