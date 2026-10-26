'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../src/lan/lan-ai.js'),'utf8');
function harness(mode='coop',{water=()=>false,blocked=()=>false,types=['grass'],enemies=[],shots=[],hazards=[]}={}){
 const bot={uid:'ai-1234567890abcdef',dex:1,bot:true};
 const host={uid:'host',x:300,y:0,dead:false};
 const pl={uid:bot.uid,x:0,y:0,r:4,mon:{dex:1,types},dex:1,hp:100,maxHp:100,dead:false,
  spd:100,spdMul:1,moves:[],slots:[],level:1,xpMul:1,magnet:78,aim:0,moveAngle:0,
  addMove(id){const m={id,kind:'projectile',lvl:1};this.moves.push(m);this.slots.push([m]);},
  setAbility(){this.abil={};},activeMove(){return this.moves[0];},
  update(dt){if(this.dead)return;this.x+=this.lanBotAxis[0]*this.spd*dt;this.y+=this.lanBotAxis[1]*this.spd*dt;},
  revive(){this.dead=false;this.hp=50;}};
 const ack=[],casts=[],applied=[];
 let cards=[{type:'new',key:'new:water',apply(p){applied.push('water');p.addMove('water');}},
  {type:'new',key:'new:grass',apply(p){applied.push('grass');p.addMove('grass');}}];
 const G={Social:{room:{mode,isHost:true,members:[host,bot]}},
  Coop:{isHost:true,local:host,mate:()=>({pl}),players:()=>[host,pl],botPicked:(...v)=>ack.push(v)},
  Mons:{abilityOf:()=>({id:'overgrow'})},baseStartOf:()=> 'tackle',
  Moves:{BY_ID:{water:{type:'water',cat:'special',kind:'projectile'},grass:{type:'grass',cat:'physical',kind:'projectile'}}},
  Stats:{fit:(_mon,cat)=>cat==='physical'?1:.7},LevelUp:{offer:()=>cards},
  PKMSVVWaterHoverDex:new Set(),World:{TS:24,isLiquid:water,isFree:(x,y,r)=>!blocked(x,y,r),
   liquidEffect:()=>types.includes('water')?{}:{slow:.6}},
  EnemyMgr:{all:()=>enemies},Projectiles:{all:()=>shots},Hazards:{all:hazards,inside:(h,x,y,r)=>Math.hypot(x-h.x,y-h.y)<h.r+r},
  Combat:{tick:(_dt,p)=>casts.push(p)},EggRush:{nests:[]},Player:{REVIVE_TIME:3}};
 const math=Object.create(Math);math.random=()=>0;
 vm.runInNewContext(code,{G,Map,Set,Math:math,Number,console});G.LanAI.begin();
 return{G,pl,host,ack,applied,casts,cards(v){cards=v;}};
}
test('AI ranks only offered legal cards using Pokemon type and physical/special fit',()=>{
 const h=harness();h.G.LanAI.levelUp(2,1);
 assert.deepEqual(h.applied,['grass']);assert.equal(h.pl.level,2);assert.equal(h.ack.length,1);
 h.G.LanAI.levelUp(2,1);assert.deepEqual(h.applied,['grass'],'no duplicate reward for the same level sequence');
});
test('Fallen AI chooses its legal reward and acknowledges the level barrier',()=>{
 const h=harness();h.pl.dead=true;h.pl.hp=0;h.G.LanAI.levelUp(2,1);
 assert.equal(h.ack[0][0],h.pl.uid);assert.equal(h.ack[0][1],1);assert.equal(h.pl.dead,true);
 h.G.LanAI.update(.12,0);assert.equal(h.casts.length,0,'dead AI cannot attack');
});
test('Low-health AI prefers a healing card over another offensive skill',()=>{
 const h=harness();h.pl.hp=15;
 h.cards([{type:'stat',key:'stat:heal',apply(p){p.hp+=45;}},{type:'up',key:'up:grass',apply(){throw Error('wrong choice');}}]);
 h.G.LanAI.levelUp(3,2);assert.equal(h.pl.hp,60);
});
test('AI routes around a pond rather than following a trainer through it',()=>{
 const water=(x,y)=>x>55&&x<200&&Math.abs(y)<65;
 const h=harness('coop',{water});let entered=false;
 for(let i=0;i<100;i++){h.G.LanAI.update(.12,i*.12);if(water(h.pl.x,h.pl.y))entered=true;}
 assert.equal(entered,false);assert.ok(h.pl.x>200,'bot reaches the other shore by going around');
});
test('AI already stuck in water can leave instead of treating the current tile as impassable',()=>{
 const water=(x,y)=>Math.abs(x)<65&&Math.abs(y)<65;
 const h=harness('coop',{water});for(let i=0;i<35;i++)h.G.LanAI.update(.12,i*.12);
 assert.equal(water(h.pl.x,h.pl.y),false);
});
test('Water Pokemon can take a safe water route while ground trainers avoid it',()=>{
 const water=(x,y)=>x>55&&x<200&&Math.abs(y)<65;
 const h=harness('coop',{water,types:['water']});let entered=false;
 for(let i=0;i<25;i++){h.G.LanAI.update(.12,i*.12);if(water(h.pl.x,h.pl.y))entered=true;}
 assert.equal(entered,true);
});
test('Route avoids a solid wall and does not cut its corners',()=>{
 const blocked=(x,y,r)=>x+r>55&&x-r<110&&Math.abs(y)<80+r;
 const h=harness('coop',{blocked});let collided=false;
 for(let i=0;i<100;i++){h.G.LanAI.update(.12,i*.12);if(blocked(h.pl.x,h.pl.y,h.pl.r))collided=true;}
 assert.equal(collided,false);assert.ok(h.pl.x>160);
});
test('AI moves away from a telegraphed hazard and incoming projectile',()=>{
 const h=harness('coop',{hazards:[{x:0,y:0,r:28,hit:false}],shots:[{x:45,y:0,vx:-100,vy:0,r:5,friendly:false}]});
 for(let i=0;i<5;i++)h.G.LanAI.update(.12,i*.12);
 assert.ok(Math.abs(h.pl.y)>h.pl.r+5+2||h.pl.x<0,'moves outside the projectile collision corridor');
 assert.ok(Math.hypot(h.pl.x,h.pl.y)>28+h.pl.r,'leaves the hazard area');
});
test('AI does not move, attack or revive outside host simulation, or after elimination in Royale',()=>{
 const h=harness('royale');h.pl.dead=true;h.host.x=h.pl.x;
 for(let i=0;i<40;i++)h.G.LanAI.update(.12,0);
 assert.equal(h.pl.dead,true);assert.equal(h.casts.length,0);
 h.G.Coop.isHost=false;assert.equal(h.G.LanAI.activeBots().length,0);
});
test('Co-op bot revives near a teammate after the normal three seconds',()=>{
 const h=harness();h.pl.dead=true;h.pl.hp=0;h.host.x=0;
 for(let i=0;i<26;i++)h.G.LanAI.update(.12,i*.12);
 assert.equal(h.pl.dead,false);assert.equal(h.pl.hp,50);
});
test('AI acknowledges a failed reward handler so a bot cannot deadlock the human player',()=>{
 const h=harness();h.cards([{type:'stat',key:'stat:hp',apply(){throw Error('bad reward');}}]);
 h.G.LanAI.levelUp(2,1);assert.deepEqual(h.ack,[[h.pl.uid,1]]);
});
test('Egg Rush AI targets an untaken nest instead of blindly following the trainer',()=>{
 const h=harness('eggrush');h.host.x=-300;h.G.EggRush.nests=[{x:180,y:0,taken:false}];
 for(let i=0;i<10;i++)h.G.LanAI.update(.12,0);
 assert.ok(h.pl.x>50);
});
test('Co-op AI chooses a nearby personal area and regroups without stacking onto the trainer',()=>{
 const h=harness('coop');h.host.x=0;
 for(let i=0;i<80;i++)h.G.LanAI.update(.12,i*.12);
 let distance=Math.hypot(h.pl.x-h.host.x,h.pl.y-h.host.y);
 assert.ok(distance>70&&distance<350,'keeps personal space while remaining near trainer');
 h.host.x=700;
 for(let i=0;i<110;i++)h.G.LanAI.update(.12,10+i*.12);
 distance=Math.hypot(h.pl.x-h.host.x,h.pl.y-h.host.y);
 assert.ok(distance>70&&distance<350,'returns to the group neighborhood, not the exact player position');
});
test('Co-op AI seeks its own support egg but prioritizes rescuing a fallen teammate',()=>{
 const h=harness('coop');h.host.x=-200;
 h.G.EggRush.objective=()=>({x:180,y:0});
 for(let i=0;i<10;i++)h.G.LanAI.update(.12,i*.12);
 assert.ok(h.pl.x>50,'forages for support independently of trainer direction');
 h.host.x=h.pl.x-100;h.host.y=h.pl.y;h.host.dead=true;
 const prior=h.pl.x;
 for(let i=0;i<8;i++)h.G.LanAI.update(.12,2+i*.12);
 assert.ok(h.pl.x<prior,'rescue overrides egg foraging');
});
