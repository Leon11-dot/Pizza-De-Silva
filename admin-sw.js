const CACHE='pizza-de-silva-admin-v1';
const ASSETS=['./admin.html','./styles.css','./admin.js','./config.js','./backend.js','./admin-manifest.json','./admin-icon-192.png','./admin-icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{})));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});
