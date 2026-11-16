# 4. AW Media — persistent objects, layered depth and practical controls

Reference: https://awmedia.marketing/. Source snapshot: 15 November 2026; follow-up: 16 November. See [original findings](../STUDY.md#4-aw-media), [sticky-stack code](../skills/03-section-transition-patterns.md#aw-media-spatial-depth-through-overlap) and [browser audit](../audit-results/awmedia-mobile-normal.json).

## Composition before code

The page combines large direct headlines, dark surfaces, rounded device frames, thin boundaries and subdued background video. It moves from a broad service promise into visible examples and process explanations. Cards and device shells remain recognizable while scale, clipping, internal content or relative depth changes.

**Interpretation:** persistent objects make changes easier to follow. The visual hierarchy depends on bright headings against quiet surfaces and on the difference between a device frame and its moving contents. Applying a generic parallax transform to both layers would erase that distinction.

## Mechanism inventory

| Effect                 | Driver and measured range                     | Evidence                                                                  |
| ---------------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| Smooth scroll          | Lenis .09, GSAP ticker seconds → milliseconds | Source + earlier wheel observation                                        |
| Hero withdrawal        | Hero top/top → bottom/top                     | Media clip to 7vh/5vw rounded 44px; scale .96; text yPercent −22 and fade |
| Device entry           | Top/bottom → center/55%, scrub .6             | Scale .8, rotateX 18°, y 60px → neutral                                   |
| Internal screen scroll | Image height minus viewport height            | Only the screen image translates                                          |
| Project stack          | Next card approaches previous sticky card     | Inner scale .9 desktop / .93 mobile and dim opacity .6                    |
| Service stage          | Scroll progression and pointer                | Pin/rotation/scale with responsive trigger positions                      |
| Reading words          | Top 82% → bottom 48%, scrub .4                | Word color toward #f5f5f7 with .12 stagger                                |
| Process reel           | Step crosses 62% of viewport                  | Active step, moving reel and progress bar                                 |
| Marquee                | Time + smoothed scroll velocity               | Baseline 38, velocity factor 9, capped contribution, direction changes    |
| FAQ                    | Native details state + measured body height   | .7s opening, .5s closing, then release height and refresh                 |
| Header/menus           | Scroll direction, menu states and route       | Hide after 700px; menu stops Lenis; Escape closes                         |
| Glass                  | Generated displacement map + SVG filter       | Chromium-gated enhancement; reduced transparency considered               |
| Cursor/tilt            | Fine pointer + target role                    | Separate dot/ring following and media/link states                         |
| Lazy media             | Visibility, reduced motion, data-saving       | Source; not every media path observed playing                             |

## A device demonstration has two coordinate systems

The outer device changes orientation and scale as it enters. The screenshot inside has a separate scroll range. Its travel must be measured after image decode:

```js
// Original reconstruction. Assumes gsap/ScrollTrigger are already registered.
function connectScreen({ stage, viewport, image, gsap, ScrollTrigger }) {
  const distance = () =>
    Math.max(0, image.offsetHeight - viewport.clientHeight);
  const tween = gsap.to(image, {
    y: () => -distance(),
    ease: "none",
    scrollTrigger: {
      trigger: stage,
      start: "top center",
      end: "bottom center",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  // Example start/end positions above are adaptation choices, not source values.
  let pending = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => ScrollTrigger.refresh());
  });
  observer.observe(viewport);
  observer.observe(image);
  return () => {
    observer.disconnect();
    cancelAnimationFrame(pending);
    tween.scrollTrigger?.kill();
    tween.revert();
  };
}
```

Use an overflow-clipped viewport, a normal-layout image and a separate outer device wrapper. On a short or narrow screen, choose a crop/content strategy first. A long image should not require an excessive scroll interval just because it can be animated. The example is explanatory and has not been integration-tested.

## Sticky stacks need correct transform ownership

The card's outer wrapper stays in document flow and becomes sticky. Its top offset includes navigation height plus 34px and a 16px increment per card. An inner wrapper scales from its top center as the next card approaches; an overlay dims the receding content. The source caps card height at `min(76vh, 780px)`.

Do not animate the sticky wrapper's scale if the goal is to retain stable sticky geometry. Do not give the final card a transition driven by a nonexistent next card. Long copy and short viewports need an alternate flow; preserving the effect is less useful than preserving access to the project content.

## Glass here is different from Tom's gallery

AW Media generates a bitmap displacement field from a rounded rectangle's edge distance. Red and green encode x/y displacement. An SVG filter then blurs, displaces and adjusts saturation of the backdrop. Each participating element gets a filter sized to its measured dimensions. A ResizeObserver rebuilds when dimensions change.

Original conceptual filter structure:

```html
<svg width="0" height="0" aria-hidden="true">
  <defs>
    <filter id="example-glass" color-interpolation-filters="sRGB">
      <feImage href="OWN_GENERATED_DISPLACEMENT_MAP" result="field" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="soft" />
      <feDisplacementMap
        in="soft"
        in2="field"
        scale="12"
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  </defs>
</svg>
```

This is a structural explanation with illustrative values, not a portable finished effect. The inspected implementation gates this enhancement using Chromium brand information and reduced-transparency preference. Browser support and cost need separate verification. Supply a readable ordinary background/border first. Tom's offscreen Three.js lens and this SVG backdrop effect are different rendering pipelines despite both looking like glass.

## Native controls with animation around them

FAQ entries are real `details`/`summary` elements. The enhanced click handler opens the details before measuring its body, animates body height, clears inline height on completion and refreshes scroll geometry. Reduced motion or missing animation libraries returns early to a static/native path.

When reusing this pattern, keep one animation owner per disclosure. Rapid toggling should cancel the previous animation and continue from the current rendered height. Resize, font changes and content updates must not leave a stale pixel height. Keyboard activation of `summary` should follow the same behavior as a pointer click. The follow-up audit exercises keyboard open/close and an interrupted open/close; it does not prove every possible timing race.

The navigation uses separate mobile-menu and desktop-mega-menu states. Mobile opening stops Lenis and toggles the document menu class. Route changes reset open menus. Desktop hover dismissal waits 160ms so small pointer gaps do not immediately close a menu. The global header hides on downward travel after 700px, except while a menu is open. These states need coordination with scroll smoothing; they are not just CSS hover effects.

## Lifecycle and adaptation notes

The page controller uses an AbortController for listeners, a GSAP context for scoped animation teardown, observers for added DOM and sizing, and a debounced refresh after layout changes. Global enhancements and per-page effects have different lifetimes. Repeated route mounts must not add another global ticker or pointer loop.

The inspected normal-motion setup and reduced-motion early-return paths are source facts. Do not claim live preference-change handling everywhere simply because the initial reduced state works. Audit that separately before reusing the code.

For MAK, the transferable lesson is how to present project evidence through a stable frame and a clear progression. The studio's service density, glass styling and sales copy are not requirements for a personal portfolio. No new portfolio composition is proposed here.

## Source trail and boundaries

[source-index.json](../source-index.json): `d4306f8d70bf.js` (`startGlobal`, `mountPage`, `scanLiquid`, `data-built-device`, `details.qa`), `012dbfe81138.js` (navigation states), `79144d9f1b9f.css` and `036142ca7684.css` (stacking, layout, glass).

Covered: desktop/mobile/reduced homepage captures, targeted sections through footer, FAQ pointer and keyboard checks, emulated touch, menu/Escape. Not established: every service/work route, all mega-menu focus paths, checkout/contact/scheduler flows, real-device video behavior, or glass rendering outside Chromium. No form submissions or contact actions were performed.
