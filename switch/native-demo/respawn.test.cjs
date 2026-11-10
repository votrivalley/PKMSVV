'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const js=fs.readFileSync(path.join(__dirname,'main.js'),'utf8');
function boot(pad=null){
 const ops={fillRect:0,arc:0,stroke:0,drawImage:0,fillText:0};
 const canvas=new Proxy({},{
  get(o,k){if(k in o)return o[k];return (...args)=>{if(k in ops)ops[k]++}},
  set(o,k,v){o[k]=v;return true}});
 let next=null;
 const context=vm.createContext({
  screen:{getContext:()=>canvas},
  navigator:{getGamepads:()=>pad?[pad]:[]},
  requestAnimationFrame(fn){next=fn},console:{error(){}}
 });
 vm.runInContext(js,context);
 function frame(ms){assert.equal(typeof next,'function');const cb=next;next=null;cb(ms)}
 const get=x=>vm.runInContext(x,context);
 return {ops,context,frame,get};
}
test('FULL 60Hz renderer retains circles/grid and renders dynamic HUD without images',()=>{
 const t=boot();
 t.frame(1000);t.frame(1016);t.frame(1032);t.frame(1048);
 assert.equal(t.get('renderMode'),2);
 assert.ok(t.ops.arc>0,'full circle geometry must remain');
 assert.ok(t.ops.stroke>0,'grid must remain');
 assert.equal(t.ops.drawImage,0);
 assert.ok(t.ops.fillText>0,'static font label path is exercised');
 assert.equal(t.get('lastError'),'');
});
test('Simulation survives 180 seconds through the 60s enemy HP change and 25s wave transition',()=>{
 const t=boot();
 t.get('spawnShield=Infinity');t.frame(1000);
 for(let i=1;i<=10800;i++)t.frame(1000+i*16.6667);
 assert.ok(t.get('time')>170);
 assert.equal(t.get('wave'),'ZUBAT/GEN1');
 assert.equal(t.get('lastError'),'');
 assert.ok(t.get('enemies.length')<=32&&t.get('shots.length')<=32);
 assert.ok(t.ops.fillText>0);
 assert.equal(t.ops.drawImage,0);
});
test('HP=0 safely respawns without mutation during enemy loop',()=>{
 const t=boot();
 t.get('spawnShield=0;hp=.1;enemies=Array.from({length:20},()=>({x:px,y:py,hp:2,r:15,speed:0}))');
 t.frame(1000);t.frame(1016);
 assert.equal(t.get('hp'),100);
 assert.equal(t.get('deaths'),1);
 assert.equal(t.get('enemies.length'),0);
 assert.equal(t.get('lastError'),'');
});
test('R+X picks first skill while left stick keeps movement live',()=>{
 const pad={connected:true,buttons:Array.from({length:18},()=>({pressed:false,value:0})),axes:[1,0]};
 const t=boot(pad);
 t.frame(1000);t.frame(1016);
 t.get('setChoices()');const x=t.get('px');
 pad.buttons[5].pressed=true;pad.buttons[3].pressed=true;t.frame(1032);
 assert.equal(t.get('pickOpen'),false);
 assert.equal(t.get('attack'),2);
 assert.ok(t.get('px')>x);
});
test('L loads exactly the two permitted images and ZL does not change renderer',()=>{
 const pad={connected:true,buttons:Array.from({length:18},()=>({pressed:false,value:0})),axes:[0,0]};
 const t=boot(pad);t.frame(1000);
 pad.buttons[4].pressed=true;pad.buttons[6].pressed=true;t.frame(1016);
 assert.equal(t.get('spriteLoadStarted'),true);
 assert.equal(t.get('renderMode'),2);
});
test('FULL render remains vector unless user opts in with L',()=>{
 const t=boot();
 t.get('setChoices();paused=true');
 t.frame(1000);t.frame(1016);
 assert.ok(t.ops.fillText>0);
 assert.equal(t.ops.drawImage,0);
 assert.equal(t.get('lastError'),'');
});

