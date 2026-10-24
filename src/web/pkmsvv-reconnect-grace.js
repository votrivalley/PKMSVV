'use strict';
/* Web-only: short network drops do not instantly end a co-op match. */
G.PKMSVVGrace = (() => {
 const TIMEOUT_MS = 45000, pending = new Map();
 function lost(uid, onExpired) {
   if(pending.has(uid))return false;
   const timer=setTimeout(()=>{pending.delete(uid);onExpired();},TIMEOUT_MS);
   pending.set(uid,timer);
   return true;
 }
 function restored(uid) {
   if(!pending.has(uid))return false;
   clearTimeout(pending.get(uid));pending.delete(uid);return true;
 }
 function clear(){for(const timer of pending.values())clearTimeout(timer);pending.clear();}
 return {lost,restored,clear,TIMEOUT_MS,pendingCount:()=>pending.size};
})();
