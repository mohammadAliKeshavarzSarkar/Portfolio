# Portfolio motion study
Study date: 2026-11-15 (Asia/Tehran).

## Evidence and limits
All four homepages were loaded in Chromium and their public HTML, CSS and JavaScript inspected. Desktop (1440x900), mobile (390x844), and reduced-motion captures completed for every site. All twelve reports contain no page JavaScript errors. Tom's targeted follow-up also completed and its saved results were checked after reconnection. AW Media's coarse mobile and reduced-motion sweeps hit the sample limit. Later targeted runs reached the FAQ, CTA and footer in both modes. The mobile run exercised its menu and a touch swipe. Raha and Glinto also received mobile menu and emulated touch follow-ups.

External pages were rendered using Playwright route.fetch with TLS verification and the inherited environment CA. This resolves the browser's CA-store problem without disabling verification. Response fulfillment changes network timing and streaming characteristics, so these captures are not performance benchmarks. Glinto's observed request failures were analytics/ad destinations; content scripts executed without page errors in the completed sweeps.

Observed = reproduced in rendered page or captured state. Source-verified = found in delivered public code. Proposed = our own reconstruction, not the site's original implementation.

## 1. Raha Salimi
Reference: https://raha-salimi.vercel.app/

### Structure and visual behavior
A fixed rounded navigation bar sits over a light editorial layout. The hero combines large condensed Product Designer / UX Researcher typography with a central portrait. Skills precede two substantial case studies, a working-principles section, other projects and contact. Desktop case studies combine text and product images; mobile places them in a single column and uses a simplified hero.

Observed follow-up: moving the pointer across the hero; clicking Case Studies moved to /#work at approximately scrollY 2048 in the follow-up viewport; opening the first case study reached /bazargam; browser back returned to /#work around the prior position.

### Source-verified techniques
- Next.js/Turbopack delivery, React Motion motion values, springs and viewport animations.
- Pointer coordinates are normalized from the hero bounds to -1..1.
- Hero pointer springs: stiffness 80, damping 20, mass .45.
- Scroll-following spring: stiffness 70, damping 26, mass .7.
- Three hero scroll offsets map scrollY 0..700 to 0..-35, 0..-60 and 0..-95 pixels.
- Text/image entry variants combine opacity, displacement and blur. Representative values: y 45px, blur 8px, duration .8s, easing [.22,1,.36,1].
- Project group reveals use once:true and amount:.15; child stagger .08s. Image entry uses y24, scale .97, duration .75s and amount:.35.
- Custom pointer is enabled for fine pointers. Its spring uses stiffness700, damping35, mass.2; its size changes between default, interactive and text states, and its contrast responds to background luminance.
- Fonts observed: Big Shoulders, Plus Jakarta Sans and Manrope.
- The inspected implementation contains local reduced-motion accommodations, but not every JS effect is proven disabled by them.

### What to learn
This site does not require scroll hijacking to feel responsive. Its main vocabulary is native scrolling plus element-level motion. The wheel capture changed native scroll position in a single step while derived visual values can continue settling. No custom smooth-scroll engine was established in the inspected code.

Keep pointer motion, scroll parallax and ambient looping motion on separate nested elements so they do not overwrite each other's transforms. Use independent wrappers for layout, scroll effects and hover effects.

For MAK: useful case-study clarity, deliberate metadata and meaningful process writing. Treat decorative cursor replacement as optional, and preserve normal pointer and keyboard behavior.

## 2. Glinto
Reference: https://glinto.co.kr/en

### Structure and visual behavior
An introductory graphic leads into a rotating hero. The services section successively presents BX, Media, Design and Engineering around a stable reading region, with supporting imagery around it. A process section translates a horizontal card track while vertical scrolling continues. Experience metrics, contact and a large wordmark close the page. Light neutral surfaces and lime accents organize the hierarchy.

Do not confuse the service copy crossfade with the horizontal process track: they are separate components.

### Source-verified smooth scrolling
The SmoothScroll component constructs Lenis with lerp .1, autoRaf true, anchors true and stopInertiaOnNavigate true. It stops during the intro and starts after the intro callback. Path changes reset scroll. The initial coarse wheel sample happened during the intro and showed no movement; the settled follow-up showed 16 distinct scroll positions after one wheel input. The former is not evidence of a broken scroll engine.

