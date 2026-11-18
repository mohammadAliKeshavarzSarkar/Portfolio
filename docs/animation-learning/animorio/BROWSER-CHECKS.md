# Browser observations

**18 November 2026 · Chromium 156.0.8078.79**, automated with Playwright against the public standalone demo URLs recorded in [evidence.json](evidence.json). [browser-results.json](browser-results.json) contains measured states and errors.

Four demos were checked in two configurations: desktop **1440 × 900**, normal motion; and mobile emulation **390 × 844**, touch capability and reduced motion enabled. A follow-up desktop gallery run used wheel input to verify movement. This is eight initial configurations and one follow-up, covering four unique demos.

The second configuration combines viewport, touch capability and motion-preference changes. It does **not** isolate their individual effects, test real touch gestures, or constitute a full desktop/mobile × normal/reduced matrix. Synthetic mouse movement and keyboard events were still used where stated.

| Demo                 | Action and observation                                                                                                                                                                                                                                                                             | Scope limit                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Menu from its button | Focused trigger and pressed Enter: `aria-expanded=true`, menu no longer inert, focus moved to Work, scrolling locked. Escape: expanded false, inert restored, focus returned to trigger, lock removed. Observed in both configurations.                                                            | No full Tab-order, rapid-toggle or background-interaction audit.                                      |
| Magnetic button      | Desktop pointer movement displaced the first button by about `(29, 9.7)` CSS px; pointer exit returned its matrix to identity. Combined mobile/reduced configuration retained identity during the same synthetic mouse input.                                                                      | No real touch press, OS preference change or navigation check.                                        |
| Stacking cards       | Desktop scroll changed a preceding card's scale/rotation while cards remained stacked. Combined mobile/reduced run showed no card transforms at the sampled positions.                                                                                                                             | No complete first-to-last reading, zoom or responsive-resize check.                                   |
| Reportage gallery    | Desktop stage computed as sticky at top 0. Follow-up wheel input moved page scroll from 2816 to 3466 px and track X from approximately −1580.8 to −2176.8 px. Combined mobile/reduced mode changed stage to relative and strip to `overflow-x:auto`; setting its native scrollLeft reached 200 px. | Programmatic native scrolling establishes overflow capability, not keyboard or touch discoverability. |

All nine runs returned HTTP 200 for the demo page, with no recorded uncaught page errors or request-routing failures. At the sampled states, none had document-level horizontal overflow. GSAP 3.15.0 loaded; the two scroll demos also exposed ScrollTrigger 3.15.0. These observations do not prove absence of all console warnings or resource errors.

## Method and reproduction

1. Open the selected `demoURL` from the evidence file in a fresh browser context.
2. Set viewport and reduced-motion preference **before** loading, because the scripts read the initial preference.
3. Wait for page load and the initial animation. The standalone demos can begin at nonzero scroll positions; record actual scroll coordinates instead of assuming the page starts at zero.
4. For the menu, focus its `[data-burger]` button, press Enter, allow the transition, record focus/expanded/inert/lock state, then press Escape and record again.
5. For the magnetic sample, measure the first `.magnet__body`, move the mouse away from its center but within its hit region, record its transform, then leave and wait for its return.
6. For cards, record card transforms and bounds before and after scrolling. For the gallery, record stage position, track transform and native strip overflow. Use actual wheel input to verify the normal gallery's scroll response.
7. Record page errors, failed requests and current dependency versions. Treat changed live source hashes as a new version to review.

The initial gallery run's two snapshots landed at the same page scroll position, so it did not prove scroll-driven movement. The explicit wheel follow-up resolves that narrow question; both records are retained.

Requests were fulfilled through Playwright's TLS-verifying request client because the shared environment's Chromium certificate setup required that path. This changes request delivery/timing: these runs are **functional observations, not network or frame-rate benchmarks**. Screenshots of the closed desktop menu, desktop card stack and reduced-motion mobile gallery were inspected locally; third-party screenshots/assets are not redistributed here.

## Still untested

The other six source-reviewed demos have no browser validation in this batch. Firefox, WebKit, real mobile hardware, screen readers, complete keyboard navigation, zoom, runtime preference changes, JavaScript/CDN failure, GPU context loss and sustained performance remain future checks. Source-level fallback branches and a publisher's testing claims are not substitutes for those tests.
