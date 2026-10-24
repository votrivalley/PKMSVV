/* PKMSVV Web Online counter.
 * Tracks one UID regardless of how many tabs briefly overlap during a takeover.
 * Uses RTDB onDisconnect instead of periodic Firestore heartbeat writes.
 */
G.PKMSVVOnline=(()=>{
 let db=null,uid='',token='',connected=false,connectedRef=null,presenceRef=null,leaf=null;
 let disposed=true,serial=0,rows=new Map(),lastError='';
 const el=()=>document.getElementById('pkmsvv-online-count');
 function render(){
   const e=el();if(!e)return;
   if(!db){e.textContent='● Đang online: —';e.title='Chỉ có trên Web Online';return;}
   if(!connected || lastError){e.textContent='● Đang online: —';e.title=lastError||'Đang kết nối Firebase';return;}
   let count=0;
   for(const v of rows.values())if(v && typeof v==='object' && Object.keys(v).length>0)count++;
   e.textContent='● Đang online: '+count;
   e.title='Số tài khoản đang kết nối Web Online; không tính người đang chơi offline';
 }
 function stop(){
   serial++;disposed=true;connected=false;
   if(connectedRef)connectedRef.off('value',onConnection);
   if(presenceRef){presenceRef.off('child_added',onAdd);presenceRef.off('child_changed',onAdd);presenceRef.off('child_removed',onRemove);}
   const prior=leaf;
   leaf=null;presenceRef=null;connectedRef=null;db=null;uid='';token='';
   rows.clear();lastError='';
   if(prior){
     // Delete only this token; never remove the new device's presence.
     prior.remove().catch(()=>{});
     prior.onDisconnect().cancel().catch(()=>{});
   }
   const e=el();if(e)e.classList.add('hidden');
   render();
 }
 function signalPresence(){try{window.dispatchEvent(new Event('pkmsvv-presence-change'));}catch(e){}}
 function onAdd(snap){rows.set(snap.key,snap.val());render();signalPresence();}
 function onRemove(snap){rows.delete(snap.key);render();signalPresence();}
 async function register(mySerial){
   const myLeaf=leaf;
   if(!myLeaf || !connected || mySerial!==serial)return;
   try{
     // Register onDisconnect BEFORE declaring this player online.
     await myLeaf.onDisconnect().remove();
     if(disposed || mySerial!==serial || !connected)return;
     await myLeaf.set(firebase.database.ServerValue.TIMESTAMP);
   }catch(e){
     lastError='Không thể cập nhật người online: '+(e.code||e.message);
     render();
     console.warn('[PKMSVV Online] presence:',e.code||e.message);
   }
 }
 function onConnection(snap){
   connected=snap.val()===true;
   render();
   if(connected)register(serial);
 }
 function start(nextDb,nextUid,nextToken){
   stop();
   if(!nextDb || !nextUid || !/^[0-9a-f]{48}$/.test(nextToken||''))return;
   db=nextDb;uid=nextUid;token=nextToken;disposed=false;
   const e=el();if(e)e.classList.remove('hidden');
   lastError='';rows=new Map();
   const mySerial=serial;
   presenceRef=db.ref('presenceLive');
   leaf=db.ref('presenceLive/'+uid+'/'+token);
   connectedRef=db.ref('.info/connected');
   const error=e=>{lastError='Không thể xem người online: '+(e.code||e.message);render();};
   presenceRef.on('child_added',onAdd,error);
   presenceRef.on('child_changed',onAdd,error);
   presenceRef.on('child_removed',onRemove,error);
   connectedRef.on('value',onConnection,error);
   // Old web versions deliberately call goOffline() while not in a Co-op room.
   // The Web patch keeps the shared RTDB connection active for presence.
   db.goOnline();
   render();
 }
 return {start,stop,isOnline(other){const v=rows.get(String(other||''));return !!(connected&&v&&typeof v==='object'&&Object.keys(v).length);},get active(){return !disposed && !!db;},get count(){
   let n=0;for(const v of rows.values())if(v&&typeof v==='object'&&Object.keys(v).length>0)n++;
   return connected?n:null;
 }};
})();
