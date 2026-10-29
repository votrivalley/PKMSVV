'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function setup(){
 const dom=new Map(),msgs=[];
 function el(tag){
  const x={tagName:tag.toUpperCase(),style:{},hidden:false,children:[],dataset:{},textContent:'',
   classList:{toggle(){}},append(...v){this.children.push(...v)},replaceChildren(...v){this.children=[...v]},
   addEventListener(){},setAttribute(){}};
  Object.defineProperty(x,'id',{set(v){x._id=v;dom.set(v,x)},get(){return x._id}});
  Object.defineProperty(x,'innerHTML',{set(s){for(const [,n] of s.matchAll(/id="([^"]+)"/g))
    if(!dom.has(n))el('div').id=n;}});
  return x;
 }
 const document={readyState:'loading',getElementById:id=>dom.get(id),createElement:el,
  addEventListener(){},body:{append(){} }};
 let state='ui';const save={partner:25,owned:{25:1,6:1,149:1},pkmsvvChapter6Seen:true};
 const player={dex:25,mon:{dex:25},maxHp:300,hp:300,baseSpd:100,baseAtk:1,
  x:0,y:0,dead:false};
 const G={DB:{save},Coop:{active:false},PKMSVVStory:{arenaUnlocked(){return save.pkmsvvChapter6Seen}},
  UI:{toast(s){msgs.push(s)}},I18n:{lang:'vi'},
  DEX_BY:new Proxy({},{get(_t,k){return {dex:Number(k),name:'Pokémon '+k,types:['normal']}}}),
  Game:{player,get state(){return state},startRun(){state='playing'},toUI(){state='ui'}},
  Flow:{goMenu(){this.returned=(this.returned||0)+1}},
  Enemy:class{constructor(def){this.maxHp=def.hp;this.hp=def.hp;this.dead=false}},
  EnemyMgr:{add(e){this.last=e;return e},clear(){},update(){}},
  Spawner:{update(){}},Rift:{update(){}},Judgment:{update(){}},
  World:{setArena(a){this.arena=a},setBiome(){}},
  Projectiles:{clear(){}},Pickups:{clear(){}},Hazards:{clear(){}},
  Sprites:{playerScale(){return 1},playerRadius(){return 20},bodyHeight(){return 35},
   preload(){},Animator:class{constructor(dex){this.dex=dex}}}
 };
 vm.runInNewContext(read('src/pkmsvv-arena-solo.js'),{G,document,Math});
 return {G,lib:G.PKMSVVArenaSolo,save,player,dom,msgs};
}
test('Arena Solo has random 10–15 min prep and warns 30s before duel',()=>{
 const h=setup(),{lib}=h;
 assert.equal(lib.PREP_MIN,600);assert.equal(lib.PREP_MAX,900);
 assert.equal(lib.WARN,30);assert.equal(lib.SELECT,10);
 assert.equal(lib.start(()=>0),true);assert.equal(lib.prepTotal,600);
 assert.notEqual(lib.chosen,lib.rival);
 lib.update(570);assert.equal(lib.stage,'warn');
 lib.update(20);assert.equal(lib.stage,'select');
});
test('Solo has a real timed selection/VS transition and 320 HP duel normalization',()=>{
 const h=setup(),{lib,G}=h;
 lib.start(()=>0);lib.update(570);lib.update(20);lib.update(10);
 assert.equal(lib.stage,'intro');lib.update(3);
 assert.equal(lib.stage,'fight');
 assert.equal(h.player.maxHp,320);assert.equal(G.EnemyMgr.last.maxHp,320);
 assert.equal(G.World.arena.r,20);
});
test('Actual enemy kill decides Solo win; a lobby exit cannot grant rewards',()=>{
 const h=setup(),{lib,G}=h;
 lib.start(()=>0);lib.update(570);lib.update(20);lib.update(10);lib.update(3);
 assert.equal(lib.active,true);
 G.EnemyMgr.last.dead=true;lib.update(.1);
 assert.equal(lib.active,false);assert.equal(G.Flow.returned,1);
 assert.equal(G.World.arena,null);
 assert.equal(h.save.arenas,undefined);
});
test('LAN Co-op is never treated as PvP and Chapter 6 is a strict Solo gate',()=>{
 const h=setup(),{lib,G,save}=h;
 G.Coop.active=true;assert.equal(lib.start(),false);
 G.Coop.active=false;save.pkmsvvChapter6Seen=false;assert.equal(lib.start(),false);
});
test('Ring shrinks after 150 seconds and no Pokémon duplication is allowed',()=>{
 const h=setup(),{lib,G}=h;
 lib.start(()=>0);lib.update(570);lib.update(20);lib.update(10);lib.update(3);
 lib.update(181);assert.equal(G.World.arena.r,18);
 assert.notEqual(lib.chosen,lib.rival);
});
