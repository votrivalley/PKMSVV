'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const read=p=>fs.readFileSync(require.resolve(p),'utf8');
function fixture(){
 const ids=[298,433,406,240,236,446,385],s={pkmsvvSupportBond:{}},G={DB:{save:s},Game:{st:{time:10}},DEX_BY:{},SPRITE_META:{},U:{dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2},EnemyMgr:{all:()=>[]}};
 for(const id of ids){G.DEX_BY[id]={dex:id};G.SPRITE_META[id]={a:{Idle:{},Walk:{}}};}
 vm.runInNewContext(read('../src/v15/eggs.js'),{G,console});return {G,s,api:G.PKMSVVEggs};
}
test('Jirachi and Mew both 4%, equal affinity and cadence; seven additions require native assets',()=>{
 const {api,s,G}=fixture();
 assert.equal(api.SPECIES.length,17);assert.equal(api.ordinarySpecies().length,14);
 assert.equal(api.rollSpecies(.12).dex,385);assert.equal(api.rollSpecies(.15999).dex,385);
 assert.equal(api.speciesChanceFor(151),.04);assert.equal(api.speciesChanceFor(385),.04);assert.equal(api.affinityGoal(385),25);
 s.pkmsvvSupportBond={151:25,385:25};assert.equal(api.speciesChanceFor(385),.08);
 for(const shiny of [false,true])assert.equal(api.castCooldown({dex:385,shiny}),api.castCooldown({dex:151,shiny}));
 delete G.SPRITE_META[385];assert.equal(api.speciesChanceFor(385),0);
});
test('Jirachi rotates one temporary buff without stacking or changing save',()=>{
 const {G,s,api}=fixture(),p={x:0,y:0,atkFor:()=>100},it={dex:385,statScale:1,shiny:false};
 const before=JSON.stringify(s);let sent;
 for(const [roll,channel] of [[0,'physical'],[.26,'special'],[.51,'speed'],[.76,'guard']]){
  assert.equal(api.extraCast(it,p,(...x)=>sent=x,10,()=>roll),true);assert.equal(sent[0],channel);assert.equal(sent[2],11);
  assert.equal(api.timedValue(p,channel),.18);assert.equal(['physical','special','speed','guard'].filter(c=>api.timedValue(p,c)>0).length,1);
  if(channel==='physical')assert.ok(Math.abs(p.atkFor({cat:'physical'})-118)<1e-8);
 }
 G.Game.st.time=11;assert.equal(api.guardBonus(p),0);assert.equal(api.speedFactor(p),1);assert.equal(JSON.stringify(s),before);
 assert.equal(api.applyTimed(p,385,'guard',.9,12),false);
});
test('six new roles call real statuses, exclude boss knockback, and retain voluntary Rest',()=>{
 const {api,G}=fixture(),p={x:0,y:0,slowT:2,restT:4},e={x:10,y:0,kx:0,ky:0,poison:0,burn:0,applyPoison(n){this.poison+=n},applyBurn(n){this.burn+=n}},boss={...e,boss:true};
 G.EnemyMgr.all=()=>[e,boss];const pet=dex=>({dex,statScale:1,shiny:false});
 assert.equal(api.extraCast(pet(433),p),true);assert.equal(p.slowT,0);assert.equal(p.restT,4);
 assert.equal(api.extraCast(pet(298),p),true);assert.equal(api.speedFactor(p),1.15);
 assert.equal(api.extraCast(pet(446),p),true);assert.equal(api.guardBonus(p),.15);
 api.extraCast(pet(406),p);api.extraCast(pet(240),p);api.extraCast(pet(236),p);
 assert.equal(e.poison,1);assert.equal(e.burn,1);assert.equal(e.kx,140);assert.equal(boss.kx,0);
});
test('sealed Jirachi reveal is 20 or 40 Shiny points, no Dex labels',()=>{
 const {G}=fixture(),members=Array.from({length:4},(_,i)=>({uid:'p'+i,name:'P'+i,dex:25})),players=members.map(m=>({...m,x:9999,y:9999,hp:100,maxHp:100,level:1,kills:0})),events=[],out=[];
 Object.assign(G,{I18n:{lang:'vi'},Social:{uid:'p0'},Game:{player:players[0]},Coop:{isHost:true,broadcast:e=>events.push(e)},World:{isFree:()=>true,isLiquid:()=>false},Sprites:{Animator:class{},preload(){}},Spawner:{say(){}}});
 const rng=Object.create(Math),rolls=[.13,.01];rng.random=()=>rolls.shift();
 vm.runInNewContext(read('../src/web/pkmsvv-egg-rush.js'),{G,Math:rng});
 G.EggRush.begin({mode:'eggrush',seed:2,members});
 G.EggRush.onEvent(['er','spawn',99,0,0]);players[0].x=0;players[0].y=0;
 G.EggRush.update(.01,1,players,r=>out.push(r));assert.equal(events.find(x=>x[1]==='take')[4],0);
 players[0].x=9999;players[0].y=9999;G.EggRush.update(.01,720,players,r=>out.push(r));
 assert.equal(out[0].standings[0].hatched[0].dex,385);assert.equal(out[0].standings[0].points,40);
 const html=G.EggRush.html(out[0]);assert.match(html,/pkmsvv-egg-hatched-label">✨ \+40 điểm<\/small>/);assert.doesNotMatch(html,/pkmsvv-egg-hatched-label">[^<]*Pokémon #/);
});
