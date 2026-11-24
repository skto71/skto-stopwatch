/* sw.js — офлайн-кеш. ПРИ КАЖДОМ ОБНОВЛЕНИИ ФАЙЛОВ меняйте CACHE. IndexedDB кеш не затрагивает. */
const CACHE="skto-stopwatch-v1.0.0";
const FILES=["./","./index.html","./manifest.json","./css/style.css","./js/norms.js","./js/distances.js","./js/comparison.js","./js/storage.js","./js/feedback.js","./js/help.js","./js/journal.js","./js/timer.js","./js/app.js","./js/recovery.js","./js/update.js","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png","./icons/apple-touch-icon.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)))}); /* без skipWaiting: обновление ждёт решения пользователя */
self.addEventListener("message",e=>{if(e.data==="SKIP_WAITING")self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith("skto-stopwatch-") && x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)))});
