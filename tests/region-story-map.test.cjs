'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-champion-arena.js'),'utf8');
function harness(){
 const nodes=new Map();
 function node(tag='button'){
  const x={tagName:tag,children:[],hidden:false,disabled:false,className:'',style:{},
   textContent:'',classList:{toggle(){},add(){},remove(){}},
   append(...items){this.children.push(...items);for(const item of items)if(item.id)nodes.set(item.id,item)},
   replaceChildren(...items){this.children=[];this.append(...items);},
   addEventListener(){},querySelector(){return null},after(){},setAttribute(){}};
  Object.defineProperty(x,'id',{get(){return this._id},set(v){this._id=v;nodes.set(v,this)}});
  Object.defineProperty(x,'innerHTML',{get(){return this._html||''},set(html){
   this._html=html;for(const match of html.matchAll(/id="([^"]+)"/g)){
    if(!nodes.has(match[1])){const c=node();c.id=match[1];}
   }
  }});
  return x;
 }
 const document={readyState:'loading',body:{append(){}},getElementById:id=>nodes.get(id)||null,
  createElement:node,querySelector(){return null},addEventListener(){}};
 const save={partner:25,pkmsvvChapter6Seen:true,pkmsvvChapter8IntroSeen:true,
  arenas:{},pkmsvvChapter3Seen:true,pkmsvvChapter5Seen:true};
 const spawnBag=[{dex:999,name:'Other Gen',hp:100,dmg:10,spd:70},
  {dex:150,name:'Kanto',hp:110,dmg:11,spd:70},
  {dex:675,name:'Other Gen',hp:120,dmg:12,spd:75}];
 const entries=[];
 const G={
  DB:{save,commit(){}},I18n:{lang:'vi'},UI:{toast(){}},
  DEX_BY:new Proxy({}, {get(_o,dex){
   return Number.isInteger(Number(dex))?{dex:Number(dex),name:'Pokémon '+dex}:undefined;
  }}),
  Enemies:{bagAt(){return spawnBag;},BOSSES:[{dex:150,hp:300,dmg:15,spd:70},{dex:999,hp:500,dmg:20,spd:80}]},
  Enemy:class{
   constructor(def,x=0,y=0,_scale=null,boss=false){
    this.def=def;this.dex=def.dex;this.name=def.name;this.x=x;this.y=y;
    this.hp=this.maxHp=def.hp;this.dmg=def.dmg;this.spd=def.spd;this.boss=boss;this.dead=false;
   }
  },
  EnemyMgr:{add(enemy){entries.push(enemy);this.last=enemy;return enemy},clear(){entries.length=0},all(){return entries}},
  Spawner:{update(){const bag=G.Enemies.bagAt();for(const def of bag)G.EnemyMgr.add(new G.Enemy(def));return bag.length}},
  World:{biome:88,setArena(value){this.arena=value},setBiome(value){this.biome=value}},
  Tiles:{arenaBiome(type){return ['fire','steel','water','ground','rock','dark','bug','fighting','ice','dragon'].indexOf(type)+1}},
  Game:{state:'ui',player:{x:0,y:0,dead:false,dex:25,mon:{name:'Pikachu'},hp:350,maxHp:350,baseAtk:1.3,baseSpd:112,atkMul:1,spdMul:1},
   startRun(){this.state='playing';G.World.setBiome(0,true)},toUI(){this.state='ui'}},
  FX:{burst(){}},Flow:{goMenu(){}},Coop:{active:false},
  Projectiles:{clear(){}},Pickups:{clear(){}},Hazards:{clear(){}}};
 G.PKMSVVStory={arenaUnlocked:()=>true,tenChampionCompleted:()=>false};
 vm.runInNewContext(source,{G,document,Math,console});
 return {G,save,lib:G.PKMSVVChampionArena,entries,spawnBag};
}
test('Nine native-generation farm rosters; special tenth Sky Pillar is cross-generation',()=>{
 const {lib,spawnBag}=harness();
 for(let i=0;i<9;i++){
  const pool=lib.farmSpecies(i),[lo,hi]=lib.GEN_BOUNDS[i];
  assert.ok(pool.length>=10,'region '+i+' needs enough native mobs');
  assert.ok(pool.every(dex=>dex>=lo&&dex<=hi),'wrong generation '+i);
  for(let n=0;n<15;n++){
   const mapped=lib.regionizeBag(spawnBag,i);
   assert.equal(mapped.length,spawnBag.length);
   assert.ok(mapped.every(def=>def.dex>=lo&&def.dex<=hi),'off-region monster in region '+i);
   assert.ok(mapped.every(def=>def.hp>=100&&def.dmg>=10),'must preserve native enemy tier data');
  }
 }
 const sky=lib.farmSpecies(9),generations=new Set(sky.map(dex=>
  lib.GEN_BOUNDS.findIndex(([lo,hi])=>dex>=lo&&dex<=hi)));
 assert.ok(generations.size>=4,'Sky Pillar deliberately mixes several generations');
});
test('Region map stays fixed across preparation, native spawn and 4-minute world reset',()=>{
 const {G,lib,entries}=harness();
 const originalBag=G.Enemies.bagAt,originalAdd=G.EnemyMgr.add;
 assert.equal(lib.start(),true);
 assert.equal(lib.stage,'prep');
 assert.equal(G.World.biome,1,'Kanto fire region must begin immediately');
 G.Spawner.update(.1,[G.Game.player],10);
 assert.ok(entries.length>=3);
 assert.ok(entries.every(e=>e.dex>=1&&e.dex<=151));
 assert.strictEqual(G.Enemies.bagAt,originalBag,'spawn bag restored after region tick');
 assert.strictEqual(G.EnemyMgr.add,originalAdd,'original manager restored after region tick');
 G.World.setBiome(999,true);
 assert.equal(G.World.biome,1,'native world rotation cannot change region');
 lib.update(91);
 assert.equal(G.EnemyMgr.last._pkmsvvChampionPrepBoss,1);
 assert.ok(G.EnemyMgr.last.dex>=1&&G.EnemyMgr.last.dex<=151,'regional prep boss must stay native');
 lib.nextDuel();
 assert.equal(G.World.biome,1,'countdown and Arena keep Kanto map');
 lib.cancelSession();
 assert.equal(G.World.biome,88,'exit restores the former free-world biome');
 G.World.setBiome(999,true);
 assert.equal(G.World.biome,999,'free modes are not intercepted after Arena');
 G.Spawner.update(.1,[G.Game.player],15);
 assert.ok(entries.some(e=>e.dex===999||e.dex===675),'free-world spawn bag is unmodified');
});
test('Farming pressure increases gradually while old 2x XP logic and seal save remain unchanged',()=>{
 const {lib,save}=harness();
 assert.equal(lib.REGION_FARM_BALANCE.length,10);
 for(let i=1;i<10;i++){
  const prev=lib.farmProfile(i-1),now=lib.farmProfile(i);
  for(const key of ['density','hp','dmg','spd']){
   assert.ok(now[key]>prev[key],key+' must grow with region');
   assert.ok(now[key]-prev[key]<.06,key+' must not jump suddenly');
  }
 }
 assert.ok(lib.farmProfile(9).hp<1.5);
 assert.ok(lib.farmProfile(9).dmg<1.25);
 assert.deepEqual(Object.keys(save.arenas),[],'region presentation does not mint Crown Seals');
 const code=source;
 assert.match(code,/FARM_SPAWN_MULT=2,FARM_XP_MULT=2/);
 assert.match(code,/G\.World,'setBiome'/);
 assert.match(code,/finally\{/);
});
