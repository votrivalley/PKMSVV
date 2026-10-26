/* LAN relay transport for existing G.Coop/G.Royale/G.EggRush messages. */
G.Net=(()=>{
 const handlers=new Set(),peerHandlers=new Set();
 const stats={sent:0,recv:0,relaySent:0,sentBytes:0,recvBytes:0};
 let roomId=null,hostUid=null,isHost=false;
 const emit=u=>peerHandlers.forEach(fn=>{try{fn(u,mode(u));}catch(e){console.warn(e);}});
 G.LanBus.on(msg=>{
  if(msg.t==='data'&&roomId){stats.recv++;handlers.forEach(fn=>{try{fn(msg.from,msg.data);}catch(e){console.error('LAN receive',e);}});}
  else if(msg.t==='room-closed'||msg.t==='disconnected')close();
 });
 function open(id,host,owner){roomId=id;isHost=!!host;hostUid=owner;syncMembers((G.Social.room?.members||[]).map(x=>x.uid));}
 function close(){const former=peers();roomId=null;hostUid=null;isHost=false;former.forEach(emit);}
 function peers(){return roomId?(G.Social.room?.members||[]).filter(x=>x.uid!==G.LanBus.uid).map(x=>x.uid):[];}
 function syncMembers(uids){if(!roomId)return;for(const u of uids)if(u!==G.LanBus.uid)emit(u);}
 function mode(u){return roomId&&peers().includes(u)?'direct':'closed';}
 function send(to,msg){if(!roomId||!peers().includes(to))return;stats.sent++;stats.sentBytes+=JSON.stringify(msg).length;G.LanBus.send(to,msg);}
 function broadcast(msg,except){for(const u of peers())if(u!==except)send(u,msg);}
 function toHost(msg){if(!isHost&&hostUid)send(hostUid,msg);}
 return {open,close,syncMembers,mode,peers,send,broadcast,toHost,slow:()=>false,
  on(fn){handlers.add(fn);},off(fn){handlers.delete(fn);},
  onPeer(fn){peerHandlers.add(fn);},
  get open_(){return!!roomId;},get uid(){return G.LanBus.uid;},
  get hostUid(){return hostUid;},get isHost(){return isHost;},stats};
})();