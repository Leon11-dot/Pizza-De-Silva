
const CACHE='pizza-de-silva-admin-redmi-v3';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);

  // Keep navigation and app shell fresh.
  if(event.request.mode==='navigate' || url.pathname.endsWith('/admin.html') || url.pathname.endsWith('/admin.js')){
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(event.request)));
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(event.request);
    if(cached) return cached;
    try{
      const response=await fetch(event.request);
      if(response && response.ok && response.type==='basic'){
        const cache=await caches.open(CACHE);
        cache.put(event.request,response.clone());
      }
      return response;
    }catch(e){
      return cached || Response.error();
    }
  })());
});

self.addEventListener('push', event => {
  let data={};
  try{ data=event.data?event.data.json():{}; }catch(e){}

  const title=data.title||'🔔 Neue Bestellung – Pizza De Silva';
  const options={
    body:data.body||'Eine neue Bestellung ist eingetroffen.',
    icon:'/admin-icon-192.png',
    badge:'/admin-icon-192.png',
    tag:data.tag||('pds-order-'+(data.orderNumber||Date.now())),
    renotify:true,
    requireInteraction:true,
    vibrate:[400,150,400,150,700,200,700],
    data:{url:data.url||'/admin.html',orderId:data.orderId||null}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target=new URL(event.notification.data?.url||'/admin.html',self.location.origin).href;
  event.waitUntil((async()=>{
    const list=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const c of list){
      if('focus' in c){
        try{ await c.navigate(target); }catch(e){}
        return c.focus();
      }
    }
    return clients.openWindow(target);
  })());
});
