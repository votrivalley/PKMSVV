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
 const G={DB:{save},Coop:{active:false},
  PKMSVVBoxHub:{arenaReady(){return save.qaReady||[25,6,149].map(dex=>({id:'b1-'+dex+'-n',dex,shiny:false}));}},PKMSVVStory:{arenaUnlocked(){return save.pkmsvvChapter6Seen}},
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
test('Solo Arena chooses exactly one of six Ready Team slots, not unready owned Pokémon',()=>{
 const h=setup(),{G,lib,save,dom}=h;
 save.qaReady=[
  {id:'ready-6-normal',dex:6,shiny:false},
  {id:'ready-6-shiny',dex:6,shiny:true},
  {id:'ready-149',dex:149,shiny:false}
 ];
 save.partner=25; // Owned, but not among the three Ready slots.
 assert.equal(lib.start(()=>0),true);
 assert.equal(lib.chosenInstance,'ready-6-normal','unready partner must not be auto-injected');
 assert.equal(lib.chosen,6);
 lib.update(570);lib.update(20);
 const cards=dom.get('pkmsvv-arena-solo-picks').children;
 assert.equal(cards.length,3,'only Ready slots in the actual 10-second picker');
 assert.deepEqual(cards.map(x=>x.dataset.readyId),save.qaReady.map(x=>x.id));
 assert.equal(cards.some(x=>x.dataset.dex==='25'),false,'owned but unready species is unavailable');
 cards[1].onclick();
 assert.equal(lib.chosenInstance,'ready-6-shiny','same species Shiny is a separate choice');
 assert.equal(lib.chosenShiny,true);
 lib.update(10);
 assert.equal(G.Game.player.shiny,true);
 assert.equal(G.Game.player.pkmsvvArenaReadyInstanceId,'ready-6-shiny');
 assert.deepEqual(save.qaReady.map(x=>x.id),['ready-6-normal','ready-6-shiny','ready-149'],'Arena does not edit Ready Team');
 assert.equal(save.partner,25,'Solo duel does not change permanent PokéBox active fighter');
});
test('Solo Arena cannot start without a Ready Team; random owned Pokémon never leak in',()=>{
 const h=setup();h.save.qaReady=[];
 assert.equal(h.lib.start(()=>0),false);
 assert.equal(h.lib.active,false);
 assert.ok(h.msgs.some(s=>/PokéBox/.test(s)));
});
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
 assert.equal(h.player.maxHp,320);assert.equal(G.EnemyMgr.last.maxHp,288);assert.equal(lib.aiFactor,.9);
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

test('Solo freezes enemies during Pokémon pick so a 10-second modal cannot kill the player',()=>{
 const h=setup(),{G,lib}=h;
 let count=0;const old=G.EnemyMgr.clear;
 G.EnemyMgr.clear=function(){count++;return old.call(this)};
 lib.start(()=>0);lib.update(570);lib.update(20);
 assert.equal(lib.stage,'select');assert.equal(count,1);
 assert.ok(h.player.invuln>=12);
});

test('Solo center 3-2-1 really blocks rival spawn until the countdown ends',()=>{
 const {G,lib,dom}=setup();
 lib.start(()=>0);lib.update(570);lib.update(20);lib.update(10);
 assert.equal(lib.stage,'intro');
 assert.equal(dom.get('pkmsvv-arena-solo-countdown').textContent,'3');
 assert.equal(G.EnemyMgr.last,undefined);
 lib.update(1);assert.equal(dom.get('pkmsvv-arena-solo-countdown').textContent,'2');
 assert.equal(G.EnemyMgr.last,undefined);
 lib.update(1);assert.equal(dom.get('pkmsvv-arena-solo-countdown').textContent,'1');
 lib.update(1);assert.equal(lib.stage,'fight');
 assert.ok(G.EnemyMgr.last);assert.match(dom.get('pkmsvv-arena-solo-countdown').textContent,/BẮT ĐẦU/);
 lib.update(.7);assert.equal(dom.get('pkmsvv-arena-solo-countdown').hidden,true);
});
test('Leaving Solo and switching to Berry or Champion cancels old Solo arena tick',()=>{
 const {G,lib}=setup();
 lib.start(()=>0);assert.equal(lib.active,true);
 G.Game.toUI();assert.equal(lib.active,false);
 lib.update(900);assert.equal(lib.stage,'idle');
 lib.start(()=>0);G.Game.startRun({mode:'berry'});
 assert.equal(lib.active,false);assert.equal(G.World.arena,null);
 lib.start(()=>0);G.Flow.goMenu();assert.equal(lib.active,false);
});

test('Random AI mirrors 90–120% player HP, attack and speed and is actually spawned',()=>{
 const {lib,G}=setup();
 for(const factor of [.9,1,1.2]){
  lib.start(()=>factor===.9?0:factor===1?1/3:1);
  lib.update(900);lib.update(20);lib.update(10);lib.update(3);
  const enemy=G.EnemyMgr.last;
  assert.ok(enemy.maxHp>=288&&enemy.maxHp<=384,'AI HP within 90–120% of 320');
  lib.abort();
 }
 const stats=lib.balanceAi({maxHp:400,baseSpd:110,baseAtk:1.3},1.2);
 assert.equal(stats.hp,480);assert.equal(stats.spd,132);assert.equal(stats.dmg,13.2);
 const src=read('src/pkmsvv-arena-solo.js');
 assert.match(src,/pkmsvv-arena-solo-invite/);assert.match(src,/PKMSVVCoop.open\('arena'\)/);
});
