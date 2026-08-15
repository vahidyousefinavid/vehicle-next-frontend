self.addEventListener('push', (event) => {
  let data = { title: 'دستیار خودرو', body: '' };
  try { data = event.data.json(); } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'دستیار خودرو', {
      body: data.body || '',
      icon: '/icon.png',
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
