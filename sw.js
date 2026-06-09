/* Service Worker — Oro's hub
   Estratégia "network-first": com internet, sempre pega a versão mais nova;
   sem internet, usa a cópia salva (offline). Evita ficar preso em versão antiga. */
const CACHE = 'oros-hub-v11';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

/* network-first: tenta a rede e atualiza o cache; se falhar (offline), usa o cache */
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(
    fetch(e.request).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(e.request, copy)).catch(()=>{});
      return res;
    }).catch(()=>
      caches.match(e.request).then(hit=> hit || caches.match('./index.html'))
    )
  );
});
