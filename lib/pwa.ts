export const DRAFT_STORAGE_KEY = "hawk.draft.v1";
const WARM_PAGE = "/dashboard/invoice-engine";
const MAX_WARM_ASSETS = 60;

export async function registerServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  if (navigator.onLine) {
    await warmOfflineShell();
  }
}

export async function warmOfflineShell(): Promise<void> {
  const response = await fetch(WARM_PAGE, { credentials: "same-origin" });
  if (!response.ok || response.redirected) {
    return;
  }
  const html = await response.text();
  const assets = new Set<string>();
  for (const match of html.matchAll(/\/_next\/static\/[^"'\s\\)]+\.(?:js|css|woff2)/g)) {
    assets.add(match[0]);
  }
  await Promise.allSettled([...assets].slice(0, MAX_WARM_ASSETS).map((asset) => fetch(asset, { credentials: "same-origin" })));
}

export function clearDeviceData(): void {
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    return;
  } finally {
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_CACHES" });
  }
}
