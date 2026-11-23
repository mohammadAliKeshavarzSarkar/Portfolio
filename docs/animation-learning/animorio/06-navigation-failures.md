# Lesson 6 — Loading failures and menu reopening

**23 November 2026 · Asia/Tehran.** This original shell adapter extends [composed controllers](06-composed-controllers.md). Its policy is deliberately simple: while a route prepares, disable the menu opener and ignore shell menu-open requests. Keep background rendering paused until a usable route or error page commits. A failed load commits an error page at the requested URL with ordinary recovery links.

## Put loading ownership outside individual animations

```js
function createLoadingGate({ menu, opener, getRenderer, load, errorPage }) {
  const originalDisabled = opener.disabled;
  let loading = false,
    disposed = false,
    revision = 0;
  return {
    async prepare(url) {
      const token = ++revision;
      loading = true;
      opener.disabled = true;
      getRenderer().setPaused(true);
      await menu.request(false);
      let page;
      try {
        page = await load(url);
      } catch (error) {
        page = await errorPage(error, url);
      }
      return {
        ready: page.ready,
        focus: () => page.focus(),
        commit() {
          if (disposed || token !== revision) return;
          page.commit();
          loading = false;
          opener.disabled = originalDisabled;
        },
      };
    },
    openMenu() {
      if (disposed || loading) return Promise.resolve();
      getRenderer().setPaused(true);
      return menu.request(true);
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      revision++;
      opener.disabled = originalDisabled;
    },
  };
}
```

Pass `gate.prepare` as the History adapter's preparation callback. Route commits replace the paused renderer with a newly mounted renderer. The router generation still owns whether a prepared page may commit; the gate revision adds protection for its own loading UI. A stale preparation must never re-enable the opener while a newer load remains pending.

The gate is called as part of the shell, not mounted independently. On teardown destroy the gate before the router, menu and renderer. It restores only its opener state; renderer and lock cleanup remain those controllers' responsibilities. The menu's native opener click is blocked through its disabled state; programmatic opens must go through `gate.openMenu()` rather than bypassing it with `menu.request(true)`.

`load` must build detached content and return a page adapter. `errorPage` does the same after a rejected load. Error pages should contain a heading explaining the failure and an ordinary link to a working destination; do not keep an indefinite animated loader. New navigation focuses the error heading through the router's ordinary focus contract. Back retains the router's restore policy. This exercise keeps the requested URL rather than silently showing old content under a new address.

`errorPage`, `page.commit` and `page.focus` must be reliable operations for this adapter. A failure in error rendering or commitment needs a final shell-level native-navigation/fallback policy; the exercise does not implement that last-resort recovery. Prepared `ready` promises must settle and commits must be synchronous. If a page computes readiness only during commit, expose it through an already-created deferred promise rather than replacing the property later.

## Browser checks

The composed fixture now extracts this code and checks:

- A delayed route disables the opener; physical opener clicks and shell open requests cannot reopen the modal.
- A rejected loader produces a readable error route at the requested URL, with heading focus and a working native recovery link.
- The opener is enabled again and no scroll lock remains.
- A superseded preparation cannot unlock a newer loading phase.

Run `node docs/animation-learning/animorio/verify-composed-browser.cjs`. Tests use Chromium and software WebGL in a temporary request-fulfilled document. No external application is published. Error-page-rendering failure, arbitrary shell API misuse, reload/bfcache, other engines and hardware performance remain outside this result.
