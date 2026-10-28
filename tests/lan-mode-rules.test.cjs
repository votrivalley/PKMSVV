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
test('Survival receives one nest every 30s, keeps two own supports and no respawn',()=>{
 const h=setup('royale');
 assert.equal(h.G.EggRush.active,false);assert.equal(h.G.EggRush.enabled,true);
 for(let slot=1;slot<=3;slot++){
  const t=slot*30;h.step(.01,t);
  assert.equal(h.G.EggRush.nests.filter(n=>!n.taken).length,1);
  const n=h.G.EggRush.nests.find(n=>!n.taken),p=h.players[0];
  if(slot<3){p.x=n.x;p.y=n.y;h.step(.01,t+.1);}
  else{
   assert.equal(h.G.EggRush.pets.filter(q=>q.uid==='p0').length,2);
   p.x=n.x;p.y=n.y;h.step(.01,t+.1);
   assert.equal(n.taken,false,'trainer already owns two supports');
   const guest=h.players[1];guest.x=n.x;guest.y=n.y;h.step(.01,t+.2);
  }
 }
 assert.equal(h.G.EggRush.pets.filter(p=>p.uid==='p0').length,2);
 assert.equal(h.G.EggRush.pets.filter(p=>p.uid==='p1').length,1);
 h.step(46,140);assert.equal(h.G.EggRush.pets.every(p=>p.hatch),true);
 assert.equal(h.G.EggRush.objective(h.players[0]),null);
 for(const p of h.players){p.dead=true;p.hp=0;}
 h.step(10,150);assert.equal(h.players.every(p=>p.dead),true);
});
test('Co-op and Royale support mini HP bars reflect actual Host damage and synchronized down',()=>{
 for(const mode of ['coop','royale']){
  const h=setup(mode),t=mode==='coop'?60:30;h.step(.01,t);
  const n=h.G.EggRush.nests.find(n=>!n.taken),player=h.players[0];
  assert.ok(n,mode+' should create an eligible support nest');
  player.x=n.x;player.y=n.y;h.step(.01,t+.1);
  const pet=h.G.EggRush.pets[0];
  assert.ok(pet.maxHp>=50&&pet.maxHp<=80,'real support health 50–80% of trainer');
  h.G.EggRush.onEvent(['er','hatch',pet.id]);
  const damage={get x(){return pet.x},get y(){return pet.y},r:12,dmg:60,dead:false,remote:false};
  h.G.EnemyMgr.all=()=>[damage];
  h.G.EggRush.update(.1,t+1,h.players,()=>{});
  assert.ok(pet.hp<pet.maxHp,'Host applied enemy damage, not cosmetic');
  const hit=h.events.find(e=>e[1]==='hp');
  assert.ok(hit&&hit[2]===pet.id&&hit[3]===pet.hp,'Host broadcast actual support HP');
  const fills=[],ctx={save(){},restore(){},beginPath(){},ellipse(){},fill(){},stroke(){},
   fillRect(...v){fills.push(v);}};
  h.G.Camera.sees=()=>true;h.G.EggRush.draw(ctx);
  assert.ok(fills.some(v=>v[2]===28&&v[3]===3),'HP track visible');
  assert.ok(fills.some(v=>v[2]<28&&v[2]>0&&v[3]===3),'damaged HP fill visible');
  const remote=setup(mode);remote.G.Coop.isHost=false;
  for(const ev of h.events.filter(ev=>['spawn','take'].includes(ev[1])))remote.G.EggRush.onEvent(ev);
  remote.G.EggRush.onEvent(['er','hatch',pet.id]);
  remote.G.EggRush.onEvent(hit);
  assert.equal(remote.G.EggRush.pets[0].hp,pet.hp,'guest receives Host HP');
  remote.G.EggRush.onEvent(hit);
  assert.equal(remote.G.EggRush.pets[0].hp,pet.hp,'duplicated HP packet ignored');
  for(let j=0;j<12&&h.G.EggRush.pets.some(q=>q.id===pet.id);j++){
   pet.hurtCd=0;h.G.EggRush.update(.1,t+2+j,h.players,()=>{});
  }
  assert.equal(h.G.EggRush.pets.some(q=>q.id===pet.id),false,'fainted support releases slot');
  const down=h.events.find(e=>e[1]==='down'&&e[2]===pet.id);assert.ok(down);
  remote.G.EggRush.onEvent(down);
  assert.equal(remote.G.EggRush.pets.some(q=>q.id===pet.id),false,'guest removes fallen support');
 }
});
test('Issue #8: tenth successfully claimed scoring egg ends once with four ranked Pokémon portraits',()=>{
 const {G,players}=setup('eggrush');
 const counts=[0,0,0,0],results=[];
 const owners=[0,1,2,3,0,1,2,3,0,1];
 for(let i=0;i<9;i++){
  const n=i+100,uid='p'+owners[i];
  G.EggRush.onEvent(['er','spawn',n,2000+i*40,1000]);
  G.EggRush.onEvent(['er','take',n,uid,175,++counts[owners[i]],i+1]);
 }
 G.EggRush.update(.01,11,players,r=>results.push(r));
 assert.equal(results.length,0);
 G.EggRush.onEvent(['er','spawn',109,2400,1000]);
 G.EggRush.onEvent(['er','take',109,'p1',175,++counts[1],12]);
 G.EggRush.update(.01,12,players,r=>results.push(r));
 assert.equal(results.length,1);
 assert.equal(results[0].collected,10);
 assert.equal(results[0].standings.length,4);
 assert.equal(new Set(results[0].standings.map(p=>p.uid)).size,4);
 const html=G.EggRush.html(results[0]);
 assert.equal((html.match(/class="pkmsvv-result-mon"/g)||[]).length,4);
 assert.equal((html.match(/data-pkmsvv-result-dex="25"/g)||[]).length,4);
 assert.match(html,/pkmsvv-results-list/);
 G.EggRush.update(.2,13,players,r=>results.push(r));
 G.EggRush.onEvent(['er','spawn',110,2440,1000]);
 G.EggRush.onEvent(['er','take',110,'p0',175,4,14]);
 assert.equal(results.length,1);
 assert.equal(G.EggRush.collected,10,'cannot score another egg after final result');
});
test('Issue #8: six eggs for a single trainer wins early; deadline remains fallback',()=>{
 const h=setup('eggrush'),finished=[];
 for(let i=0;i<6;i++){
  h.G.EggRush.onEvent(['er','spawn',200+i,i*90,1000]);
  h.G.EggRush.onEvent(['er','take',200+i,'p2',175,i+1,i+1]);
 }
 h.G.EggRush.update(.01,6,h.players,r=>finished.push(r));
 assert.equal(finished.length,1);assert.equal(finished[0].winner,'p2');
 assert.equal(finished[0].collected,6);
 const deadline=setup('eggrush'),out=[];
 deadline.G.EggRush.update(.01,720,deadline.players,r=>out.push(r));
 assert.equal(out.length,1);assert.equal(out[0].collected,0);
});

