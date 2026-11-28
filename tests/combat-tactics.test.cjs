'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const src=fs.readFileSync(require.resolve('../src/pkmsvv-combat-tactics-qa.js'),'utf8');
function setup(){
 const G={Coop:{isHost:true},Social:{room:{mode:'coop'}},Game:{state:'playing'},World:{isFree:()=>true},PKMSVVCombatBalanceQA:{enabled:()=>true},I18n:{lang:'vi'}};
 vm.runInNewContext(src,{G});return {G,api:G.PKMSVVCombatTacticsQA};
}
const p=(uid,x,y=0,extra={})=>({uid,x,y,r:10,spd:100,hp:100,maxHp:100,lanBot:true,dead:false,...extra});
test('nearest one rescuer per fallen trainer, sticky role and no competitive activation',()=>{
 const {G,api}=setup(),a=p('a',10),b=p('b',100),c=p('c',250),down=p('host',0,0,{lanBot:false,dead:true});
 let map=api.assignRescuers([a,b,c,down],[a,b,c]);assert.equal(map.size,1);assert.equal(map.get(a),down);
 const old=new Map([['a',{rescue:down}]]);b.x=2;map=api.assignRescuers([a,b,c,down],[a,b,c],old);assert.equal(map.get(a),down);
 a.dead=true;map=api.assignRescuers([a,b,c,down],[a,b,c],old);assert.equal(map.get(b),down);assert.equal(map.get(c),a);
 for(const mode of ['eggrush','royale','arena'])assert.equal(api.alliedMode(mode),false);
 G.Coop.isHost=false;assert.equal(api.alliedMode('coop'),false);
});
test('real deadline geometry: leave circle, avoid beam, no expired hazard steering',()=>{
 const {api}=setup(),bot=p('a',0),zone={kind:'zone',x:0,y:0,r:45,t:0,delay:1,hit:false};
 const beam={kind:'beam',x:-80,y:0,angle:0,len:200,w:30,t:0,delay:1,hit:false};
 const axis=api.evade(bot,[1,0],{x:100,y:0},[zone,beam],()=>true,()=>0);
 assert.ok(axis);assert.ok(Math.abs(axis[1])>.7);assert.ok(api.margin(beam,axis[0]*70,axis[1]*70,20)>0);
 zone.hit=true;beam.hit=true;assert.equal(api.evade(bot,[1,0],{x:100,y:0},[zone,beam],()=>true,()=>0),null);
 const future={...zone,hit:false,delay:3};assert.equal(api.needsEvade(bot,[0,0],[future]),false);
});
test('direct dry route only, Berry assigned trees, ranged elite footwork without damage or speed changes',()=>{
 const {G,api}=setup(),bot=p('a',0),goal={x:100,y:0};
 assert.equal(api.directPath(bot,goal,()=>true,()=>0),true);
 assert.equal(api.directPath(bot,goal,()=>true,(_p,x)=>x>40&&x<60?25:0),false);
 assert.equal(api.directPath(bot,goal,()=>false,()=>0),false);
 G.PKMSVVBerryRescue={active:true,trees:[{id:0,x:-60,y:0,hp:20,maxHp:100},{id:1,x:60,y:0,hp:100,maxHp:100},{id:2,x:0,y:80,hp:90,maxHp:100}]};
 const e={id:4,x:0,y:0,r:10,spd:100,dmg:20,pkmsvvPressureElite:true},player={x:170,y:0};
 assert.equal(api.rangedFootwork(e,player,100,200,170)[0]<.001,true);assert.equal(Math.abs(api.rangedFootwork(e,player,100,200,170)[1]),32);assert.equal(e.dmg,20);
 const a=api.berryGoal(bot,[],0),b=api.berryGoal(bot,[],1);assert.notEqual(a.x,b.x);
});
test('status reads actual Rest and slow separately from measured FPS, not generic lag',()=>{
 const {G,api}=setup(),bot=p('a',0,0,{slowT:1.2,__pkmsvv3dsSupport:{rest:1.5}});
 G.PKMSVVHordePerformance={fps:29};assert.equal(api.status(bot).map(x=>x.id).join(','),'rest,slow,fps');
 bot.__pkmsvv3dsSupport.rest=0;bot.slowT=0;G.PKMSVVHordePerformance.fps=60;assert.equal(api.status(bot).length,0);
 G.Game.state='ui';bot.frozen=true;assert.equal(api.status(bot).length,0);
});

test('Arena AI can sidestep an approaching real friendly shot at native speed, without changing stats or cast state',()=>{
 const {G,api}=setup(),enemy={id:8,x:0,y:0,r:12,hp:320,maxHp:320,spd:100,dmg:12,pkmsvvArenaSolo:true,ai:{cd:1.5,cast:null}},player=p('player',-140);
 G.PKMSVVArenaSolo={active:true,stage:'fight'};G.Coop.active=false;
 const shot={x:-85,y:0,vx:210,vy:0,r:5,life:1.4,t:0,dmg:10,friendly:true};
 G.Projectiles={all:()=>[shot]};
 const v=api.arenaFootwork(enemy,player,100,-100,0,.016);
 assert.ok(v&&Math.abs(v[1])>40,'real approaching shot produces lateral steering');
 assert.ok(Math.hypot(...v)<=100+1e-9);
 assert.equal(enemy.hp,320);assert.equal(enemy.dmg,12);assert.equal(enemy.ai.cd,1.5);
 assert.equal(enemy.x,0);assert.equal(enemy.y,0);
 const slow=api.arenaFootwork(enemy,player,50,-50,0,.016);
 assert.ok(slow&&Math.hypot(...slow)<=50+1e-9,'no bypass of actual slow-adjusted speed');
 enemy.ai.cast={id:'beam'};
 assert.equal(api.arenaFootwork(enemy,player,100,-100,0,.016),null,'never cancel a telegraphed cast');
 enemy.ai.cast=null;
 assert.equal(api.arenaFootwork(enemy,player,100,-100,0,.016),null,'cooldown prevents immediate repeated dodge');
});
test('Arena movement is limited to offline Solo and Champion fights, never PvP, prep, Sky, immobilization or blocked tiles',()=>{
 const {G,api}=setup(),e={id:9,x:0,y:0,r:12,hp:320,maxHp:320,pkmsvvChampion:true,ai:{cast:null}},player=p('player',-140);
 G.PKMSVVChampionArena={active:true,stage:'fight'};G.Coop.active=false;
 const shot={x:-85,y:0,vx:210,vy:0,r:5,life:1.4,t:0,dmg:10,friendly:true};
 G.Projectiles={all:()=>[shot]};
 const call=(extra={})=>api.arenaFootwork({...e,...extra},player,100,-100,0,.016);
 assert.ok(call());
 G.Coop.active=true;assert.equal(call(),null);G.Coop.active=false;
 G.PKMSVVChampionArena.stage='prep';assert.equal(call(),null);G.PKMSVVChampionArena.stage='fight';
 for(const extra of [{_pkmsvvSkyBoss:true},{_pkmsvvMegaTransition:1},{stunT:1},{sleepT:1},{remote:true},{dead:true},{pkmsvvChampion:false}])assert.equal(call(extra),null);
 G.World.isFree=()=>false;assert.equal(call(),null);G.World.isFree=()=>true;
 G.Projectiles.all=()=>[{...shot,friendly:false},{...shot,vx:-210},{...shot,orb:true},{...shot,t:1.4},{...shot,hits:new Set([9])}];
 assert.equal(call(),null,'do not dodge non-threatening or already-consumed shots');
});
