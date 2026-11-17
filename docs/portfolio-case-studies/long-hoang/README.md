# Long Hoang — a game world with scrollable portfolio panels

**Original website:** [Long Hoang / Lyo](https://longhoang-lyo.com/). **Awwwards credit:** Long Sẹo. The [listing](https://www.awwwards.com/sites/long-hoang-portfolio) identifies **Nominee — 17 November 2026**. This study does not describe the site as an award winner. The site's own metadata identifies its author as Long Hoang, a designer and developer in Hanoi.

**Research date:** 17 November 2026, Asia/Tehran. This is an independent educational analysis, not an official study or a claim that the repository owner created the original website. Project impact figures and experience statements on the site are the creator's claims; they were not independently verified here.

Read [architecture.md](architecture.md) for system diagrams, [implementation-notes.md](implementation-notes.md) for original code and exercises, and [evidence.json](evidence.json) for source identifiers and investigation results.

## Why this portfolio

The current Awwwards portfolio category exposed this entry. Existing documentation and open PRs were checked before selection; it does not repeat Sztanki, Dennis Snellenberg or the four earlier references. This run contributes exactly one new case study.

The distinctive lesson is the boundary between **play and reading**. The world has player controls, physics and interactive objects, while project case studies use ordinary DOM panels with their own scrolling. Direct project URLs can open those panels before full world initialization. This provides a concrete way to study creative interaction without making every piece of portfolio information a game mechanic.

## Evidence and scope

| Evidence                             | What was inspected                                                                                                         | Confidence boundary                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Awwwards listing and published image | Credit, nominee date, description, technology tags and a game-world reference image                                        | Published attribution/presentation, not a live interaction test                           |
| Public delivery                      | HTML, entry/application/world/intro modules, warmup, modal and case-study modules, shared UI utilities, style declarations | Source-supported mechanisms; private source layout and build configuration remain unknown |
| Desktop Chromium, 1440×900           | 3D intro, direct Hanzii case study, section navigation, wheel scrolling, Niubii switching, Back and About                  | Actual captured states; not exhaustive game traversal                                     |
| Emulated mobile, 390×844             | Hanzii layout and native element scrolling                                                                                 | Viewport/touch-capability emulation; no physical touch test                               |
| Reduced motion / JavaScript disabled | Animated section jump under reduced motion; startup overlay hiding the no-JavaScript content                               | Specific tested limitations, not a complete accessibility audit                           |
| Original teaching examples           | Four JavaScript blocks, one GLSL example and 17 focused checks                                                             | Isolated functions and a nested-scroll fixture; not a complete router or game             |

The live browser used TLS-verified Playwright API response routing through the configured proxy. This alters delivery and streaming timing; no load-time, FPS or Core Web Vitals benchmark is claimed. Browser screenshots and retrieved third-party code were retained outside the repository. Only documentation and compact evidence metadata are contributed.

## Design and information architecture

### Playful identity, serious project material

The live intro rendered a stylized vehicle in a 3D environment with roads, props and vegetation. A crosshair, loud outlined lettering and a lime-green entry control establish a game vocabulary. The published Awwwards image shows brightly colored vehicles, a projectile and strong shadows; it supports the intended visual presentation, not a claim that shooting was successfully tested here.

The About route continues the same identity: an oversized outlined “CREATING DIGITAL EMOTION” headline, white space, lime accent and smaller introductory text. Its visual hierarchy is expressive but pushes practical information below a large first-screen title.

Project detail uses a different reading rhythm. The Hanzii page places long visual case-study material on the left and a dark, fixed contents sidebar on the right. The sidebar has a hand-drawn white panel, small hierarchical section labels, a close button and end-of-document project navigation. This gives dense product-design work a persistent orientation aid while retaining the site's illustrated styling.

The source contains direct paths for Work/project detail, About, Contact, Map and Behind the Scene, plus some supporting overlays. Only the paths named in the evidence table were inspected interactively. No contact, contribution, external-link or message action was submitted.

### Concrete visual rules and their costs

| System              | Verified/observed detail                                                                                 | Transferable lesson or trade-off                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Color               | Brand lime `#C7FF72`; dark neutral `#11121A`; white; supporting red/yellow tokens                        | A small strong palette connects game HUD, intro and content panels. Contrast compliance was not measured.                            |
| Typography          | Crocante display family; Barlow body family; large outlined lettering in About/intro                     | Display type carries identity; readable body type must still carry practical information. Fonts are not included in this repository. |
| Shape               | Irregular/doubled outlines, skewed-looking cards, chunky controls and crosshair cues                     | Consistent geometry connects the interface to the stylized world rather than adding unrelated effects to every element.              |
| Desktop case layout | Independent media column plus 280 px sidebar at the tested viewport                                      | Separates long reading content from navigation; nested scrolling needs clear ownership.                                              |
| Mobile case layout  | Full-width media, floating close control, hidden contents UI; no Lenis class on media column             | The input model simplifies, but dense image-based narrative shrinks substantially.                                                   |
| Media               | Responsive `<picture>` sources; width/height and aspect ratio; first two images eager, later images lazy | Reserves space and delays later downloads. This is an implementation policy, not a measured bandwidth saving.                        |
| Narrative           | Most project sections are composed as images/videos with short labels/alt text                           | Preserves art direction but prevents ordinary paragraph reflow, selection and full semantic access to the embedded prose.            |

The site's project pages are not entirely semantic articles merely because the HTML contains a hidden summary and section labels. The captured mobile Hanzii view shows how a visually complete desktop composition can become very small text when reduced to a narrow image. A reusable adaptation should retain charts and illustrations as images while presenting the narrative as real headings, paragraphs and lists.

## Scroll and section-changing behavior

The document has fixed positioning and hidden overflow. Reading occurs inside the project panel's overflowing column. At desktop entry, the measured column was 900 px tall with approximately 33,046 px of content; document `scrollY` stayed zero. The exact height is a captured state, not a stable design token.

Clicking **Strategic Impact** scrolled the column to roughly 2,368 px and marked that contents item current. A subsequent 1,000 px wheel input moved it to roughly 3,368 px and updated the current section to **Design Process**. The source calculates active sections relative to the column's top, with a 120 px threshold. The contents list has its own scroll position and custom scrollbar feedback.

Desktop Lenis uses a 1.2-second configured duration and receives time from GSAP's ticker with a seconds-to-milliseconds conversion. Touch/coarse-pointer mode selects a native scroll listener instead. At 390 px, a wheel-based emulation check moved the native column to 650 px; this was not a finger-swipe test.

Near 92% reading progress, the sidebar replaces its scroll hint with project navigation. A first automation attempt targeted a hidden duplicate Next control and timed out. The corrected sequence used the Business Impact TOC entry, scrolled to the bottom, then activated the sidebar's Next control. It successfully changed Hanzii to Niubii and reset the new column to its top.

**History limitation:** Back then returned the URL to `/work/hanzii`, but the captured panel was `display: none`; the prior Niubii TOC remained in its hidden DOM. Source inspection explains the behavior: the generic modal's `popstate` handler closes the modal rather than reconciling the destination project. This is a bounded observed mismatch, not a claim that every history path fails.

## Engineering findings

| Technology/mechanism    | Evidence and qualification                                                                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Three.js r183           | Runtime canvas marker and delivered Three module. Application configuration explicitly sets `forceWebGL: true`; the word “webgpu” in the canvas marker does not prove the active backend is WebGPU. |
| Rapier physics          | Delivered module includes Rapier WASM initialization; world code creates physics bodies/world and runs fixed simulation steps. Exact package release not established.                               |
| GSAP 3.13.0             | Delivered GSAP module version and application timeline/ticker calls                                                                                                                                 |
| Lenis 1.3.25            | Version literal in the delivered module and actual case-study constructor/ticker integration                                                                                                        |
| Vite-generated delivery | `__vite__mapDeps`, modulepreload helper and dynamic chunk imports support this identification; private toolchain configuration is unknown.                                                          |
| Blender                 | Listed by Awwwards. The authoring pipeline was not independently inspected.                                                                                                                         |
| DOM panel architecture  | Direct element creation, project configuration, modal controller, shared event bus and disposable registry are visible in delivered code. No React/Next.js claim is made.                           |

### Readiness, physics and modal boundaries

The startup coordinator waits for renderer initialization, assets, camera, world bootstrap, enemies and warmup before emitting readiness. Warmup initializes textures, renders groups of meshes/objects and yields to the main thread between work batches. Intro-specific resources have their own preparation. This explains why “downloaded” and “ready for interaction” are different states.

The world source uses a 1/60-second physics step, bounded catch-up and interpolation between previous/current transforms. That is a transferable game-engine technique: movement and collisions should not depend directly on display refresh rate. Grab/release logic restores body-related state, but this study did not establish successful live grabbing, throwing or combat.

Modal locks distinguish pausing **input** from pausing **rendering**. An active project panel makes the world root inert and hidden from the accessibility tree, while keeping the panel outside that root. The generic modal controller also has focus management, Escape handling, animation finalization and cleanup subscriptions. About's panel received initial focus, and a Tab press reached a skill tab in the captured test. Complete keyboard behavior remains unverified.

See [architecture.md](architecture.md) for the direct-route branch, stage responsibilities and ownership diagrams.

## Five lessons to retain

1. **Own nested scroll coordinates.** Use the media column's geometry for progress and TOC selection; keep its scroll engine separate from the sidebar and fixed document.
2. **Make the URL authoritative.** Resolve the visible project on initial navigation and Back/Forward. Closing a modal is not equivalent to restoring a project route.
3. **Use independently owned pause requests.** One overlay must not resume game input or rendering while another still needs it suspended.
4. **Separate simulation and presentation clocks.** Bound fixed-step catch-up, interpolate visuals and reset elapsed-time debt after a pause.
5. **Define several readiness levels.** Make portfolio content available independently, then prepare the optional 3D experience with explicit stages, recovery and a usable exit path.

Each lesson has original code or an integration outline in [implementation-notes.md](implementation-notes.md).

## Critical evaluation and limitations

The strongest architectural decision is the direct content route: a recruiter or collaborator can follow a project link without navigating the world first. The desktop TOC and separate native mobile scrolling also show deliberate adaptation to different tasks and input capabilities.

Reduced-motion support exists in shared panel animations and intro-related logic, so it would be inaccurate to call it absent. However, the tested reduced-motion project page still installed Lenis, and the TOC jump progressed from an intermediate position near 799 px to about 2,368 px. Preference handling needs to reach the scroll subsystem too.

The HTML includes a semantic outline and `noscript` summary, but the JavaScript-disabled browser still displayed the fixed “PREPARING RENDERER...” overlay. Presence of fallback markup is insufficient when the baseline layout obscures it. A failed-script or failed-renderer path also needs a visible content route; `noscript` alone cannot cover those cases.

The 3D intro was reached. A pointer-entry attempt timed out waiting for a moving control to stabilize; a follow-up focused the real entry button and pressed Enter, capturing an animated dotted transition. The final capture still had the intro-active class, so later W/Escape inputs do not establish successful player control. Driver warnings occurred in that headless run. These are bounded automation observations, not proof that ordinary visitors cannot play. The research does not claim complete game traversal, successful combat/grabbing, audible sound evaluation, physical-device touch, cross-browser compatibility, a full accessibility audit or performance measurements.

## References

- [Original portfolio](https://longhoang-lyo.com/), [Hanzii](https://longhoang-lyo.com/work/hanzii), [Niubii](https://longhoang-lyo.com/work/niubii), [About](https://longhoang-lyo.com/about)
- [Awwwards listing](https://www.awwwards.com/sites/long-hoang-portfolio) and [portfolio category](https://www.awwwards.com/websites/portfolio/)
- [Awwwards-published reference image](https://assets.awwwards.com/awards/submissions/2026/10/6ae5d5c3bac73164277129.png): presentation reference, not our live capture
- Public [entry module](https://longhoang-lyo.com/assets/vYUQZzfX.js), [application](https://longhoang-lyo.com/assets/BlAypStk.js), [world](https://longhoang-lyo.com/assets/B1Nq4Kq6.js), [case-study panel](https://longhoang-lyo.com/assets/CZejaJVW.js), [modal controller](https://longhoang-lyo.com/assets/CozVMRND.js), [pause locks](https://longhoang-lyo.com/assets/D9JAKPuk.js), [styles](https://longhoang-lyo.com/assets/BcJjgNcx.css)
- [Evidence metadata](evidence.json) records hashes because deployed asset names and behavior can change.
