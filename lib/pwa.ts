'use client';

/**
 * Install and update, in one place.
 *
 * `beforeinstallprompt` fires once, early — routinely **before React hydrates**
 * on a phone — and it is the only object that can replay the install. A
 * listener attached from a component's `useEffect` is therefore a race the app
 * loses often, and losing it means the browser will never offer the install
 * again for that page load. So the listener is installed by a blocking script
 * in <head> (PWA_BOOT_SCRIPT, mounted in app/layout.tsx) and parks the event on
 * `window`; everything here only reads what that script captured.
 *
 * The same applies to the single-use nature of the event: one owner holds it,
 * so a banner the person dismissed cannot take the install away from the
 * profile screen.
 */

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';

type Choice = { outcome: 'accepted' | 'dismissed' };
export type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<Choice> };

/** Fired whenever installability changes, so any mounted screen can re-read it. */
export const INSTALLABILITY = 'v-installability';

declare global {
  interface Window {
    __vBip?: InstallEvent | null;
  }
}

/**
 * Runs blocking in <head>, before hydration, for the same reason the theme
 * script does: by the time a component mounts it is already too late.
 */
export const PWA_BOOT_SCRIPT = `
(function(){
  window.__vBip = null;
  function announce(){ window.dispatchEvent(new CustomEvent('${INSTALLABILITY}')); }
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();          // keep the browser's own mini-bar away
    window.__vBip = e;
    announce();
  });
  window.addEventListener('appinstalled', function(){
    window.__vBip = null;
    announce();
  });
})();
`.trim();

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

/** iOS fires no install event and exposes no API, so the platform is the tell. */
export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
}

export function canInstall(): boolean {
  return typeof window !== 'undefined' && !!window.__vBip;
}

/** Replays the captured prompt. Resolves to what the person chose. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = typeof window !== 'undefined' ? window.__vBip : null;
  if (!e) return 'unavailable';
  await e.prompt();
  const { outcome } = await e.userChoice;
  // the event is single-use; the browser sends a fresh one if it still applies
  window.__vBip = null;
  window.dispatchEvent(new CustomEvent(INSTALLABILITY));
  return outcome;
}

/**
 * Whether to show "here is how to install" instead of a button: the app is not
 * already installed, and no prompt is available to replay. That covers iOS,
 * Firefox, and any browser that simply has not offered one — in all of which a
 * dead install button would be worse than instructions.
 */
export function needsManualInstallHelp(): boolean {
  return !isStandalone() && !canInstall();
}
