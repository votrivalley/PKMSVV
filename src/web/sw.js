'use strict';
/* Installed Web app startup only. Do not cache outdated gameplay scripts or game saves. */
const CACHE='pkmsvv-launch-v1';
const SHELL=['./','./index.html','./entry.js','./manifest.webmanifest'];
self.addEventListener('install',e=>{
 e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pkmsvv-launch-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.mode!=='navigate'||u.origin!==self.location.origin)return;
 // Always check current Hosting first; offline launcher falls back only to mode picker.
 if(u.pathname==='/'||u.pathname==='/index.html'){
  e.respondWith(fetch(e.request).catch(()=>caches.match('./index.html')));
 }
});
