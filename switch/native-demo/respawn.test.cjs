'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const js=fs.readFileSync(path.join(__dirname,'main.js'),'utf8');
function boot(pad=null){
 const ops=[];
 const ctx=new Proxy({}, {get(obj,k){
  if(k in obj)return obj[k];
  if(k==='fillText')return (...a)=>{ops.push(a)};
  return ()=>{};
 },set(o,k,v){o[k]=v;return true}});
 const screen={getContext:type=>type==='2d'?ctx:null};
 let next=null,errors=[];
 const context=vm.createContext({screen,navigator:{getGamepads:()=>pad?[pad]:[]},
  requestAnimationFrame(fn){next=fn},console:{error(...args){errors.push(args)}}});
 vm.runInContext(js,context);
 function inspect(){return vm.runInContext('({hp,kills,time,deaths,spawnShield,enemies:enemies.length,shots:shots.length,lastError,spritesEnabled,drawnSprites,wave})',context)}
 function frame(ms){assert.ok(next);const fn=next;next=null;fn(ms)}
 return {context,frame,inspect,ops,errors};
}
test('Crowded collision damage never reassigns enemies mid-loop or breaks animation',()=>{
 const t=boot();
 vm.runInContext('spawnShield=0;hp=.1;enemies=Array.from({length:70},()=>({x:px,y:py,hp:2,r:15,speed:0}));shots=[]',t.context);
 t.frame(1000);t.frame(1016);
 const state=t.inspect();
 assert.equal(state.hp,100);
 assert.equal(state.deaths,1);
 assert.equal(state.enemies,0);
 assert.equal(state.shots,0);
 assert.ok(state.spawnShield>1);
 assert.equal(state.lastError,'');
 for(let i=0;i<650;i++)t.frame(1032+i*16);
 assert.equal(t.inspect().lastError,'');
});
test('Contact with many enemies is bounded, and death triggers once',()=>{
 const t=boot();
 vm.runInContext('spawnShield=0;hp=100;enemies=Array.from({length:80},()=>({x:px,y:py,hp:2,r:15,speed:0}))',t.context);
 t.frame(1000);t.frame(1016);
 const hp=t.inspect().hp;
 assert.ok(hp<100&&hp>=99,'damage cap protects against one-frame instant-death');
 assert.equal(t.inspect().deaths,0);
});
test('A thrown simulation exception appears on screen; RAF remains scheduled',()=>{
 const t=boot();
 vm.runInContext('enemies=[null];spawnAt=Infinity',t.context);
 t.frame(1000);t.frame(1016);
 assert.match(t.inspect().lastError,/TypeError/);
 t.frame(1032);assert.ok(t.ops.some(x=>String(x[0]).includes('ERROR')));
});

test('Native diagnostic demo survives 150 seconds including the 25-second species transition',()=>{
 const t=boot();
 // Isolate elapsed wave/sprite behavior from intentional battle death resets.
 vm.runInContext('spawnShield=Infinity',t.context);
 t.frame(1000);
 for(let i=1;i<=9000;i++)t.frame(1000+i*16.6667);
 const s=t.inspect();
 assert.equal(s.lastError,'','native simulation must not abort near 30s');
 assert.ok(s.time>=120,'simulated stage has passed 25s and 60s');
 assert.equal(s.wave,'ZUBAT/GEN1');
 assert.ok(s.enemies<=32&&s.shots<=32,'bounded gameplay actor counts');
 assert.equal(s.spritesEnabled,false,'safe vector rendering default must remain off');
});
test('Switch L toggles sprite path on a rising edge without affecting gameplay',()=>{
 const pad={connected:true,buttons:Array.from({length:18},()=>({pressed:false,value:0})),axes:[0,0]};
 const t=boot(pad);
 t.frame(1000);t.frame(1016);
 assert.equal(t.inspect().spritesEnabled,false);
 assert.equal(vm.runInContext('spriteLoadStarted',t.context),false,'never decode images in default vector mode');
 pad.buttons[4].pressed=true;t.frame(1032);
 assert.equal(vm.runInContext('spriteLoadStarted',t.context),true,'load sprites only after L');
 assert.equal(t.inspect().spritesEnabled,true);
 t.frame(1048);assert.equal(t.inspect().spritesEnabled,true,'holding L must not retrigger');
 pad.buttons[4].pressed=false;t.frame(1064);
 pad.buttons[4].pressed=true;t.frame(1080);
 assert.equal(t.inspect().spritesEnabled,false);
});

test('Default MIN mode avoids Canvas text, arcs, images and stroke for 150 seconds',()=>{
 const ops={fillText:0,beginPath:0,arc:0,drawImage:0,stroke:0,fillRect:0};
 const ctx=new Proxy({}, {get(o,k){if(k in o)return o[k];if(k in ops)return ()=>{ops[k]++};return ()=>{}},set(o,k,v){o[k]=v;return true}});
 let next=null;
 const context=vm.createContext({screen:{getContext:()=>ctx},
  navigator:{getGamepads:()=>[]},requestAnimationFrame(fn){next=fn},
  console:{error(){}}});
 vm.runInContext(js,context);
 next(1000);
 for(let i=1;i<=9000;i++){const fn=next;fn(1000+i*16.66667)}
 assert.equal(ops.fillText,0);
 assert.equal(ops.drawImage,0);
 assert.equal(ops.arc,0);
 assert.equal(ops.beginPath,0);
 assert.ok(ops.fillRect>1000);
 assert.equal(vm.runInContext('lastError',context),'');
});
test('ZL switches MIN -> static -> full renderer without changing battle state',()=>{
 const pad={connected:true,buttons:Array.from({length:18},()=>({pressed:false,value:0})),axes:[0,0]};
 const t=boot(pad);
 t.frame(1000);
 assert.equal(vm.runInContext('renderMode',t.context),0);
 pad.buttons[6].pressed=true;t.frame(1016);
 assert.equal(vm.runInContext('renderMode',t.context),1);
 t.frame(1032);assert.equal(vm.runInContext('renderMode',t.context),1);
 pad.buttons[6].pressed=false;t.frame(1048);
 pad.buttons[6].pressed=true;t.frame(1064);
 assert.equal(vm.runInContext('renderMode',t.context),2);
 assert.equal(t.inspect().lastError,'');
});