### Service transitions
ScrollProgress writes:
p = clamp((viewportHeight - sectionRect.top) / (viewportHeight + sectionRect.height), 0, 1)
and span = viewportHeight + sectionRect.height.

On desktop, service-copy becomes fixed inside a composition that masks/contains it. Its opacity is the minimum of an entrance ramp and an exit ramp, clamped to 0..1. Defaults put entrance near p=.25 and exit near p=.75, scaled by the CSS service-fade variable. The first and last services have boundary exceptions. Additional translation is motion-preference dependent. Surrounding images rotate from approximately +/-15 degrees toward zero as progress advances.

### Horizontal process track
Source component HorizontalScroll:
travel = max(track.scrollWidth - document.documentElement.clientWidth, 0)
hold = viewportHeight * dataHscrollHold
runwayHeight = viewportHeight + hold + 1.5 * travel
progress = clamp((-runwayRect.top - hold) / (runwayHeight - viewportHeight - hold), 0, 1)
trackX = -travel * progress

Desktop activates at 48rem. Below it, runway height and transforms are cleared and cards form a vertical layout.

Observed at 1440px width: track travel 388px. Five follow-up samples yielded approximately 0, -97.33, -194, -291.33 and -388px. Vertical travel was approximately 582px, matching 1.5*388.

The component also supports optional eased steps when a snap attribute exists. That branch must not be attributed to the inspected process section without confirming that attribute; the sampled page used continuous travel.

### Other behaviors
- IntersectionObserver reveals: threshold .15, bottom root margin -10%, 80ms ordering delays; observed elements are unobserved after entry.
- Hero autoplay interval 5s; source pauses for hover/focus, a hidden document and reduced motion.
- Fine-pointer contextual cursor follows with a .25 interpolation factor and view/drag labels.
- A service navigation strip has separate decoy and real states controlled by viewport thresholds.
- Fonts observed: DM Sans and Pretendard Variable.
- Reduced motion disables several decorative effects. Lenis initialization itself was not guarded in the inspected SmoothScroll component, so complete disabling of smooth scrolling is not established.

For MAK: take the clear phase transitions and measured geometry, with a shorter runway and static mobile content. Use the MAK accent and typography; do not carry over Glinto's branding.

## 3. Tom de Koning — primary reference
Reference: https://www.tomdekoning.work/
Public custom script inspected: https://slater.app/20917/64158.js
Public stylesheet inspected: https://cdn.prod.website-files.com/6947d4a42871d2972031e9ab/css/tdk-work.webflow.shared.09be52ab1.css

### Architecture
Webflow supplies document structure/styles. Custom JavaScript orchestrates GSAP, ScrollTrigger and SplitText, with LocomotiveScroll, Hls and a dynamically imported Three.js 0.184.0 module for the work carousel. The supplied Locomotive bundle contains Lenis internals; this must not be described as an old transformed-container Locomotive implementation merely because the library name is familiar.

The design is typography-dominant: oversized tightly set text, black surfaces, orange accents, selective serif letterforms, thin rules, sparse small metadata and a moving portrait. The inspected font stack includes PP Neue Montreal, with Playfair Display used for wrapped o/O characters.

### Opening sequence
initPageLoader clips the portrait element from inset(100% 0 0 0) to a fully open inset over 1.6s with expo.inOut. Navigation fades in over 1s starting at timeline time1. Reduced motion immediately exposes these elements.

### Scroll-scrubbed portrait
The canvas has 63 JPG frames, numbered 001..063. Desktop and mobile currently reference the same prefix:
https://tomdekoning-work.b-cdn.net/scroll-tom/ezgif-frame-

The wrapper is 180vh tall and absolutely positioned; its child uses CSS sticky, 100vh height and top1.5rem. ScrollTrigger measures top top through bottom top. The frame index is:
first + round(progress * (count - 1)).

This is an image sequence, not a video seek. Source implementation:
- Four concurrent image requests.
- Queue covers first, desired and last frames, then recursively samples midpoints.
- Render chooses the nearest loaded frame when the desired frame is unavailable.
- Canvas backing resolution caps DPR at2.
- Image fit uses cover scaling: max(canvasWidth/imageWidth, canvasHeight/imageHeight).
- A ResizeObserver requests redraws; a generation token prevents stale loads from updating a reset sequence.
- Reduced motion uses a static image or the first frame.

