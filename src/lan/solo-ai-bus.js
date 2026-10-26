'use strict';
/* Offline-only LANBus adapter for the standalone HTML5 vs-AI build.
 * It uses the exact same room/game/AI code as Windows LAN, but never opens a
 * socket or advertises rooms. No Firebase, signaling, account or server.
 */
G.LanBus=(()=>{
 const listeners=new Set();
 const identity='lan-'+Math.random().toString(16).slice(2).padEnd(20,'0').slice(0,20);
 let playerName='Trainer',room=null;
 const emit=event=>{for(const fn of listeners)try{fn(event);}catch(e){console.warn('Offline AI event',e);}};
 const snapshot=()=>room?{id:room.id,mode:room.mode,host:identity,open:room.open,
  visibility:'private',members:room.members.map(m=>({...m}))}:null;
 const update=()=>emit({t:'room',room:snapshot()});
 const randomId=()=>Math.random().toString(36).slice(2,12)+Math.random().toString(36).slice(2,10);
 const max=()=>room?.mode==='royale'?10:4;
 const dexOf=dex=>G.DEX_BY?.[Number(dex)]?Number(dex):25;
 function connect(){return Promise.resolve(identity);}
 async function request(action,data={}){
  if(action==='hello'){
   const name=String(data.name||'').trim();
   if(name&&name.length<=24)playerName=name;
   return {uid:identity,name:playerName};
  }
  if(action==='list')return []; // local AI room is never discoverable
  if(action==='create'){
   if(room)throw Error('Đã ở trong phòng.');
   const mode=['coop','royale','eggrush'].includes(data.mode)?data.mode:'coop';
   room={id:'local-ai-'+randomId(),mode,open:true,
    members:[{uid:identity,name:playerName,dex:dexOf(data.dex),shiny:!!data.shiny}]};
   update();return snapshot();
  }
  if(action==='join')throw Error('Đây là trận AI ngoại tuyến, không hỗ trợ người chơi từ máy khác.');
  if(action==='leave'){
   room=null;emit({t:'room-closed'});return true;
  }
  if(!room)throw Error('Chưa tạo trận AI.');
  if(action==='update'){
   room.members[0]={...room.members[0],dex:dexOf(data.dex),shiny:!!data.shiny};
   update();return true;
  }
  if(action==='open'){room.open=!!data.open;update();return true;}
  if(action==='finish'){room.open=true;update();return snapshot();}
  if(action==='addBot'){
   if(!room.open)throw Error('Trận đang diễn ra, không thể thêm AI.');
   if(room.members.length>=max())throw Error('Đã đủ số người chơi và AI.');
   const picks=[25,1,4,7,133,447,175];
   const dex=G.DEX_BY?.[Number(data.dex)]?Number(data.dex):picks[Math.floor(Math.random()*picks.length)];
   const id='ai-'+Math.floor(Math.random()*0xffffffff).toString(16).padStart(8,'0')+
    Math.floor(Math.random()*0xffffffff).toString(16).padStart(8,'0');
   const mon=G.DEX_BY?.[dex];
   room.members.push({uid:id,name:'AI · '+(mon?.name||'Pokémon'),dex,shiny:false,bot:true});
   update();return snapshot();
  }
  if(action==='removeBot'||action==='kick'){
   const i=room.members.findIndex(m=>m.uid===data.uid&&m.bot);
   if(i<0)throw Error('Không tìm thấy AI trong phòng.');
   room.members.splice(i,1);update();return snapshot();
  }
  throw Error('Chức năng không dùng trong trận AI ngoại tuyến: '+action);
 }
 return {connect,request,send(){},on(fn){listeners.add(fn);},off(fn){listeners.delete(fn);},
  get uid(){return identity;},get connected(){return true;},get offlineAI(){return true;}};
})();
