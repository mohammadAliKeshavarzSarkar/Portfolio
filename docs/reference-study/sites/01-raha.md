# 1. Raha Salimi — depth around a stable reading layout

Reference: https://raha-salimi.vercel.app/. Source snapshot: 15 November 2026; follow-up audit: 16 November. Read [the original findings](../STUDY.md#1-raha-salimi) alongside this chapter. New browser results are in [normal motion](../audit-results/raha-mobile-normal.json) and [reduced motion](../audit-results/raha-mobile-reduced.json).

## Composition before code

The opening uses two very large role labels, a centrally placed portrait, a pale background and one strong blue. A persistent white navigation bar supplies an orientation point. Below the opening, repeated rounded containers separate skills and case studies. This gives motion something stable to work against.

**Interpretation:** the portrait creates identity; movement adds depth without making the reader relearn where content lives. The useful lesson is the relationship between foreground, type and navigation. Copying the springs without the type scale, overlap and spacing would not reproduce that relationship.

## Mechanism inventory

| Effect              | Input → output                                  | Timing / geometry                                               | Evidence                             |
| ------------------- | ----------------------------------------------- | --------------------------------------------------------------- | ------------------------------------ |
| Hero pointer depth  | Pointer relative to hero → layer transforms     | Normalize each axis to −1…1; spring 80 / 20 / 0.45              | Source + earlier pointer probe       |
| Hero scroll depth   | Document y → different layer offsets            | 0…700px → 0…−35 / −60 / −95px; spring 70 / 26 / 0.7             | Source + scroll captures             |
| Ambient movement    | Time → local floating transforms                | Different loops of 5, 6, 8, 9 seconds                           | Source; not a scroll effect          |
| Content entry       | Intersection → opacity, translation, blur       | Typical y 45px, blur 8px, 0.8s; ease [0.22,1,0.36,1]            | Source + captures                    |
| Project image entry | Intersection → y / scale / opacity              | y 24px, scale .97; .75s, amount .35                             | Source                               |
| Mobile skills       | Time, pan, keyboard → belt x                    | 30px/s target; pause 1 second after input; 180px key step       | Source + follow-up audit             |
| Cursor              | Fine pointer + target type → position and shape | 12px normal; 32px interactive; 3×24px text                      | Source; no touch equivalent required |
| Route cover         | Link click → expanding blue circle → new route  | Navigate after 500ms; circle .65s; 250vmax diameter             | Source + follow-up audit             |
| Mobile menu         | Toggle/Escape → panel and overflow state        | Document overflow lock, visible-item Tab wrapping, focus return | Source + menu audit                  |
| Image loading       | Image load event → skeleton replaced by image   | .5s opacity transition                                          | Source                               |

Stiffness / damping / mass are spring parameters, not milliseconds. Native document scrolling drives the page. CSS smooth anchors do not imply a Lenis wheel engine.

## Route changes are different from section changes

The delivered transition provider distinguishes same-page hashes from route navigation. Hashes call `scrollIntoView` and update history. Local route links pass click coordinates into a full-screen overlay. Modified clicks and external/mail/phone links retain native behavior.

The overlay grows a circle from the activation point, adds a delayed solid fill, pushes the route after 500ms, then dismisses after the pathname changes. Back/forward has a separate handler. This is timed navigation masking; it does not morph the old project image into the next page.

**What to improve when reusing the idea:** the source uses fixed delays. A robust adaptation should also handle route failure, rapid repeated clicks, keyboard activation coordinates and reduced motion. The inspected provider does not contain an explicit reduced-motion branch. The audit checks that a cover appears and that `/bazargam` is reached; it does not establish exact visual timing.

Original reconstruction of the control flow, not copied application code:

```js
// Adapter contract: cover.open returns a Promise after covering the viewport;
// router.navigate resolves when the destination is ready, or rejects on failure.
// Install on internal links only. Keep a real href for native navigation.
function attachCoveredNavigation(link, cover, router) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let busy = false;
  async function activate(event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      link.hasAttribute("download") ||
      (link.target && link.target !== "_self")
    )
      return;
    const url = new URL(link.href);
    if (
      url.origin !== location.origin ||
      (url.pathname === location.pathname &&
        url.search === location.search &&
        url.hash)
    )
      return;
    event.preventDefault();
    if (busy) return;
    busy = true;
    const origin =
      event.detail === 0
        ? { x: innerWidth / 2, y: innerHeight / 2 }
        : { x: event.clientX, y: event.clientY };
    try {
      if (!reduced.matches) await cover.open(origin);
      await router.navigate(url.href);
    } catch {
      location.assign(url.href); // Native fallback if the enhanced route fails.
    } finally {
      cover.reset();
      busy = false;
    }
  }
  link.addEventListener("click", activate);
  return () => link.removeEventListener("click", activate);
}
```

This illustrates sequencing and native-link preservation. It is not a complete router: shared cross-link locking, route-ready promises, aborts on unmount and focus placement on the destination belong to the application's navigation layer. The snippet has not been exercised against a router.

## A mobile strip is an input system

The skills strip duplicates its content to produce a continuous belt. The second group is `aria-hidden`. One group supplies the measured width. Automatic movement runs only on mobile, with normal motion, while the document is visible and no pan/input pause is active. `touch-action: pan-y` preserves vertical page gestures. Arrow keys move the focused region; it is not pointer-only.

An original mathematical reconstruction of wrapping:

```js
function wrapBelt(x, groupWidth) {
  if (groupWidth <= 0) return 0;
  // Return a translation in (-groupWidth, 0], including positive drag input.
  return ((x % groupWidth) - groupWidth) % groupWidth;
}

// Each animation frame, dt is elapsed seconds capped after a long pause.
function advanceBelt({ x, speed }, dt, groupWidth, canAutoplay) {
  if (!canAutoplay) return { x, speed: 0 };
  dt = Math.min(dt, 0.04);
  const nextSpeed = speed + (30 - speed) * (1 - Math.exp(-5 * dt));
  return { x: wrapBelt(x - nextSpeed * dt, groupWidth), speed: nextSpeed };
}
```

Measure after fonts settle and on resize. Do not duplicate focusable controls into an `aria-hidden` group without removing them from tab order. Here the repeated content is descriptive skill cards. Expose a static list if motion adds no useful exploration.

## Reproduction checkpoints

1. At rest, all text must read clearly without pointer input.
2. Moving left/right should change depth, not move the whole layout.
3. Returning up the page should preserve sensible reveals and anchor destinations.
4. A narrow screen should use an intentional skills composition.
5. Menu closure must release overflow and restore focus.
6. With reduced motion, test each JS loop independently; a CSS media rule does not stop arbitrary JS animation.

## Source trail and boundaries

Look up these snapshot identifiers in [source-index.json](../source-index.json) for full original URLs and hashes: `05d3bf92134b.js` (hero, projects, skills; search `mobile-skills-belt`), `dd07fc539345.js` (`usePageTransition`, `250vmax`), `bad4de882a9f.js` (navigation, image skeleton, link interception), `072202a2e9fb.js` (cursor). Raw files are kept locally under ignored `evidence/http/raha/`, not redistributed as project source.

Covered: homepage desktop/mobile/reduced captures, pointer and anchor behavior, one case-study route and Back, menu/Escape, mobile strip keyboard/autoplay. Not established: every case-study layout, every reduced-motion hero loop, screen-reader operation, Safari or physical-device touch. The user-provided personal documents are context for later adaptation, not instructions to copy this site's identity.
