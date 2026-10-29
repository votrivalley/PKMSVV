'use strict';
// Local WebRTC, manual two-way signaling. No STUN, TURN, WebSocket or Internet service.
if(new URLSearchParams(location.search).get('pkmsvvWifi')==='1'){
 window.PKMSVV_WIFI=true;window.PKMSVV_STANDALONE_AI=false;
 G.LanBus=(()=>{
  const listeners=new Set(),links=new Map(),requests=new Map();
  const random=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),x=>x.toString(16).padStart(2,'0')).join('');
  let uid='lan-'+random(10),name='Trainer',room=null,owner=false,next=0;
  const emit=m=>listeners.forEach(fn=>{try{fn(m);}catch(e){console.error('Wi-Fi event',e);}});
  const snapshot=()=>room?JSON.parse(JSON.stringify(room)):null;
  const limit=()=>room?.mode==='royale'?10:4;
  const dex=d=>G.DEX_BY?.[Number(d)]?Number(d):25;
  const power=v=>{
   const out={};if(!v||typeof v!=='object'||Array.isArray(v))return null;
   for(const [key,min,max,def] of [['hp',0,2000,0],['atkMul',1,5,1],
    ['spdMul',1,4,1],['cdMul',.2,1,1],['dmgReduce',0,.8,0],['regen',0,30,0]]){
    const n=Number(v[key]);out[key]=Number.isFinite(n)?Math.max(min,Math.min(max,n)):def;
   }return out;
  };
  function write(p,msg){
   if(p?.dc?.readyState!=='open')throw Error('Chưa ghép nối với thiết bị');
   if(p.dc.bufferedAmount>2097152)throw Error('Kết nối Wi-Fi quá chậm');
   p.dc.send(JSON.stringify(msg));
  }
  function drop(id){const p=links.get(id);if(p){links.delete(id);clearTimeout(p.timer);p.pc.close();}}
  function clear(){for(const id of [...links.keys()])drop(id);room=null;owner=false;for(const r of requests.values()){clearTimeout(r.timer);r.reject(Error('Đã rời phòng Wi-Fi'));}requests.clear();}
  function publish(){
   const message={t:'room',room:snapshot()};emit(message);
   for(const m of room?.members||[])if(m.uid!==uid&&!m.bot)try{write(links.get(m.uid),message);}catch(_){}
  }
  function departed(id){
   if(!owner){clear();emit({t:'room-closed',reason:'host-left'});return;}
   drop(id);if(room?.members.some(m=>m.uid===id)){room.members=room.members.filter(m=>m.uid!==id);publish();}
  }
  function local(action,data,who=uid){
   const host=owner&&who===uid,p=links.get(who);
   if(action==='hello'){
    const n=String(data.name||'Trainer').trim().slice(0,24)||'Trainer';
    if(who===uid)name=n;else if(p)p.name=n;
    return {uid:who,name:n};
   }
   if(action==='list')return [];
   if(action==='create'){
    if(who!==uid||room||links.size)throw Error('Rời phòng hoặc hủy ghép nối trước khi tạo phòng khác');
    owner=true;room={id:'wifi-'+random(12),host:uid,mode:['coop','royale','eggrush'].includes(data.mode)?data.mode:'coop',visibility:'private',open:true,
     members:[{uid,name,dex:dex(data.dex),shiny:!!data.shiny,power:power(data.power)}]};publish();return snapshot();
   }
   if(action==='join'){
    if(!owner||!p||data.id!==room?.id||!room.open)throw Error('Phòng không còn chờ người chơi');
    if(room.members.some(m=>m.uid===who))return snapshot();
    if(room.members.length>=limit())throw Error('Phòng đã đủ người và AI');
    room.members.push({uid:who,name:p.name||'Trainer',dex:dex(data.dex),shiny:!!data.shiny,power:power(data.power)});
    clearTimeout(p.timer);publish();return snapshot();
   }
   if(!room)throw Error('Chưa tạo phòng');
   if(!room.members.some(m=>m.uid===who))throw Error('Chưa tham gia phòng');
   if(action==='update'){
    Object.assign(room.members.find(m=>m.uid===who),{dex:dex(data.dex),shiny:!!data.shiny,power:power(data.power)});publish();return true;
   }
   if(action==='leave'){
    if(host){for(const id of [...links.keys()])try{write(links.get(id),{t:'room-closed',reason:'host-left'});}catch(_){};clear();emit({t:'room-closed'});}
    else{room.members=room.members.filter(m=>m.uid!==who);publish();}
    return true;
   }
   if(!host)throw Error('Chỉ Host được thực hiện thao tác này');
   if(action==='open'){room.open=!!data.open;publish();return true;}
   if(action==='finish'){room.open=true;room.members=room.members.filter(m=>!m.bot);publish();return snapshot();}
   if(!room.open)throw Error('Hãy trở về sảnh trước');
   if(action==='addBot'){
    if(room.members.length>=limit())throw Error('Phòng đã đủ người và AI');
    const used=new Set(room.members.map(m=>m.dex));let pool=Object.keys(G.DEX_BY||{}).map(Number).filter(d=>d>0&&!used.has(d));
    if(!pool.length)pool=[25];const species=G.DEX_BY?.[Number(data.dex)]?Number(data.dex):pool[Math.floor(Math.random()*pool.length)];
    room.members.push({uid:'ai-'+random(8),name:'AI · '+(G.DEX_BY?.[species]?.name||'Pokémon'),dex:species,shiny:false,bot:true});publish();return snapshot();
   }
   if(action==='kick'||action==='removeBot'){
    const m=room.members.find(m=>m.uid===data.uid&&m.uid!==uid&&(action!=='removeBot'||m.bot));
    if(!m)throw Error('Không tìm thấy thành viên');
    if(!m.bot)try{write(links.get(m.uid),{t:'room-closed',reason:'kicked'});}catch(_){}
    room.members=room.members.filter(p=>p!==m);drop(m.uid);publish();return snapshot();
   }
   throw Error('Thao tác không được hỗ trợ');
  }
  function setup(id,token){
   if(typeof RTCPeerConnection==='undefined')throw Error('Thiết bị chưa hỗ trợ kết nối Wi-Fi WebRTC');
   const p={id,token,pc:new RTCPeerConnection({iceServers:[]}),dc:null,name:'Trainer'};links.set(id,p);
   p.timer=setTimeout(()=>{if(links.get(id)===p){drop(id);if(!owner){clear();emit({t:'disconnected'});}}},120000);
   const attach=dc=>{
    p.dc=dc;dc.onclose=()=>{if(links.get(id)===p)departed(id);};
    dc.onmessage=e=>{
     if(typeof e.data!=='string'||e.data.length>262144)return;
     let m;try{m=JSON.parse(e.data);}catch(_){return;}
     if(owner){
      if(m.t==='req'&&Number.isSafeInteger(m.rid)){
       try{const result=local(m.action,m.data||{},id);write(p,{t:'response',rid:m.rid,ok:true,result});if(m.action==='leave')setTimeout(()=>drop(id),200);}
       catch(e){try{write(p,{t:'response',rid:m.rid,ok:false,error:e.message});}catch(_){}}
      }else if(m.t==='data'&&room?.members.some(m=>m.uid===id))emit({t:'data',from:id,data:m.data});
     }else{
      if(m.t==='room'){room=m.room;clearTimeout(p.timer);emit(m);}
      else if(m.t==='room-closed'){clear();emit(m);}
      else if(m.t==='data')emit({t:'data',from:id,data:m.data});
      else if(m.t==='response'){
       const r=requests.get(m.rid);if(r){requests.delete(m.rid);clearTimeout(r.timer);m.ok?r.resolve(m.result):r.reject(Error(m.error));}
      }
     }
    };
   };
   p.pc.ondatachannel=e=>attach(e.channel);p.attach=attach;return p;
  }
  async function gathered(pc){
   if(pc.iceGatheringState==='complete')return;
   await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pc.removeEventListener('icegatheringstatechange',check);reject(Error('Không lấy được địa chỉ Wi-Fi. Thử tạo lời mời lại.'));},8000);
    function check(){if(pc.iceGatheringState==='complete'){clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',check);resolve();}}
    pc.addEventListener('icegatheringstatechange',check);check();
   });
  }
  async function encode(value){
   const bytes=new TextEncoder().encode(JSON.stringify(value));
   const packed=typeof CompressionStream==='function'?new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer()):bytes;
   let text='';for(const b of packed)text+=String.fromCharCode(b);
   return 'PKMWIFI1.'+(packed===bytes?'J':'Z')+'.'+btoa(text).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  }
  async function decode(text){
   const match=String(text).trim().match(/^PKMWIFI1\.([JZ])\.([A-Za-z0-9_-]{20,16000})$/);
   if(!match)throw Error('Lời mời Wi-Fi không hợp lệ');
   let bytes=Uint8Array.from(atob(match[2].replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
   if(match[1]==='Z'){
    if(typeof DecompressionStream!=='function')throw Error('Trình duyệt cần được cập nhật để đọc lời mời');
    const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader(),chunks=[];let length=0;
    try{while(true){const r=await reader.read();if(r.done)break;length+=r.value.length;if(length>32768)throw Error('Lời mời quá dài');chunks.push(r.value);}}
    finally{await reader.cancel().catch(()=>{});}
    bytes=new Uint8Array(length);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}
   }
   const v=JSON.parse(new TextDecoder().decode(bytes));
   if(v.v!==1||!/^lan-[0-9a-f]{20}$/.test(v.host)||!/^lan-[0-9a-f]{20}$/.test(v.guest)||!/^wifi-[0-9a-f]{24}$/.test(v.room)||!/^\w{32}$/.test(v.token)||!['offer','answer'].includes(v.description?.type)||typeof v.description.sdp!=='string')throw Error('Lời mời không đúng định dạng');
   return v;
  }
  async function invitation(){
   if(!owner||!room?.open)throw Error('Chỉ Host ở sảnh được mời bạn');
   if(room.members.length>=limit()||links.size>=limit()-1)throw Error('Đã đủ người hoặc lời mời đang chờ. Hãy hủy lời mời cũ.');
   const guest='lan-'+random(10),token=random(16),p=setup(guest,token);p.attach(p.pc.createDataChannel('pkmsvv',{ordered:true}));
   try{await p.pc.setLocalDescription(await p.pc.createOffer());await gathered(p.pc);return encode({v:1,host:uid,guest,token,room:room.id,mode:room.mode,description:p.pc.localDescription.toJSON()});}
   catch(e){drop(guest);throw e;}
  }
  async function answer(text){
   if(room||links.size)throw Error('Rời phòng hoặc hủy ghép nối hiện tại trước');
   const v=await decode(text);if(v.description.type!=='offer')throw Error('Cần lời mời từ Host');
   uid=v.guest;owner=false;const p=setup(v.host,v.token);p.room=v.room;
   try{await p.pc.setRemoteDescription(v.description);await p.pc.setLocalDescription(await p.pc.createAnswer());await gathered(p.pc);return encode({...v,description:p.pc.localDescription.toJSON()});}
   catch(e){drop(v.host);throw e;}
  }
  async function accept(text){
   const v=await decode(text),p=links.get(v.guest);
   if(!owner||!room?.open||v.description.type!=='answer'||v.host!==uid||v.room!==room.id||!p||p.token!==v.token||p.accepted)throw Error('Phản hồi không khớp lời mời đang chờ');
   await p.pc.setRemoteDescription(v.description);p.accepted=true;
  }
  async function connect(){
   if(owner||!links.size)return uid;
   const p=[...links.values()][0];if(p.dc?.readyState==='open')return uid;
   await new Promise((resolve,reject)=>{
    let finished=false;
    const settle=error=>{
     if(finished)return;finished=true;clearInterval(poll);clearTimeout(timer);
     if(error)reject(error);else resolve();
    };
    // Multiple genuine peer connections require additional LAN ICE time on busy PCs.
    const timer=setTimeout(()=>settle(Error('Chưa ghép nối WebRTC sau 30 giây. Kiểm tra Host và cùng Wi-Fi rồi thử lại.')),30000);
    const poll=setInterval(()=>{
     if(p.dc?.readyState==='open')settle();
     else if(!links.has(p.id)||p.pc.connectionState==='closed'||p.pc.connectionState==='failed')
      settle(Error('Ghép nối đã đóng hoặc ICE thất bại'));
    },100);
   });return uid;
  }
  async function request(action,data={}){
   if(owner||action==='create'||!links.size&&['hello','list'].includes(action))return local(action,data);
   await connect();const p=[...links.values()][0],id=++next;
   const result=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{requests.delete(id);reject(Error('Host không phản hồi'));},9000);requests.set(id,{resolve,reject,timer});
    try{write(p,{t:'req',rid:id,action,data});}catch(e){requests.delete(id);clearTimeout(timer);reject(e);}
   });
   if(action==='leave'){clear();emit({t:'room-closed'});}return result;
  }
  function send(to,data){try{write(links.get(to),{t:'data',data});}catch(e){console.warn(e.message);}}
  function cancel(){if(!owner){clear();emit({t:'disconnected'});}else for(const [id] of links)if(!room?.members.some(m=>m.uid===id))drop(id);}
  return {connect,request,send,invitation,answer,accept,cancel,decode,
   on(fn){listeners.add(fn);},off(fn){listeners.delete(fn);},get uid(){return uid;},get connected(){return owner||[...links.values()].some(p=>p.dc?.readyState==='open');},
   get pendingRoom(){return [...links.values()][0]?.room;},transport:()=> 'webrtc'};
 })();
}
