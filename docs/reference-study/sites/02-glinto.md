# 2. Glinto — stable reading areas and measured transitions

Reference: https://glinto.co.kr/en. Source snapshot: 15 November 2026; follow-up: 16 November. See [original findings](../STUDY.md#2-glinto), [transition formulas](../skills/03-section-transition-patterns.md) and [new browser results](../audit-results/glinto-desktop-normal.json).

## Composition before code

The design gives typography and imagery unusually generous space. Pale green signals service navigation and brand accents. Large changes happen around a stable reading area instead of moving every object at the same time. The white-space intervals are part of the choreography: they provide room to settle, read and anticipate the next topic.

**Interpretation:** its continuity comes from preserving a reference point while replacing surrounding information. A generic fade applied independently to every section would lose that continuity. The effect also depends on the image crop, text width and hierarchy remaining coherent through intermediate states.

## Mechanism inventory

| Mechanism              | State and geometry                                                     | Evidence / caution                                         |
| ---------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| Opening intro          | Resource/font readiness, progress, symbol completion, session flag     | Source; settled and revisit browser checks                 |
| Smooth document scroll | Lenis `lerp: .1`, `autoRaf: true`, anchors, navigation inertia stop    | Source + earlier settled wheel samples                     |
| Service scenes         | Section progress `--p` → fixed-copy opacity + media transforms         | Source + desktop scroll captures                           |
| Service navigation     | Decoy navigation hands off to actual navigation at progress thresholds | Source; mobile uses another layout                         |
| Horizontal process     | Track overflow → runway height → x translation                         | Source + forward/reverse audit                             |
| Entry reveal           | Intersection at .15, bottom margin −10%, y-sorted 80ms staggering      | Source                                                     |
| Hero slides            | Index/previous/lock state, 5-second timer                              | Pauses on hover, focus, document hidden and reduced motion |
| Header                 | Scroll direction after hold region, 8px noise threshold                | Hides downward, returns upward or after 4 seconds idle     |
| Theme                  | Root `data-theme`, local storage, system preference                    | Toggle and reload checked                                  |
| View cursor            | Fine pointer, view/drag state, .25 following interpolation             | Source                                                     |
| Counters / symbols     | Intersection or time; separate from scroll progression                 | Source; do not infer behavior from library presence        |

## The intro is a coordination barrier

The source waits for window load and fonts, with a six-second escape timeout. Displayed progress counts completed image/font/document states and approaches completion at a limited rate. It is **not** a byte-accurate network progress indicator.

Completion needs both progress reaching 100% and the symbol's formation callback. The page records `intro-seen` in session storage, deletes the root intro flag and dispatches a completion event. Other components subscribe through `afterIntro`. Lenis stops during the intro and restarts afterward. This explains why a wheel test taken too early can incorrectly suggest that the page is broken or uses scroll trapping.

An original reusable coordination primitive:

```js
function afterGate(isReady, eventName, callback) {
  let cancelled = false;
  const run = () => {
    if (!cancelled) callback();
  };
  if (isReady()) queueMicrotask(run);
  else addEventListener(eventName, run, { once: true });
  return () => {
    cancelled = true;
    removeEventListener(eventName, run);
  };
}

// All entry components subscribe to the same state owner.
const cancelEntry = afterGate(
  () => !document.documentElement.hasAttribute("data-intro"),
  "example:intro-ready",
  () => {
    /* start heading reveal or slideshow timer */
  },
);
// Invoke cancelEntry() when this component is removed.
```

`example:intro-ready` is a reconstruction event, not a claimed original event name. A production gate needs one owner, timeout/failure handling and a no-intro path. Never wait indefinitely for optional media.

## Two progress spaces, two different effects

For a service section, progress includes its entrance into and exit from the viewport:

```js
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sectionProgress = (rect, H) =>
  clamp01((H - rect.top) / (H + rect.height));
```

At `.25` and `.75`, copy starts entering/leaving in the default CSS windows. The CSS fade width is .08; first/last exceptions keep boundary copy available. Fixed text has `pointer-events: none`; interactive media remains a separate layer. Some translations are reduced-motion gated. Lenis is still initialized, but its delivered implementation defaults `respectReducedMotion` to true: programmatic `scrollTo` becomes immediate, and other scroll interpolation becomes 1. Follow the dependency implementation before inferring preference behavior from the app wrapper alone. This does not prove every visual effect is disabled.

For the horizontal process, the scroll runway is sized from **overflow distance**, not from the number of cards:

```js
function horizontalGeometry(trackWidth, viewportWidth, H, holdScreens = 0) {
  const D = Math.max(0, trackWidth - viewportWidth);
  const hold = H * holdScreens;
  return { D, hold, runwayHeight: H + hold + D * 1.5 };
}
function horizontalX(rectTop, geometry, H) {
  const { D, hold, runwayHeight } = geometry;
  const range = runwayHeight - H - hold;
  return range <= 0 ? 0 : -D * clamp01((-rectTop - hold) / range);
}
```

The earlier 1440px capture measured 388px horizontal travel across 582px vertical travel. Optional snapping exists in the component source, but was not enabled on the inspected process section. Do not teach the optional branch as observed behavior.

Responsive implementation requires remeasurement after fonts/images or viewport changes, clearing desktop inline dimensions below the 48rem breakpoint, and making all items available in the alternate layout. A sticky descendant needs enough containing-block height; an ancestor's overflow or transform can change the result.

## Header and slideshow: timing follows interaction

The header hides only after leaving its hold region. Tiny scroll deltas below 8px are ignored for direction decisions. Any scroll closes the menu; four seconds without scrolling returns the header. The logo's presence also depends on intersection of the hero logo. This is richer than a single `scrollY > 100` rule.

The slideshow retains both previous and current indices, while hover/focus pauses automatic changes. Reduced motion prevents the automatic timer. When adapting, keep explicit controls usable and stop timers while hidden. If you implement live preference changes, subscribe to the media query; checking `matches` once during effect setup is not equivalent.

## Debug and adaptation notes

- Inspect service progress at entry, fully readable middle, outgoing overlap and reverse travel.
- Avoid two readable service titles occupying the same fixed position at once.
- Confirm the horizontal endpoint reaches the last item without a blank tail.
- Recheck theme contrast in every overlay state, not only the page background.
- Give mobile its own content order and spacing; do not preserve an oversized desktop runway by habit.
- A long intro can delay access to content. Its presence is a reference fact, not a recommendation for MAK.

## Source trail and boundaries

[source-index.json](../source-index.json): `855796b845f8.js` (`LoadingIntro`, `ScrollProgress`, `ScrollReveal`, `SmoothScroll`, header/theme), `7df9fe763e47.js` (`HorizontalScroll`, `HeroSlides`, `ServiceTabsDrop`), `fbf49e30fdff.js` (`afterIntro`, `intro-seen`), `9ed33936b0b5.js` (symbol and supporting elements), `62e25c00cd1e.css` (fixed service copy and progress styles).

Covered: homepage in three configurations, service transitions, process progression, emulated mobile touch/menu, theme persistence and session revisit. Not established: every work-detail route, Korean locale parity, symbol timing across browsers, storage-denied intro behavior, a full keyboard/focus audit, or native browser streaming performance.
