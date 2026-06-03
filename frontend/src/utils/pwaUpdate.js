/**
 * Safe PWA update: activate new service worker without white-screen stale chunks.
 */
export function registerPwaUpdateHandler() {
  if (!("serviceWorker" in navigator)) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker.ready.then((registration) => {
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          window.__WEALLL_SW_UPDATE_PENDING__ = true;
          window.dispatchEvent(new Event("wealll-sw-update"));
        }
      });
    });
  });
}

export async function activatePwaUpdate() {
  const registration = await navigator.serviceWorker?.ready;
  if (registration?.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}
