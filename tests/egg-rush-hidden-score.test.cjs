'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

test('v1.5.33 Host commits rare egg species secretly on pickup; four trainers only learn value at finale',()=>{
 const source=fs.readFileSync(require.resolve('../src/web/pkmsvv-egg-rush.js'),'utf8');
 const members=Array.from({length:4},(_,i)=>({uid:'p'+i,name:'Player '+i,dex:25+i}));
 const players=members.map(m=>({...m,x:9999,y:9999,hp:100,maxHp:100,dead:false,level:1,kills:0}));
 const messages=[],finished=[],draws=[.01,.08,.35,.40,.45,.55,.6,.7,.75,.8];
 const privateMath=Object.create(Math);
 let rngCalls=0;
 privateMath.random=()=>draws[rngCalls++];
 const G={
  I18n:{lang:'vi'},Social:{uid:'p0'},Game:{player:players[0]},
  Coop:{isHost:true,broadcast:e=>messages.push(e)},
  World:{isFree:()=>true,isLiquid:()=>false},U:{dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2},
  Sprites:{preload(){},Animator:class{update(){}draw(){}}},
  Spawner:{say(){}},EnemyMgr:{all:()=>[]},FX:{ring(){}},Moves:{BY_ID:{}}
 };
 vm.runInNewContext(source,{G,Math:privateMath,Map,Number,Object});
 G.EggRush.begin({mode:'eggrush',seed:14,members});
 // Two rare eggs beat four ordinary eggs, even though there are fewer.
 const owner=['p1','p1','p0','p0','p0','p0','p2','p2','p2','p2'],counts={};
 for(let i=0;i<10;i++){
  const id=9000+i,p=players.find(p=>p.uid===owner[i]);
  G.EggRush.onEvent(['er','spawn',id,i*170,600]);
  p.x=i*170;p.y=600;
  G.EggRush.update(.01,i+1,players,r=>finished.push(r));
  const take=messages.filter(e=>e[1]==='take').at(-1);
  assert.ok(take&&take[2]===id,'Host accepts the nearest real egg');
  assert.equal(take[4],0,'no Pokémon dex in live packet');
  assert.equal(G.EggRush.pets.at(-1).dex,0,'even Host's public egg object stays sealed');
  assert.ok(G.EggRush.pets.every(p=>!p.hatch&&!p.anim),'no companions, no combat before result');
  if(i<9)assert.equal(finished.length,0,'must not end with six or fewer eggs');
  counts[owner[i]]=(counts[owner[i]]||0)+1;
  p.x=9999;p.y=9999;
 }
 assert.equal(finished.length,1);
 assert.equal(rngCalls,10,'one private draw per claimed egg, never rerolled at result');
 const r=finished[0];assert.equal(r.winner,'p1');
 assert.equal(r.collected,10);assert.equal(r.standings.length,4);
 const p1=r.standings.find(x=>x.uid==='p1'),p0=r.standings.find(x=>x.uid==='p0');
 assert.equal(p1.eggs,2);assert.equal(p1.points,30);
 assert.deepEqual([...p1.hatched.map(x=>x.dex)],[151,132]);
 assert.deepEqual([...p1.hatched.map(x=>x.points)],[20,10]);
 assert.equal(p0.eggs,4);assert.equal(p0.points,20);
 assert.equal(r.standings[0].uid,'p1','points decide winner, not egg count');
 const out=G.EggRush.html(r);
 assert.match(out,/data-pkmsvv-winner-uid="p1"/);
 assert.match(out,/pkmsvv-egg-scoring-rules/);
 assert.equal((out.match(/class="pkmsvv-egg-reveal"/g)||[]).length,10);
 assert.equal((out.match(/class="pkmsvv-result-rank">\?/g)||[]).length,4,'rank hidden before reveal');
 G.EggRush.update(.2,20,players,x=>finished.push(x));
 assert.equal(finished.length,1,'exactly one final result event');
});
