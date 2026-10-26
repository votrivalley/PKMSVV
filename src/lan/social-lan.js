/* Local ownership and room directory; no Firebase credentials or Google accounts. */
G.Social=(()=>{
 const listeners=new Set();
 let me=null,room=null,started=false,playing=false,finishPromise=null;
 const fire=what=>listeners.forEach(fn=>{try{fn(what);}catch(e){console.warn(e);}});
 const ownMember=()=>{
  const s=G.DB.save||{};
  return {dex:Number(s.partner)||25,shiny:!!s.partnerShiny&&!!G.DB.ownsShiny?.(s.partner)};
 };
 G.LanBus.on(msg=>{
  if(msg.t==='room'){room={...msg.room,isHost:msg.room.host===G.LanBus.uid};fire('room');}
  if(msg.t==='room-closed'||msg.t==='disconnected'){room=null;fire('room-closed');}
 });
 async function start(){
  if(!G.DB.save)return'off';
  try{
   await G.LanBus.connect();
   const name=String(G.DB.user||G.DB.save.name||'Trainer').slice(0,24).trim()||'Trainer';
   const r=await G.LanBus.request('hello',{name});
   me={uid:G.LanBus.uid,name:r.name};started=true;fire('started');return'ok';
  }catch(e){G.UI?.toast?.('LAN: '+e.message,3300);return'off';}
 }
 async function claimNick(name){const n=String(name||'').trim();if(!n||n.length>24)return{ok:false,error:'Tên từ 1–24 ký tự'};const r=await G.LanBus.request('hello',{name:n});me={uid:G.LanBus.uid,name:r.name};return{ok:true};}
 const limit=r=>r?.mode==='royale'?10:4;
 async function createRoom(mode='coop',visibility='private'){
  if(!me&&await start()!=='ok')throw Error('Chưa kết nối LAN');
  const r=await G.LanBus.request('create',{mode,visibility,...ownMember()});
  room={...r,isHost:true};fire('room');return room;
 }
 async function joinRoom(id){
  if(!me&&await start()!=='ok')return{ok:false,error:'Chưa kết nối LAN'};
  try{
   const r=await G.LanBus.request('join',{id:String(id).trim(),...ownMember()});
   room={...r,isHost:false};fire('room');return{ok:true};
  }catch(e){return{ok:false,error:e.message};}
 }
 async function leaveRoom(){if(!room)return;await G.LanBus.request('leave').catch(()=>{});room=null;fire('room-closed');}
 async function refreshMember(){if(room)await G.LanBus.request('update',ownMember()).catch(()=>{});}
 async function setOpen(open){if(room?.isHost)await G.LanBus.request('open',{open:!!open}).catch(()=>{});}
 async function listPublicRooms(){if(!me&&await start()!=='ok')return[];return G.LanBus.request('list');}
 function finishMatch(){
  if(!room?.isHost)return Promise.resolve();
  if(finishPromise)return finishPromise;
  const id=room.id;
  finishPromise=G.LanBus.request('finish').then(r=>{
   if(room?.id===id){room={...r,isHost:true};fire('room');}
  }).catch(e=>{finishPromise=null;throw e;});
  return finishPromise;
 }
 return {start,claimNick,createRoom,joinRoom,leaveRoom,refreshMember,setOpen,listPublicRooms,finishMatch,
  roomLimit:limit,MAX_PLAYERS:10,VALID:/^.{1,24}$/,ensureFriends:async()=>[],
  setPlaying(p){playing=!!p;if(p)finishPromise=null;},refreshPresence(){},publishProfile(){},getProfile:async()=>null,
  request:async()=>({ok:false,error:'LAN không có danh sách bạn'}),accept:async()=>({ok:false}),
  remove:async()=>({ok:false}),invite:async()=>({ok:false,error:'Chia sẻ IP/mã phòng để mời'}),
  acceptInvite:async()=>({ok:false}),declineInvite(){},get invites(){return[];},get friends(){return[];},
  on(fn){listeners.add(fn);},off(fn){listeners.delete(fn);},
  get me(){return me;},get uid(){return G.LanBus.uid;},get started(){return started;},get room(){return room;},get playing(){return playing;}
 };
})();
