'use strict';
/* Cache core game after first visit; sprites/audio cache on demand, to avoid
 * 13k preloads exhausting iOS storage. Never cache any exported user save.
 */
const CACHE='pkmsvv-cloudflare-v1516-5';
const CORE=['/','/index.html','/manifest.webmanifest','/game/',
 '/game/index.html','/game/js/app.min.js','/game/css/style.css',
 '/game/js/ui/pkmsvv-local-shell.js','/game/js/boot.js','/save-guardian.js','/save-rescue.html','/save-rescue.js'];
self.addEventListener('install',e=>e.waitUntil(
 caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(
 caches.keys().then(keys=>Promise.all(keys.filter(k=>
 k.startsWith('pkmsvv-')&&k!==CACHE).map(k=>caches.delete(k))))
 .then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const request=e.request;if(request.method!=='GET')return;
 const url=new URL(request.url);if(url.origin!==self.location.origin)return;
 if(/(?:save|backup|export|import).*\.json$/i.test(url.pathname))return;
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(request.mode==='navigate'||request.destination==='script'||request.destination==='style'){
   try{
    const res=await fetch(request);
    if(res.ok&&res.type==='basic')cache.put(request,res.clone()).catch(()=>{});
    return res;
   }catch(_){return await cache.match(request)||
    (request.mode==='navigate'?await cache.match('/game/index.html'):undefined)||
    Response.error();}
  }
  const hit=await cache.match(request);if(hit)return hit;
  try{
   const res=await fetch(request);
   if(res.ok&&res.type==='basic')cache.put(request,res.clone()).catch(()=>{});
   return res;
  }catch(_){return Response.error();}
 })());
});
