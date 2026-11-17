# Dennis Snellenberg — coordinating scroll, routes and pointer motion

**Original portfolio:** [dennissnellenberg.com](https://dennissnellenberg.com/). **Creator credited by Awwwards:** Dennis Snellenberg. The [Awwwards listing](https://www.awwwards.com/sites/dennis-snellenberg) identifies **Site of the Day — 4 April 2022**, with a score of 7.35/10 at inspection time.

**Research date:** 17 November 2026, Asia/Tehran. This is an independent educational analysis. Dennis's portfolio, visual assets and original engineering are not the repository owner's work. This study examines the **live version served on the research date**; it does not assert that the current content or code is identical to the 2022 award submission.

Read [architecture.md](architecture.md) for the coordination model and [implementation-notes.md](implementation-notes.md) for original code, alternatives and exercises. [evidence.json](evidence.json) contains source hashes, bounded browser observations and example-validation results.

## Selection and investigation

The Awwwards portfolio category and individual listing were inspected. Existing case-study folders and open repository PRs were checked before selection; Dennis was not already documented. This run adds exactly one portfolio. The educational value is a readable implementation of a familiar challenge: several animation systems must agree about scroll position, page lifetime and interaction state.

| Evidence class                          | What was inspected                                                                                     | What it supports                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Verified: published listing**         | Individual Awwwards listing                                                                            | Creator credit, award date and listed score                                                                      |
| **Verified: public delivery**           | Live HTML, application JS, Locomotive script, styleguide, components and main CSS                      | Markup structure, library URLs, animation functions, CSS values and lifecycle responsibilities                   |
| **Observed: desktop browser**           | Headless Chromium at 1440×900; Home, Work, TWICE project and About                                     | Rendered layouts, scrolling, menu/Escape, filters, view persistence, hover preview, internal navigation and Back |
| **Observed: emulated mobile**           | 390×844 with touch capability; Home, menu, Work                                                        | Narrow layouts, menu navigation, hidden pointer preview and visible project cards                                |
| **Observed: preference/failure checks** | Reduced-motion desktop context; separate JavaScript-disabled context                                   | Motion still active under reduced motion; loader obscuring the no-JavaScript page                                |
| **Inferred**                            | Explanations of hierarchy, continuity and design intent                                                | Independent interpretation, not quotations from Dennis                                                           |
| **Unknown**                             | Private architecture, CMS/backend, production performance, full accessibility and device compatibility | Not established by these observations                                                                            |

Browser requests used TLS-verified Playwright API response routing through the environment proxy because native Chromium certificate handling was unsuitable for this environment. This changes network/streaming timing. Screenshots were inspected locally; neither artwork nor third-party source is redistributed here.

## Design and information architecture

### A recognizable person, then evidence of work

The homepage's first viewport is dominated by a portrait against gray. White oversized name lettering runs across it, with the professional role readable separately. A Netherlands location marker and compact navigation provide context without competing with the portrait. The moving name acts as a visual signature; the separate role text carries practical information while the name is cropped.

Work shifts to a white, spacious editorial composition: an oversized heading, category pills, optional row/column controls, then project content. Desktop rows expose client, location, services and year. The default list is useful for scanning experience; the hovering image supplies visual evidence on demand. The column view exchanges density for persistent imagery.

The TWICE detail page starts with a large project title and clear role, credit, location/year metadata before large media. It explicitly credits **Dylan Brouwer for design**, while Dennis's role is interaction and development. That separation is worth learning: the portfolio communicates contribution instead of implying sole authorship of every project. Its external “Live site” control was not activated during this study.

About repeats the large-heading hierarchy, a blue circular globe accent, concise supporting text and photography. Work, About and Contact are real navigation destinations in the HTML. Contact's form behavior and submission were not tested.

### Concrete visual rules

| Element          | Inspected evidence                                                                                                       | Design interpretation and trade-off                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Typography       | `Dennis Sans` CSS family maps to `NeueMontreal-*.otf` files; regular declared weight 450, light 300, bold 800            | A restrained sans-serif system supports enormous headings and quieter metadata. These are source declarations, not font redistribution rights. |
| Palette          | Dark `#1C1D20`, deeper dark `#141517`, white, gray `#999D9E`, blue `#455CE9`                                             | Neutral structure lets project imagery lead; blue marks prominent interactive moments. Contrast compliance was not measured.                   |
| Spacing          | Section padding `clamp(5em, 21vh, 12em)` and container padding `clamp(2.5em, 8vw, 8em)`, with breakpoint overrides       | Viewport-sensitive whitespace gives headings room while limiting extreme desktop spacing. It is not one fixed 12-column grid.                  |
| Work composition | Metadata columns in rows; two-column tile CSS on wider screens                                                           | Supports both scanning and image browsing; maintaining two presentations introduces synchronization work.                                      |
| Shape            | Circular action controls, hairline dividers, pill filters, curved transition edges                                       | Repetition connects navigation and content without requiring a different visual effect for every section.                                      |
| Mobile           | At 390 px, compact Menu control, cropped portrait/name, role near the bottom; Work uses cards and hides row presentation | The interaction model changes for touch. Narrowing the desktop table alone would lose useful visual evidence.                                  |

The interpretation is that consistency makes the motion legible: broad page sweeps, small control displacement and restrained content reveals have different jobs. The design's weakness is that continuous decorative motion and a long introductory sequence can delay direct access to information.

## Motion: what moves, and how

| Interaction           | Mechanism verified in public code                                                                                                                 | Browser evidence / limit                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| First arrival         | Multilingual greeting sequence; loading screen moves above viewport; content rises into place; scroller stops/starts around the sequence          | Settled Home rendered in desktop and mobile checks; no timing benchmark                                                                      |
| Smooth desktop scroll | Locomotive transforms scroll sections; scroller proxy connects its position to ScrollTrigger                                                      | Repeated wheel input moved the first section to approximately −672 px while document `scrollY` stayed zero                                   |
| Name loop             | Cloned text, repeating GSAP timeline with 18-second configured duration; scroll direction changes timeline `timeScale`; resize repositions clones | Two reduced-motion samples 600 ms apart had different x transforms; full loop continuity and resize correctness were not exhaustively tested |
| Scroll reveals        | ScrollTrigger entrances for split lines/fades; scrubbed arrow rotation and footer geometry                                                        | Source-verified; footer sequence was not separately exercised                                                                                |
| Menu                  | Class-driven fixed panel transform, dimmed backdrop and rounded edge; scrolling paused; Escape closes                                             | Desktop open/Escape and mobile open → Work succeeded                                                                                         |
| Page change           | Persistent cover moves vertically; rounded wrapper heights change; destination word comes from next HTML; incoming content animates separately    | Home → Work, Work → TWICE, Back, and About/Home transitions succeeded; About cover captured at viewport top 0                                |
| Magnetic controls     | Pointer position normalized against a target rectangle; different strengths for button and text; elastic reset                                    | Source-verified; no isolated quantitative magnetic-motion test                                                                               |
| Work preview          | Separate delayed image/button/text coordinates; clipped vertical image strip selected by visible row index                                        | Hovering TWICE displayed its preview and View control; clicking opened its case page                                                         |
| Filters and layout    | Class changes plus timed fades, scroll reset, dimension updates and trigger refresh; view stored in a cookie                                      | Design changed 11 visible rows to 7; columns survived reload; switching back restored rows                                                   |

The smooth-scroll root itself had `transform: none`; its child sections carried the actual translation. A useful debugging lesson is to inspect the elements that visually move rather than assume the named scroll container is always transformed.

The transition cover is DOM/CSS geometry animated with GSAP. The inspected mechanism does not require a shader or a 3D renderer. Its rounded edge is a wrapper/rounded-div construction, not evidence of a WebGL fluid simulation.

## Verified technology and architecture

| Finding                                         | Confidence and basis                                                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| GSAP and ScrollTrigger 3.9.1                    | Versioned script URLs in HTML; runtime GSAP version inspected; `registerPlugin`, timelines and triggers in application source |
| Barba core 2.10.3                               | Versioned script URL, `barba.init()` and route hooks in application source; a window sentinel survived Home → Work            |
| Locomotive Scroll                               | Delivered script and actual constructor/proxy integration; exact release not established                                      |
| jQuery 3.5.1                                    | Versioned script URL and extensive `$()` event/class operations                                                               |
| js-cookie 2.2.0                                 | Versioned script URL and `Cookies.set/get` view preference code                                                               |
| vanilla-lazyload 17.6.1                         | Versioned script URL and application lazy-load initialization; not a complete loading-performance audit                       |
| Server-delivered content plus client navigation | Real headings, anchors and Barba containers in initial HTML; observed partial-page route replacement                          |
| Backend, CMS, private component system          | Unknown; asset paths and rendered markup do not establish these                                                               |

The conceptual architecture is a persistent document/cover around a replaced `main`. Each page creates its scrolling and interactions again. [The architecture document](architecture.md) distinguishes the actual hook responsibilities from a recommended lifecycle with explicit ownership and animation completion.

The inspected source itself acknowledges earlier community examples for magnetic controls, delayed cursors and looping text. This analysis does not claim Dennis invented every underlying technique. Those techniques' integration and art direction are the subject of the study; the teaching snippets here were written independently.

## Five transferable skills

1. **Coordinate scroll systems.** Distinguish geometry refresh from progress update. Native scroll and a transformed-scroller adapter require different event sources. Test section coordinates, focus, anchors and pinning together.
2. **Own route resources.** Treat scroll instances, triggers, repeating animations and document listeners as page resources. Await actual animation completion and provide a readable recovery path when fetch or mounting fails.
3. **Engineer pointer previews.** Separate tracking, scale and image-strip transforms; use elapsed-time damping and stable project identities. Keep essential project information available without hover.
4. **Model filter and view state.** Derive rows, tiles and image order from the same project data. Persist only deliberate preferences, cancel stale transitions and refresh geometry after layout changes.
5. **Preserve access when motion fails or is unwanted.** Use semantic controls, focus restoration, a readable no-JavaScript baseline and a preference policy that actually disables loops, large transitions and virtual scrolling.

Each skill has implementation guidance, caveats and original code or integration pseudocode in [implementation-notes.md](implementation-notes.md).

## Critical evaluation

**What works in the checked paths:** the list/grid option supports different browsing goals; project roles and credits establish useful context; mobile retains images without requiring hover. Successful internal navigation and Back preserve the feel of one continuous interface. Two About/Home cycles ended with one Barba container, one scrollbar and eight Home ScrollTriggers. These bounded counts are encouraging but do not prove leak-free behavior.

**Keyboard semantics need improvement:** the inspected hamburger is a `div`; the compact Menu control is an `li` containing a clickable `div`. Captured controls had no `tabindex`, button role or `aria-expanded`. The inspected handler supports Escape, but does not establish initial keyboard activation, modal focus containment or focus return. This is a specific finding, not a complete screen-reader/accessibility audit.

**Reduced motion is incomplete in the tested path:** at `prefers-reduced-motion: reduce`, the name's transform kept changing, transformed scrolling remained active, and the About route cover still appeared. No corresponding preference handling was found in the inspected application JS and three principal CSS files. That bounded source search does not cover every possible dependency or future version.

**Content delivery alone is not progressive enhancement:** with JavaScript disabled, Home's content was present in the HTML but the captured screen remained dark with the loading screen at top 0. The failed baseline shows why a loader should be opt-in, recoverable enhancement.

**Lifecycle cleanup deserves attention:** trigger destruction is explicit, but several globally attached listeners and repeating animations lack paired disposal in the inspected functions. Fixed-delay filter and route coordination also couples correctness to animation durations. These are source-supported maintenance risks, not measured memory/performance failures.

## References and investigation limits

- [Original portfolio](https://dennissnellenberg.com/), [Work](https://dennissnellenberg.com/work), [TWICE](https://dennissnellenberg.com/work/twice), [About](https://dennissnellenberg.com/about)
- [Awwwards listing](https://www.awwwards.com/sites/dennis-snellenberg) and [portfolio category](https://www.awwwards.com/websites/portfolio/)
- Public [application JS](https://dennissnellenberg.com/assets/js/index-new.js), [styleguide](https://dennissnellenberg.com/assets/css/styleguide.css), [main styles](https://dennissnellenberg.com/assets/css/style-new.css), [components](https://dennissnellenberg.com/assets/css/components.css), [Locomotive script](https://dennissnellenberg.com/assets/js/locomotive-scroll.min.js)
- [Evidence metadata](evidence.json) and [library documentation / exercises](implementation-notes.md#further-reading)

Initial desktop attempts used too little accumulated wheel movement to reveal the hamburger; a later About selector also targeted the offscreen navigation copy. Those automation attempts timed out. Repeated wheel input and targeting an open menu/header resolved them. They are not reported as production-site failures. Settled successful paths recorded no page exceptions; this does not certify every route or dependency.

Not tested: physical touch gestures, Safari/Firefox, every breakpoint, full project media playback, contact submission, external project navigation, comprehensive Tab order or screen-reader behavior, contrast compliance, GPU/CPU load, memory growth, FPS or Core Web Vitals. No personal messages or form submissions were sent. The examples teach isolated techniques; no website, third-party bundle, font, image or video is included in this contribution.
