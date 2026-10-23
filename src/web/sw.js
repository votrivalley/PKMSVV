'use strict';
/* Root Web launcher for Android PWAs. Keep saves/storage entirely untouched. */
const CACHE='pkmsvv-launch-v2';
const SHELL=['/','/index.html','/entry.js','/manifest.webmanifest'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(
  keys.filter(key=>key.startsWith('pkmsvv-launch-')&&key!==CACHE).map(key=>caches.delete(key))
 )).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||event.request.mode!=='navigate')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).then(async response=>{
   if(response.status===404)return (await caches.match('/index.html'))||response;
   return response;
  }).catch(async()=> (await caches.match('/index.html'))||
    new Response('<!doctype html><title>Pokémon Sống Sót</title><p>Kiểm tra Internet rồi mở lại ứng dụng.</p>',
      {status:503,headers:{'Content-Type':'text/html; charset=utf-8'}})));
});
