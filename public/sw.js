const CACHE='karkaba-shell-v12';
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const response=await fetch('/',{cache:'reload'});
  if(!response.ok)throw new Error('App shell unavailable');
  const markup=await response.clone().text();
  await cache.put('/',response);
  const assets=[...markup.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match=>match[1]);
  await cache.addAll([...new Set([...assets,'/icon-192.png','/icon-512.png','/manifest.json'])]);
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('karkaba-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/.netlify/'))return;
 if(event.request.mode==='navigate'&&url.pathname!=='/'&&url.pathname!=='/index.html')return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put('/',copy)))}return response}).catch(()=>caches.match('/')));return;
 }
 if(url.pathname.startsWith('/assets/')||['/icon-192.png','/icon-512.png','/manifest.json'].includes(url.pathname))event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)))}return response})));
});

self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
  const existing=windows.find(client=>new URL(client.url).origin===self.location.origin);
  if(existing)return existing.focus();
  return self.clients.openWindow('/');
 }));
});
