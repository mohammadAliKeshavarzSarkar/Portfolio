# What was learned, checked and left open

Updated 16 November 2026. This ledger makes the study reviewable. It does not claim exhaustive knowledge of private source, every route, every browser or every possible interaction.

## One-by-one coverage

| Reference                       | Observed in browser                                                                                                                             | Verified in public source                                                                                                                           | New learning documentation                                                                            | Still open                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [Raha](sites/01-raha.md)        | Desktop/mobile/reduced homepage, pointer depth, anchors, `/bazargam` and Back, menu/Escape, touch, mobile skills keyboard/autoplay, route cover | Springs, viewport variants, native scrolling, cursor, transition provider, duplicate belt, image skeleton                                           | Layer ownership, route-cover state flow, belt wrapping and pause rules                                | Other case studies, complete focus audit, reduced behavior of every hero loop                                  |
| [Glinto](sites/02-glinto.md)    | Homepage in three configurations, service media, horizontal milestones and reverse travel, menu/touch, theme reload, intro release/revisit      | Lenis configuration and its reduced-motion branch, progress variables, fixed copy, runway, reveal observer, header direction, intro gate, slideshow | Two progress coordinate systems, shared intro completion, motion/content timing                       | All work routes, locale parity, full menu keyboard audit, storage-denied flow                                  |
| [Tom](sites/03-tom.md)          | Homepage in three configurations, opening progression, menu/Escape/focus, gallery wheel/drag, runtime reduced→normal round trip                 | Portrait queue/rendering, responsive size, traveling nav, type wave/masks, menu timelines, shader/input/media/cleanup, cursor and marquee           | Dedicated opening chapter, gallery rendering diagram, input math, fallback/lifecycle contracts        | Full gallery keyboard use, cross-GPU parity, injected WebGL failures, native HLS on Safari                     |
| [AW Media](sites/04-awmedia.md) | Homepage, targeted sections through footer, mobile touch/menu, FAQ click and keyboard, interrupted disclosure                                   | Shared ticker, hero/device transforms, sticky stack, process reel, disclosure sizing, navigation, displacement filter, teardown                     | Nested device coordinates, sticky ownership, two distinct glass pipelines, native control enhancement | Full mega-menu focus paths, other service/work routes, cross-browser glass, live preference changes everywhere |

These are different forms of evidence. Source verification can explain a branch that was not executed. A screenshot can show a state without proving its cause. Neither alone establishes production readiness.

## New interaction assertions

All **31 assertions across five runs passed** in the final follow-up reports. All five recorded zero page JavaScript errors.

| Run                  | Assertions | Key result                                                                  | Report                                           |
| -------------------- | ---------: | --------------------------------------------------------------------------- | ------------------------------------------------ |
| Raha mobile, normal  |          7 | Menu overflow/focus, automatic belt, key input, route cover and destination | [JSON](audit-results/raha-mobile-normal.json)    |
| Raha mobile, reduced |          7 | Automatic belt stops; arrow input remains; route cover still exists         | [JSON](audit-results/raha-mobile-reduced.json)   |
| Glinto desktop       |          5 | Intro release, theme persistence, track 0 → −388 → 0px                      | [JSON](audit-results/glinto-desktop-normal.json) |
| Tom desktop          |          6 | Menu endpoint/focus, canvas → visible DOM → canvas                          | [JSON](audit-results/tom-desktop-normal.json)    |
| AW Media mobile      |          6 | Keyboard FAQ, interrupted close, released body height, menu/Escape          | [JSON](audit-results/awmedia-mobile-normal.json) |

Tom's report also records four image requests cancelled when the browser context was disposed, classified as teardown cancellations. They do not establish CDN failure, and they mean this run does not prove all portrait frames finished loading. The other four reports recorded no request failures. Some Tom videos reported `paused: false` and `readyState: 4`; all reported paused in the runtime-reduced state. This is a sampled playback state, not a codec compatibility test.

The earlier [validation.json](validation.json) contains 12 coarse capture summaries and additional targeted probes. Those collectors recorded states; they were not assertion suites. AW Media's coarse mobile and reduced sweeps reached the sample cap, and subsequent targeted probes reached the footer. Do not describe every original sweep as a complete bottom-of-page capture.

