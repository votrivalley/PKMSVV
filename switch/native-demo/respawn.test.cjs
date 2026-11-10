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
test('FULL 60Hz renderer retains circles/grid and adds static HUD text without images',()=>{
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
test('No native image decode on L and no renderer switching with ZL',()=>{
 const pad={connected:true,buttons:Array.from({length:18},()=>({pressed:false,value:0})),axes:[0,0]};
 const t=boot(pad);t.frame(1000);
 pad.buttons[4].pressed=true;pad.buttons[6].pressed=true;t.frame(1016);
 assert.equal(t.get('spriteLoadStarted'),false);
 assert.equal(t.get('renderMode'),2);
});
test('FULL render uses fixed font labels but no images even on level-up and pause',()=>{
 const t=boot();
 t.get('setChoices();paused=true');
 t.frame(1000);t.frame(1016);
 assert.ok(t.ops.fillText>0);
 assert.equal(t.ops.drawImage,0);
 assert.equal(t.get('lastError'),'');
});
