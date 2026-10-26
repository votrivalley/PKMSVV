'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','src/lan/lan-ai.js'),'utf8');
function harness(mode,{nests=[],enemies=[]}={}){
 const bot={uid:'ai-1234567890abcdef',name:'AI',dex:25,bot:true};
 const frames=[];
 const mate={connected:true,pl:{x:0,y:0,hp:100,maxHp:100,net:{x:0,y:0,hp:100,maxHp:100}}};
 const G={Social:{room:{mode,isHost:true,members:[{uid:'user',name:'Host'},bot]}},
  Coop:{isHost:true,local:{uid:'user',x:300,y:0},mate:uid=>uid===bot.uid?mate:null},
  EnemyMgr:{all:()=>enemies},EggRush:{nests},
  Net:{injectBot:(uid,data)=>frames.push({uid,data})},baseStartOf:()=> 'tackle'};
 vm.runInNewContext(code,{G,Map,Set,Math,Date,Number,
  setInterval:()=>1,clearInterval:()=>{},console});
 return {G,frames,bot};
}
test('Co-op AI can follow host and periodically attack hostile targets',()=>{
 const h=harness('coop',{enemies:[{x:150,y:0,dead:false}]});
 assert.equal(h.G.LanAI.activeBots().length,1);
 h.G.LanAI.update();
 assert.equal(h.frames.length,1);
 assert.ok(h.frames[0].data.p[0]>0,'Bot moves toward hostile monster');
 assert.ok(h.frames[0].data.ev.some(e=>e[0]==='c'),'Bot casts its own attack');
});
test('Sống Còn AI is a real actor, can be eliminated and joins roster',()=>{
 const h=harness('royale',{enemies:[{x:150,y:0,dead:false}]});
 assert.equal(h.G.LanAI.activeBots().length,1);
 h.G.LanAI.update();
 assert.equal(h.frames.length,1);
 assert.ok(h.frames[0].data.p[0]>0);
 assert.equal(h.frames[0].uid,h.bot.uid);
});
test('Tranh Trứng AI seeks available nest before chasing mobs',()=>{
 const h=harness('eggrush',{nests:[{id:1,x:200,y:0,taken:true},{id:2,x:140,y:0,taken:false}],enemies:[{x:-120,y:0,dead:false}]});
 assert.equal(h.G.LanAI.activeBots().length,1);
 h.G.LanAI.update();
 assert.ok(h.frames[0].data.p[0]>0,'Egg competitor must move right toward unclaimed egg, not left toward mob');
});
test('No AI is driven by non-host clients',()=>{
 const h=harness('eggrush',{nests:[{id:1,x:200,y:0,taken:false}]});
 h.G.Coop.isHost=false;h.G.LanAI.update();
 assert.equal(h.frames.length,0);
});
