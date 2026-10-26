'use strict';
/* Cache navigations and assets progressively; never cache or transmit save JSON. */
const CACHE='pkmsvv-ios-v1516-2';
const SHELL=['/','/index.html','/entry.js','/manifest.webmanifest','/game/index.html','/lan-connect.html','/lan-connect.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(
 keys.filter(k=>k.startsWith('pkmsvv-ios-')&&k!==CACHE).map(k=>caches.delete(k))
 )).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;
 const url=new URL(r.url);
 if(url.origin!==self.location.origin||url.pathname.endsWith('.json')&&/save|backup/i.test(url.pathname))return;
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  // Updated HTML takes precedence. Assets can run from cache if connection drops.
  if(r.mode==='navigate'){
   try{const res=await fetch(r);if(res.ok)await cache.put(r,res.clone());return res;}
   catch(_){return(await cache.match(r))||(await cache.match('/game/index.html'))||Response.error();}
  }
  const hit=await cache.match(r);if(hit)return hit;
  const res=await fetch(r);if(res.ok&&res.type==='basic')await cache.put(r,res.clone()).catch(()=>{});
  return res;
 })());
});