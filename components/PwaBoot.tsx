'use client';
import { useEffect } from 'react';
import { api } from '@/lib/api';

const LAST_REFRESH = 'v-token-refreshed';
const EVERY = 6 * 3600 * 1000;   // at most once every six hours

/**
 * Everything the installed app needs on boot, and nothing visible.
 *
 * Registering the worker here rather than only inside PushToggle matters: the
 * worker is what lets the app open offline and start instantly, and most
 * people never visit the screen that asks about notifications.
 *
 * `storage.persist()` is the piece that keeps someone signed in. The session
 * token lives in localStorage, and a browser is free to evict that whenever it
 * is short of room — Safari does it after about a week of not opening the app,
 * which is exactly the "why am I logged out again" complaint. Persisted
 * storage is exempt from that sweep. An installed app is usually granted it
 * without a prompt; a browser tab may refuse, which is fine — we just ask.
 */
export default function PwaBoot() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    if (navigator.storage?.persist) {
      navigator.storage.persisted()
        .then((already) => { if (!already) return navigator.storage.persist(); })
        .catch(() => {});
    }

    /* Slide the session forward. Tokens last 30 days, so without this even a
       daily user is thrown out a month after signing in. Renewing on open
       means an active person never sees the login screen again, while a token
       abandoned for a month still expires on its own.

       A failure here is deliberately silent and never clears anything: being
       offline, or the API being down, must not log anybody out. */
    try {
      if (!localStorage.getItem('vtoken')) return;
      const last = Number(localStorage.getItem(LAST_REFRESH) || 0);
      if (Date.now() - last < EVERY) return;
      api.auth.refresh()
        .then((res) => {
          localStorage.setItem('vtoken', res.access_token);
          localStorage.setItem('vuser', JSON.stringify(res.user));
          localStorage.setItem(LAST_REFRESH, String(Date.now()));
        })
        .catch(() => {});
    } catch { /* storage unavailable (private mode) — nothing to renew */ }
  }, []);

  return null;
}
