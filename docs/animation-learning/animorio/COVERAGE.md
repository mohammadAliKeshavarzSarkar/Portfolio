# Coverage and next learning priorities

**23 November 2026 · Asia/Tehran.** This matrix separates catalog research, independently written exercises and application/device validation. A passing exercise does not certify the original reference or every possible integration.

## Research coverage

| Evidence                         | Scope                                                               |
| -------------------------------- | ------------------------------------------------------------------- |
| Catalog inventory                | 1,957 entries captured on 18 November; metadata only for 1,945      |
| Source review                    | Ten complete standalone scripts plus relevant markup/styles         |
| Incomplete source access         | Melting sheet and Glass word returned HTTP 503 during initial study |
| Live reference browser checks    | Four demos, two configurations each, plus gallery wheel follow-up   |
| Original lesson browser fixtures | Chromium; GPU exercises use software WebGL                          |

See [evidence.json](evidence.json), [catalog.csv](catalog.csv) and [reference browser observations](BROWSER-CHECKS.md). Subsequent lesson tests do not expand the number of live reference demos reviewed.

## Runnable original exercises

Commands below are relative to `docs/animation-learning/animorio/`. Run them with Node from that directory, or prefix the directory from repository root. Browser commands require Playwright and Chromium; they do not install dependencies. Most accept `CHROMIUM_PATH` for a different executable. Results describe the recorded development environment, not portability to any machine.

| Subject              | Command                                    | Checked behavior                                                                  |
| -------------------- | ------------------------------------------ | --------------------------------------------------------------------------------- |
| Foundation helpers   | `node verify-notes.cjs`                    | Geometry, progress, damping and cleanup                                           |
| Pointer/spring       | `node verify-pointer-lesson.cjs --browser` | Stable hit region, spring math, touch emulation, preferences and disposal         |
| Sticky/gallery       | `node verify-scroll-lesson.cjs --browser`  | Travel, endpoints, reverse, keyboard and fallback                                 |
| Text/chapter         | `node verify-text-lesson.cjs --browser`    | Interruption, readable text and decay math                                        |
| Navigation state     | `node verify-navigation-lesson.cjs`        | Latest request, stale completions and recovery                                    |
| Modal adapter        | `node verify-menu-browser.cjs`             | Keyboard, Escape, focus return and lock release                                   |
| Rendering math       | `node verify-rendering-lesson.cjs`         | Advection, texture budgets and draw counts                                        |
| Static GPU           | `node verify-gpu-browser.cjs`              | Failure fallback, context restoration and cleanup                                 |
| Frame ownership      | `node verify-frame-owner.cjs --browser`    | Single loop, time reset, intersection and motion preferences                      |
| Moving GPU           | `node verify-gpu-motion.cjs`               | Animated uniform, pause, context restore and teardown                             |
| History              | `node verify-history-browser.cjs`          | Entry scroll positions, layout readiness and stale navigation                     |
| Composed controllers | `node verify-composed-browser.cjs`         | Modal GPU pause, route replacement, concurrent route requests and open-modal Back |

The new composed cases and moving-GPU regression were run for this update. This matrix indexes existing verification; it does not claim every command was rerun on this date. Earlier pointer/scroll/text results include hashes of the lesson versions they tested. Other exercises print pass/failure when executed and do not retain a machine-readable historical run log.

## Remaining priorities

| Priority | Gap                                                                 | Why it matters                                                                  | Completion evidence                                            |
| -------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1        | Failed route preparation and user reopens menu during route loading | The shell must keep pause, focus and URL/content state coherent                 | Adversarial fixture with explicit recovery/cancellation policy |
| 1        | Restart/reload and bfcache lifecycle                                | In-memory scroll state and mounted owners may not survive the same way          | Real browser traversal and reload records                      |
| 2        | Firefox and WebKit                                                  | Native dialog, WebGL recovery and scroll behavior can differ                    | Versioned runs with failures retained                          |
| 2        | Real mobile hardware                                                | Emulation does not measure GPU capability or mobile scroll locking              | Device/browser details, interaction and frame-time records     |
| 2        | Screen-reader and Persian typography review                         | Selection/attributes do not prove pronunciation, joining or reading order       | Actual content/font and assistive-technology review            |
| 3        | Full-screen SVG covering reveal                                     | Decorative stroke tests do not establish complete viewport coverage             | Portrait/landscape, resize and initialization-failure tests    |
| 3        | Complete marquee and decorated-card components                      | Their mathematical helpers are more extensively checked than full behavior      | Original component implementation and lifecycle/resize checks  |
| 3        | Fluid solver and quality experiments                                | Triangle rendering does not establish floating-target or simulation performance | Capability tests, resource checks and hardware measurements    |

The practical next study is the first row: define a route-failure/reopen policy and test it. These priorities should guide new exercises before adding visual variants. None requires building or deploying the portfolio now.
