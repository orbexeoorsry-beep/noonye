/** Register the app-shell worker only on secure origins. A waiting update is
 * intentionally left waiting; it activates on a later fresh load, never mid-PDF. */
export function registerPwaServiceWorker(): void {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
      console.warn('PWA service worker registration failed', error);
    });
  }, { once: true });
}
