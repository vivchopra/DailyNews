const CACHE_NAME = 'india-market-v2';
const BASE = '/DailyNews';
const STATIC = [BASE + '/', BASE + '/index.html', BASE + '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(STATIC).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Never intercept API calls
  if (e.request.url.includes('anthropic.com') || e.request.url.includes('cors-anywhere')) return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).catch(() => caches.match(BASE + '/index.html')))
  );
});

// Notification scheduling
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_CHECK') fireIfDue();
});

self.addEventListener('periodicsync', e => {
  if (e.tag === 'market-briefing') e.waitUntil(fireIfDue());
});

async function fireIfDue() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600000);
  const h = ist.getUTCHours(), m = ist.getUTCMinutes();
  if ((h === 6 || h === 15) && m < 10) {
    const label = h === 6 ? 'Morning (6 AM IST)' : 'Afternoon (3 PM IST)';
    await self.registration.showNotification('🇮🇳 India Market Intelligence', {
      body: `${label} briefing ready — tap to fetch today\'s news`,
      icon: BASE + '/icon-192.png',
      badge: BASE + '/icon-192.png',
      tag: 'market-brief',
      renotify: true,
      requireInteraction: true,
      data: { url: BASE + '/' },
    });
  }
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('vivchopra.github.io')) { c.focus(); c.postMessage({ type: 'AUTO_RUN' }); return; }
      }
      return clients.openWindow(BASE + '/');
    })
  );
});
