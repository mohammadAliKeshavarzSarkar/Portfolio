# Section transition patterns

Based on the existing source captures. New examples below are explanatory reconstructions and have not been executed in this revision.

## Glinto: maintain a reading anchor

Observed: service topics change around a stable desktop reading area while surrounding media changes. Source-verified: the implementation writes normalized section progress into CSS variables and uses fixed copy with entry/exit opacity ramps.

Interpretation: the reading anchor reduces the effort of repeatedly locating the next topic. Supporting imagery supplies variation without requiring the main text to travel across the entire screen.

```js
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const p = clamp01((viewportHeight - rect.top) / (viewportHeight + rect.height));
const incoming = (p - enterAt) / fadeWidth;
const outgoing = (leaveAt - p) / fadeWidth;
const opacity = clamp01(Math.min(incoming, outgoing));
```

Important assumptions:

- rect is viewport-relative.
- fadeWidth must be positive.
- Adjacent panels need coordinated windows if they occupy the same space.
- Transparent interactive content must not remain focusable/clickable.
- A fixed element is still affected by containing-block rules.
- The first/last topic need boundary handling.
- Static/mobile content must not depend on the animated fixed layout.

The formula is more useful than memorizing one site's thresholds. Set the thresholds around the reading interval, then inspect overlap and gaps.

## Glinto: horizontal travel needs a runway

Observed/source-verified at the sampled desktop size: 388px horizontal travel over 582px vertical progression, a 1.5 multiplier.

```js
const travel = Math.max(track.scrollWidth - viewportWidth, 0);
const hold = viewportHeight * holdScreens;
const height = viewportHeight + hold + travel * speedRatio;
const p = clamp01(
  (-runwayRect.top - hold) / Math.max(1, height - viewportHeight - hold),
);
const x = -travel * p;
```

speedRatio is scroll distance allocated per pixel of horizontal movement. Larger values make progression slower and increase page length. hold is a separate reading pause, not an easing trick.

Avoid scroll trapping: preserve vertical navigation, keyboard access and a mobile list/native scroller. Do not add snapping just because it exists in a reusable source component; the inspected Glinto process section did not establish use of its optional snap branch.

## AW Media: spatial depth through overlap

Observed: later project cards cover earlier cards while earlier cards recede.
Source-verified: CSS sticky positions the card; GSAP scales an inner wrapper and increases a dark overlay based on the next card's approach.

Interpretation: the next project becomes dominant while the previous project remains briefly recognizable. Scaling without layered overlap would create a different visual effect.

```html
<article class="sticky-card">
  <div class="scale-layer">
    <div class="project-content">...</div>
    <div class="dim-layer" aria-hidden="true"></div>
  </div>
</article>
```

Ownership:

- sticky-card: flow, top offset and containing section.
- scale-layer: transform-origin and scale.
- dim-layer: opacity; pointer-events:none.
- project-content: real accessible links/text.

```js
const transition = gsap.timeline({
  scrollTrigger: {
    trigger: nextCard,
    start: "top bottom",
    end: () => "top " + parseFloat(getComputedStyle(nextCard).top) + "px",
    scrub: true,
    invalidateOnRefresh: true,
  },
});
transition.to(currentInner, { scale: 0.9, ease: "none" }, 0);
transition.to(currentDim, { opacity: 0.6, ease: "none" }, 0);
```

The final card has no next-card transition. Large cards must still fit a useful viewport region. On shorter screens or with longer text, prefer normal flow rather than clipping content to preserve the effect.

## Raha: reveal content without moving the reading system

Observed/source-verified: ordinary document scrolling with local spring parallax and viewport-entry variants.

Interpretation: a stable case-study structure makes localized entry motion sufficient. Global scroll smoothing is not required to recreate that visual grammar.

Nested transform ownership:

```html
<div class="layout">
  <div class="scroll-layer">
    <div class="pointer-layer">...</div>
  </div>
</div>
```

Normalize pointer location inside the component, not across the entire screen. Use a spring to follow the target and reset it on leave. The source's spring constants are useful evidence but should not be treated as universally correct defaults: element scale and allowed movement change the result.

## Choosing the correct family

| Content need                           | Suitable starting point       | Avoid                                            |
| -------------------------------------- | ----------------------------- | ------------------------------------------------ |
| Compare successive topics in one place | Anchored reading/crossfade    | Simultaneously readable overlapping copy         |
| Show a short ordered process           | Horizontal runway             | Excessively long forced travel                   |
| Present a few distinct visual projects | Sticky stack                  | Tall text-heavy cards with inaccessible overflow |
| Explain a detailed case study          | Native flow and local reveals | Decorative motion on every paragraph             |
| Establish an identity opening          | One coordinated sequence      | Several equally dominant moving subjects         |

These are adaptation guidelines. They do not replace content planning or constitute a final website concept.
