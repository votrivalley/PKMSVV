'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function harness(mode='royale',count=10,host=true){
 const events=[],players=Array.from({length:count},(_,i)=>({uid:'p'+i,name:'Trainer '+i,dex:25,
  x:Math.cos(i*Math.PI*2/count)*1000,y:Math.sin(i*Math.PI*2/count)*1000,r:14,hp:100,maxHp:100,dead:false}));
 const G={Game:{player:players[0],st:{time:0}},Social:{uid:'p0'},Coop:{isHost:host,players:()=>players,broadcast:e=>events.push(e)},
  World:{isFree:()=>true,isLiquid:()=>false},Rift:{inArena:false},Judgment:{active:false},
  Camera:{w:768,h:420,x:players[0].x,y:players[0].y,sees:()=>false,scale:1},
  U:{dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2},Sprites:{preload(){},Animator:class{update(){}}},
  Spawner:{say(){}},I18n:{lang:'vi'},EnemyMgr:{all:()=>[]},FX:{ring(){}}};
 const context=vm.createContext({G,console});
 for(const name of ['pkmsvv-arena','pkmsvv-egg-rush'])vm.runInContext(fs.readFileSync(require.resolve('../src/web/'+name+'.js'),'utf8'),context);
 const cfg={mode,seed:72,members:players};G.Arena.begin(cfg);G.EggRush.begin(cfg);
 const step=(dt,t)=>{G.Game.st.time=t;G.Arena.update(dt,t,players);G.EggRush.update(dt,t,players,()=>{});};
 return {G,players,events,step};
}
test('Royale radii interpolate, Egg Rush stays fixed, Co-op remains unbounded',()=>{
 const {G}=harness();for(const [t,r] of [[0,1650],[240,1650],[360,1425],[480,1200],[600,1050],[720,900],[1000,900]])assert.equal(G.Arena.radiusAt('royale',t),r);
 assert.equal(G.Arena.radiusAt('eggrush',1000),1600);assert.equal(G.Arena.radiusAt('coop',1000),Infinity);
});
test('only Host charges zone damage after grace, reentry resets, arenas suspend penalties',()=>{
 const {G,players,step}=harness(),p=players[0];p.x=1800;p.y=0;
 step(10,10);assert.equal(p.hp,100);step(1,11);assert.equal(p.hp,99);
 p.x=0;step(1,12);p.x=1800;step(10,22);assert.equal(p.hp,99);
 G.Rift.inArena=true;step(30,52);assert.equal(p.hp,99);G.Rift.inArena=false;
 G.Coop.isHost=false;step(30,82);assert.equal(p.hp,99);
});
test('zone damage rejects replay and other match epochs; guest cannot overwrite Host zone',()=>{
 const host=harness(),client=harness('royale',10,false),p=host.players[0];p.x=1800;p.y=0;host.step(11,11);
 const e=host.events.find(e=>e[0]==='az');client.G.Arena.onEvent(e);assert.equal(client.players[0].hp,99);
 client.G.Arena.onEvent(e);assert.equal(client.players[0].hp,99);
 client.G.Arena.onEvent(['az',999,'p0',0,true,999]);assert.equal(client.players[0].hp,99);
 host.G.Arena.receive({mode:'royale',epoch:72,time:999,disabled:true});assert.equal(host.G.Arena.radius,1650);
});
test('reconnect snapshot catches up missed zone ticks exactly once',()=>{
 const host=harness(),client=harness('royale',10,false);host.players[0].x=1800;host.players[0].y=0;host.step(25,25);
 client.G.Arena.receive(host.G.Arena.snapshot());assert.equal(client.players[0].hp,85);
 client.G.Arena.receive(host.G.Arena.snapshot());assert.equal(client.players[0].hp,85);
 client.G.Arena.onEvent(host.events.find(e=>e[0]==='az'));assert.equal(client.players[0].hp,85);
});
test('Egg Rush blocks outward steps/dashes but permits inward movement with no damage',()=>{
 const {G,players,step}=harness('eggrush',4),p=players[0];p.x=1700;p.y=0;G.Arena.motion(p,{x:1580,y:0});
 assert.ok(p.x<=1600-p.r);p.x=1650;G.Arena.motion(p,{x:1700,y:0});assert.equal(p.x,1650);
 step(100,700);assert.equal(p.hp,100);assert.equal(G.Arena.radius,1600);
});
for(const count of [2,4,10])test('Royale support schedule/caps/TTL and camera safety for '+count+' trainers',()=>{
 const h=harness('royale',count);h.step(.01,29.9);assert.equal(h.G.EggRush.nests.length,0);h.step(.1,30);
 assert.equal(h.G.EggRush.nests.length,Math.min(5,count*2));
 for(const n of h.G.EggRush.nests){assert.ok(h.G.Arena.validSpawn(n.x,n.y));assert.equal(h.G.Arena.visible(n.x,n.y,h.players,80),false);assert.equal(n.expiresAt,210);}
 h.step(.1,75);assert.ok(h.G.EggRush.nests.length<=6);
 const expired=h.G.EggRush.nests.filter(n=>n.expiresAt===210).map(n=>n.id);h.step(.1,211);
 assert.ok(expired.every(id=>!h.G.EggRush.nests.some(n=>n.id===id)));assert.ok(h.events.some(e=>e[1]==='despawn'));
});
test('Host claims once, caps pets at two, never reuses expired IDs and stops when everyone is full',()=>{
 const h=harness('royale',2);h.step(.1,30);let t=30;
 for(const p of h.players)for(let i=0;i<2;i++){
  const n=h.G.EggRush.nests.find(n=>!n.taken);p.x=n.x;p.y=n.y;h.step(.01,++t);
  const take=h.events.filter(e=>e[1]==='take').at(-1),before=h.G.EggRush.pets.length;h.G.EggRush.onEvent(take);assert.equal(h.G.EggRush.pets.length,before);
 }
 assert.equal(h.G.EggRush.pets.length,4);h.step(.1,75);assert.equal(h.G.EggRush.nests.length,0);h.step(.1,120);assert.equal(h.G.EggRush.nests.length,0);
});
test('no legal point under overlapping cameras is deferred rather than forced onscreen',()=>{
 const h=harness('royale',10);h.G.Arena.visible=()=>true;h.step(.1,30);
 assert.equal(h.G.EggRush.nests.length,0);assert.ok(h.G.EggRush.metrics.placementAttempts<=5*192);
 assert.equal(h.G.EggRush.metrics.placementFailures,5);
});
test('opening boost is Royale-only, monotone and continuous at 180 seconds',()=>{
 const {G}=harness();let prev=3;
 for(const t of [0,30,60,120,180,181]){const k=G.Arena.openingBoost(t);assert.ok(k<=prev&&k>=1);prev=k;}
 assert.equal(G.Arena.openingBoost(0),2.3);assert.equal(G.Arena.openingBoost(180),1);
 G.Arena.begin({mode:'coop'});assert.equal(G.Arena.openingBoost(0),1);
});
test('four-corner Egg Rush cameras still get legal scoring eggs at the unchanged minute cadence',()=>{
 const h=harness('eggrush',4),corners=[[-1000,-1000],[1000,-1000],[-1000,1000],[1000,1000]];
 h.players.forEach((p,i)=>{[p.x,p.y]=corners[i];});h.G.Camera.x=-1000;h.G.Camera.y=-1000;
 h.step(.1,59.9);assert.equal(h.G.EggRush.nests.length,0);h.step(.1,60);assert.equal(h.G.EggRush.nests.length,1);
 const n=h.G.EggRush.nests[0];assert.ok(h.G.Arena.validSpawn(n.x,n.y));assert.equal(h.G.Arena.visible(n.x,n.y,h.players,80),false);
 h.step(.1,120);assert.equal(h.G.EggRush.nests.length,2);assert.equal(h.G.Arena.radius,1600);
});

