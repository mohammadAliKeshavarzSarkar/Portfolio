# Reading motion as a design system

Revision: 16 November 2026. Based on the captures and public source inspected on 15 November. No new live observation is claimed.

This is a learning reference, not a proposed portfolio design. The earlier lab is not the visual target.

## Four kinds of evidence

- Observed: visible behavior reproduced in a captured browser state.
- Source-verified: a selector, formula, value or branch found in delivered code.
- Interpretation: an explanation of the visual purpose; it is not a claim about the original designer's intent.
- Reconstruction: original annotated code illustrating the mechanism; it is not the site's source.

## What was missing from the first study

An inventory of libraries and animation properties does not explain composition. Before documenting a tween, establish:

1. What the viewer should look at.
2. What remains stable.
3. What changes and why.
4. The spatial interval allocated to that change.
5. How attention passes to the next section.
6. What reverses when the viewer scrolls back.
7. What remains understandable with motion removed.

## A reusable effect contract

For each technique, document:

- Reference URL, capture conditions and evidence.
- Perceived effect in plain language.
- Visual purpose, explicitly labeled interpretation.
- DOM hierarchy and containing blocks.
- Trigger, start/end boundaries and coordinate system.
- State inputs and animated outputs.
- Timeline phases and easing.
- Layering, clipping, typography and negative space.
- Annotated implementation core.
- Cleanup, responsive behavior and reduced motion.
- Failure modes and debugging observations.
- Appropriate use, inappropriate use and adaptation variables.

## Quality criteria

| Criterion         | Question                                                        |
| ----------------- | --------------------------------------------------------------- |
| Hierarchy         | Is one subject clearly dominant at each moment?                 |
| Continuity        | Can the eye follow the same object across the transition?       |
| Pacing            | Is enough scroll distance allocated to reading and recognition? |
| Restraint         | Which elements remain still?                                    |
| Legibility        | Are words readable over every intermediate state?               |
| Reversibility     | Does upward scrolling make sense?                               |
| Input fidelity    | Does movement remain connected to wheel/touch input?            |
| Adaptation        | Is mobile composed deliberately rather than uniformly reduced?  |
| Failure tolerance | Is the content usable when animation/media fails?               |

These are review criteria, not numeric scores assigned to the references.

## Why copying an effect can still look poor

A technically correct animation can have the wrong type scale, line breaks, image crop, contrast, alignment or duration. More effects do not repair those relationships.

The earlier learning demo demonstrated mechanisms, but its initial overlapping text and pattern showed this exact problem: implementation success did not establish visual quality. Future documentation must explain the relationships rather than use that demo as a design recommendation.

## Four distinct visual grammars

- Raha: persistent navigation and clear case-study content form a stable base; localized motion adds depth and entry rhythm.
- Glinto: a stable reading area and controlled substitutions create continuity; floating imagery supplies secondary motion.
- Tom: expressive typography and a portrait establish identity; scale and position change while recognizable elements connect chapters.
- AW Media: visible project/device objects persist while their internal content or relative depth changes.

These descriptions are interpretations grounded in the captured layouts. They should guide questions, not prescribe a combined design.

## Motion ownership

Keep three layers separate:

- Layout wrapper: document flow and sticky positioning.
- Motion wrapper: scroll-derived translation/scale.
- Interaction wrapper: hover/pointer response.

Two systems writing transform on the same element will overwrite each other or create hard-to-debug composition. A nested structure makes ownership explicit.

## Debugging order

Check geometry before easing:

1. Confirm document and viewport coordinates.
2. Confirm the intended scroll container.
3. Confirm the containing block and sticky range.
4. Remove animations and inspect the static composition.
5. Restore one animated property at a time.
6. Inspect start, midpoint, completion and reverse travel.
7. Then adjust easing and smoothing.

Do not use screenshot attractiveness alone as evidence of correct interaction.
