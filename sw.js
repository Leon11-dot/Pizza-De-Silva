const CACHE='pizza-de-silva-v20260912-hours-v4';
self.addEventListener('install',event=>self.skipWaiting());
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  const dynamic = url.pathname.endsWith('.html') ||
                  url.pathname.endsWith('.js') ||
                  url.pathname==='/' ||
                  url.pathname.endsWith('/');
  if(dynamic){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        return fresh;
      }catch(e){
        return (await caches.match(req)) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached) return cached;
    const fresh=await fetch(req);
    const copy=fresh.clone();
    const cache=await caches.open(CACHE);
    cache.put(req,copy);
    return fresh;
  })());
});
