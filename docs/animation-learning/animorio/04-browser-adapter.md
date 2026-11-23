# Lesson 4 browser adapter — a native modal and decorative SVG

**22 November 2026 · Asia/Tehran.** This original exercise completes the browser portion of [Lesson 4](04-navigation-and-reveals.md). It uses the lesson's `createRevealController`; load those JavaScript blocks before the block below. It is documentation code, not a portfolio implementation.

Native dialog supplies top-layer interaction and background inertness. The adapter owns only its opener, dialog, visual panel and one scroll-lock release handle. An always-available ordinary link is the no-JavaScript navigation path. The SVG is decorative; it never covers or blocks the page.

```html
<a href="#work">Browse work</a>
<button id="open-menu" hidden aria-controls="menu" aria-expanded="false">
  Open menu
</button>
<dialog id="menu" aria-labelledby="menu-title">
  <div class="menu-panel">
    <h2 id="menu-title">Navigation</h2>
    <button id="close-menu" autofocus>Close menu</button>
    <a href="#work">Work</a>
    <svg viewBox="0 0 200 40" aria-hidden="true">
      <path
        d="M 5 20 Q 100 0 195 20"
        pathLength="1"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-dasharray="1"
      />
    </svg>
  </div>
</dialog>
<section id="work" tabindex="-1">
  <h2>Work</h2>
  <p>Readable without the animation.</p>
</section>
```

```css
#menu {
  padding: 0;
  border: 1px solid #526479;
  max-width: min(90vw, 420px);
}
#menu::backdrop {
  background: rgb(0 0 0 / 0.35);
}
.menu-panel {
  padding: 24px;
  background: white;
  color: #172b3a;
}
.menu-panel svg {
  display: block;
  width: 200px;
  max-width: 100%;
  pointer-events: none;
}
button:focus-visible,
a:focus-visible {
  outline: 3px solid #1765ad;
  outline-offset: 3px;
}
```

```js
function makeScrollLock(element) {
  let count = 0,
    saved;
  return function acquire() {
    if (count++ === 0) {
      saved = [
        element.style.getPropertyValue("overflow"),
        element.style.getPropertyPriority("overflow"),
      ];
      element.style.setProperty("overflow", "hidden");
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (--count === 0) {
        if (saved[0]) element.style.setProperty("overflow", ...saved);
        else element.style.removeProperty("overflow");
      }
    };
  };
}

function mountMenuLesson(acquireLock) {
  const trigger = document.querySelector("#open-menu");
  const dialog = document.querySelector("#menu");
  const panel = dialog.querySelector(".menu-panel");
  const close = dialog.querySelector("#close-menu");
  const path = dialog.querySelector("path");
  if (
    typeof dialog.showModal !== "function" ||
    typeof panel.animate !== "function"
  )
    return { destroy() {} };
  const events = new AbortController();
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let release = null,
    disposed = false,
    desired = false;
  const original = {
    hidden: trigger.hidden,
    expanded: trigger.getAttribute("aria-expanded"),
    opacity: panel.style.opacity,
    dash: path.style.strokeDashoffset,
  };
  function finishClose(restore = true) {
    if (dialog.open) dialog.close();
    if (release) release();
    release = null;
    trigger.setAttribute("aria-expanded", "false");
    if (restore && trigger.isConnected && !trigger.hidden) trigger.focus();
  }
  const controller = createRevealController({
    sample: () => (dialog.open ? getComputedStyle(panel).opacity : "0"),
    prepare(open) {
      if (!dialog.open && open) {
        dialog.showModal();
        release = acquireLock();
        close.focus();
      }
      trigger.setAttribute("aria-expanded", String(dialog.open));
    },
    animate(pose, open) {
      const end = open ? "1" : "0";
      panel.style.opacity = end;
      path.style.strokeDashoffset = String(strokeOffset(open ? 1 : 0));
      // SVG and panel finish together; cancellation owns both effects.
      const options = {
        duration: motion.matches ? 0 : 180,
        easing: "ease-out",
      };
      const fade = panel.animate(
        [{ opacity: pose }, { opacity: end }],
        options,
      );
      const line = path.animate(
        [
          { strokeDashoffset: open ? 1 : 0 },
          { strokeDashoffset: open ? 0 : 1 },
        ],
        options,
      );
      return {
        finished: Promise.all([fade.finished, line.finished]),
        cancel() {
          fade.cancel();
          line.cancel();
        },
      };
    },
    commit(open) {
      if (!open) finishClose();
    },
    recover() {
      desired = false;
      finishClose();
    },
    dispose() {
      finishClose();
    },
  });
  function request(open) {
    if (disposed) return Promise.resolve();
    desired = open;
    return controller.request(open);
  }
  function listen(owner, type, handler) {
    owner.addEventListener(type, handler, { signal: events.signal });
  }
  listen(trigger, "click", () => request(true));
  listen(close, "click", () => request(false));
  listen(dialog, "cancel", (event) => {
    event.preventDefault();
    request(false);
  });
  listen(motion, "change", () => request(desired));
  // Handle only the known local destination; keep its native anchor action.
  listen(dialog.querySelector("a"), "click", () => {
    request(false).then(() => {
      if (!disposed)
        document.querySelector("#work").focus({ preventScroll: true });
    });
  });
  trigger.hidden = false;
  return {
    request,
    get state() {
      return controller.state;
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      events.abort();
      controller.destroy();
      trigger.hidden = original.hidden;
      if (original.expanded === null) trigger.removeAttribute("aria-expanded");
      else trigger.setAttribute("aria-expanded", original.expanded);
      panel.style.opacity = original.opacity;
      path.style.strokeDashoffset = original.dash;
    },
  };
}
```

Create one shared lock manager with `makeScrollLock(document.documentElement)` and pass it to the mount function. Each owner releases only its own handle. This restores the exact overflow value and priority after the last release. It is not a universal mobile scroll-lock implementation: fixed-body techniques, scrollbar compensation and physical-device behavior require separate testing.

The dialog stays modal through closing; reversal does not release its lock. Escape follows the same transition path as the visible close control. Motion-preference changes replace the current job and resolve to the requested state. The ordinary Work link is not prevented; its destination receives focus after closure. This fixture assumes the local destination exists and the application does not independently call `dialog.close()` or mutate these owned styles.

The panel resumes from its current opacity on interruption. The decorative SVG intentionally restarts its normalized stroke on reversal; it is not a continuous scribble simulation. A full-screen cover would require separate aspect-ratio coverage and failure-path tests. This example cannot obstruct baseline content if JavaScript fails to load, because the dialog starts closed and the ordinary navigation link remains present.

## Verification

Run `node docs/animation-learning/animorio/verify-menu-browser.cjs`. It extracts both lessons' code into an in-memory Chromium fixture. Checks cover keyboard opening, modal focus containment, Escape and focus return, rapid close/reopen, reduced motion, SVG dash state, shared-lock release and destruction. The tests concern this original adapter, not Animorio's live implementation. Physical devices, other browser engines and screen readers remain unverified.
