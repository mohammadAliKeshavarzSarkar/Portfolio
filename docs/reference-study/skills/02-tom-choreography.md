# Tom de Koning: portrait, typography and navigation choreography

Reference: https://www.tomdekoning.work/
Retrieved custom source: https://slater.app/20917/64158.js
Evidence date: 15 November 2026. Documentation revision: 16 November 2026.
This chapter expands the existing evidence; it is not a fresh inspection.

## The perceived composition

Observed: the opening composition connects large typography, a portrait, small metadata, strong dark/light contrast and navigation near the lower viewport. The portrait changes with scrolling. Navigation reaches the upper edge. Later, a work heading introduces a gallery with distinct horizontal interaction.

Interpretation: continuity comes from recognizable objects persisting while their role changes. The portrait begins as an identity element and becomes a smaller supporting element; navigation moves into its long-term reading position. This interpretation does not assert the designer's original intention.

## Do not combine the mechanisms into one generic scroll animation

| Layer             | Input                                  | Output                     | Timing model                          |
| ----------------- | -------------------------------------- | -------------------------- | ------------------------------------- |
| Entry mask        | Initialization                         | clip-path                  | Time-based                            |
| Portrait sequence | Section progress                       | Canvas frame               | Position-based                        |
| Portrait size     | Section progress + breakpoint          | Width and height           | Position-based                        |
| Navigation        | Document scrollY + viewport/nav height | Fixed top position         | Direct geometry                       |
| Character wave    | Heading progress + crossing direction  | Character colors           | Position triggers small timed effects |
| Masked heading    | Viewport threshold                     | Character/line translation | Time-based                            |
| Gallery           | Horizontal wheel/drag input            | Gallery position           | Inertia + snapping                    |

The result feels coordinated, but the mechanisms have different coordinate systems and clocks.

## Source facts

- Portrait: 63 JPEG frames, numbered 001…063.
- Wrapper: 180vh, absolutely positioned in the original layout.
- Sticky stage: 100vh, top 1.5rem.
- Sequence trigger: top top -> bottom top.
- Frame selection: first + round(progress*(frameCount-1)).
- Desktop size: 35vw × 100vh → 25vw × 65vh.
- Mobile size: 60vw × 50vh → 90vw × 70vh.
- Entry mask: inset(100% 0 0 0) → inset(0), 1.6s, expo.inOut.
- Nav fade: 1s beginning at timeline time 1s.
- Navigation top: max(0,viewportHeight-navHeight-scrollY).

Sticky containment duration and animation progress duration are different. The wrapper's height minus the sticky element's height constrains how long it can remain fixed; the sequence's top-top/bottom-top trigger spans the wrapper's passage. Replacing that interval with a convenient generic viewport distance changes the original pacing.

## A numerical reading

For a 900px-high viewport, an 180vh wrapper is 1620px high. If its top begins at document position 0, the specified sequence interval is approximately 0…1620px.

- p=0 → frame 001
- p=.5 → frame 032
- p=1 → frame 063

At p=.5 the linear desktop dimension mapping gives 30vw × 82.5vh. These are consequences of the source parameters, not independent pixel measurements of every browser state.

## Why mobile is a new composition

The desktop portrait shrinks; the mobile portrait grows. The source therefore does more than change a breakpoint size. It changes the visual direction of the gesture. A faithful lesson is to specify mobile's role separately, not automatically copy this exact size change into MAK.

## Annotated reconstruction core

This example isolates choreography. It assumes decoded image objects are supplied and GSAP/ScrollTrigger are already imported. It does not implement networking, an entire page, artwork or production error UI. It has not been executed in the current documentation-only revision.

