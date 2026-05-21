const CACHE = 'mkt-gemini-v1';
const BASE  = '/DailyNews';

self.addEventListener('install',  e => e.waitUntil(caches.open(CACHE).then(c => c.addAll([BASE+'/',BASE+'/index.html',BASE+'/manifest.json']).catch(()=>{})).then(()=>self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));

self.addEventListener('fetch', e => {
  if (e.request.url.includes('googleapis.com') || e.request.url.includes('generativelanguage')) return;
  e.respondWith(caches.match(e.request).then(h => h || fetch(e.request).catch(() => caches.match(BASE+'/index.html'))));
});

self.addEventListener('message', e => { if (e.data?.type === 'SCHEDULE_CHECK') fireIfDue(); });
self.addEventListener('periodicsync', e => { if (e.tag === 'market-brief') e.waitUntil(fireIfDue()); });

async function fireIfDue() {
  const ist = new Date(Date.now() + 5.5 * 3600000);
  const h = ist.getUTCHours(), m = ist.getUTCMinutes();
  if ((h === 6 || h === 15) && m < 10) {
    await self.registration.showNotification('🇮🇳 India Market Intelligence', {
      body: `${h===6?'Morning 6 AM':'Afternoon 3 PM'} IST briefing — tap to fetch today's news`,
      icon: BASE+'/icon-192.png', badge: BASE+'/icon-192.png',
      tag: 'mkt-brief', renotify: true, requireInteraction: true,
      data: { url: BASE+'/' }
    });
  }
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list => {
    for (const c of list) { if (c.url.includes('vivchopra.github.io')) { c.focus(); c.postMessage({type:'AUTO_RUN'}); return; } }
    return clients.openWindow(BASE+'/');
  }));
});
