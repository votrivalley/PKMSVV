/* Pokémon Sống Sót — optional peer-to-peer Co-op voice (Web ONLY).
 * No recording, TURN or media writes to Firebase. Signaling is sent via the
 * already-open gameplay WebRTC DataChannel, relayed in-memory by the host.
 * Microphone is OFF until the player explicitly grants permission.
 */
G.PKMSVVVoice=(()=>{
 const ICE=[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}];
 const peers=new Map(),blocked=new Set();
 let joined=false,roomId='',microphone=null,micPending=false,volume=.7,ptt=false,held=false,speakerEnabled=false,settingsOpen=false;
 let root=null,tip='',blockedAudio=false,initialized=false,lastSignature='',toastTimer=0,pressTimer=0,suppressSpeakerTap=false;
 const vi=()=>!G.I18n||G.I18n.lang==='vi';
 const tr=(vn,en)=>vi()?vn:en;
 const room=()=>G.Social&&G.Social.room;
 const allowed=()=>{const r=room();return !!(r&&r.id&&r.mode!=='royale'&&r.members&&r.members.length<=4&&G.Net&&G.Net.open_);};
 const members=()=>{const r=room();return r?r.members.map(m=>m.uid):[];};
 const own=()=>G.Net&&G.Net.uid;
 // Voice controls belong to a live Co-op run, never the lobby or menus.
 const activeView=()=>!!(allowed()&&G.Coop&&G.Coop.active&&G.Game&&G.Game.state!=='ui'&&G.Game.state!=='over');
 function setTip(s){
  tip=s;clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{tip='';render();},2400);
  render();
 }
 const effectiveVolume=uid=>speakerEnabled&&!blocked.has(uid)?volume:0;
 function applyVolume(){
  for(const [uid,p] of peers)if(p.audio)p.audio.volume=effectiveVolume(uid);
 }
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
  speakerEnabled=false;settingsOpen=false;lastSignature='';
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
   el.autoplay=true;el.playsInline=true;el.volume=effectiveVolume(uid);
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
  setTip(tr('Đã kết nối thoại (mic tắt).','Voice connected (mic off).'));
  for(const uid of members())greet(uid);
  render();
 }
 function stop(){closeAll();}
 function reconnect(){
  if(!joined||!allowed())return;
  for(const uid of [...peers.keys()])closePeer(uid);
  for(const uid of members())greet(uid);
  setTip(tr('Đang kết nối lại thoại…','Reconnecting voice…'));
 }
 async function micOn(){
  if(!joined)start();
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
   setTip(tr('Mic đã bật.','Microphone on.'));
  }catch(e){setTip(tr('Không bật được mic. Kiểm tra quyền micro trong trình duyệt.','Microphone blocked. Check browser permissions.'));}
  finally{micPending=false;render();}
 }
 function micOff(){
  const track=microphone;if(!track)return;
  microphone=null;
  for(const p of peers.values())p.tx.sender.replaceTrack(null).catch(()=>{});
  track.stop();setTip(tr('Mic đã tắt.','Microphone off.'));
  // Keep receive-only connection up; the Mic and Speaker remain independent.
 }
 function unmuteSound(){
  blockedAudio=false;
  for(const p of peers.values())if(p.audio){
   p.audio.volume=effectiveVolume(p.uid);
   const z=p.audio.play();if(z&&z.catch)z.catch(()=>{blockedAudio=true;render();});
  }
  render();
 }
 function getUi(){
  if(root)return root;
  root=document.createElement('section');root.id='pkmsvv-voice-panel';
  root.setAttribute('translate','no');root.setAttribute('role','group');root.setAttribute('aria-label','Voice Chat Co-op');
  document.body.appendChild(root);return root;
 }
 function button(text,handler,kind=''){
  const b=document.createElement('button');b.type='button';b.className='btn small '+kind;
  b.textContent=text;b.onclick=handler;return b;
 }
 function toggleMic(){
  if(micPending)return;
  if(microphone){micOff();return;}
  if(ptt){ptt=false;held=false;} // regular Mic button always enables immediately
  micOn();
 }
 function toggleSpeaker(){
  if(suppressSpeakerTap){suppressSpeakerTap=false;return;}
  speakerEnabled=!speakerEnabled;
  if(speakerEnabled){
   if(!joined)start();
   unmuteSound();
   setTip(tr('Đã bật loa đồng đội.','Teammate audio on.'));
  }else{
   applyVolume();
   setTip(tr('Đã tắt loa đồng đội.','Teammate audio off.'));
   // Speaker-off silences all remote tracks without requesting microphone access.
  }
  render();
 }
 function openSettings(){
  if(!joined)start();
  settingsOpen=!settingsOpen;
  suppressSpeakerTap=true;
  render();
 }
 function render(){
  const shell=getUi();
  if(!allowed()||!activeView()){
   shell.hidden=true;
   if(joined)closeAll(true); // privacy: never leave mic active offscreen
   return;
  }
  const signature=[vi(),joined,!!microphone,micPending,speakerEnabled,settingsOpen,ptt,blockedAudio,tip,
   room().members.map(m=>m.uid+':'+(peers.get(m.uid)?.state||'absent')+':'+blocked.has(m.uid)).join(';')].join('|');
  const wasHidden=shell.hidden;
  if(!wasHidden&&lastSignature===signature)return;
  lastSignature=signature;
  shell.hidden=false;shell.replaceChildren();
  const bar=document.createElement('div');bar.className='pkmsvv-voice-mini';
  shell.append(bar);
  const mic=document.createElement('button');
  mic.type='button';mic.id='pkmsvv-voice-mic';mic.className='pkmsvv-voice-icon '+(microphone?'is-on':'is-off');
  mic.textContent='🎤';mic.setAttribute('aria-label',microphone?tr('Tắt micro','Mute microphone'):tr('Bật micro','Enable microphone'));
  mic.setAttribute('aria-pressed',String(!!microphone));
  mic.title=tr('Chạm để bật/tắt mic','Tap to toggle microphone');
  mic.onclick=toggleMic;mic.disabled=micPending;
  const speaker=document.createElement('button');
  speaker.type='button';speaker.id='pkmsvv-voice-speaker';
  speaker.className='pkmsvv-voice-icon '+(speakerEnabled?'is-on':'is-off');
  speaker.textContent='🔊';speaker.setAttribute('aria-label',speakerEnabled?tr('Tắt loa đồng đội','Mute team audio'):tr('Bật loa đồng đội','Enable team audio'));
  speaker.setAttribute('aria-pressed',String(speakerEnabled));
  speaker.title=tr('Nhấn: bật/tắt loa. Giữ lâu hoặc chuột phải: cài đặt thoại.','Tap: toggle speaker. Hold or right-click: voice settings.');
  speaker.onclick=toggleSpeaker;
  speaker.oncontextmenu=e=>{e.preventDefault();openSettings();};
  speaker.onpointerdown=()=>{clearTimeout(pressTimer);suppressSpeakerTap=false;pressTimer=setTimeout(openSettings,600);};
  speaker.onpointerup=()=>clearTimeout(pressTimer);
  speaker.onpointercancel=()=>clearTimeout(pressTimer);
  speaker.onpointerleave=()=>clearTimeout(pressTimer);
  bar.append(mic,speaker);
  if(tip){
   const toast=document.createElement('p');
   toast.className='pkmsvv-voice-toast';toast.setAttribute('role','status');
   toast.textContent=tip;shell.append(toast);
  }
  if(!settingsOpen)return;
  const details=document.createElement('div');details.id='pkmsvv-voice-settings';details.className='pkmsvv-voice-details';
  const header=document.createElement('div');header.className='pkmsvv-voice-details-heading';
  const title=document.createElement('strong');title.textContent=tr('Thoại đồng đội · Sống Sót','Team voice · Co-op');
  header.append(title,button('✕',()=>{settingsOpen=false;render();},'ghost'));
  details.append(header);
  details.append(button(tr('↻ Thử kết nối lại','↻ Reconnect voice'),reconnect,'ghost'));
  const pttLine=document.createElement('label');pttLine.className='pkmsvv-voice-ptt';
  const cb=document.createElement('input');cb.type='checkbox';cb.checked=ptt;
  cb.onchange=()=>{ptt=cb.checked;held=false;micOff();render();};
  pttLine.append(cb,document.createTextNode(tr('Giữ V để nói (PC)','Hold V to talk (PC)')));
  details.append(pttLine);
  const vol=document.createElement('label');vol.className='pkmsvv-voice-volume';
  const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='100';slider.value=String(Math.round(volume*100));
  slider.setAttribute('aria-label',tr('Âm lượng đồng đội','Teammate volume'));
  slider.oninput=()=>{volume=Number(slider.value)/100;applyVolume();};
  vol.append(document.createTextNode(tr('Âm lượng','Volume')),slider);details.append(vol);
  if(blockedAudio)details.append(button(tr('🔊 Cho phép phát âm thanh','🔊 Allow audio playback'),unmuteSound,'gold'));
  const ul=document.createElement('div');ul.className='pkmsvv-voice-peers';
  for(const m of room().members){
   if(m.uid===own())continue;
   const p=peers.get(m.uid),row=document.createElement('div');row.className='pkmsvv-voice-peer';
   const label=document.createElement('span');
   label.textContent=(m.name||tr('Đồng đội','Teammate'))+' · '+
    (p&&(p.state==='connected'||p.state==='completed')?tr('Đã kết nối','Connected'):
     p?tr('Đang kết nối','Connecting'):tr('Chưa kết nối','Not connected'));
   const mute=button(blocked.has(m.uid)?tr('Bỏ tắt tiếng','Unmute'):tr('Tắt tiếng','Mute'),()=>{
    if(blocked.has(m.uid))blocked.delete(m.uid);else blocked.add(m.uid);
    applyVolume();render();
   },'ghost');
   row.append(label,mute);ul.append(row);
  }
  details.append(ul);
  details.append(button(tr('Rời thoại','Leave voice'),()=>{stop();settingsOpen=false;render();},'ghost'));
  shell.append(details);
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
 return {init,start,stop,reconnect,micOn,micOff,unmuteSound,get joined(){return joined;},get micActive(){return !!microphone;}};
})();