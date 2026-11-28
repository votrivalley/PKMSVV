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

test('adaptive arena profile weighs learned real moves, actual attack and cooldown, not empty unlocked slots',()=>{
 const {G,api}=setup();
 G.PKMSVVBalance={effectiveCooldown:(p,m)=>Math.max(.25,m.cd*p.cdMul)};
 const weak={maxHp:320,baseAtk:1.3,atkMul:1,baseSpd:112,spdMul:1,cdMul:1,maxMoves:8,moves:[{id:'one',kind:'melee',dmg:20,cd:2,lvl:1}]};
 const strong={...weak,atkMul:3,cdMul:.5,moves:Array.from({length:8},(_,i)=>({id:'max'+i,kind:'beam',dmg:50,cd:2,lvl:5}))};
 const ratios={hp:1,dmg:1,spd:1},a=api.arenaStats(weak,ratios),b=api.arenaStats(strong,ratios);
 assert.equal(a.profile.attacks,1);assert.equal(b.profile.attacks,8);assert.equal(a.profile.style,'keep-range');assert.equal(b.profile.style,'press');
 assert.ok(b.hp>a.hp*2&&b.dmg>a.dmg);assert.ok(b.profile.tempo<a.profile.tempo);
 assert.equal(b.shotDmg,b.dmg);assert.ok(b.hp<=strong.maxHp*32);
 assert.equal(api.arenaStats({...weak,maxMoves:3},ratios).hp,a.hp);
 const tank=api.arenaStats({...weak,dmgReduce:.65,regen:8},ratios);assert.ok(tank.dmg>a.dmg);assert.ok(tank.dmg<=weak.maxHp*.20);
 assert.ok(api.arenaStats(strong,ratios,{mode:'champion',round:3}).hp>=b.hp);
 assert.equal(strong.atkMul,3);assert.equal(strong.moves.length,8);
});
test('offline arena tactical plan preserves native cast windup and PvP; recovery is bounded',()=>{
 const {G,api}=setup(),player=p('player',0),enemy={id:2,x:120,y:0,hp:320,maxHp:320,pkmsvvArenaSolo:true,pkmsvvArenaBuild:{style:'keep-range',tempo:.7},ai:{mode:'close',modeT:1,cast:null}};
 G.PKMSVVArenaSolo={active:true,stage:'fight'};G.Game.player=player;G.Coop.active=false;
 api.arenaPlan(enemy,player,.016);assert.equal(enemy.ai.mode,'far');assert.equal(api.arenaRecovery(enemy,2),1.4);assert.equal(api.arenaRecovery(enemy,.3),.85);
 enemy.ai.cast={id:'slam'};enemy.ai.mode='close';api.arenaPlan(enemy,player,4);assert.equal(enemy.ai.mode,'close');
 G.Coop.active=true;assert.equal(api.arenaRecovery(enemy,2),2);
});
test('switching Ready species carries legitimate farm bonuses, same species retains actual stats',()=>{
 const {api}=setup(),old={hp:100,atk:1,spd:100},p1={dex:6,mon:{hp:120,atk:1.5,spd:110},maxHp:160,baseAtk:1.2,baseSpd:120,atkMul:3,cdMul:.5};
 api.arenaPreserveFighter(p1,old,25);
 assert.equal(p1.maxHp,180);assert.equal(p1.hp,180);assert.ok(Math.abs(p1.baseAtk-1.8)<1e-9);assert.equal(p1.baseSpd,132);assert.equal(p1.atkMul,3);assert.equal(p1.cdMul,.5);
 api.arenaPreserveFighter(p1,p1.mon,6);assert.equal(p1.maxHp,180);
});

