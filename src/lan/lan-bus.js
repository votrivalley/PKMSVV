/* Same-origin LAN transport. The host never reads device saves. */
G.LanBus=(()=>{
 const handlers=new Set(),pending=new Map();
 let socket=null,identity=null,next=0,connecting=null;
 const emit=e=>handlers.forEach(fn=>{try{fn(e);}catch(error){console.warn('LAN event',error);}});
 function connect(){
  if(socket&&socket.readyState===WebSocket.OPEN&&identity)return Promise.resolve(identity);
  if(connecting)return connecting;
  connecting=new Promise((resolve,reject)=>{
   let done=false;
   const ws=new WebSocket('ws'+(location.protocol==='https:'?'s':'')+'://'+location.host+'/lan/ws');
   socket=ws;
   const timer=setTimeout(()=>{if(!done){done=true;reject(Error('Không thể kết nối máy Host.'));ws.close();}},7000);
   ws.onmessage=e=>{
    if(socket!==ws||done&&!identity)return;
    let m;try{m=JSON.parse(e.data);}catch(_){return;}
    if(m.t==='welcome'){identity=m.uid;clearTimeout(timer);done=true;resolve(identity);emit(m);return;}
    if(m.t==='response'){const p=pending.get(m.rid);if(p){pending.delete(m.rid);clearTimeout(p.timer);m.ok?p.resolve(m.result):p.reject(Error(m.error||'LAN error'));}return;}
    emit(m);
   };
   ws.onerror=()=>{if(!done){clearTimeout(timer);done=true;reject(Error('Không kết nối được máy chủ LAN.'));}ws.close();};
   ws.onclose=()=>{
    clearTimeout(timer);
    if(!done){done=true;reject(Error('Host đã đóng kết nối LAN.'));}
    if(socket!==ws)return;
    identity=null;socket=null;
    for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Mất kết nối LAN'));}
    pending.clear();emit({t:'disconnected'});
   };
  }).finally(()=>{connecting=null;});
  return connecting;
 }
 async function request(action,data={}){
  await connect();
  if(!socket||socket.readyState!==WebSocket.OPEN)throw Error('LAN disconnected');
  const rid=++next;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{pending.delete(rid);reject(Error('Máy chủ LAN không phản hồi.'));},9000);
   pending.set(rid,{resolve,reject,timer});
   try{socket.send(JSON.stringify({t:'req',rid,action,...data}));}
   catch(e){pending.delete(rid);clearTimeout(timer);reject(e);}
  });
 }
 function send(to,data){if(socket&&socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({t:'data',to,data}));}
 return {connect,request,send,on(fn){handlers.add(fn);},off(fn){handlers.delete(fn);},get uid(){return identity;},get connected(){return!!identity;}};
})();