```js
export function connectPortrait({
  section,
  media,
  drawFrame,
  frameCount,
  gsap,
  ScrollTrigger,
}) {
  if (frameCount < 1) throw new Error("At least one frame is required");
  gsap.registerPlugin(ScrollTrigger);
  const mediaQueries = gsap.matchMedia();

  mediaQueries.add(
    {
      mobile: "(max-width: 767px)",
      desktop: "(min-width: 768px)",
      reduced: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      const { mobile, reduced } = context.conditions;

      if (reduced) {
        drawFrame(0); // CSS supplies the static composition.
        return;
      }

      const playhead = { frame: 0 };
      const from = mobile
        ? { width: "60vw", height: "50vh" }
        : { width: "35vw", height: "100vh" };
      const to = mobile
        ? { width: "90vw", height: "70vh" }
        : { width: "25vw", height: "65vh" };

      const timeline = gsap.timeline({
        defaults: { duration: 1, ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      // Equal timeline duration and the same starting position make
      // frame selection and dimensions share the same progress.
      timeline.to(
        playhead,
        {
          frame: frameCount - 1,
          onUpdate: () => drawFrame(Math.round(playhead.frame)),
        },
        0,
      );
      timeline.fromTo(media, from, to, 0);

      // GSAP matchMedia owns these animations and reverts them
      // when conditions change or mediaQueries.revert() runs.
    },
  );

  return () => mediaQueries.revert();
}
```

The linear easing is intentional: frame identity must track position predictably. An ease can be introduced intentionally, but applying a strong ease to only frame selection would desynchronize it from the size progression.

The renderer must redraw on media resize even when the selected frame does not change. Changing canvas width or height clears its bitmap. Keep a ResizeObserver in the renderer and schedule redraw once per frame.

## Navigation as geometry

```js
export function connectTravelingNav(nav) {
  const previousTop = nav.style.top;
  let frame = 0;
  const paint = () => {
    frame = 0;
    nav.style.top =
      Math.max(0, innerHeight - nav.offsetHeight - scrollY) + "px";
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(paint);
  };
  const size = new ResizeObserver(schedule);
  size.observe(nav);
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  paint();

  return () => {
    cancelAnimationFrame(frame);
    size.disconnect();
    removeEventListener("scroll", schedule);
    removeEventListener("resize", schedule);
    nav.style.top = previousTop;
  };
}
```

This assumes CSS position:fixed and a viewport-based containing block. A transformed ancestor can change that containing block and break the intended result. The formula is based on document scrolling, not a custom element scroller. This reconstruction is untested in this revision.

## Character wave: why a CSS gradient is not equivalent

Source-verified: heading progress controls how many characters have been crossed. Newly crossed characters briefly take an accent color, then their final color. Backward crossing returns them toward their initial color.

Default source range: top 90% → center 40%; scrub .1; color-wave duration .4s. The forward color phases use 30% and 70% of that duration.

Conceptual implementation:

```js
const nextCount = Math.round(progress * characters.length);
const low = Math.min(previousCount, nextCount);
const high = Math.max(previousCount, nextCount);

for (let i = low; i < high; i++) {
  runningTweens.get(i)?.kill();
  const forward = i < nextCount;
  // forward: accent briefly -> final color
  // backward: return to initial color
  // Store each new tween so direction changes can replace it.
}
previousCount = nextCount;
```

This is a state machine with short timed responses, not merely a continuously moving gradient. During rapid scroll or refresh, a direct state reconciliation is useful so hundreds of obsolete color tweens do not queue.

## Masked type is another mechanism

Source-verified: SplitText line masks hide characters below each line. yPercent 120 → 0 with power4.out, default duration 1s, default stagger .1s per character or .12s per line. Trigger top 85%, replay on downward entry and reset on reverse exit.

A mask must follow the actual font metrics and wrapping. A fallback font changing into the final font can invalidate line boundaries. Preserve accessible text, avoid duplicate announcements, and re-split/revert deliberately. Do not split a sentence by characters without preserving word boundaries.

## Failure modes

- Frame changes feel late: too much smoothing is applied to both page movement and playhead.
- Portrait jumps: geometry was measured before a font or image changed layout.
- Portrait vanishes: canvas backing dimensions changed without a redraw.
- Text becomes noisy: the portrait, character wave and navigation compete at equal contrast.
- Navbar moves in the wrong space: a transformed ancestor became its fixed-position containing block.
- Reverse travel flashes: new character tweens do not replace older tweens.
- Mobile feels like a cramped desktop: layout roles were scaled rather than reconsidered.

## Adaptation variables, not a design prescription

Keep the technique separate from values:

- Media subject and crop.
- Initial/final dimensions.
- Sequence length.
- Reading interval before the next heading.
- Typography scale and line breaks.
- Accent timing and contrast.
- Mobile composition.
- Reduced-motion poster and static geometry.

MAK's one-hero/type-first rules can help choose those variables later. This chapter does not select a final homepage design.