test('Live HUD values change as game time and HP change without image draws',()=>{
 const values=[];
 const ctx=new Proxy({},{
  get(o,k){if(k in o)return o[k];return k==='fillText'?(...args)=>values.push(String(args[0])):()=>{}},
  set(o,k,v){o[k]=v;return true}});
 let next=null;
 const context=vm.createContext({
  screen:{getContext:()=>ctx},
  navigator:{getGamepads:()=>[]},
  requestAnimationFrame(cb){next=cb},console:{error(){}}
 });
 vm.runInContext(js,context);
 next(1000);next(1016);
 assert.ok(values.some(v=>v.includes('HP: 100')));
 assert.ok(values.some(v=>v.includes('FPS:')));
 values.length=0;
 vm.runInContext('hp=43;xp=7;kills=18;time=72.5',context);
 next(1032);
 assert.ok(values.some(v=>v.includes('HP: 43')));
 assert.ok(values.some(v=>v.includes('XP: 7/12')));
 assert.ok(values.some(v=>v.includes('KO: 18')));
 assert.ok(values.some(v=>v.includes('TIME: 72s')));
 assert.equal(vm.runInContext('lastError',context),'');
});

test('L loads Pikachu and Rattata exactly once, limits Rattata to four draws',()=>{
 const calls={constructed:0,sources:[],names:[],draw:0};
 class FakeImage{
  constructor(){calls.constructed++;this.onload=null;this.onerror=null}
  set src(src){calls.sources.push(src);this.name=src;this.onload?.()}
 }
 const ctx=new Proxy({},{
  get(o,k){if(k in o)return o[k];return k==='drawImage'?(img)=>{calls.draw++;calls.names.push(img.name)}:()=>{}},
  set(o,k,v){o[k]=v;return true}});
 const pad={connected:true,buttons:Array.from({length:18},()=>({pressed:false,value:0})),axes:[0,0]};
 let next=null;
 const context=vm.createContext({
  screen:{getContext:()=>ctx},Image:FakeImage,
  navigator:{getGamepads:()=>[pad]},
  requestAnimationFrame(cb){next=cb},console:{error(){}}
 });
 vm.runInContext(js,context);
 next(1000);next(1016);
 assert.equal(calls.constructed,0);
 assert.equal(calls.draw,0,'opt-in mode is off by default');
 vm.runInContext("enemies=Array.from({length:10},(_,i)=>({x:80+i*60,y:300,species:'rattata',hp:3,r:16,speed:0}))",context);
 pad.buttons[4].pressed=true;next(1032);
 assert.equal(calls.constructed,2,'only two images are constructed');
 assert.deepEqual(calls.sources,['romfs:/sprites/25.png','romfs:/sprites/19.png']);
 assert.equal(calls.draw,5,'at most four Rattata plus one Pikachu');
 assert.equal(calls.names.filter(x=>x.endsWith('/19.png')).length,4);
 assert.equal(calls.names.filter(x=>x.endsWith('/25.png')).length,1);
 next(1048);assert.equal(calls.constructed,2);
 assert.equal(calls.draw,10);
 pad.buttons[4].pressed=false;next(1064);
 pad.buttons[4].pressed=true;next(1080);
 assert.equal(calls.draw,15,'L off returns to vector drawing');
 assert.equal(vm.runInContext('spritesEnabled',context),false);
 assert.equal(vm.runInContext('lastError',context),'');
});
test('Pidgey and Zubat use vector fallback even with sprites enabled',()=>{
 const t=boot();
 t.get("spritesEnabled=true;loaded.pikachu=true;loaded.rattata=true;SPRITES.pikachu={};SPRITES.rattata={};enemies=[{species:'pidgey',x:60,y:300,r:15,hp:3,speed:0},{species:'zubat',x:100,y:300,r:15,hp:3,speed:0}]");
 t.frame(1000);
 assert.equal(t.ops.drawImage,1,'only the player sprite should render');
 assert.equal(t.get('enemySpritesDrawn'),0);
 assert.equal(t.get('lastError'),'');
});
