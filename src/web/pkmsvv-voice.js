/* Pokémon Sống Sót — optional peer-to-peer Co-op voice (Web ONLY).
 * No recording, TURN or media writes to Firebase. Signaling is sent via the
 * already-open gameplay WebRTC DataChannel, relayed in-memory by the host.
 * Microphone is OFF until the player explicitly grants permission.
 */
G.PKMSVVVoice=(()=>{
 const ICE=[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}];
 const peers=new Map(),blocked=new Set();
 let joined=false,roomId='',microphone=null,micPending=false,volume=.7,ptt=false,held=false;
 let root=null,tip='',blockedAudio=false,initialized=false;
 const vi=()=>!G.I18n||G.I18n.lang==='vi';
 const tr=(vn,en)=>vi()?vn:en;
 const room=()=>G.Social&&G.Social.room;
 const allowed=()=>{const r=room();return !!(r&&r.id&&r.mode!=='royale'&&r.members&&r.members.length<=4&&G.Net&&G.Net.open_);};
 const members=()=>{const r=room();return r?r.members.map(m=>m.uid):[];};
 const own=()=>G.Net&&G.Net.uid;
 const activeView=()=>!!(allowed()&&((G.UI&&G.UI.isOpen('scr-lobby'))||(G.Coop&&G.Coop.active)));
 function setTip(s){tip=s;render();}
 function send(to,body){
  const r=room();
  if(!allowed()||!members().includes(to)||!to||to===own())return false;
  const packet={k:'pkmsvv-voice',room:r.id,to,body};
  if(r.isHost){
   if(G.Net.mode(to)!=='direct')return false;
   G.Net.send(to,Object.assign(packet,{from:own()}));
  }else{
   if(G.Net.mode(r.host)!=='direct')return false;
   G.Net.toHost(packet);
  }
  return true;
 }
 function closePeer(uid){
  const p=peers.get(uid);if(!p)return;
  peers.delete(uid);
  try{p.pc.ontrack=null;p.pc.onicecandidate=null;p.pc.onconnectionstatechange=null;p.pc.close();}catch(e){}
  if(p.audio){p.audio.pause();p.audio.srcObject=null;p.audio.remove();}
  render();
 }
 function closeAll(silent=false){
  if(!silent&&joined)for(const u of members())if(u!==own())send(u,{type:'bye'});
  for(const u of [...peers.keys()])closePeer(u);
  if(microphone){microphone.stop();microphone=null;}
  joined=false;held=false;micPending=false;roomId='';tip='';blockedAudio=false;
  render();
 }
 function newPeer(uid){
  if(!joined||!allowed()||!members().includes(uid)||uid===own()||typeof RTCPeerConnection==='undefined')return null;
  if(peers.has(uid))return peers.get(uid);
  let pc,tx;
  try{
   pc=new RTCPeerConnection({iceServers:ICE,iceTransportPolicy:'all'});
   tx=pc.addTransceiver('audio',{direction:'sendrecv'});
  }catch(e){setTip(tr('Trình duyệt không hỗ trợ thoại WebRTC.','Browser does not support WebRTC voice.'));return null;}
  const p={uid,pc,tx,offered:false,pending:[],audio:null,state:'connecting'};
  peers.set(uid,p);
  if(microphone)tx.sender.replaceTrack(microphone).catch(()=>{});
  pc.onicecandidate=e=>{
   if(e.candidate)send(uid,{type:'ice',candidate:e.candidate.toJSON()});
  };
  pc.onconnectionstatechange=()=>{
   p.state=pc.connectionState;
   if(pc.connectionState==='failed'||pc.connectionState==='closed')closePeer(uid);
   else render();
  };
  pc.ontrack=e=>{
   if(e.track.kind!=='audio')return;
   if(p.audio){p.audio.pause();p.audio.srcObject=null;p.audio.remove();}
   const el=document.createElement('audio');
   el.autoplay=true;el.playsInline=true;el.volume=blocked.has(uid)?0:volume;
   el.style.display='none';
   el.srcObject=(e.streams&&e.streams[0])||new MediaStream([e.track]);
   document.body.appendChild(el);
   p.audio=el;
   const play=el.play();
   if(play&&play.catch)play.catch(()=>{blockedAudio=true;render();});
   e.track.onended=()=>{if(p.audio===el){el.pause();el.remove();p.audio=null;render();}};
   render();
  };
  render();return p;
 }
 async function makeOffer(uid){
  const p=newPeer(uid);
  if(!p||p.offered||!joined)return;
  p.offered=true;
  try{
   const offer=await p.pc.createOffer();
   if(!peers.has(uid)||!joined)return;
   await p.pc.setLocalDescription(offer);
   send(uid,{type:'offer',sdp:{type:'offer',sdp:p.pc.localDescription.sdp}});
  }catch(e){closePeer(uid);}
 }
 function greet(uid){
  if(!joined||!allowed()||uid===own())return;
  if(room().isHost){if(G.Net.mode(uid)!=='direct')return;}
  else if(G.Net.mode(room().host)!=='direct')return;
  send(uid,{type:'hello'});
 }
 async function accept(uid,body){
  if(!joined||!allowed()||!members().includes(uid))return;
  if(body.type==='hello'){
   send(uid,{type:'helloAck'});
   if(String(own())<String(uid))makeOffer(uid);
   return;
  }
  if(body.type==='helloAck'){
   if(String(own())<String(uid))makeOffer(uid);
   return;
  }
  if(body.type==='bye'){closePeer(uid);return;}
  if(!['offer','answer','ice'].includes(body.type))return;
  if((body.type==='offer'||body.type==='answer')&&
    (!body.sdp||!['offer','answer'].includes(body.sdp.type)||
     body.sdp.type!==body.type||typeof body.sdp.sdp!=='string'||body.sdp.sdp.length>22000))return;
  const p=newPeer(uid);if(!p)return;
  try{
   if(body.type==='offer'){
    // Deterministic offerer by UID prevents simultaneous SDP glare.
    if(String(own())<String(uid))return;
    await p.pc.setRemoteDescription(body.sdp);
    for(const c of p.pending.splice(0))await p.pc.addIceCandidate(c).catch(()=>{});
    const answer=await p.pc.createAnswer();
    await p.pc.setLocalDescription(answer);
    send(uid,{type:'answer',sdp:{type:'answer',sdp:p.pc.localDescription.sdp}});
   }else if(body.type==='answer'){
    if(!p.offered||p.pc.signalingState!=='have-local-offer')return;
    await p.pc.setRemoteDescription(body.sdp);
    for(const c of p.pending.splice(0))await p.pc.addIceCandidate(c).catch(()=>{});
   }else if(body.type==='ice'){
    if(!body.candidate||typeof body.candidate.candidate!=='string'||body.candidate.candidate.length>2000)return;
    if(p.pc.remoteDescription)await p.pc.addIceCandidate(body.candidate).catch(()=>{});
    else if(p.pending.length<50)p.pending.push(body.candidate);
   }
  }catch(e){setTip(tr('Không thể thiết lập thoại với một đồng đội.','Could not connect voice to a teammate.'));closePeer(uid);}
 }
 function onMessage(from,msg){
  if(!msg||msg.k!=='pkmsvv-voice'||!allowed()||msg.room!==room().id||!members().includes(from)||!members().includes(msg.to))return;
  const r=room();
  if(r.isHost&&msg.to!==own()){
   if(from===own()||msg.to===from||G.Net.mode(msg.to)!=='direct')return;
   if(msg.body&&['hello','helloAck','bye','offer','answer','ice'].includes(msg.body.type))
    G.Net.send(msg.to,Object.assign({},msg,{from}));
   return;
  }
  if(msg.to!==own())return;
  const sender=r.isHost?from:(from===r.host?msg.from:null);
  if(!sender||sender===own()||!members().includes(sender)||!msg.body||typeof msg.body!=='object')return;
  accept(sender,msg.body);
 }
 function start(){
  if(!allowed())return setTip(tr('Voice chỉ dùng trong Sống Sót 2–4 người.','Voice is for 2–4 player Co-op only.'));
  if(typeof RTCPeerConnection==='undefined')return setTip(tr('Trình duyệt không hỗ trợ WebRTC.','WebRTC is unavailable.'));
  if(joined)return;
  joined=true;roomId=room().id;
  tip=tr('Đã vào thoại. Mic vẫn tắt; nhấn Bật mic khi muốn nói.','Voice joined. Mic is off until you enable it.');
  for(const uid of members())greet(uid);
  render();
 }
 function stop(){closeAll();}
 async function micOn(){
  if(!joined||microphone||micPending)return;
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
   setTip(tr('Cần HTTPS và trình duyệt cho phép sử dụng mic.','Microphone requires HTTPS and browser support.'));return;
  }
  micPending=true;
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:{
    echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   const track=stream.getAudioTracks()[0];
   if(!joined||roomId!==room()?.id||(ptt&&!held)){
    stream.getTracks().forEach(t=>t.stop());return;
   }
   if(!track)throw Error('no audio track');
   microphone=track;track.onended=()=>{if(microphone===track){microphone=null;render();}};
   await Promise.allSettled([...peers.values()].map(p=>p.tx.sender.replaceTrack(track)));
   tip=tr('Mic đang bật.','Microphone on.');
  }catch(e){setTip(tr('Không bật được mic. Kiểm tra quyền micro trong trình duyệt.','Microphone blocked. Check browser permissions.'));}
  finally{micPending=false;render();}
 }
 function micOff(){
  const track=microphone;if(!track)return;
  microphone=null;
  for(const p of peers.values())p.tx.sender.replaceTrack(null).catch(()=>{});
  track.stop();tip=tr('Đã tắt mic.','Microphone off.');render();
 }
 function unmuteSound(){
  blockedAudio=false;
  for(const p of peers.values())if(p.audio){
   p.audio.volume=blocked.has(p.uid)?0:volume;
   const z=p.audio.play();if(z&&z.catch)z.catch(()=>{blockedAudio=true;render();});
  }
  render();
 }
 function getUi(){
  if(root)return root;
  root=document.createElement('section');root.id='pkmsvv-voice-panel';
  root.setAttribute('translate','no');root.setAttribute('aria-label','Voice Chat Co-op');
  document.body.appendChild(root);return root;
 }
 function button(text,handler,kind=''){
  const b=document.createElement('button');b.type='button';b.className='btn small '+kind;
  b.textContent=text;b.onclick=handler;return b;
 }
 function render(){
  const shell=getUi();
  if(!allowed()||!activeView()){
   shell.hidden=true;
   if(joined&&(!allowed()||roomId!==room()?.id))closeAll(true);
   return;
  }
  shell.hidden=false;shell.replaceChildren();
  const h=document.createElement('div');h.className='pkmsvv-voice-heading';
  h.textContent=tr('🎙 Thoại đồng đội · Sống Sót','🎙 Team Voice · Co-op');
  shell.append(h);
  const bar=document.createElement('div');bar.className='pkmsvv-voice-controls';shell.append(bar);
  if(!joined){
   bar.append(button(tr('Tham gia thoại (mic tắt)','Join voice (mic off)'),
    start,'gold'));
   return;
  }
  bar.append(button(tr('Rời thoại','Leave voice'),stop,'ghost'));
  if(!ptt)bar.append(button(microphone?tr('🔴 Tắt mic','🔴 Mute mic'):tr('🎤 Bật mic','🎤 Enable mic'),
   ()=>microphone?micOff():micOn(),microphone?'gold':''));
  else bar.append(button(tr('Giữ V để nói','Hold V to talk'),()=>{},'ghost'));
  const pttLine=document.createElement('label');pttLine.className='pkmsvv-voice-ptt';
  const cb=document.createElement('input');cb.type='checkbox';cb.checked=ptt;
  cb.onchange=()=>{ptt=cb.checked;held=false;micOff();render();};
  pttLine.append(cb,document.createTextNode(tr('Nhấn giữ V để nói','Hold V to talk')));
  shell.append(pttLine);
  const vol=document.createElement('label');vol.className='pkmsvv-voice-volume';
  const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='100';slider.value=String(Math.round(volume*100));
  slider.setAttribute('aria-label',tr('Âm lượng đồng đội','Teammate volume'));
  slider.oninput=()=>{volume=Number(slider.value)/100;for(const [u,p] of peers)if(p.audio)p.audio.volume=blocked.has(u)?0:volume;};
  vol.append(document.createTextNode(tr('Loa đồng đội','Team volume')),slider);shell.append(vol);
  if(blockedAudio)shell.append(button(tr('🔊 Bật loa','🔊 Enable speakers'),unmuteSound,'gold'));
  const ul=document.createElement('div');ul.className='pkmsvv-voice-peers';
  for(const m of room().members){
   if(m.uid===own())continue;
   const p=peers.get(m.uid),row=document.createElement('div');
   row.className='pkmsvv-voice-peer';
   const status=document.createElement('span');
   status.textContent=(m.name||tr('Đồng đội','Teammate'))+' · '+
    (p&&(p.state==='connected'||p.state==='completed')?tr('Đã kết nối','Connected'):
     p?tr('Đang kết nối','Connecting'):tr('Chưa vào thoại','Not on voice'));
   const mute=button(blocked.has(m.uid)?tr('Bỏ tắt tiếng','Unmute'):tr('Tắt tiếng','Mute'),()=>{
    if(blocked.has(m.uid))blocked.delete(m.uid);else blocked.add(m.uid);
    if(p&&p.audio)p.audio.volume=blocked.has(m.uid)?0:volume;
    render();
   },'ghost');row.append(status,mute);ul.append(row);
  }
  shell.append(ul);
  if(tip){const note=document.createElement('p');note.className='pkmsvv-voice-tip';note.textContent=tip;shell.append(note);}
 }
 function init(){
  if(initialized)return;initialized=true;
  G.Net.on(onMessage);
  G.Net.onPeer((uid,state)=>{
   if(!joined)return;
   if(state==='direct')greet(uid);
   if(state==='failed'||state==='closed')closePeer(uid);
   render();
  });
  G.Social.on(()=>{if(joined&&(!allowed()||roomId!==room()?.id))closeAll(true);else render();});
  window.addEventListener('keydown',e=>{
   if(!joined||!ptt||e.code!=='KeyV'||e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;
   const tag=e.target&&e.target.tagName;
   if(['INPUT','TEXTAREA','SELECT'].includes(tag)||e.target?.isContentEditable)return;
   held=true;micOn();e.preventDefault();
  });
  window.addEventListener('keyup',e=>{if(e.code==='KeyV'&&held){held=false;micOff();}});
  window.addEventListener('blur',()=>{held=false;if(ptt)micOff();});
  window.addEventListener('beforeunload',()=>closeAll(true));
  // Render only while in a Co-op room or in the Co-op run.
  window.setInterval(render,1500);
  render();
 }
 return {init,start,stop,micOn,micOff,unmuteSound,get joined(){return joined;},get micActive(){return !!microphone;}};
})();