A separate scrub changes the container dimensions:
desktop 35vw x100vh ->25vw x65vh;
mobile 60vw x50vh ->90vw x70vh.
The same artwork therefore shrinks on desktop and grows on mobile. A single desktop animation uniformly scaled down would miss this distinction.

### Navigation traveling from bottom to top
This is a custom fixed position calculation, not simply sticky top0:
navTop = max(0, innerHeight - nav.offsetHeight - scrollY).
A ResizeObserver refreshes nav height and scroll updates are scheduled through rAF.
The targeted follow-up captured scroll positions200,450,700,1000,1450 and1900 and the navigation at those states.

### Character wave and masked headings
initGradientWaveText splits words/chars and maps scroll progress to a character count. Newly crossed characters briefly move through the accent color before taking the final text color. Default start top90%, end center40%, scrub .1. Reverse travel returns characters to their starting color. Default accent #F34213 and wave duration .4s are configurable.

initStaggerChar uses SplitText line masks, yPercent120 ->0, power4.out and a default1s duration. Stagger defaults .1s per character or .12s per line. Trigger defaults top85%; restart on downward entry and reset when leaving backward. autoSplit handles changed wrapping.

initLineReveal expands a rule from0% to100% over1.6s with expo.inOut, triggered at top95%.

These are three mechanisms: scroll-scrubbed color progression, time-based masked text entry and time-based rule drawing. They should not all be given the same scrub configuration.

### Menu and links
The menu animates the page down5rem, reveals the menu wrapper and staggers its links. Five icon dots collapse and rearrange from plus to cross. Source includes aria-expanded, inert on the closed wrapper, Escape close and focus return. Reduced motion settles the timelines immediately. Menu open and Escape states were captured and confirmed in the saved targeted follow-up.

Link hover uses two character layers: current text moves to -110%, replacement text rises from110%; duration.45s, stagger.018s and a .04s offset. Pointer and focus both trigger it; the original accessible label is preserved.

### Work carousel
A live WebGL carousel rendered in desktop and mobile captures. The code uses Three.js, an orthographic scene, image/video textures and a lens shader with chromatic dispersion, a blue ring and animated rim details. This is not an ordinary CSS blur panel.

Source input behavior:
- Horizontal-dominant wheel input is consumed; ordinary vertical wheel input is left for the page.
- Pointer capture supports dragging; touch-action:pan-y protects vertical touch navigation.
- Target position is smoothed with ease .09; touch follow .22.
- Wheel sensitivity1.4; mouse drag sensitivity1.6; touch sensitivity1.
- Inertial friction .865; idle snapping after120ms with snap ease .05.
- Mouse movement over6px or touch movement over12px suppresses accidental clicks.
- First entry nudges toward the next item.
- Clicking an off-center panel centers it; clicking the centered panel activates its link.
- Captions and counters track the centered item.
- Reduced motion and renderer initialization failure keep the DOM/native horizontal-scroll alternative.

Observed interaction test: the rendered canvas gallery counter changed from 01/07 to 02/07 after horizontal wheel input and then to 03/07 after a drag. The follow-up also reached the footer.

### Supporting effects and lifecycle
Star rotation responds to scroll velocity and direction with decaying momentum. Marquee direction responds to scroll direction. Footer gradient scrub uses1.2s catch-up while position, scale and opacity change. Cursor effects are limited to fine pointers and normal motion.

The script has a destroy lifecycle, AbortController event scopes, GSAP contexts, media-query rebuilds and refresh after fonts/load. These are architectural requirements for reuse, not cosmetic extras.

For MAK: prioritize typographic hierarchy, a strong opening gesture, restrained character/line reveals and clear transitions into case studies. A custom WebGL gallery is a separate high-complexity enhancement, not a prerequisite for achieving the editorial character.

## 4. AW Media
Reference: https://awmedia.marketing/

### Structure
Dark, glass-like surfaces with large white type. Hero -> device demonstration -> trust/intro -> selected work -> service tiers -> services -> process -> reasons/proof -> articles -> FAQ -> CTA/footer.

