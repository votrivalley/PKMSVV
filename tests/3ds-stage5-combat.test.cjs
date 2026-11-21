'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const MODULES=[
 'src/pkmsvv-3ds-move-families.js','src/pkmsvv-3ds-combat-families.js',
 'src/pkmsvv-3ds-stage3-moves.js','src/pkmsvv-3ds-combat-stage3.js',
 'src/pkmsvv-3ds-stage4-moves.js','src/pkmsvv-3ds-support-stage4.js',
 'src/pkmsvv-3ds-stage5-moves.js','src/pkmsvv-3ds-combat-stage5.js'
];
const NATIVE=[
 ['x-scissor','scissor','bug',.75,16.59],
 ['stone-axe','scissor','rock',.8,18.55],
 ['extreme-speed','blitz','normal',1.3,74.86],
 ['acrobatics','leap','flying',1.3,13.3],
 ['shadow-force','leap','ghost',1.3,18.48],
 ['explosion','boom','normal',2.5,38.57],
 ['sunny-day','weather','fire',4,0],
 ['rain-dance','weather','water',4,0],
 ['sandstorm','weather','rock',4,0]
];
function fixture(){
 const log={hits:[],props:[],fx:[],blasts:[],weather:[],collides:0,kicks:0};
 const enemies=[],fields=[];
 const basic={id:'tackle',kind:'melee',type:'normal',cd:.5};
 const moves={ALL:[basic],BY_ID:{tackle:basic},POOL:{normal:['tackle']},
  poolFor(mon){const ids=new Set(this.POOL.normal);for(const t of mon.types||[])
   for(const id of this.POOL[t]||[])ids.add(id);return [...ids];},
  instance(id){const def=this.BY_ID[id];if(!def)throw Error(id);return {...def,def,lvl:1,t:0};}
 };
 const fx={};for(const k of ['ring','burst','slash','px','sp','beam','dmgText'])
   fx[k]=(...args)=>log.fx.push({k,args});
 const G={
  Moves:moves,Coop:{active:false},
  U:{TYPE_COLOR:{normal:'#fff',bug:'#5b5',rock:'#887',flying:'#6cd',ghost:'#757',fire:'#f44',water:'#4df',psychic:'#c8f',electric:'#ff8',ground:'#874'}},
  VFX:{forMove:m=>({pal:m.type,proj:'streak'})},
  FX:fx,Camera:{sees:()=>true,kick(){log.kicks++}},
  EnemyMgr:{all:()=>enemies,queryCircle:(x,y,r)=>enemies.filter(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<=r)},
  World:{isFree:()=>true,collide(){log.collides++},propsInCircle:()=>[],damageProp(obj,dmg){log.props.push({obj,dmg})},isWall:()=>false},
  Weather:{KINDS:{sun:{color:'#fc5'},rain:{color:'#7af'},sand:{color:'#b98'}},
    force(kind,dur){log.weather.push({kind,dur});}}
 };
 const p={x:0,y:0,aim:0,r:10,bodyH:24,atk:2,mon:{dex:25,types:['electric']},hp:80,maxHp:100,item:null,invuln:0,dead:false,
  anim:{draw(){}},heal(n){this.hp=Math.min(this.maxHp,this.hp+n)}};
 const context={G,Math,performance:{now:()=>1000}};
 for(const m of MODULES)vm.runInNewContext(read(m),context,{filename:m});
 const hooks={hit:(p,e,dmg,color,dx,dy,knock,m)=>log.hits.push({e,dmg,id:m.id,knock}),
  blast:(f,r)=>log.blasts.push({r,dmg:f.dmg,kind:f.kind,ghost:f.ghost})};
 function cast(id,ghost=false){const m=moves.instance(id);
  const ok=G.PKMSVV3DSCombatFX.spawn(fields,p,m,ghost);
  return {ok,m,fields:fields.filter(f=>f.m?.id===id)};}
 function update(f,dt){f.t+=dt;return G.PKMSVV3DSCombatFX.update(f,dt,hooks);}
 return {G,p,enemies,fields,log,hooks,cast,update};
}
test('Stage5 registers exactly 9 genuine native 3DS skill IDs with authentic kinds/types/CD/damage',()=>{
 const f=fixture(),all=f.G.Moves.BY_ID;
 for(const [id,kind,type,cd,dmg] of NATIVE){
  const m=all[id];
  assert.equal(m.kind,kind);assert.equal(m.type,type);assert.equal(m.cd,cd);
  if(dmg)assert.equal(m.dmg,dmg);
  assert.equal(m.maxLvl,5);assert.equal(m.ups.length,4);
  assert.ok(f.G.PKMSVV3DSMoveFamilies.isNativeMove(id));
 }
 assert.equal(all.explosion.cost,.25);
 assert.equal(all['acrobatics'].noItem,1.5);
 assert.equal(all['sunny-day'].wx,0);assert.equal(all['rain-dance'].wx,1);
 assert.equal(all.sandstorm.wx,2);
 assert.equal(f.G.Moves.ALL.length,28,'103-game adds 2+9+5+9 new IDs; fixture has one legacy');
});
test('native scissor/blitz/leap/boom/weather upgrade ladders maintain all four original ranks',()=>{
 const l=fixture().G.PKMSVV3DSStage5Moves.ladders;
 assert.deepEqual(Object.keys(l).sort(),['blitz','boom','leap','scissor','weather'].sort());
 assert.equal(l.scissor[3].m.arc,1.3);assert.equal(l.scissor[3].m.dmg,1.5);
 assert.equal(l.blitz[0].m.count,1);assert.equal(l.blitz[3].m.count,2);
 assert.equal(l.leap[3].m.range,1.3);assert.equal(l.leap[1].m.radius,1.3);
 assert.equal(l.boom[1].m.radius,1.25);
 assert.equal(l.weather[0].m.dur,1.35);assert.equal(l.weather[3].m.dur,1.5);
});
test('Kleavor Stone Axe and Giratina Shadow Force never appear in other Pokémon learn pool',()=>{
 const f=fixture(),pool=f.G.Moves.poolFor;
 assert.equal(f.G.Moves.BY_ID['stone-axe'].only[0],900);
 assert.equal(f.G.Moves.BY_ID['shadow-force'].only[0],487);
 assert.ok(!pool({dex:74,types:['rock']}).includes('stone-axe'));
 assert.ok(pool({dex:900,types:['rock']}).includes('stone-axe'));
 assert.ok(!pool({dex:92,types:['ghost']}).includes('shadow-force'));
 assert.ok(pool({dex:487,types:['ghost']}).includes('shadow-force'));
 f.G.Coop.active=true;
 for(const id of NATIVE.map(m=>m[0]))assert.ok(!pool({dex:900,types:['normal','rock','flying','fire','ghost','bug','water']}).includes(id),id);
 assert.ok(pool({dex:900,types:['normal']}).includes('tackle'),'original skill remains');
});
test('Stone Axe and Shadow Force reject manual casts by non-owner species',()=>{
 const f=fixture();
 f.enemies.push({x:30,y:0,r:7,dead:false});
 assert.equal(f.cast('stone-axe').ok,false);
 assert.equal(f.cast('shadow-force').ok,false);
 f.p.mon.dex=900;assert.equal(f.cast('stone-axe').ok,true);
 f.p.mon.dex=487;assert.equal(f.cast('shadow-force').ok,true);
});
test('X-Scissor produces exactly two offset slashes; center enemy is hit twice',()=>{
 const f=fixture(),center={x:40,y:0,r:8,dead:false},behind={x:-30,y:0,r:8,dead:false};
 f.enemies.push(center,behind);
 const prop={x:30,y:0,r:8,gone:false};
 f.G.World.propsInCircle=()=>[prop];
 const x=f.cast('x-scissor');
 assert.equal(x.ok,true);
 assert.ok(f.G.PKMSVV3DSCombatFX.isPortField(x.fields[0]));
 assert.equal(f.update(x.fields[0],.02),true);
 assert.equal(f.log.hits.filter(h=>h.e===center).length,2);
 assert.equal(f.log.hits.filter(h=>h.e===behind).length,0);
 assert.equal(f.log.props.length,2);
 assert.equal(f.log.fx.filter(z=>z.k==='slash').length,2);
});
test('Scissor remote ghost has slashes but no gameplay damage or prop break',()=>{
 const f=fixture(),e={x:40,y:0,r:8,dead:false};
 f.enemies.push(e);f.G.World.propsInCircle=()=>[{x:30,y:0,r:4}];
 const field=f.cast('x-scissor',true).fields[0];f.update(field,.02);
 assert.equal(f.log.hits.length,0);assert.equal(f.log.props.length,0);
 assert.equal(f.log.fx.filter(x=>x.k==='slash').length,2);
});
test('Extreme Speed chains across unique nearby enemies and grants brief invulnerability',()=>{
 const f=fixture();
 const e1={x:60,y:0,r:10,dead:false},e2={x:95,y:0,r:10,dead:false},e3={x:125,y:0,r:10,dead:false};
 f.enemies.push(e1,e2,e3);
 const field=f.cast('extreme-speed').fields[0];assert.ok(field);
 let done=false;
 for(let i=0;i<3;i++){done=f.update(field,.08);assert.equal(done,i===2);}
 assert.equal(f.log.hits.length,3);
 assert.equal(new Set(f.log.hits.map(h=>h.e)).size,3);
 assert.ok(f.p.x>0,'player moves toward targets');
 assert.ok(f.p.invuln>=.25);
 assert.equal(f.log.collides,3);
});
test('Blitz never targets Arceus, never repeats enemies, never moves or damages in ghost mode',()=>{
 const f=fixture();
 const god={x:20,y:0,r:10,dead:false,arceus:true},normal={x:50,y:0,r:10,dead:false};
 f.enemies.push(god,normal);
 const field=f.cast('extreme-speed').fields[0];
 assert.equal(f.update(field,.08),false);
 assert.equal(f.update(field,.08),true,'no new target beyond first non-Arceus');
 assert.equal(f.log.hits.length,1);assert.equal(f.log.hits[0].e,normal);
 const ghost=fixture();ghost.enemies.push({x:30,y:0,dead:false});
 const f2=ghost.cast('extreme-speed',true).fields[0];ghost.update(f2,.08);
 assert.equal(ghost.log.hits.length,0);assert.equal(ghost.p.x,0);
});
test('Acrobatics delays impact 0.32s and receives 1.5x power when no item equipped',()=>{
 const f=fixture();f.enemies.push({x:70,y:0,r:10,dead:false});
 const leap=f.cast('acrobatics');assert.equal(leap.ok,true);
 assert.equal(leap.fields[0].dmg,13.3*2*1.5);
 assert.equal(f.p.invuln,.45);
 assert.equal(f.update(leap.fields[0],.2),false);
 assert.equal(f.log.blasts.length,0);
 assert.equal(f.update(leap.fields[0],.15),true);
 assert.equal(f.log.blasts.length,1);assert.equal(f.log.blasts[0].dmg,39.9);
 assert.equal(f.p.x,70);
 const g=fixture();g.p.item='choiceband';g.enemies.push({x:70,y:0,r:10,dead:false});
 assert.equal(g.cast('acrobatics').fields[0].dmg,26.6);
});
test('Leap still damages after blocked teleport and does not move if world has no free landing',()=>{
 const f=fixture();f.enemies.push({x:70,y:0,r:10,dead:false});
 f.G.World.isFree=()=>false;
 const field=f.cast('acrobatics').fields[0];f.update(field,.33);
 assert.equal(f.p.x,0);
 assert.equal(f.log.blasts.length,1);
 const ghost=fixture();ghost.enemies.push({x:70,y:0,r:10,dead:false});
 const target=ghost.cast('acrobatics',true).fields[0];ghost.update(target,.33);
 assert.equal(ghost.p.x,0);assert.equal(ghost.log.blasts.length,0);
});
test('Explosion does genuine area damage, attacks props and costs 25% remaining HP (never KO)',()=>{
 const f=fixture(),e={x:40,y:0,r:10,dead:false},prop={x:30,y:0,r:10,gone:false};
 f.enemies.push(e);f.G.World.propsInCircle=()=>[prop];
 const boom=f.cast('explosion');assert.equal(boom.ok,true);
 assert.equal(f.update(boom.fields[0],.01),true);
 assert.equal(f.p.hp,60);
 assert.equal(f.log.hits.length,1);assert.equal(f.log.hits[0].dmg,77.14);
 assert.equal(f.log.hits[0].knock,220);
 assert.equal(f.log.props.length,1);
 const count=f.log.hits.length;
 assert.equal(f.update(boom.fields[0],.05),true);
 assert.equal(f.log.hits.length,count,'no double-trigger on same field');
 f.p.hp=1.2;const second=f.cast('explosion').fields[0];f.update(second,.02);
 assert.equal(f.p.hp,1);
});
test('Explosion ghost produces FX but never costs real HP or damages targets',()=>{
 const f=fixture();f.enemies.push({x:40,y:0,r:8,dead:false});
 const field=f.cast('explosion',true).fields[0];f.update(field,.01);
 assert.equal(f.p.hp,80);assert.equal(f.log.hits.length,0);
 assert.ok(f.log.fx.some(z=>z.k==='burst'));
});
test('Sunny Day, Rain Dance and Sandstorm call original real Weather.force, not a fake overlay',()=>{
 const f=fixture();
 for(const [id,kind] of [['sunny-day','sun'],['rain-dance','rain'],['sandstorm','sand']]){
  assert.equal(f.cast(id).ok,true);
  const last=f.log.weather.at(-1);
  assert.equal(last.kind,kind);assert.equal(last.dur,20);
 }
 assert.equal(f.fields.length,0,'weather does not create attack fields');
 assert.equal(f.log.fx.filter(z=>z.k==='ring').length,3);
 const ghost=fixture();ghost.cast('sunny-day',true);
 assert.equal(ghost.log.weather.length,0,'ghost VFX cannot force climate');
});
test('Stage5 field adapter preserves earlier Stage2/Stage3/Stage4 field updates',()=>{
 const f=fixture();
 const older=['fire-punch','double-team','surf','earthquake'];
 f.enemies.push({x:55,y:0,r:6,dead:false});f.p.target=f.enemies[0];
 for(const id of older){
  const c=f.cast(id);
  assert.equal(c.ok,true,id);
  assert.ok(c.fields.length>=1,id);
  assert.ok(f.G.PKMSVV3DSCombatFX.isPortField(c.fields[0]),id);
 }
});
test('Stage5 source patch adds native targeting rules and range/knock multiplicative upgrades',()=>{
 const script=read('scripts/patch-3ds-stage5-families.cjs');
 const preparation=read('scripts/prepare-game.cjs');
 for(const needle of ['js/data/moves.js','range', 'knock','needsTarget(m)','js/systems/combat.js','Weather']){
  if(needle==='Weather')continue;
  assert.ok(script.includes(needle),needle);
 }
 assert.ok(script.includes("weather: 'Charge'"),'weather animation and SFX');
 assert.ok(preparation.includes('patch-3ds-stage5-families.cjs'));
 assert.doesNotMatch(read('src/pkmsvv-3ds-combat-stage5.js'),/localStorage|SaveGuardian|save\.json|signingKey/);
});
