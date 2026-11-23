# Lesson 6 exercise — History entries own their scroll positions

**23 November 2026 · Asia/Tehran.** An original documentation fixture extending [integration contracts](06-integration-contracts.md). It uses native History and document scrolling. It does not choose a production router or reproduce a reference site's code.

## Restore the entry, not just the pathname

Two visits to the same route can have different scroll positions. Give each History entry its own key, save positions by that key, and preserve the key on back/forward navigation. New navigation starts at the heading; back/forward restores the recorded position without stealing focus.

Restoration must wait until the new content has sufficient height. Applying a saved position to a short loading placeholder causes browser clamping. The example prepares detached content first, guards its generation, commits it, then waits for its finite layout-readiness promise. Every asynchronous boundary checks the generation again. Slow preparation for a superseded entry cannot replace the latest page.

```js
function mountHistoryStudy({ prepare, onError, positionStore = new Map() }) {
  const namespace = "animationStudyEntry";
  const previousRestoration = history.scrollRestoration;
  const positions = positionStore;
  const events = new AbortController();
  let sequence = 0,
    generation = 0,
    disposed = false,
    restoring = false,
    hasDisplayed = false;
  const key = () => `${Date.now()}-${++sequence}`;
  let active = history.state?.[namespace] || key();
  history.replaceState({ ...history.state, [namespace]: active }, "");
  history.scrollRestoration = "manual";

  function save() {
    if (!restoring) positions.set(active, scrollY);
  }
  async function display(entry, url, restore) {
    const token = ++generation;
    restoring = true;
    try {
      // prepare must build detached content and must not mutate the page.
      const page = await prepare(url);
      if (disposed || token !== generation) return;
      page.commit();
      await page.ready;
      if (disposed || token !== generation) return;
      window.scrollTo({
        top: restore ? positions.get(entry) || 0 : 0,
        behavior: "instant",
      });
      if (!restore) page.focus();
      // Record the actual clamped position if content became shorter.
      positions.set(entry, scrollY);
      hasDisplayed = true;
    } catch (error) {
      if (!disposed && token === generation) onError(error, url);
    } finally {
      if (!disposed && token === generation) restoring = false;
    }
  }
  function pop() {
    save(); // active still identifies the document being left.
    active = history.state?.[namespace] || key();
    if (!history.state?.[namespace])
      history.replaceState({ ...history.state, [namespace]: active }, "");
    display(active, location.href, true);
  }
  window.addEventListener("scroll", save, {
    passive: true,
    signal: events.signal,
  });
  window.addEventListener("popstate", pop, { signal: events.signal });
  return {
    async navigate(url) {
      if (disposed) return;
      const target = new URL(url, location.href);
      if (target.origin !== location.origin)
        throw new Error("Same-origin routes required");
      save();
      active = key();
      history.pushState({ [namespace]: active }, "", target.href);
      return display(active, target.href, false);
    },
    refresh() {
      if (!disposed) {
        if (hasDisplayed) save();
        return display(active, location.href, true);
      }
    },
    destroy() {
      if (disposed) return;
      save();
      disposed = true;
      generation++;
      events.abort();
      history.scrollRestoration = previousRestoration;
    },
  };
}
```

The adapter's `prepare(url)` returns `{ commit(), ready, focus() }`. `commit` installs detached content synchronously. `ready` must settle after content height and font/image geometry are ready, with a bounded failure path. `focus` moves focus to the new route heading using `preventScroll: true`. A restore does not call it. The error hook should expose a usable error state or offer native navigation; it must not throw.

Only one application shell may own this helper and `history.scrollRestoration`. Its in-memory map covers this mounted session; reload persistence, bfcache/pageshow handling, hash anchors, nested scrolling and smoothing-library integration need explicit adapters. Native anchors remain native unless the application deliberately calls `navigate`. Do not intercept modified clicks, downloads or external links indiscriminately.

During restoration, scroll events caused by DOM replacement must not overwrite the saved target position. The `restoring` flag suppresses those writes. If the user navigates again before readiness completes, the new generation wins. The abandoned preparation still finishes in the background; it cannot commit. Add AbortSignal-based loading cancellation in a real data adapter to avoid wasted network work.

The fixture renders the initial route before mounting and calls `refresh()` to establish the initial ready state. History keys are namespaced to avoid overwriting existing entry data during replacement. New navigation owns its new entry state; applications with other state owners should define a shared state schema instead.

## Verification

Run `node docs/animation-learning/animorio/verify-history-browser.cjs`. It uses Playwright request fulfillment on a reserved `.test` origin, without a server or external network. It extracts the code above into a temporary Chromium document and tests actual browser back/forward navigation, distinct scroll positions for repeated paths, detached preparation races, readiness delays and disposal during preparation.

This proves the fixture's route/scroll behavior in Chromium. It does not certify browser restart persistence, Firefox/WebKit, real application content or screen-reader focus behavior. A future integration must validate its own router and layout-readiness contract rather than treating the helper as a drop-in router.

For reload persistence, the optional `positionStore` accepts the `get`/`set` interface demonstrated in [reload and recovery](06-reload-and-recovery.md). Its default remains an in-memory Map.
