# Sztanki's Portfolio — a website rendered as a set of 3D scenes

**Original portfolio:** [Attila Sztankovics / Sztanki](https://www.sztanki.com/). **Awwwards credits:** Ginrin and Sztanki. The [listing](https://www.awwwards.com/sites/sztankis-portfolio) describes Attila as an interactive designer and creative technologist based in Austin. It labels the entry **Nominee — 14 November 2026** at inspection time; this study does not call it an award winner or assign unverified design/development roles to the credited parties.

**Research date:** 16 November 2026, Asia/Tehran. This is an independent educational analysis for the Portfolio research repository. It is not an official study, and the original website, artwork and engineering are not the repository owner's work.

## Why this portfolio

The [Awwwards portfolio category](https://www.awwwards.com/websites/portfolio/) exposed this listing. The repository's existing four references and open documentation PR were checked before selection; Sztanki was not previously documented. This run contributes exactly one case study. Earlier unfinished Romain Avalle research is not included.

The educational distinction is architectural: text, navigation and content participate in the 3D renderer. Scrolling moves cameras through scenes; transitions combine rendered scenes. The code also contains asset preparation, shader compilation, quality tiers, routing and resource cleanup. This provides concrete material for studying the costs of making a portfolio behave like an interactive graphics application.

## Evidence and investigation result

| Evidence class                  | What was actually inspected                                                                                                              | What it establishes                                                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Verified: published listing** | Awwwards category, individual listing and three published element images                                                                 | Credits, nominee status, reference composition of About, Work and Contact                                                                      |
| **Verified: public code**       | Live HTML, CSS and delivered application JavaScript, formatted locally for reading                                                       | Bootstrap, scene configuration, camera controller, router, transition controller, typography assets and quality policy                         |
| **Observed: browser attempts**  | Chromium at 1440×900 and emulated mobile at 390×844; wheel/Tab attempts; a separate software-WebGPU retry; direct-route attempts         | Rendering failures, partial Contact content, canvas-only DOM states and bounded URL/history changes; **not a successful end-to-end traversal** |
| **Inferred**                    | Explanations of hierarchy, spatial continuity and engineering intent                                                                     | Reasoned interpretation, not statements from the creators                                                                                      |
| **Unknown**                     | Private source organization, authoring workflow, production device performance, complete accessibility and successful mobile interaction | Not established by this study                                                                                                                  |

Default browser runs reported no available WebGPU adapter, followed by Three.js's WebGL2 fallback warning, shader errors and a loader that did not reach a usable homepage in the captured states. An additional software-WebGPU attempt obtained an adapter but encountered device/buffer errors and a blank capture. This makes “adapter available” an insufficient success criterion. It does **not** establish that the site fails on normal hardware or identify the root cause of every error.

A targeted Contact follow-up did render its text panel and icon tiles after wheel input while document `scrollY` remained zero. Clicking the visible About navigation changed the URL to `/about/`; the next capture still showed Contact content and a renderer exception was recorded. Browser Back returned the URL to `/contact/`. Six Tab presses left focus on the body, with zero DOM focusable controls in that captured state. These observations verify parts of input and history handling, not successful destination rendering.

The live attempts used TLS-verified Playwright response routing because Chromium's native certificate store did not trust the environment proxy. This changes network timing. Screenshots, artwork and third-party bundles are not redistributed in this PR. [Evidence metadata](evidence.json) records URLs, source hashes, attempt conditions and diagnostic summaries. The composition analysis below uses Awwwards-published images; the separate Contact follow-up provides limited live corroboration. Neither establishes a completed live traversal.

## Design and UX analysis

### Layout and visual hierarchy

The [About image](https://www.awwwards.com/inspiration/about-page-sztankis-portfolio) places a large blue particle portrait behind curved text panels. A compact navigation panel remains at the upper left. The central text panel has a relatively quiet fill, allowing the description to read against the detailed particle field. Neighboring panels turn away from the viewer, implying more content beyond the central focus.

The [Work image](https://www.awwwards.com/inspiration/work-page-sztankis-portfolio) gives one project image the largest area and strongest detail. Smaller or softer surrounding images establish a collection. The [Contact image](https://www.awwwards.com/inspiration/contact-page-sztankis-portfolio) repeats the curved panel language above five icon tiles, against a vertical particle structure.

**Interpretation:** this consistency makes the sections feel like locations within one environment. The persistent navigation supplies orientation while the central subject changes. Depth separates foreground information from supporting imagery. The trade-off is reading effort: perspective, small angled text and textured backgrounds can work against quick scanning.

This is not evidence of a conventional CSS column grid. The code specifies world-space positions, rotations and camera paths. The header converts viewport dimensions into world-space placement using the camera's field of view; its scale is based on a 50-pixel conversion. Geometric scene layout supplies much of the apparent spacing.

### Typography and color

The inspected configuration references **Excon** regular, medium and bold atlases, and **Antonio Semibold** for navigation, buttons and some card titles. These are canvas text assets, not evidence that the HTML body has those CSS fonts. Role-specific size values are scene units; quoting them as CSS pixels would be misleading.

Source tokens include dark navy `#051126`, pale text `#B5CFFF`, brighter hover text `#6BB8FF` and blue transition color `#3D8BFF`. The published images show a coherent blue family rather than many competing accents. Bright edges, particles and active labels share that palette. Their relationship works best when the content panel remains visually quieter than its surroundings. No contrast-ratio audit was performed.

### Information architecture and motion

The public content model defines **Home → About → Work → Contact**, plus project-detail routes and a 404 page. The Home call to action points to About. Work contains project metadata and section-based case-study data. The controller understands `/work/<slug>/`, while the header switches to a close control in a project detail.

**Source-verified mechanism:** input updates a damped camera controller. Near a section's end, two scenes are rendered into separate targets and combined through transition uniforms. The next page must be prepared before progression crosses the boundary. Menu activation uses timed transition logic; browser history has a separate `popstate` path. These branches were read, but their successful end-to-end behavior was not reproduced here.

The micro-interaction code changes 3D label color and panel hover state and filters raycast targets by scene/activity. This is a different input model from native HTML links with CSS hover. Its coordination burden includes hit testing, focus alternatives, active-page state and interrupted transitions.

### Responsive adaptation

The source selects portrait-specific layout adjustments, typography values, camera offsets and reduced yaw. It supplies a separate mobile hint and initially gates the Home touch-scroll range until the journey control is activated. The header still uses a row of scene buttons; no successful mobile menu interaction is claimed.

The 390×844 browser attempt reached the loader with errors. Consequently, mobile legibility, touch-target sizes, orientation changes and the final mobile composition remain **unverified**. Source branches demonstrate an adaptation strategy, not proof of its usability.

## Front-end engineering: verified, inferred, unknown

| Claim                                                                 | Status                         | Evidence and qualification                                                                                                       |
| --------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Three.js renderer stack, including WebGPU/TSL modules                 | **Verified**                   | HTML module preloads, application imports and runtime Three.js fallback diagnostics                                              |
| Dairamon runtime code in the delivered application                    | **Verified**                   | Named Dairamon/WebGPU registrations, `dairamon-js` diagnostics and `_DAIRAMON_WEBGPU_` marker; private package layout is unknown |
| Vite-generated bundle output                                          | **Verified build fingerprint** | `__vite__mapDeps` helper; does not identify a UI framework or the original build configuration                                   |
| Custom tween/ticker abstraction                                       | **Verified**                   | Application tween object instantiates its own manager, with `to`, `cancel` and a delta-time update loop                          |
| GSAP, React, Next.js, Vue or Nuxt as the site's application framework | **Unknown / not established**  | No positive evidence in the inspected entry source; animation appearance is not proof of a library                               |
| Bitmap/font-atlas 3D text and raycast interaction                     | **Verified**                   | Font aliases/loaders, scene text components, raycaster and event registry                                                        |
| Asset chunks, next-page preparation and shader precompilation         | **Verified**                   | `preparePage`, `buildPage`, `preCompilePage`, `readyPages` and loading events                                                    |
| A CMS, original component filenames or deployment platform            | **Unknown**                    | Public content objects and hashed files do not establish private authoring infrastructure                                        |
| Figma and Blender in the production workflow                          | **Listing-reported**           | Awwwards tags name them; actual design files and modeling workflow were not inspected                                            |

See [architecture.md](architecture.md) for the component model and state transitions. Its names describe responsibilities found in delivered code, not an invented private repository structure.

## Five transferable lessons

| Lesson                                                    | Why it matters                                                                  | Cost or constraint                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Separate input, camera progress and rendered output       | Smooth motion needs one understandable coordinate model                         | Momentum, camera paths and transition progress can otherwise drift apart        |
| Make scene readiness part of navigation                   | A destination is not ready merely because its URL exists                        | Asset decoding and shader compilation can fail or stall                         |
| Treat quality and compatibility as different decisions    | Lower particle density cannot repair an unsupported shader path                 | Validate actual rendering and retain a usable fallback                          |
| Keep content and style roles separate from scene geometry | Copy changes should not require editing shader code                             | World-space text still needs layout, font coverage and localization testing     |
| Preserve semantic navigation independently of the canvas  | A visual button is not automatically a keyboard or assistive-technology control | A second presentation layer must stay synchronized and avoid duplicate controls |

[Implementation notes](implementation-notes.md) provide original, bounded examples and exercises for these lessons.

## Critical evaluation

The strongest transferable idea is the separation between content, scene state and the final composited image. A portfolio can present a coherent spatial journey without placing all logic in a single animation timeline. Next-page preparation and quality policies show attention to the engineering work behind that continuity.

The main concern is dependency on the graphics path for basic access. The initial HTML body contains a canvas host and no portfolio copy or ordinary navigation. Captured application states had no HTML links, buttons or headings. Six Tab presses in the partial Contact view left focus on the body; no usable keyboard navigation path was established. Because the renderer did not complete normally, this is not a full accessibility audit of the finished application; it does demonstrate that the observed failure state offered no semantic content fallback.

No `prefers-reduced-motion` match was found in the inspected application bundle. That bounded search does not prove absence from every dependency or runtime path. Reduced-motion behavior was not successfully tested. A reusable implementation should make that preference explicit rather than assume GPU quality tiers address it.

A good adaptation would retain the spatial presentation as an enhancement while keeping readable project content and real links available. This recommendation is independent analysis, not a claim that the original creator intended a particular trade-off. No replacement portfolio is built in this study.

## References and limits

- [Awwwards portfolio category](https://www.awwwards.com/websites/portfolio/) and [Sztanki listing](https://www.awwwards.com/sites/sztankis-portfolio): discovery, credits, nominee status and published image references.
- [Original site](https://www.sztanki.com/), [application bundle](https://www.sztanki.com/assets/js/index-Dk_P2Bqq.js), [stylesheet](https://www.sztanki.com/assets/css/index-Y7hPqSnr.css): inspected public delivery, not private source.
- Awwwards element pages: [About](https://www.awwwards.com/inspiration/about-page-sztankis-portfolio), [Work](https://www.awwwards.com/inspiration/work-page-sztankis-portfolio), [Contact](https://www.awwwards.com/inspiration/contact-page-sztankis-portfolio). These images support composition analysis, not motion timing or mobile behavior.
- [Evidence metadata](evidence.json): exact inspection conditions, source identifiers and bounded failures.

Not established: successful full live traversal, project interaction correctness, physical-device touch, cross-browser compatibility, screen-reader behavior, contrast compliance, FPS, memory usage or Core Web Vitals. No forms, messages, external project actions or contact controls were activated. No copyrighted artwork or third-party source files are included in this contribution.
