// BAEK TO YOU service worker
// · 앱 파일: 항상 서버에 재검증(no-cache) → 최신 배포가 바로 반영, 오프라인이면 캐시 사용
// · 배포할 때 버전을 바꿀 필요 없음. 이 파일을 바꿨을 때만 새 워커가 설치되고 페이지가 한 번 새로고침돼요.
// · 사용자 데이터(localStorage·IndexedDB)는 건드리지 않아요. 정리하는 건 'baek-to-you' 앱 캐시뿐.
const SHELL_CACHE = 'baek-to-you-shell-v3';
const FONT_CACHE = 'baek-to-you-fonts-v1';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/app.js', './js/pwa.js', './js/store.js', './js/speech.js', './js/yt.js', './js/compare.js', './js/feedback.js', './js/talk-engine.js',
  './js/ui.js', './js/video.js', './js/apply.js', './js/talk.js', './js/saved.js', './js/settings.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE)
    .then(c => Promise.all(SHELL.map(u => fetch(new Request(u, { cache: 'reload' })).then(r => r.ok && c.put(u, r)).catch(() => { }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('baek-to-you') && k !== SHELL_CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.endsWith('/sw.js')) return;
    e.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: 'no-cache' }); // ETag로 재검증 → 바뀐 파일만 새로 받음
        if (res.ok && res.type === 'basic') { const c = await caches.open(SHELL_CACHE); c.put(stripQuery(req, url), res.clone()); }
        return res;
      } catch {
        const c = await caches.open(SHELL_CACHE);
        return (await c.match(stripQuery(req, url))) || (req.mode === 'navigate' ? (await c.match('./index.html')) || (await c.match('./')) : Response.error());
      }
    })());
    return;
  }
  // 폰트·CDN: 캐시 우선
  if (/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net/.test(url.host)) {
    e.respondWith(caches.open(FONT_CACHE).then(c => c.match(req).then(r => r || fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }))));
  }
});
function stripQuery(req, url) { return url.search ? new Request(url.origin + url.pathname) : req; }
