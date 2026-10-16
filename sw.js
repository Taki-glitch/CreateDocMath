/* Service worker : fichiers de l'application = réseau d'abord (toujours à jour), cache en secours ;
   bibliothèques CDN (KaTeX, html-docx) = cache d'abord, remplies à la première visite en ligne. */
const V='fiches-maths-v7',CORE=['./','index.html','bo_cycle3.js','bo_cycle4.js','bo_premiere.js','bank_difficultes.js','manifest.json','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
const keep=(r,x)=>{const c=x.clone();caches.open(V).then(h=>h.put(r,c));return x};
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;
 if(new URL(r.url).origin===location.origin)
  e.respondWith(fetch(r).then(x=>keep(r,x)).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))));
 else e.respondWith(caches.match(r).then(m=>m||fetch(r).then(x=>keep(r,x))));});
