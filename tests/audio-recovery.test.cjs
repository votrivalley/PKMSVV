'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const base=path.join(root,'vendor','pokesurvivor');
test('audio engine retries suspended music, does not restart when muted intentionally',()=>{
 if(!fs.existsSync(path.join(base,'index.html')))return;
 const s=fs.readFileSync(path.join(base,'js/core/audio.js'),'utf8');
 assert.match(s,/function ensureMusic\(\)/);
 assert.match(s,/if \(pkmsvvAudioBackground \|\| document\.hidden \|\| !wanted\) return;/);
 assert.match(s,/ctx\.resume\(\)\.then\(\(\) => ensureMusic\(\)\)/);
 assert.match(s,/if \(wanted === name\) \{ if \(name\) ensureMusic\(\); return; \}/);
 assert.match(s,/visibilitychange/);
 assert.match(s,/addEventListener\('focus', ensureMusic\)/);
 assert.match(s,/addEventListener\('pageshow', ensureMusic\)/);
 assert.match(s,/if \(c\.next < ctx\.currentTime - 0\.4\) c\.next = ctx\.currentTime \+ 0\.05/);
 assert.match(s,/el\.paused/);
 assert.match(fs.readFileSync(path.join(base,'js/core/gamepad.js'),'utf8'),/G\.Audio\.unlock\(\)/);
});
test('compiled offline bundle includes v0.9.2 audio and immediate-start controller',()=>{
 if(!fs.existsSync(path.join(base,'index.html')))return;
 const js=fs.readFileSync(path.join(base,'js/app.min.js'),'utf8');
 assert.match(js,/visibilitychange/);
 assert.match(js,/updateVariant|PKMSVVPadFlow/);
});

test('approved custom village OGG and browser autoplay recovery',()=>{
 const src=fs.readFileSync(path.join(root,'scripts/prepare-game.cjs'),'utf8');
 const patch=fs.readFileSync(path.join(root,'scripts/patch-music.cjs'),'utf8');
 const ogg=path.join(root,'custom-music','village.ogg');
 assert.ok(fs.existsSync(ogg),'Please commit village.ogg to the custom-music folder');
 assert.equal(fs.readFileSync(ogg).subarray(0,4).toString(),'OggS');
 assert.match(src,/PKMSVV custom music bundled/);
 assert.match(src,/err\.name === 'NotAllowedError'/);
 assert.match(patch,/if \(!customAudio\) startCustomMusic\(wanted\)/);
 assert.match(patch,/Autoplay denied: keep custom OGG pending/);
});


test('background music stops during window minimize, app switching and tab hiding',async t=>{
 const patch=fs.readFileSync(path.join(root,'scripts','patch-background-audio.cjs'),'utf8');
 const prep=fs.readFileSync(path.join(root,'scripts','prepare-game.cjs'),'utf8');
 const native=fs.readFileSync(path.join(root,'desktop','main.cjs'),'utf8');
 assert.match(prep,/patch-background-audio\.cjs/);
 assert.match(patch,/customAudio\.pause\(\)/);
 assert.match(patch,/ctx\.suspend\(\)/);
 assert.match(patch,/ctx\.resume\(\)/);
 assert.match(native,/setAudioMuted\(/);
 assert.match(native,/minimize','restore','blur','focus'/);
 if(!fs.existsSync(path.join(base,'index.html'))){
  t.skip('The pinned upstream game has not been prepared');
  return;
 }
 const source=fs.readFileSync(path.join(base,'js','core','audio.js'),'utf8');
 assert.match(source,/function pkmsvvSetAudioBackground\(background\)/);
 assert.match(source,/pkmsvvAudioBackground \|\| document\.hidden/);
 assert.match(source,/addEventListener\('blur'/);
 assert.match(source,/addEventListener\('pagehide'/);
 assert.match(source,/document\.addEventListener\('visibilitychange'/);
 const vm=require('node:vm');
 const events=new Map(),docEvents=new Map(),audio=[];
 const doc={hidden:false,addEventListener:(name,fn)=>docEvents.set(name,fn)};
 const ctxObj={
  state:'running',currentTime:0,sampleRate:48000,destination:{},
  resumes:0,suspends:0,
  suspend(){this.suspends++;this.state='suspended';this.onstatechange?.();return Promise.resolve();},
  resume(){this.resumes++;this.state='running';this.onstatechange?.();return Promise.resolve();},
  createDynamicsCompressor(){return{threshold:{value:0},ratio:{value:0},connect(){return this;}};},
  createGain(){return{gain:{value:0,setTargetAtTime(){},setValueAtTime(){},linearRampToValueAtTime(){}},
   connect(){return this;}};},
  createConvolver(){return{connect(){return this;}};},
  createBuffer(){return{getChannelData(){return new Float32Array(1);}};},
 };
 class FakeAudio{
  constructor(src){this.src=src;this.paused=true;this.currentTime=0;this.volume=0;this.playCount=0;audio.push(this);}
  addEventListener(){}
  play(){this.paused=false;this.playCount++;return Promise.resolve();}
  pause(){this.paused=true;}
  removeAttribute(){}
  load(){}
 }
 const store=new Map(),G={MUSIC:{},U:{clamp:(n,a,b)=>Math.max(a,Math.min(b,n))}};
 vm.runInNewContext(source,{
  G,window:{AudioContext:function(){return ctxObj;}},document:doc,Audio:FakeAudio,
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  addEventListener:(name,fn)=>events.set(name,fn),
  setInterval(){return 1;},setTimeout(){return 1;},clearTimeout(){},
  console,Math,Date,Float32Array,performance:{now:()=>1000}
 });
 G.Audio.music('village');G.Audio.unlock();
 assert.equal(audio.length,1,'custom village OGG starts');
 const song=audio[0];assert.equal(song.paused,false);
 song.currentTime=42;
 doc.hidden=true;docEvents.get('visibilitychange')();
 assert.equal(song.paused,true,'the file itself is paused, not only WebAudio');
 assert.equal(ctxObj.state,'suspended');
 const plays=song.playCount;
 G.Audio.unlock();
 assert.equal(song.playCount,plays,'hidden app cannot restart the track via unlock');
 doc.hidden=false;docEvents.get('visibilitychange')();
 await Promise.resolve();await Promise.resolve();
 assert.equal(song.paused,false,'returning to game resumes the song');
 assert.equal(song.currentTime,42,'OGG resumes at the same playback position');
 events.get('blur')();
 assert.equal(song.paused,true,'Alt-Tab must pause while the tab remains visible');
 events.get('focus')();await Promise.resolve();await Promise.resolve();
 assert.equal(song.paused,false,'focus resumes audio');
 G.Audio.toggleMute();
 assert.equal(G.Audio.settings.muted,true);
 events.get('blur')();events.get('focus')();
 await Promise.resolve();await Promise.resolve();
 assert.equal(song.volume,0,'user-controlled mute remains intact after refocusing');
});