test('v1.5.30 displays a world-space red circle and short shrinking hint without changing zone damage',()=>{
 const {G,players,step}=harness('royale',10);const p=players[0],seen=[],arcs=[],ctx={
  save(){},restore(){},beginPath(){},stroke(){},fill(){},fillRect(){},translate(){},rotate(){},
  moveTo(){},lineTo(){},closePath(){},strokeText(s){seen.push(s);},fillText(s){seen.push(s);},
  arc(...v){arcs.push({r:v[2],stroke:this.strokeStyle});}
 };
 G.Camera.left=()=>p.x-422;G.Camera.top=()=>p.y-195;
 G.Arena.draw(ctx,844,390);
 assert.ok(seen.some(s=>s.includes('Vòng đỏ thu sau 4:00')),'visible rule before reaching edge');
 assert.ok(arcs.some(a=>a.stroke.includes('255,77,85')),'red ring uses shared world-space radius');
 p.x=1800;p.y=0;G.Arena.draw(ctx,844,390);
 assert.ok(seen.some(s=>s.includes('Ngoài vòng đỏ')));
 step(11,11);assert.equal(p.hp,99,'visual changes must not alter authoritative damage');
});

test('Issue #8: Royale ends immediately below 6s and displays all 10 Pokémon ranking icons',()=>{
 const {G,players}=harness('royale',10),r=[];
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/web/pkmsvv-royale.js'),'utf8'),{G,Math,Map,Number,Object,Set});
 G.Royale.begin({mode:'royale',members:players});
 assert.equal(G.Royale.check(players.slice(0,2),1,x=>r.push(x)),false,'wait for full roster');
 players.forEach((p,i)=>p.dead=i!==0);
 assert.equal(G.Royale.check(players,1,x=>r.push(x)),true,'winner at second one');
 assert.equal(r.length,1);assert.equal(r[0].winner,'p0');assert.equal(r[0].standings.length,10);
 assert.equal(new Set(r[0].standings.map(p=>p.uid)).size,10);
 assert.equal(r[0].standings[0].uid,'p0');
 assert.equal(G.Royale.check(players,2,x=>r.push(x)),false);
 assert.equal(r.length,1);
 const html=G.Royale.html(r[0]);
 assert.equal((html.match(/class="pkmsvv-result-mon"/g)||[]).length,10);
 assert.equal((html.match(/data-pkmsvv-result-dex="25"/g)||[]).length,10);
 assert.match(html,/pkmsvv-results-list/);
});
test('Issue #8: simultaneous knockouts return a deterministic full draw without a missing rank',()=>{
 const {G,players}=harness('royale',4),r=[];
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/web/pkmsvv-royale.js'),'utf8'),{G,Math,Map,Number,Object,Set});
 G.Royale.begin({mode:'royale',members:players});
 players.forEach(p=>p.dead=true);
 G.Royale.check(players,3,x=>r.push(x));
 assert.equal(r.length,1);assert.equal(r[0].winner,null);
 assert.equal(r[0].standings.length,4);
 assert.equal(new Set(r[0].standings.map(p=>p.uid)).size,4);
 assert.match(G.Royale.html(r[0]),/Hòa · Không còn ai sống/);
});
