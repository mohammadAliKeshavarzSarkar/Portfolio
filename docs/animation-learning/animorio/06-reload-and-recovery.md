# Lesson 6 — Reload persistence and final recovery

**23 November 2026 · Asia/Tehran.** This exercise extends [History restoration](06-history-restoration.md). History entry keys survive an ordinary reload, while the adapter's in-memory scroll map does not. A bounded session-storage adapter can reconnect them.

## Persist only validated entry positions

```js
function createPositionStore(
  storage,
  name = "animation-study-positions",
  limit = 40,
) {
  if (!Number.isInteger(limit) || limit < 1)
    throw new RangeError("Positive entry limit required");
  let entries = new Map();
  try {
    const data = JSON.parse(storage.getItem(name) || "[]");
    if (Array.isArray(data)) {
      for (const row of data.slice(-limit)) {
        if (
          Array.isArray(row) &&
          row.length === 2 &&
          typeof row[0] === "string" &&
          Number.isFinite(row[1]) &&
          row[1] >= 0
        )
          entries.set(row[0], row[1]);
      }
    }
  } catch (_) {
    /* denied or malformed storage: keep the local fallback */
  }
  return {
    get(key) {
      return entries.get(key);
    },
    set(key, value) {
      if (typeof key !== "string" || !Number.isFinite(value) || value < 0)
        return;
      entries.delete(key);
      entries.set(key, value);
      while (entries.size > limit) entries.delete(entries.keys().next().value);
      try {
        storage.setItem(name, JSON.stringify([...entries]));
      } catch (_) {}
    },
  };
}

function showFinalRecovery({ main, dispose, url }) {
  // Validate the destination before releasing ownership.
  const destination = new URL(url, location.href);
  if (destination.origin !== location.origin)
    throw new Error("Local recovery destination required");
  const failures = [];
  for (const cleanup of dispose) {
    try {
      cleanup();
    } catch (error) {
      failures.push(error);
    }
  }
  const heading = document.createElement("h1");
  heading.tabIndex = -1;
  heading.textContent = "This page could not be prepared";
  const text = document.createElement("p");
  text.textContent = "Use ordinary navigation to try the destination again.";
  const link = document.createElement("a");
  link.href = destination.href;
  link.textContent = "Open the destination";
  main.replaceChildren(heading, text, link);
  heading.focus({ preventScroll: true });
  return failures;
}
```

Pass `createPositionStore(sessionStorage)` as `positionStore` to the History adapter and call its initial `refresh()` only after baseline route content is ready. Storage access itself can throw: if reading the `sessionStorage` property is restricted, pass a no-op storage object from a guarded accessor. The helper tolerates failures from `getItem` and `setItem`, invalid stored values and quota errors. It keeps an in-memory fallback, so denial removes reload persistence without breaking navigation.

This small exercise writes on each saved position. In a real application, coalesce persistence writes and flush on pagehide/visibility boundaries while retaining the latest position in memory. Namespace stored entries by application/version, expire them according to the intended session policy, and clear obsolete route keys. Scroll positions are layout-dependent: the browser clamps them if content shrinks. They do not encode a meaningful chapter across different responsive layouts.

## Error rendering can also fail

The History adapter invokes its `onError` only for the current navigation generation. Use that boundary for `showFinalRecovery` when both route preparation and its ordinary error-page builder reject. Supply cleanup functions in dependency order: loading gate, modal, route owner and GPU renderer. Each cleanup is attempted even if an earlier one throws; the returned failures can be recorded by the shell.

This last-resort view uses DOM text and an ordinary link, avoiding another route-template dependency. It does not automatically reload, which could create an infinite error loop. The recovery link must remain outside enhanced click interception after shell disposal. The fixture tests ordinary navigation to a known server-renderable recovery destination. A real server must support that destination; a client-only URL cannot guarantee native recovery.

The final fallback assumes DOM creation/replacement and focus remain usable. No JavaScript fallback can recover a completely unavailable document or process. Cleanup functions retain their own idempotence contracts; this helper cannot release a lock if its owner fails before releasing it.

## Bfcache is a separate lifecycle

Ordinary reload creates a new document. Back-forward cache can revive the old document and its JavaScript heap. A reload test therefore cannot prove bfcache behavior. On persisted `pagehide`, pause scheduling; on persisted `pageshow`, refresh geometry and resume only eligible owners. Avoid blindly mounting duplicate controllers on every pageshow. If destroying on pagehide, provide a symmetrical remount path and restore readiness before restoring scroll.

The tests below do not observe an actual persisted bfcache restore. That remains unverified, as do browser restarts, cross-tab behavior, other engines and physical devices. The session-storage policy is intentionally tab/session-oriented.

## Verification

Run `node docs/animation-learning/animorio/verify-reload-browser.cjs`. The request-fulfilled Chromium fixture loads scripts as part of the document, performs an actual reload and verifies entry-key/scroll restoration after delayed layout readiness. It also checks malformed/denied storage handling and invokes the router error boundary after both loader and error-page preparation reject. That boundary disposes owners, displays the last-resort view, focuses its heading and permits ordinary recovery-link navigation.

The History adapter skips saving the initial new-document scroll offset before its first refresh, so the stored target survives initialization. Teardown restores the setting captured at mount; Chromium can retain `manual` across reload, so assuming the previous setting was always `auto` is incorrect.

The final-recovery fixture records the cleanup callback order and destroys the actual History adapter. Modal/GPU cleanup functions are stand-ins in this particular test; their resource release is checked separately in the composed fixture. This is not a new end-to-end proof of every controller failing simultaneously.

Follow-up: [the bfcache lifecycle exercise](06-bfcache-lifecycle.md) now observes actual persisted restores for a standalone frame owner. The reload results above retain their separate scope; combined GPU/modal cache eligibility remains unverified.
