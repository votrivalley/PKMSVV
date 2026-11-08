'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../src/pkmsvv-champion-arena.js'),'utf8');
function setup(){
 const nodes=new Map(),actors=[],events=[];
 function node(tag='section'){
  const x={tagName:String(tag).toUpperCase(),children:[],hidden:false,disabled:false,className:'',style:{},dataset:{},
   textContent:'',onclick:null,classList:{add(){},remove(){},toggle(){}},
   append(...kids){this.children.push(...kids);for(const k of kids)if(k.id)nodes.set(k.id,k)},
   replaceChildren(...kids){this.children=[];this.append(...kids)},
   setAttribute(){},querySelector(){return null},after(){},remove(){nodes.delete(this.id)}};
  Object.defineProperty(x,'id',{get(){return this._id},set(id){this._id=id;nodes.set(id,this)}});
  Object.defineProperty(x,'innerHTML',{get(){return this._html||''},set(value){
   this._html=value;for(const match of value.matchAll(/id="([^"]+)"/g))
    if(!nodes.has(match[1])){const item=node('button');item.id=match[1];}
  }});
  return x;
 }
 const document={readyState:'loading',body:{append(){}},createElement:node,
  addEventListener(){},querySelector(){return null},getElementById:id=>nodes.get(id)||null};
 const player={x:0,y:0,dex:25,mon:{dex:25,name:'Pikachu',types:['electric']},level:25,
  maxHp:350,hp:350,baseAtk:1.3,baseSpd:112,atkMul:1,spdMul:1,invuln:0,dead:false};
 const save={partner:25,pkmsvvChapter6Seen:true,pkmsvvChapter8IntroSeen:true,
  tickets:{t1:20,t10:2},arenas:{},pkmsvvMultiplayerDone:{coop:true,royale:true}};
 class Enemy{
  constructor(def,x=0,y=0,_scale=null,boss=false){
   this.def=def;this.dex=def.dex;this.name=def.name;this.x=x;this.y=y;this.maxHp=def.hp;this.hp=def.hp;
   this.dmg=def.dmg;this.spd=def.spd;this.boss=boss;this.dead=false;this.ai={cd:1.6,fury:false};
  }
  hurt(n){this.hp-=n;if(this.hp<=0)this.die()}
  die(){this.dead=true}
  bossEnd(){return true}
  bossInit(){return true}
  draw(){}
 }
 let state='ui';
 const G={
  DEX_BY:new Proxy({},{get(_o,key){
   if(Number.isInteger(Number(key)))return {dex:Number(key),name:'Pokémon '+key,types:['normal'],hp:100};
   return undefined;
  }}),
  DB:{save,commit(){return true}},UI:{toast(){}},I18n:{lang:'vi'},Coop:{active:false},
  PKMSVVStory:{arenaUnlocked(){return true},tenChampionCompleted(){return false}},
  PKMSVVQuickRegion:{THEMES:[null,'ground','water','ice','steel','rock','bug','fighting','fire','dragon'],
   targetBiome(i){return i===0?0:100+i}},
  Game:{player,get state(){return state},startRun(){state='playing'},toUI(){state='ui'}},
  World:{biome:77,setArena(value){this.arena=value},setBiome(v){this.biome=v}},
  Tiles:{arenaBiome(type){return 300+['normal','ground','water','ice','steel','rock','bug','fighting','fire','dragon'].indexOf(type)}},
  Spawner:{update(){},say(){}},
  Enemies:{bagAt(){return []},BOSSES:[]},Enemy,
  EnemyMgr:{get added(){return actors.slice()},add(enemy){actors.push(enemy);this.last=enemy;return enemy},
   clear(){actors.length=0;this.last=null},update(){}},
  Projectiles:{clear(){}},Pickups:{clear(){},dropXp(){}},Hazards:{clear(){}},
  FX:{burst(){},ring(){events.push('heal')}},Flow:{goMenu(){}},Rift:{update(){}},Judgment:{update(){}},
  Events:{update(){}}
 };
 vm.runInNewContext(source,{G,document,Math,Date,console});
 return {G,player,save,actors,events,lib:G.PKMSVVChampionArena};
}
test('Champion uses the Explore generation map mapping with Kanto biome zero',()=>{
 const h=setup(),{lib,G}=h;
 assert.equal(lib.regionBiome(),0);
 assert.equal(lib.start(),true);
 assert.equal(G.World.biome,0,'Kanto Arena and Explore must share native starter map 0');
 assert.equal(lib.REGION_THEMES[0],'normal');
 assert.equal(lib.REGION_THEMES[8],'fire','the difficult fire map is Paldea, not Kanto');
 assert.equal(lib.REGION_THEMES.length,10);
 assert.equal(new Set(lib.REGION_THEMES).size,10);
});
test('all rounds use actual player relative ranges, never native boss/tier multiplier leakage',()=>{
 const {lib,G}=setup();
 assert.equal(lib.start(),true);
 const all=[[.90,1.10],[.95,1.15],[1,1.2],[1.1,1.25]];
 for(let round=0;round<4;round++){
  const [lo,hi]=all[round];
  assert.equal(lib.nextDuel(),true);
  lib.update(3.01);
  assert.equal(lib.stage,'fight');
  const boss=G.EnemyMgr.last;
  const measured=boss.pkmsvvArenaStatRatios;
  assert.ok(measured,'record source ratios on the real boss');
  for(const key of ['hp','dmg','spd'])
   assert.ok(measured[key]>=lo-1e-9&&measured[key]<=hi+1e-9,key+' outside '+round);
  assert.equal(boss.maxHp,Math.round(boss.pkmsvvArenaPlayerBaseline.hp*measured.hp),
   'native boss constructor scaling must not bypass percentages');
  if(round<3){boss.dead=true;lib.update(.01)}
 }
 const final=G.EnemyMgr.last;
 assert.equal(final._pkmsvvChampionMegaEligible,true,'final retains 50% HP Mega');
});
test('AI Champion has 1–2 actual support enemies in Round 16, exactly two from Round 8 onward',()=>{
 const {lib,G}=setup();lib.start();
 for(let round=0;round<4;round++){
  lib.nextDuel();lib.update(3.01);
  const adds=G.EnemyMgr.added,boss=G.EnemyMgr.last;
  const support=adds.filter(x=>x.pkmsvvChampionSupport);
  const n=round===0?support.length:2;
  assert.ok(round!==0||n>=1&&n<=2,'opening round gets one or two supports');
  if(round>0)assert.equal(support.length,2,'later rounds always have two supports');
  assert.equal(boss.pkmsvvChampion,true);
  assert.equal(support.length,boss.pkmsvvChampionSupports.length);
  for(const ally of support){
   assert.equal(ally.pkmsvvChampionSupportOwner,boss);
   assert.equal(ally.boss,false,'support is NOT another mini-boss');
   assert.equal(ally.xp,0,'no extra Arena farming reward');
   assert.ok(ally.hp>0,'support can be damaged in actual combat');
   assert.ok(lib.SUPPORT_DEX.includes(ally.dex),'support comes from canonical support roster');
  }
  if(round<3){
   boss.dead=true;lib.update(.1);
   assert.equal(lib.stage,'prep');
   assert.ok(support.every(x=>x.dead),'old supporters cannot leak into the next round');
  }
 }
});
test('healer support periodically heals only its living AI Champion, never revives a dead boss',()=>{
 const {lib,G,player,events}=setup();lib.start();lib.nextDuel();lib.update(3.01);
 const boss=G.EnemyMgr.last;
 lib.clearOpponentSupports();
 const actor=lib.spawnOpponentSupports(boss,player,()=>.7).find(x=>x.pkmsvvSupportRole==='heal');
 assert.ok(actor,'seeded support roster must contain Happiny');
 boss.hp=boss.maxHp*.6;
 lib.updateOpponentSupports(12);
 assert.ok(boss.hp>boss.maxHp*.6);
 assert.ok(events.includes('heal'));
 boss.dead=true;
 lib.updateOpponentSupports(12);
 assert.equal(actor.dead,true,'no heals or allies after Champion dies');
});
