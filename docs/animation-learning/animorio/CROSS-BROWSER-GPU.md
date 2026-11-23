# GPU capabilities and readable fallbacks by engine

**23 November 2026 · Asia/Tehran.** This original exercise runs the [static renderer](05-browser-renderer.md) in Chromium and Firefox. It records fallback correctness independently from graphics availability.

| Behavior                              | Chromium                      | Firefox                           |
| ------------------------------------- | ----------------------------- | --------------------------------- |
| Injected unavailable context          | Readable fallback passed      | Readable fallback passed          |
| Ordinary link activation without GPU  | Passed                        | Passed                            |
| Initial reduced motion                | No allocation/drawing; passed | No allocation/drawing; passed     |
| Actual WebGL context                  | Available                     | Returned null in this environment |
| Shader compilation and rendered pixel | Passed                        | Not run                           |
| Live reduced-motion release/rebuild   | Passed                        | Not run with an actual context    |
| Forced context loss/restoration       | Passed                        | Not run: no context               |
| Disposal and no later rebuild         | Passed                        | Passed for fallback-only instance |

[Recorded results](gpu-cross-browser-validation.json) include browser versions, the renderer lesson hash and available context parameters. Firefox's null context is an environment capability result; it does not establish that Firefox generally lacks WebGL or that the renderer is incompatible with Firefox graphics hardware. No preference was forced to override that result.

## Reproduction

Run `node docs/animation-learning/animorio/verify-gpu-capabilities.cjs --record`. This workspace locates downloaded Firefox through `PLAYWRIGHT_BROWSERS_PATH=/workspace/scratch/playwright-browsers`. The recorded run used approved execution outside the command sandbox, matching the earlier successful Firefox text/history setup.

Chromium launches with `--enable-unsafe-swiftshader` for software WebGL. Firefox uses its default headless graphics configuration. These are different rendering environments, so this is a capability/fallback matrix, not a controlled performance comparison. It records WebGL's generic renderer parameter without attempting to bypass privacy restrictions for hardware identification.

The verifier reads a pixel immediately after drawing, before the browser can discard its non-preserved drawing buffer. It only tests context restoration when `WEBGL_lose_context` is available; it explicitly records skipped paths. A completed run does not mean every engine rendered successfully—inspect `rendering`, `restoration` and `fallback` individually.

## Reuse lesson

Progressive enhancement should depend on actual capability, not browser branding. Keep the semantic heading and links available before creating a context. If creation fails, hide the decoration and retain that baseline. Reduced motion can skip GPU allocation entirely; it does not need to manufacture a moving fallback.

This exercise covers WebGL1, a fixed drawing buffer and one static triangle. It does not establish WebGL2, floating-point framebuffer completeness, texture filtering, fluid-solver quality, moving Firefox rendering or hardware speed. The Chromium moving-GPU and bfcache exercises retain their separate scope. WebKit still requires host-library setup before any comparable run.

Next priorities are a usable Firefox graphics environment or physical hardware to exercise its rendering/restoration paths, WebKit host setup, and assistive-technology/device validation. The passing fallback remains useful even where GPU rendering is unavailable.