test('Arena assembles independent type-pool skills and never copies player-only or unsupported moves',()=>{
 const {G,api}=setup();
 const defs=[
  {id:'spark',type:'electric',kind:'projectile',dmg:10,cd:1,speed:220,life:1,maxLvl:5},
  {id:'ray',type:'electric',kind:'beam',dmg:20,cd:2,radius:240,maxLvl:5},
  {id:'tackle',type:'normal',kind:'melee',dmg:10,cd:1,radius:48,maxLvl:5},
  {id:'ring',type:'electric',kind:'nova',dmg:9,cd:1,count:8,maxLvl:5},
  {id:'storm',type:'electric',kind:'meteor',dmg:15,cd:2,maxLvl:5},
  {id:'harden',type:'normal',kind:'buff',stat:'def',cd:3,maxLvl:5},
  {id:'bad',type:'fire',kind:'beam',dmg:99,cd:1,maxLvl:5},
  {id:'unsupported',type:'electric',kind:'vortex',dmg:99,cd:1,maxLvl:5}];
 G.Moves={BY_ID:Object.fromEntries(defs.map(d=>[d.id,d])),poolFor:()=>defs.map(d=>d.id),instance:(id,lvl)=>({...defs.find(d=>d.id===id),lvl})};
 const player=p('p',100,0,{mon:{types:['water']},cdMul:.8,moves:[{id:'not-allowed'}]});
 const rival={id:2,dex:25,x:0,y:0,hp:500,maxHp:500,dmg:20,mon:{types:['electric']},pkmsvvArenaSolo:true,pkmsvvArenaBuild:{attacks:8,support:0,style:'press',mode:'solo',round:0,moves:[{lvl:5}]},ai:{cd:0,cast:null},bossEnd(){this.ai.cast=null;return [0,0,'Idle'];}};
 G.PKMSVVArenaSolo={active:true,stage:'fight'};G.Coop.active=false;G.Game.player=player;
 G.U={TYPE_COLOR:{electric:'#ff0'}};G.Types={mult:()=>1};G.T=(s,context)=>context==='move'?'VI '+s:s;const hz=[],shots=[];
 G.Hazards={add:o=>hz.push(o)};G.Projectiles={spawn:o=>shots.push(o)};
 const kit=api.arenaEquip(rival,player);
 assert.equal(kit.length,6);assert.equal(new Set(kit.map(m=>m.id)).size,6);
 assert.ok(kit.every(m=>['normal','electric'].includes(m.type)&&m.level===5));assert.ok(!kit.some(m=>m.id==='unsupported'||m.id==='not-allowed'));
 assert.ok(kit.some(m=>m.family==='melee')&&kit.some(m=>m.family==='buff')&&kit.some(m=>m.family==='beam'));
 assert.ok(kit.every(m=>m.name.startsWith('VI ')));
 // Direction is derived from observed movement only; prediction is capped.
 player.x=120;api.arenaSkillClock(rival,player,.2);const aim=api.arenaAimPoint(rival,player,.25);
 assert.ok(aim.x>player.x&&aim.x<=player.x+45);assert.equal(aim.y,player.y);
 G.World.isFree=()=>false;assert.equal(api.arenaAimPoint(rival,player,.25).x,player.x);G.World.isFree=()=>true;
 player.x=100;
 for(let n=0;n<5;n++)api.arenaSkillClock(rival,player,.25);
 assert.equal(api.arenaSkillStart(rival,player,100),true);
 const cast=rival.ai.cast;assert.ok(cast?.arenaSkill);assert.ok(cast.wind>=.62);assert.ok(cast.damage<=30);
 if(hz.length){assert.equal(hz[0].pkmsvvArenaMove,cast.v.m.id);assert.ok(api.arenaHazardActive(hz[0],player));}
 assert.equal(shots.length,0,'no shot before windup');
 rival.stunT=.5;api.arenaSkillInterrupt(rival,player);assert.equal(rival.ai.cast,null);assert.equal(cast.cancelled,true);
 if(hz.length)assert.equal(api.arenaHazardActive(hz[0],player),false);
 rival.stunT=0;for(let n=0;n<12;n++)api.arenaSkillClock(rival,player,.25);
 api.arenaSkillStart(rival,player,100);const next=rival.ai.cast;assert.ok(next?.arenaSkill);
 api.arenaSkillCast(rival,player,next.wind+.31);assert.equal(rival.ai.cast,null);
 assert.equal(api.arenaKit(rival).casts,2);
 G.Coop.active=true;assert.equal(api.arenaSkillStart(rival,player,100),false);
});
