# Lesson 6 — Bfcache with modal and GPU owners

**23 November 2026 · Asia/Tehran.** This original fixture combines the [modal adapter](04-browser-adapter.md), [moving GPU renderer](05-browser-renderer.md), [frame owner](05-animation-ownership.md) and [page lifecycle binding](06-bfcache-lifecycle.md). It verifies that independent pause reasons survive a real persisted document return.

## Keep modal and page suspension independent

```js
function bindCachedShell({ renderer, menu }) {
  let modalRelease = null;
  let pageRelease = null;
  let disposed = false;
  const lifecycle = bindPageLifecycle({
    suspend() {
      if (!pageRelease) pageRelease = renderer.acquirePause();
    },
    resume() {
      if (pageRelease) pageRelease();
      pageRelease = null;
    },
  });
  return {
    async openMenu() {
      if (disposed) return;
      if (!modalRelease) modalRelease = renderer.acquirePause();
      await menu.request(true);
    },
    async closeMenu() {
      if (disposed) return;
      await menu.request(false);
      if (modalRelease) modalRelease();
      modalRelease = null;
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      lifecycle.destroy();
      menu.destroy();
      if (pageRelease) pageRelease();
      if (modalRelease) modalRelease();
      pageRelease = null;
      modalRelease = null;
      renderer.destroy();
    },
  };
}
```

Opening the menu acquires one renderer pause. `pagehide` acquires a second pause. On persisted `pageshow`, the lifecycle releases only the page pause; the modal pause remains, so drawing stays stopped while the cached dialog is still open. Closing the menu releases the remaining pause and drawing resumes.

The renderer stores pause reasons independently from GPU resources. Context loss and restoration can rebuild shaders and buffers while the menu pause remains acquired. Rebuilding calls the same eligibility calculation; it does not clear the pause set. A single boolean cannot express this ownership safely because releasing either the page or modal reason would resume work prematurely.

The shell's close operation retains its pause until the modal close animation commits. If opening fails, an application shell should release the modal pause in its error policy; the adapter's current learning fixture recovers visual/lock state but does not notify this wrapper of recovery separately. That failure path is outside this test.

## Actual cache verification

Run `node docs/animation-learning/animorio/verify-composed-bfcache.cjs`. It starts a temporary loopback server and removes Playwright's default cache-disabling argument. The test asserts persisted `pagehide`/`pageshow`, unchanged document identity and a single shell mount. It also checks:

- GPU context loss/restoration while the modal is open does not resume drawing.
- Navigating away with the modal open adds a page pause.
- Returning from bfcache releases only that page pause; the dialog and scroll lock remain active and drawing remains stopped.
- Closing the restored dialog releases its lock and resumes drawing.
- A second cache traversal with the menu closed resumes drawing without remounting.
- Explicit teardown prevents a later cache return from drawing or reopening resources.

Add `--record` to save [the observed result](composed-bfcache-validation.json). The fixture uses Chromium software WebGL. It establishes this ownership composition, not hardware performance, mobile scroll-lock behavior, cache eligibility under memory pressure or behavior in other engines. A browser may evict the document at any time, so reload and baseline paths remain required.
