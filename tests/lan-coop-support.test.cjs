const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('Co-op humans and each AI collect and hatch independent support pairs, with no trainer exceeding two',()=>{
 const players=[0,1,2,3].map(i=>({uid:'p'+i,x:0,y:0,hp:100,maxHp:100,dead:false,level:1,kills:0,lanBot:i>0}));
 const G={I18n:{lang:'vi'},Game:{player:players[0]},Social:{uid:'p0'},
  Coop:{isHost:true,players:()=>players,broadcast(){}},Sprites:{preload(){},Animator:class{update(){}draw(){}}},
  World:{isFree:()=>true,isLiquid:()=>false},Camera:{w:800,h:600,sees:()=>true},
  U:{dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2},Spawner:{say(){}},FX:{ring(){}},EnemyMgr:{all:()=>[]},Moves:{BY_ID:{}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/web/pkmsvv-egg-rush.js'),'utf8'),{G,Map,Math,Number,Object});
 G.EggRush.begin({mode:'coop',seed:123,members:players.map(p=>({...p,name:p.uid,dex:25}))});
 assert.equal(G.EggRush.enabled,true);assert.equal(G.EggRush.active,false,'Co-op must not become competitive Egg Rush');
 for(let i=0;i<8;i++){
  for(const p of players){p.x=0;p.y=0;}
  G.EggRush.update(.01,(i+1)*60,players,()=>{throw Error('Co-op must not use Egg Rush end condition');});
  const nest=G.EggRush.nests.at(-1),owner=players[i%4];
  assert.ok(Math.hypot(nest.x,nest.y)<400,'support nests stay near the cooperative group');
  owner.x=nest.x;owner.y=nest.y;
  G.EggRush.update(.01,(i+1)*60+.1,players,()=>{});
 }
 for(const owner of players)assert.equal(G.EggRush.pets.filter(p=>p.uid===owner.uid).length,2);
 G.EggRush.update(46,481,players,()=>{});
 assert.equal(G.EggRush.pets.every(p=>p.hatch),true);
 for(const owner of players)assert.equal(G.EggRush.objective(owner),null,'a full team member does not steal additional eggs');
});
