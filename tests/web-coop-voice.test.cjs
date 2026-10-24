'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('voice is an opt-in Web-only build feature; no offline/Android integration',()=>{
 const patch=read('scripts/patch-web-voice.cjs');
 const web=read('scripts/prepare-web.cjs'),game=read('scripts/prepare-game.cjs');
 assert.match(web,/patch-web-voice\.cjs/);
 assert.doesNotMatch(game,/patch-web-voice\.cjs/);
 assert.match(patch,/pkmsvv-voice\.js/);
 assert.match(patch,/G\.PKMSVVVoice\.init\(\)/);
 const compiled='vendor/pokesurvivor/js/ui/pkmsvv-voice.js';
 if(fs.existsSync(path.join(root,compiled))){
  assert.match(read('vendor/pokesurvivor/dev.html'),/js\/ui\/pkmsvv-voice\.js/);
  assert.match(read('vendor/pokesurvivor/js/game.js'),/G\.PKMSVVVoice\.init\(\)/);
 }
});

test('voice is disabled for Royale and rooms larger than four',()=>{
 const s=read('src/web/pkmsvv-voice.js');
 assert.match(s,/r\.mode!=='royale'/);
 assert.match(s,/r\.members\.length<=4/);
 assert.match(s,/G\.Net\.open_/);
 assert.match(s,/activeView/);
 assert.doesNotMatch(s,/ALLOW_RELAY\s*=\s*true/);
});

test('voice media uses encrypted WebRTC P2P and does not send recordings via Firebase',()=>{
 const s=read('src/web/pkmsvv-voice.js');
 assert.match(s,/new RTCPeerConnection\(\{iceServers:ICE,iceTransportPolicy:'all'\}\)/);
 assert.match(s,/addTransceiver\('audio',\{direction:'sendrecv'\}\)/);
 assert.match(s,/pc\.ontrack/);
 assert.match(s,/getUserMedia\(\{audio:/);
 assert.match(s,/tx\.sender\.replaceTrack\(null\)/);
 assert.match(s,/track\.stop\(\)/);
 assert.match(s,/G\.Net\.toHost\(packet\)/);
 assert.match(s,/G\.Net\.send\(to,Object\.assign\(packet,\{from:own\(\)\}\)\)/);
 assert.doesNotMatch(s,/firebase\.database|firebase\.firestore|MediaRecorder|uploadBytes|\.ref\('rooms\/.*\/voice/);
 assert.ok(!s.includes('turn:'),'TURN relay must remain disabled');
 assert.match(s,/echoCancellation:true,noiseSuppression:true,autoGainControl:true/);
});

test('voice supports the whole Co-op team, plus mic privacy and teammate controls',()=>{
 const s=read('src/web/pkmsvv-voice.js');
 assert.match(s,/for\(const uid of members\(\)\)greet\(uid\)/);
 assert.match(s,/G\.Net\.send\(msg\.to,Object\.assign\(\{\},msg,\{from\}\)\)/);
 assert.match(s,/String\(own\(\)\)<String\(uid\)/);
 assert.match(s,/body\.type==='offer'/);
 assert.match(s,/body\.type==='answer'/);
 assert.match(s,/body\.type==='ice'/);
 assert.match(s,/mute.*blocked|blocked\.add\(m\.uid\)/);
 assert.match(s,/slider\.type='range'/);
 assert.match(s,/if\(!ptt\)bar\.append/);
 assert.match(s,/e\.code!=='KeyV'/);
 assert.match(s,/window\.addEventListener\('blur'/);
 assert.match(s,/if\(!joined\|\|microphone\|\|micPending\)return/);
});

test('voice does not touch microphone when a user declines the opt-in',()=>{
 let requested=0,netMessage,peerCb,roomChanged;
 const nodes=[];
 const makeNode=()=>({
  hidden:false,children:[],style:{},textContent:'',remove(){},append(...els){this.children.push(...els);},
  appendChild(el){this.children.push(el);return el;},replaceChildren(...els){this.children=els;},
  setAttribute(){},classList:{add(){},remove(){}}
 });
 const document={body:makeNode(),createElement(){const n=makeNode();nodes.push(n);return n;},createTextNode(text){return {textContent:text};}};
 const r={id:'abc123',mode:'royale',isHost:true,host:'a',members:[{uid:'a',name:'A'},{uid:'b',name:'B'}]};
 const sent=[];
 const G={I18n:{lang:'vi'},Social:{room:r,on(fn){roomChanged=fn;}},UI:{isOpen(){return true;}},
  Coop:{active:false},Net:{open_:true,uid:'a',on(fn){netMessage=fn;},
  onPeer(fn){peerCb=fn;},mode(){return 'direct';},send(to,msg){sent.push({to,msg});},
  toHost(){throw Error('host must not send to host');}}};
 const ctx={G,document,window:{addEventListener(){},setInterval(){}},navigator:{mediaDevices:{
  async getUserMedia(){requested++;throw Error('must not request microphone');}}},console};
 vm.runInNewContext(read('src/web/pkmsvv-voice.js'),ctx);
 G.PKMSVVVoice.init();
 G.PKMSVVVoice.start();
 assert.equal(G.PKMSVVVoice.joined,false,'Royale is never a voice room');
 assert.equal(requested,0,'never request microphone unless user explicitly enables it');
 r.mode='coop';
 G.PKMSVVVoice.start();
 assert.equal(G.PKMSVVVoice.joined,true,'Co-op may opt in');
 assert.equal(requested,0,'joining receive-only should not ask for microphone permission');
 assert.equal(sent[0].msg.k,'pkmsvv-voice');
 assert.equal(sent[0].msg.body.type,'hello');
 G.PKMSVVVoice.stop();
 assert.equal(G.PKMSVVVoice.joined,false,'leaving voice closes voice session');
});
