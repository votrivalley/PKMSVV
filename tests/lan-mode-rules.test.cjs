'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(mode='eggrush'){
 const players=[0,1,2,3].map(i=>({uid:'p'+i,x:i*100,y:0,hp:100,maxHp:100,dead:false,level:1,kills:0,
  lanBot:i>0,revive(frac){this.dead=false;this.hp=this.maxHp*frac;}}));
 const events=[];
 const G={I18n:{lang:'vi'},Game:{player:players[0]},Social:{uid:'p0'},
  Coop:{isHost:true,players:()=>players,broadcast:e=>events.push(e)},
  Sprites:{preload(){},Animator:class{update(){}draw(){}}},
  World:{isFree:()=>true,isLiquid:()=>false},Camera:{w:800,h:600,sees:()=>false},
  U:{dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2},Spawner:{say(){}},FX:{ring(){}},
  EnemyMgr:{all:()=>[]},Moves:{BY_ID:{}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/web/pkmsvv-egg-rush.js'),'utf8'),{G,Map,Math,Number,Object});
 G.EggRush.begin({mode,seed:123,members:players.map(p=>({...p,name:p.uid,dex:25}))});
 return{G,players,events,step:(dt,t)=>G.EggRush.update(dt,t,players,()=>{throw Error('unexpected finish');})};
}
test('Egg Rush continues spawning after two eggs; each minute adds exactly one shared nest',()=>{
 const h=setup();h.step(.01,59.99);assert.equal(h.G.EggRush.nests.length,0);
 for(let minute=1;minute<=10;minute++){
  h.step(.01,minute*60);assert.equal(h.G.EggRush.nests.length,minute);
  h.step(.01,minute*60+.1);assert.equal(h.G.EggRush.nests.length,minute);
 }
 assert.equal(h.events.filter(e=>e[1]==='spawn').length,10);
 assert.ok(h.G.EggRush.objective(h.players[0]),'a shared objective is available for guide arrows');
});
test('Egg Rush revives host and AI at 8 seconds for unlimited deaths',()=>{
 const h=setup();
 for(let death=0;death<6;death++){
  for(const p of h.players){p.dead=true;p.hp=0;}
  h.step(7.9,10);assert.equal(h.players.every(p=>p.dead),true);
  h.step(.11,10);assert.equal(h.players.every(p=>!p.dead),true);
  for(const p of h.players)assert.equal(p.hp,50);
 }
});
test('Survival eggs hatch and grant a maximum of two supports independently for every trainer',()=>{
 const h=setup('royale');assert.equal(h.G.EggRush.active,false);assert.equal(h.G.EggRush.enabled,true);
 for(let minute=1;minute<=3;minute++){
  h.step(.01,minute*60);const n=h.G.EggRush.nests.at(-1);
  const p=h.players[0];p.x=n.x;p.y=n.y;h.step(.01,minute*60+.1);
 }
 assert.equal(h.G.EggRush.pets.filter(p=>p.uid==='p0').length,2);
 assert.equal(h.G.EggRush.nests.at(-1).taken,false,'third egg not claimed by trainer at cap');
 const n=h.G.EggRush.nests.at(-1),p=h.players[1];p.x=n.x;p.y=n.y;h.step(.01,181);
 assert.equal(h.G.EggRush.pets.filter(p=>p.uid==='p1').length,1);
 h.step(46,182);assert.equal(h.G.EggRush.pets.every(p=>p.hatch),true);
 assert.equal(h.G.EggRush.objective(h.players[0]),null,'AI at support cap returns to independent survival');
 for(const p of h.players){p.dead=true;p.hp=0;}
 h.step(10,190);assert.equal(h.players.every(p=>p.dead),true,'Survival never inherits Egg Rush respawns');
});
