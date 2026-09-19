/**
 * دستیار خودرو — service worker.
 *
 * Two jobs. Web push, which this file already did, and enough caching that an
 * installed app opens instantly and shows its own page instead of the
 * browser's error when the phone drops off the network.
 */

const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const OFFLINE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((c) => c.addAll([OFFLINE, '/icon-192.png']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* `/api` is the live application. A cached answer here would show someone
     yesterday's appointments or a stale price, so it never touches the cache. */
  if (url.pathname.startsWith('/api')) return;

  /* Navigations: network first, so the app is never stale; fall back to the
     last good copy of that page, and only then to the offline notice. */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match(OFFLINE))),
    );
    return;
  }

  /* Build output and fonts are content-hashed or immutable, so a hit is always
     correct: serve it at once, refresh in the background. This is what makes
     the second launch feel instant. */
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/fonts')) {
    event.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(ASSETS).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => hit);
        return hit || net;
      }),
    );
  }
});

self.addEventListener('push', (event) => {
  let data = { title: 'دستیار خودرو', body: '' };
  try { data = event.data.json(); } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'دستیار خودرو', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      dir: 'rtl',
      lang: 'fa',
      // Carried through to the click handler below. A push that cannot be
      // followed to what it is about is only half a notification.
      data: { url: data.url || '/dashboard' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/dashboard';

  /**
   * Prefer a tab that is already open. Opening a second window onto an app the
   * person already has running is a small thing that feels broken, and on a
   * phone it loses whatever they were in the middle of.
   */
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client && 'navigate' in client) {
          return client.focus().then(() => client.navigate(url)).catch(() => self.clients.openWindow(url));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
