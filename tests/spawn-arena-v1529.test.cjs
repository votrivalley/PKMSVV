'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function harness(count=10,blocked=false,mode='royale'){
 const players=Array.from({length:count},(_,i)=>({uid:'p'+i,x:i*1200,y:0,dead:false})),items=[];
 const G={EnemyMgr:{count:0,all:()=>items,bossAlive:()=>false,add(e){items.push(e);this.count++;}},
  Enemy:class{constructor(def,x,y,sc){this.x=x;this.y=y;this.hp=this.maxHp=sc.hp;this.dmg=5;this.xp=1;this.dead=false;}},
  Enemies:{BOSSES:[],rollRun(){},upcomingDex:()=>[],bagAt:()=>[{dex:25}],scale:()=>({hp:10})},
  Sprites:{preload(){},hovers:()=>false,hasShiny:()=>false},Camera:{outerRadius:()=>200,kick(){}},
  Coop:{isHost:true,scaleRate:()=>1,scaleHp:()=>1,say(){}},U:{rand:a=>a,pick:a=>a[0],dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2},
  Rift:{inArena:false,leftBehind:()=>false},Judgment:{active:false},World:{isFree:()=>true},
  Royale:{active:mode==='royale',intensity:()=>({density:.5,hp:1,dmg:1})},EggRush:{nests:[]},
  Arena:{active:mode!=='coop',validSpawn:()=>true,visible:()=>blocked,clampGoal:p=>p,openingBoost:t=>1+1.3*Math.max(0,1-t/180)},
  Events:{golden:false},Audio:{sfx(){}},Game:{player:players[0],st:{time:0}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../vendor/pokesurvivor/js/systems/spawner.js'),'utf8'),{G,Math,Set,Array,Object,Number});
 G.Spawner.reset();return {G,players,items};
}
for(const n of [2,4,10])test('opening batch spreads at most two enemies to each of '+n+' trainers, over 3–12s',()=>{
 const {G,players}=harness(n);G.Spawner.update(.1,players,2.9);assert.equal(G.Spawner.openingMetrics.spawned,0);
 for(let t=3;t<15;t+=.05)G.Spawner.update(.05,players,t);
 assert.equal(G.Spawner.openingMetrics.spawned,2*n);
 for(const uid of players.map(p=>p.uid))assert.equal(G.Spawner.openingMetrics.byTrainer[uid],2);
 assert.ok(G.EnemyMgr.count<=60);
});
test('hidden spawn failure is retried, never bypassed; hard cap also covers burst',()=>{
 const {G,players}=harness(10,true);
 for(let t=3;t<13;t+=.05)G.Spawner.update(.05,players,t);
 assert.equal(G.EnemyMgr.count,0);assert.equal(G.Spawner.openingMetrics.spawned,0);
 G.Arena.visible=()=>false;G.EnemyMgr.count=59;G.Spawner.burst(100);assert.equal(G.EnemyMgr.count,60);
 assert.equal(G.Spawner.lateCap(600),60);assert.equal(G.Spawner.lateCap(1200),80);
});
test('opening batch never runs in ordinary Co-op or Egg Rush',()=>{
 for(const mode of ['coop','eggrush']){const {G,players}=harness(4,false,mode);G.Spawner.update(.1,players,10);assert.equal(G.Spawner.openingMetrics.spawned,0);}
});
