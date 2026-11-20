'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Core=require('../src/pkmsvv-fossil-expedition-core.cjs');
const source=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-fossil-expedition-native.js'),'utf8');

function scene(blockers=[]){
 const nativeFree=function(x,y,r=0){
  return blockers.every(b=>x+r<b.x0||x-r>b.x1||y+r<b.y0||y-r>b.y1);
 };
 const World={isFree:nativeFree,isLiquid(){return false;},collide(){return false;}};
 const room={mode:'fossil_lab',id:'qa-room',host:'host',members:[
  {uid:'host',bot:false},{uid:'ai1',bot:true}]};
 const player={x:0,y:0,dead:false,hp:100,maxHp:100};
 const doc={
  addEventListener(){},getElementById(){return null;},
  createElement(){return {style:{},dataset:{},isConnected:false,
   append(){},querySelector(){return null;},remove(){this.isConnected=false;}};},
  body:{append(node){node.isConnected=true;}}
 };
 const G={
  PKMSVVFossilExpeditionCore:Core,World,
  I18n:{lang:'vi'},Social:{room,uid:'host'},
  Game:{player,state:'playing',st:{time:0}},
  Coop:{isHost:true,puppets:()=>[],broadcast(){}},
  EnemyMgr:{all:()=>[]},Spawner:{say(){}},UI:{toast(){}},
 };
 class FakeImage{set src(value){this._src=value;}get src(){return this._src;}get complete(){return false;}}
 vm.runInNewContext(source,{G,Image:FakeImage,document:doc,console,Math,Set,Map});
 return {G,World,player,exp:G.PKMSVVFossilExpedition,nativeFree};
}
test('excavation, Rotom and restorer footprints avoid native rocks and trees',()=>{
 // Deliberate blockers at the original unverified locations.
 const a=scene([
  {x0:-710,x1:-560,y0:1360,y1:1540},
  {x0:-1110,x1:-980,y0:-850,y1:-740},
  {x0:280,x1:355,y0:-65,y1:40}
 ]);
 assert.equal(a.exp.begin({mode:'fossil_lab'}),true);
 const s=a.exp.session;
 assert.equal(s.sites.length,3);
 assert.equal(a.exp.objectivePositionsSafe,true);
 assert.equal(a.exp.machineCollisionActive,true);
 assert.ok(Math.hypot(s.machine.x,s.machine.y)>=290);
 for(let i=0;i<3;i++){
  assert.ok(Math.hypot(s.sites[i].x-s.machine.x,s.sites[i].y-s.machine.y)>=1500);
  for(let j=i+1;j<3;j++)assert.ok(
   Math.hypot(s.sites[i].x-s.sites[j].x,s.sites[i].y-s.sites[j].y)>=2550);
 }
 assert.ok(Math.hypot(s.rotom.x-s.machine.x,s.rotom.y-s.machine.y)>=900);
 // Every objective must clear the mocked obstacles, not just its center.
 for(const p of [...s.sites,s.rotom])assert.equal(a.nativeFree(p.x,p.y,17),true);
 a.exp.end();
});
test('physical restorer rejects movement until mission ends',()=>{
 const a=scene();const original=a.World.isFree,originalCollide=a.World.collide;
 assert.equal(a.exp.begin({mode:'fossil_lab'}),true);
 const m=a.exp.session.machine;
 assert.equal(a.exp.machineCollisionActive,true);
 assert.equal(a.World.isFree(m.x,m.y-45,12),false);
 assert.equal(a.World.isFree(m.x+110,m.y-45,12),true);
 const player={x:m.x,y:m.y-45,r:13};
 assert.equal(a.World.collide(player),true,'native World.collide must block player motion');
 assert.ok(player.x<m.x-53-player.r||player.x>m.x+53+player.r||
  player.y<m.y-99-player.r||player.y>m.y+10+player.r);
 a.exp.end();
 assert.equal(a.World.isFree,original);
 assert.equal(a.World.collide,originalCollide);
 assert.equal(a.World.isFree(m.x,m.y-45,12),true);
});
test('Rotom escorts around a blocked rock wall without teleporting or clipping',()=>{
 const wall={x0:-50,x1:50,y0:20,y1:260};
 const a=scene([wall]);
 assert.equal(a.exp.begin({mode:'fossil_lab'}),true);
 const s=a.exp.session;
 s.phase='escort';s.rotom.freed=true;
 s.rotom.x=-280;s.rotom.y=150;
 a.player.x=280;a.player.y=150;
 const start={x:s.rotom.x,y:s.rotom.y};
 let last={...start},wentAround=false;
 for(let i=1;i<=640;i++){
  a.exp.tick(.05,i*.05,[],()=>{});
  const p=s.rotom;
  assert.ok(Math.hypot(p.x-last.x,p.y-last.y)<=8.6,
   'Rotom may not jump across a collider');
  assert.ok(a.nativeFree(p.x,p.y,18),'Rotom should never enter the rock wall');
  if(p.y<0||p.y>280)wentAround=true;
  last={x:p.x,y:p.y};
 }
 assert.ok(wentAround,'Rotom must navigate around the wall ends');
 assert.ok(s.rotom.x>80,
  'Rotom should reach the trainer side rather than stall against the wall');
 a.exp.end();
});
