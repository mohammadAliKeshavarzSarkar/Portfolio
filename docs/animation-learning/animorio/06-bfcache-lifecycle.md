# Lesson 6 — Actual back-forward cache lifecycle

**23 November 2026 · Asia/Tehran.** This original exercise follows [reload restoration](06-reload-and-recovery.md). A bfcache return revives the old document and JavaScript heap. It should resume eligible owners instead of mounting copies of them.

## Pause an existing owner and resume after persisted return

```js
function bindPageLifecycle({ suspend, resume }) {
  const events = new AbortController();
  let suspended = false,
    disposed = false;
  window.addEventListener(
    "pagehide",
    () => {
      if (disposed || suspended) return;
      suspended = true;
      suspend();
    },
    { signal: events.signal },
  );
  window.addEventListener(
    "pageshow",
    (event) => {
      if (disposed || !event.persisted || !suspended) return;
      suspended = false;
      resume();
    },
    { signal: events.signal },
  );
  return {
    destroy() {
      if (disposed) return;
      disposed = true;
      events.abort();
    },
  };
}
```

The callbacks must be synchronous and nonthrowing. `suspend` should set the shell's page-lifecycle pause flag and stop scheduling. `resume` should refresh layout and release only that flag; other pause sources such as reduced motion or an open modal still apply. The exercise passes `setActive(false/true)` to a standalone frame owner. A real shell should aggregate eligibility before calling its owner.

Initial `pageshow` is not a persisted return and does not call resume. `pagehide` pauses even when the document will not be cached; in that case it is safe to let navigation discard the document. Avoid relying on unload events or destroying all component state on every pagehide. If an application intentionally destroys on hide, it needs a different remount policy and must not also resume the destroyed owner.

The lifecycle binding does not own the renderer itself. During explicit application teardown, destroy this binding and then destroy the component owners in dependency order. Its `destroy` removes listeners but does not call a resume that could start unwanted work.

## Why the test uses local HTTP

Request interception and browser automation defaults can change cache eligibility. This verifier starts a short-lived loopback HTTP server on an operating-system-selected port and closes it in `finally`. It serves only two tiny test documents. It uses the system Chromium in headless mode and removes Playwright's default `--disable-back-forward-cache` argument. No application is deployed or externally accessible.

The test asserts all of the following rather than inferring caching from a Back navigation alone:

- Document identity remains unchanged after cross-document navigation and Back.
- `pagehide.persisted` and `pageshow.persisted` are true for the cached transition.
- One existing owner resumes, and its first resumed timestep is zero.
- Two successive cache returns do not create extra owners.
- After explicit teardown, another cache return does not resume or draw.

It extracts the scheduler and lifecycle code directly from Markdown. Run `node docs/animation-learning/animorio/verify-bfcache-browser.cjs`. Add `--record` to save [the observed result](bfcache-validation.json). An unsupported or ineligible environment fails the assertions rather than silently converting the test to a reload check.

## What this establishes

The fixture observed real persisted restoration in Chromium under the recorded launch configuration. It proves this small scheduling/lifecycle contract, not that the GPU, modal and full History shell are all bfcache-eligible together. GPU context loss on restore, browser memory pressure, external origins, other engines and physical devices remain separate checks. Eligibility is not guaranteed on every traversal; the baseline/reload path must continue to work if the browser evicts a page.

The next useful integration test combines the cached-document lifecycle with the composed modal/GPU fixture. Keep page lifecycle, modal pause and reduced-motion flags independent so returning from cache cannot override another active reason to pause.
