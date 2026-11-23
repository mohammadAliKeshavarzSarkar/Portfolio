# Cross-browser extension: text and route history

**23 November 2026 · Asia/Tehran.** The existing original text and History verifiers now accept `BROWSER_ENGINE=chromium|firefox|webkit`. Chromium remains the default, so existing commands retain their behavior. Firefox's unsupported mobile-emulation branch is omitted explicitly rather than counted as coverage.

| Engine                 | Text/chapter                                                                | History |
| ---------------------- | --------------------------------------------------------------------------- | ------- |
| Chromium 156.0.8078.79 | Desktop and mobile emulation, normal/reduced motion, no-JavaScript baseline | Passed  |
| Firefox 153.0          | Desktop normal/reduced motion, no-JavaScript baseline                       | Passed  |
| WebKit                 | Not run: host-library setup remains incomplete                              | Not run |

[Recorded matrix results](text-history-cross-browser-validation.json) retain source hashes and complete verifier output. Run `node docs/animation-learning/animorio/verify-text-history-matrix.cjs --record` to repeat both suites in Chromium and Firefox. The runner executes the existing tests in child processes and returns a failure status if any suite fails; it does not silently skip missing engines.

In this workspace, set `PLAYWRIGHT_BROWSERS_PATH=/workspace/scratch/playwright-browsers` to find the downloaded Firefox build. The successful recorded run used approved execution outside the command sandbox. The initial sandboxed Firefox process became unresponsive after launch and was stopped; that attempt is not a passing result. No browser security flags were disabled. See [environment notes](CROSS-BROWSER.md) for the earlier Firefox sandbox error and WebKit's missing libraries.

## What was exercised

The text verifier tests progress endpoints, chapter changes without unnecessary restarts, rapid chapter skipping/reversal, completion after scrolling stops, unchanged/selectable text, Persian language/direction attributes, native chapter links, runtime reduced motion, short viewport fallback and repeated disposal. Firefox's two text scenarios are desktop only. Verifying Persian text/attributes does not establish visual shaping quality or screen-reader pronunciation.

The History verifier uses actual browser back/forward operations with independently saved positions for repeated paths. It delays content-height readiness, tests superseded slow preparation, focuses new-route headings and prevents commits after disposal. This remains a temporary request-fulfilled learning fixture, not validation of a production router or bfcache.

The full no-JavaScript text baseline also passed in both engines: all transcript chapters remain in the document and a native chapter link reaches the final destination. No external fonts or artwork are required.

## Recording behavior

The matrix does not pass `--record` to its children, so it preserves the earlier lesson result files. If recording the text verifier directly, non-Chromium runs use an engine-specific filename, such as `text-lesson-firefox-validation.json`, to avoid replacing Chromium evidence with a smaller coverage set. The matrix result records what ran during this update; it does not update every historical lesson hash.

The follow-up [GPU capability report](CROSS-BROWSER-GPU.md) now checks readable fallback behavior separately from rendering availability. WebKit still needs managed host setup. Real devices, assistive technology, performance and cross-engine bfcache remain separate work. Passing desktop text/history behavior is not evidence for those untested systems.