The long mobile page exceeded the coarse collector's24-sample limit. A targeted follow-up visited built, work, lanes, services, process, why, FAQ, CTA and footer; opened/closed a FAQ; exercised the mobile menu/Escape; and performed an emulated touch swipe.

### Source-verified implementation
Next.js/Turbopack plus GSAP/ScrollTrigger and Lenis. Lenis uses lerp .09, smoothWheel true, wheelMultiplier1. Its scroll event updates ScrollTrigger; GSAP's ticker supplies Lenis time in milliseconds. Reduced motion avoids the main motion setup and exposes static content.

### Hero and devices
Hero media changes from full-bleed to inset(7vh 5vw 0vh 5vw round44px), with scale1 ->.96. Hero content translates yPercent-22 and fades. Trigger range top top ->bottom top; linear scrub.

Device reveal: scale.8 ->1, rotateX18 ->0, y60 ->0, trigger top bottom ->center55%, scrub.6.
Inside the device, a tall screenshot translates by:
-(screenshot.offsetHeight - viewport.offsetHeight).
It is a moving image behind a mask, not an embedded live site. Dynamic measurements are invalidated on refresh.

### Stacked project cards
CSS sticky handles the pinning:
top = navHeight +34px +cardIndex*16px.
Each card's inner element is transformed separately. As the next card approaches its sticky top, the previous card scales to.9 desktop or.93 mobile, and a dark overlay reaches opacity.6.
The next card is the animation trigger. The last card has no next-card exit animation.
Transform origin is top center. CSS overflow on ancestors must not accidentally redefine the sticky container.

### Process, text and details
- Word-color scrubbing: top82% ->bottom48%, scrub.4, word stagger.12.
- Process steps toggle active as each crosses62% viewport height; a reel translates and a progress bar changes.
- Marquee speed combines a baseline with smoothed absolute Lenis velocity.
- Fine-pointer tilt and image drift are additional effects, not scroll pinning.
- FAQ uses semantic details/summary and an animated height. It returns height to its natural value and refreshes ScrollTrigger after opening/closing. Source durations .7s open, .5s close; expo.out.
- Font observed: Rethink Sans.

For MAK: useful project stacking, device demonstrations and clear progress through a case study. Use these only where they help tell the story; stacking every section would reduce readability.

## Shared model
1. Layout: normal document flow, explicit heights, CSS sticky and clipping.
2. Input smoothing: optional Lenis/Locomotive; one scroll owner.
3. Measurement: scrollY, element geometry, viewport height, normalized progress.
4. Presentation: transforms/opacity/clip changes, or time-based entry tweens.
5. Lifecycle: fonts/images/resize refresh, media queries, cleanup and fallbacks.

Do not confuse CSS scroll-behavior:smooth (programmatic/anchor smooth scrolling), CSS scroll-snap (rest positions), a smooth-scroll engine (wheel interpolation), and scrub (animation follows a position).

Useful math:
clamp01(x) = min(1,max(0,x))
rangeProgress(y,start,end) = clamp01((y-start)/max(1,end-start))
traversalProgress(rect,H) = clamp01((H-rect.top)/(H+rect.height))
horizontalTravel = max(track.scrollWidth-viewportWidth,0)
coverScale = max(targetWidth/sourceWidth,targetHeight/sourceHeight)

Use transform and opacity for most continuous effects. Width/height animation, large blur filters, WebGL, and dense frame sequences require separate profiling. No performance ranking of these sites is established by this study.

## Recommended MAK implementation direction
Use semantic HTML or React components for content, CSS for layout and sticky regions, GSAP/ScrollTrigger for complex choreography, and at most one optional Lenis instance. Do not add Locomotive, Lenis and a second smooth-scroll wrapper together.

Suggested progression:
1. Establish type hierarchy, spacing, red signal accents and a readable static page.
2. Add ordinary reveal transitions.
3. Add one signature scroll composition.
4. Add carefully measured case-study transitions.
5. Add a native swipeable work gallery; only then consider WebGL.
6. Validate narrow screens, keyboard, reduced motion, late-loading fonts/images and route cleanup.

Keep present UI/UX/frontend experience distinct from future architecture and leadership goals. Use project decisions and outcomes as content. Geometry should support the content according to the MAK asset rules.