test('Issue #8: simultaneous last-egg claims in one Host frame cannot score 11',()=>{
 const h=setup('eggrush'),G=h.G,players=h.players,finished=[];
 const owners=[0,1,2,3,0,1,2,3,0],counts=[0,0,0,0];
 for(let i=0;i<9;i++){
  G.EggRush.onEvent(['er','spawn',400+i,1000+i*40,1000]);
  G.EggRush.onEvent(['er','take',400+i,'p'+owners[i],175,++counts[owners[i]],i+1]);
 }
 const a=500,b=501;
 G.EggRush.onEvent(['er','spawn',a,120,200]);
 G.EggRush.onEvent(['er','spawn',b,-120,-200]);
 players.forEach(p=>{p.x=10000;p.y=10000;});
 players[0].x=120;players[0].y=200;
 players[1].x=-120;players[1].y=-200;
 G.EggRush.update(.01,12,players,r=>finished.push(r));
 assert.equal(G.EggRush.collected,10,'never increment score to 11 on same-frame collisions');
 assert.equal(finished.length,1);
 assert.equal(h.events.filter(e=>e[1]==='take').length,1,
  'exactly one of the two final nests is claimed');
});

test('v1.5.32 Host heals remote human-owned support and broadcasts HP once',()=>{
 const h=setup('coop'),owner=h.players[1];
 for(const t of [60,120]){
  h.G.EggRush.update(.1,t,h.players,()=>{});
  const nest=h.G.EggRush.nests.find(n=>!n.taken);
  assert.ok(nest);owner.x=nest.x;owner.y=nest.y;
  h.G.EggRush.update(.1,t+.1,h.players,()=>{});
 }
 const myPets=h.G.EggRush.pets.filter(p=>p.uid==='p1');
 assert.equal(myPets.length,2);
 myPets[0].dex=173;myPets[1].hp=myPets[1].maxHp*.4;
 for(const pet of myPets)h.G.EggRush.onEvent(['er','hatch',pet.id]);
 const hp=myPets[1].hp,seq=myPets[1].hpSeq;
 h.G.EggRush.update(.1,140,h.players,()=>{});
 assert.ok(myPets[1].hp>hp,'Host healer restores second owned support');
 assert.ok(myPets[1].hpSeq>seq,'healing advances per-support HP sequence');
 assert.ok(h.events.some(e=>e[1]==='hp'&&e[2]===myPets[1].id&&e[3]===myPets[1].hp));
 myPets[0].cd=0;const before=myPets[1].hp;h.G.Coop.isHost=false;
 h.G.EggRush.update(.1,141,h.players,()=>{});
 assert.equal(myPets[1].hp,before,'non-Host cannot independently heal multiplayer supports');
});
