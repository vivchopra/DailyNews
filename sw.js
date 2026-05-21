const CACHE_NAME = 'india-market-intel-v1';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

// ─── INSTALL ──────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH (cache-first for static, network-first for API) ────────────────────
self.addEventListener('fetch', e => {
  if (e.request.url.includes('api.anthropic.com')) return; // never cache API calls
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});

// ─── SCHEDULED NOTIFICATION CHECK ─────────────────────────────────────────────
// Fires when browser wakes the SW via periodic sync or a client message
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_CHECK') {
    checkAndNotify();
  }
});

self.addEventListener('periodicsync', e => {
  if (e.tag === 'market-briefing') {
    e.waitUntil(checkAndNotify());
  }
});

function checkAndNotify() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  const h = ist.getUTCHours();
  const m = ist.getUTCMinutes();

  const is6AM  = h === 6  && m < 10;
  const is3PM  = h === 15 && m < 10;

  if (is6AM || is3PM) {
    const label = is6AM ? 'Morning Briefing (6 AM IST)' : 'Afternoon Briefing (3 PM IST)';
    return self.registration.showNotification('🇮🇳 India Market Intelligence', {
      body: `${label} — Tap to open your daily market briefing`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'market-briefing',
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'open', title: '📊 Open Briefing' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      data: { url: '/' },
    });
  }
}

// ─── NOTIFICATION CLICK ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({ type: 'AUTO_RUN' });
          return;
        }
      }
      return clients.openWindow('/');
    })
  );
});
