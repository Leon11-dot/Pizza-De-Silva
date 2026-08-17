
const CACHE='pds-apfelstrudel-fix-v1';
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([
  self.clients.claim(),
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
])));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(/\.(webp|png|jpg|jpeg|svg)$/i.test(u.pathname)){
    e.respondWith(caches.open(CACHE).then(async c=>{
      const hit=await c.match(e.request);
      if(hit) return hit;
      const res=await fetch(e.request);
      if(res.ok) c.put(e.request,res.clone());
      return res;
    }));
    return;
  }
  e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request)));
});
