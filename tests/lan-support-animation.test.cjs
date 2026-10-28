'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

const source=fs.readFileSync(require.resolve('../src/web/pkmsvv-egg-rush.js'),'utf8');
function harness(mode='coop'){
 const events=[],players=[
  {uid:'p0',name:'Human',dex:25,x:100,y:0,hp:100,maxHp:100,spd:150,dead:false,level:1,kills:0},
  {uid:'p1',name:'Mate',dex:133,x:-120,y:0,hp:100,maxHp:100,spd:130,dead:false,level:1,kills:0}
 ];
 class Animator{
  constructor(dex,scale,shiny){this.dex=dex;this.scale=scale;this.shiny=shiny;this.cur='Idle';this.dir=0;this.frames=0;this.history=[];}
  loop(anim,speed=1){this.cur=anim;this.speed=speed;this.history.push({anim,speed,dir:this.dir});}
  update(dt){this.frames+=60*dt*(this.speed||1);}
  draw(){}
 }
 const G={
  Game:{player:players[0],st:{time:0}},I18n:{lang:'vi'},Social:{uid:'p0'},
  Coop:{isHost:true,players:()=>players,broadcast:e=>events.push(e)},
  Sprites:{preload(){},Animator,playerScale:()=>.9,dirFromAngle:a=>Math.round(a*100)},
  Camera:{w:768,h:420,sees:()=>false},
  World:{isFree:()=>true,isLiquid:()=>false},
  Spawner:{say(){}},EnemyMgr:{all:()=>[]},FX:{ring(){}},
  Moves:{BY_ID:{}},U:{dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2}
 };
 vm.runInNewContext(source,{G,Math,Map,Set,Number,Object});
 G.EggRush.begin({mode,seed:9,members:players});
 const hatch=(id,uid,dex=172,where={x:120,y:0})=>{
  G.EggRush.onEvent(['er','spawn',id,where.x,where.y]);
  G.EggRush.onEvent(['er','take',id,uid,dex,1,5,70]);
  G.EggRush.onEvent(['er','hatch',id]);
  return G.EggRush.pets.find(p=>p.id===id);
 };
 const step=(dt,t)=>{G.Game.st.time=t;G.EggRush.update(dt,t,players,()=>{});};
 return {G,players,events,hatch,step};
}

for(const mode of ['coop','royale','eggrush']){
 test('v1.5.32 '+mode+' support uses real directional Walk/Idle animation at measured velocity',()=>{
  const h=harness(mode),pet=h.hatch(7,'p0');
  assert.ok(pet&&pet.anim);
  assert.equal(pet.anim.scale,.6*.9,'60% of normal adjusted Pokémon sprite scale');
  let previous={x:pet.x,y:pet.y};
  h.step(1/60,6);
  assert.equal(pet.anim.cur,'Walk');
  assert.equal(pet.moving,true);
  assert.ok(pet.anim.history.at(-1).speed>.6,'animation playback scales with movement speed');
  assert.ok(Math.hypot(pet.x-previous.x,pet.y-previous.y)<=150*.85/60+.001,
   'distance is bounded by 85% of owner walking speed per frame');
  assert.ok(pet.anim.frames>0,'not a static image sliding over the map');
  for(let i=0;i<55;i++){
   h.players[0].x+=3;h.players[0].y+=1;
   previous={x:pet.x,y:pet.y};
   h.step(1/60,6+(i+1)/60);
   assert.ok(Math.hypot(pet.x-previous.x,pet.y-previous.y)<=150*.85/60+.001,
    'support cannot glide faster than normal walk');
  }
  assert.ok(pet.anim.history.some(s=>s.anim==='Walk'&&s.dir!==0),'animated sprite faces an actual direction');
  const walkFrames=pet.anim.frames;
  for(let i=0;i<180;i++)h.step(1/60,7+i/60);
  assert.equal(pet.anim.cur,'Idle','stationary support stops walking');
  assert.equal(pet.moving,false);
  assert.ok(pet.anim.frames>walkFrames,'Animator advances frames through the full lifecycle');
 });

 test('v1.5.32 '+mode+' Rift warp reanchors followers without running across an old map',()=>{
  const h=harness(mode),pet=h.hatch(9,'p0');
  h.step(1/60,6);
  h.players[0].x=9000;h.players[0].y=-5000;
  h.step(1/60,6.1);
  assert.ok(Math.hypot(pet.x-h.players[0].x,pet.y-h.players[0].y)<100,
   'followers must reanchor near owner after a real world teleport');
  assert.equal(pet.anim.cur,'Idle','a teleport must not be rendered as a Walk sprint');
  const before=pet.anim.frames;
  h.step(1/60,6.2);
  assert.ok(pet.anim.frames>before,'animation continues normally after reanchor');
 });
}

test('v1.5.32 support does not Walk when a collision blocks real movement',()=>{
 const h=harness('coop'),pet=h.hatch(11,'p0');
 h.G.World.isFree=()=>false;
 const prev={x:pet.x,y:pet.y};
 for(let i=0;i<15;i++)h.step(1/60,6+i/60);
 assert.equal(pet.x,prev.x);assert.equal(pet.y,prev.y);
 assert.equal(pet.anim.cur,'Idle','blocked follower cannot play running feet in place');
});

test('v1.5.32 every support follows its own trainer, not the local human',()=>{
 const h=harness('coop'),pet=h.hatch(12,'p1',447,{x:-100,y:0});
 h.players[0].x=20000;h.players[0].y=20000;
 h.step(1/60,6);
 assert.ok(Math.hypot(pet.x-h.players[1].x,pet.y-h.players[1].y)<150);
 assert.equal(pet.anim.scale,.54);
});