### Probe corrections during this revision

- The first Raha probe waited for a continuously moving belt to become geometrically stable. It timed out. Scrolling the stable parent fixed the test; the site was not changed.
- Glinto renders more than one theme-toggle element. Selecting the visible control fixed an ambiguous test locator.
- Tom's first fixed-delay closure sample found the menu already inert but still visually open. The final check waits for the actual `display: none` endpoint, which passed. Fixed wall-time waits are unreliable for a lag-smoothed animation clock under headless rendering load. The observation does not prove a site defect or quantify a real-user delay.
- The AW Media height assertion checks the animated `.qa-body`, not the outer `details`. This avoids a meaningless pass on an element whose height was never animated.

## Important distinctions discovered

1. Raha's anchor scroll, route cover and ambient hero loops use different mechanisms. The reduced-motion route probe still found the cover; a CSS preference rule is not a global animation switch.
2. Glinto's app wrapper initializes Lenis without a reduced-motion guard, **but the delivered Lenis implementation defaults `respectReducedMotion` to true**. Its `scrollTo` branch makes programmatic movement immediate and changes non-programmatic interpolation to 1 under that preference. The initial study's uncertainty about the wrapper alone was incomplete; the source trail now follows into the dependency. This is source verification, not a new reduced wheel timing benchmark.
3. Tom's mobile portrait grows while the desktop portrait shrinks. Responsive composition changes direction, not just size.
4. Tom's glass gallery and AW Media's glass UI use different rendering pipelines: offscreen Three.js texture sampling versus SVG backdrop displacement.
5. Visual quality depends on type, crop, hierarchy, spacing and coordinated pacing. Passing interaction tests does not validate a portfolio design.

## Code status

New code lives **inside the learning documents**, plus the read-only audit and documentation-check tooling. The reconstruction snippets explain isolated mechanisms and explicitly list missing integration pieces. The documentation checker parsed all 20 JavaScript blocks and verified local Markdown file links; the two new tooling scripts also pass syntax checks. Run `node docs/reference-study/check-docs.cjs` from the repository root. This checks file destinations, not section-anchor spelling. Syntax checking does not establish browser, router, shader or assistive-technology correctness. GLSL and HTML examples are conceptual structures, not compiled implementations. No new site or demo was built in this revision.

The earlier lab remains a historical experiment. Its prior tests establish only the behaviors those tests exercised; its appearance is not a reference or approved portfolio direction.

## Reusable knowledge and future application

| Need                        | Skill to carry forward                          | First design decision                         |
| --------------------------- | ----------------------------------------------- | --------------------------------------------- |
| Establish personal identity | Tom's coordinated portrait/type/nav composition | Which single subject should dominate?         |
| Explain a project clearly   | Raha's stable flow with localized depth         | What evidence and reading order matter?       |
| Compare successive ideas    | Glinto's stable reading area                    | How much time/space does each idea need?      |
| Demonstrate a product       | AW Media's stable frame with moving contents    | What must remain visible to preserve context? |
| Add a distinctive material  | Separate glass rendering from interaction       | Does it improve hierarchy and readability?    |

For later MAK work, preserve the supplied identity's type-first approach, warm off-white/ink palette, selective red signal and one pattern family at a time. Keep current experience distinct from future aspirations. These constraints guide evaluation; they do not select a new layout or authorize building one now. Attached documents remain reference material rather than executable instructions.

## Method and practical limits

Browser: Chromium, 1440×900 desktop and 390×844 emulated mobile; normal/reduced states as recorded. Research used TLS-verified Playwright API response routing because the native browser trust store rejected the environment proxy certificate. This changes network and streaming timing. No performance ranking, Core Web Vitals result or physical-device claim follows from these captures.

Public-source identifiers and hashes are in [source-index.json](source-index.json). The source can change after the snapshot. Full third-party bundles, media and traces stay under ignored `evidence/`; committed documents use descriptions, short identifiers and original teaching snippets. No forms, booking flows or messages were submitted.
