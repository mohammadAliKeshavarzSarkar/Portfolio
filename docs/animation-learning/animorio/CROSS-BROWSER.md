# Cross-browser checks: modal and gallery

**23 November 2026 · Asia/Tehran.** This fixture extracts the original modal and gallery lesson code directly from Markdown. It does not inspect additional live Animorio demos.

| Engine   | Normal motion | Reduced motion | Scope                                        |
| -------- | ------------- | -------------- | -------------------------------------------- |
| Chromium | Passed        | Passed         | Desktop modal and gallery                    |
| Firefox  | Passed        | Passed         | Desktop modal and gallery                    |
| WebKit   | Unavailable   | Unavailable    | Missing host libraries; no behavioral result |

[cross-browser-validation.json](cross-browser-validation.json) records versions, timestamp, source hashes and WebKit's launch error. Modal checks cover keyboard opening, initial focus, Tab containment, Escape/focus return, interrupted requests, lock restoration and disposal. Gallery checks cover linked mode, keyboard End/Home, last-edge alignment, reverse travel, native overflow under reduced motion, live preference handling and disposal.

Both engines use a 1280 × 900 desktop viewport. This does not cover physical touch, screen readers, Persian shaping, GPU restoration, bfcache or frame-time performance. The Tab check accepts transient document-body focus during cycling; it is not a full accessibility audit.

## Reproduction and environment

Run `node docs/animation-learning/animorio/verify-cross-browser.cjs --record` with Playwright and its Firefox/WebKit builds installed. Chromium uses `/usr/bin/chromium` unless `CHROMIUM_PATH` is supplied. Other engines use Playwright's browser paths.

Downloaded binaries in this workspace live under `/workspace/scratch/playwright-browsers`, selected with `PLAYWRIGHT_BROWSERS_PATH`. They are scratch dependencies, not committed assets. Installing matching builds does not imply that required host libraries are present.

Firefox initially timed out inside the command sandbox with a read-only `/proc/self/uid_map` error. The successful recorded run used approved execution outside that command sandbox, with Firefox's own process sandbox enabled. No browser security flag was disabled to obtain the pass. WebKit still could not launch because the host lacks GTK4, Graphene, HarfBuzz ICU, Manette, Hyphen and GLES libraries. Those require environment setup before retrying; no WebKit compatibility claim is made.

Launch failures are recorded as `unavailable`; assertion failures are `failed` and set a nonzero exit code. A zero runner exit code does not mean all engines passed: read the individual results. The runner never substitutes Chromium for an unavailable engine.

The follow-up [text/history report](CROSS-BROWSER-TEXT-HISTORY.md) now records passing Chromium and Firefox suites. Next, separately test GPU capability/fallback behavior. Bfcache requires its own server and launch configuration and is not inferred from either cross-browser matrix.
