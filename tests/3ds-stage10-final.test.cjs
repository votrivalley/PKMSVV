'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const stages=['move-families','stage3-moves','stage4-moves','stage5-moves',
 'stage6-projectiles','stage7-dash-meteor','stage8-beam-nova-charge',
 'stage9-homing-cone-melee','stage10-final-moves'];
function registry(){
 const tackle={id:'tackle',type:'normal',kind:'melee'};
 const M={ALL:[tackle],BY_ID:{tackle},POOL:{normal:['tackle']},
  poolFor(mon){return [...new Set([...(this.POOL.normal||[]),
   ...(mon.types||[]).flatMap(t=>this.POOL[t]||[])])];}};
 const G={Moves:M,Coop:{active:false}};
 for(const part of stages)
  vm.runInNewContext(read('src/pkmsvv-3ds-'+part+'.js'),{G,Math},{filename:part});
 return {G,M,tackle};
}
const sourceRows=[
 ['relic-song','normal','shove',1.1,84.58,648],
 ['clanging-scales','dragon','shove',1.1,85.8,784],
 ['mortal-spin','poison','spin',1,8.82,970],
 ['darkest-lariat','dark','spin',1,9.72,727],
 ['waterfall','water','stun',1.4,23.01,null],
 ['dark-void','dark','stun',2,25.3,491],
 ['glaciate','ice','tremor',1.5,24,646],
 ['psyshock','psychic','bounce',.7,26.17,null],
 ['geomancy','fairy','buff',.85,null,716],
 ['precipice-blades','ground','quake',1.25,12.87,383]
];
test('Stage10 registers the final 10, keeps all preceding IDs intact',()=>{
 const {G,M,tackle}=registry();
 assert.equal(G.PKMSVV3DSStage10Moves.count,10);
 assert.equal(G.PKMSVV3DSStage10Moves.defs.length,10);
 assert.equal(M.BY_ID.tackle,tackle);
 assert.equal(new Set(M.ALL.map(d=>d.id)).size,M.ALL.length);
 for(const [id,type,kind,cd,dmg,dex]of sourceRows){
  const m=M.BY_ID[id];assert.ok(m,id);assert.equal(m.type,type);
  assert.equal(m.kind,kind);assert.equal(m.cd,cd);
  if(dmg!==null)assert.equal(m.dmg,dmg);
  else assert.equal(m.dmg,undefined);
  assert.equal(m.maxLvl,5);assert.equal(m.ups.length,4);
  if(dex!==null)assert.equal(m.only[0],dex);
 }
});
test('Stage10 profiles preserve native statuses, count and special attack buff',()=>{
 const m=registry().M.BY_ID;
 assert.equal(m['mortal-spin'].poison,1.5);
 assert.equal(m['darkest-lariat'].knock,60);
 assert.equal(m.waterfall.stun,.8);
 assert.equal(m['dark-void'].stun,1.8);
 assert.equal(m.glaciate.slow,.6);
 assert.equal(m.psyshock.bounce,4);
 assert.equal(m.geomancy.stat,'spa');
 assert.equal(m.geomancy.amount,.18);assert.equal(m.geomancy.stacks,5);
 assert.equal(m['precipice-blades'].count,8);
});
test('All 7 native rank ladders preserve exact modifier keys',()=>{
 const L=registry().G.PKMSVV3DSStage10Moves.ladders;
 assert.equal(Object.keys(L).length,7);
 assert.equal(L.shove[3].m.knock,1.5);
 assert.equal(L.spin[2].m.count,1);
 assert.equal(L.stun[2].m.stun,1.5);
 assert.equal(L.tremor[3].m.radius,1.2);
 assert.equal(L.bounce[3].m.spread,1.3);
 assert.equal(L.bounce[3].m.bounce,1);
 assert.equal(L.buff[3].m.amount,1.4);
 assert.equal(L.quake[3].m.count,2);
});
test('Stage10 preserves owner exclusivity and hides all new IDs in Co-op',()=>{
 const {G,M}=registry();
 for(const [id,type,,,,dex]of sourceRows){
  assert.ok(M.poolFor({dex:dex||25,types:[type]}).includes(id),'owner '+id);
  if(dex!==null)assert.ok(!M.poolFor({dex:25,types:[type]}).includes(id),'nonowner '+id);
 }
 G.Coop.active=true;
 for(const [id,type,,,,dex]of sourceRows)
  assert.ok(!M.poolFor({dex:dex||25,types:[type]}).includes(id),'Co-op '+id);
 assert.ok(M.poolFor({dex:25,types:['normal']}).includes('tackle'));
});
function fixture(){
 const fx={rings:0,bursts:0},props=[],enemies=[],fields=[];
 const old={spawn:()=>false,update:()=>false,draw:()=>{},
  isPortField:()=>false};
 const G={PKMSVV3DSCombatFX:old,PKMSVV3DSStage10Moves:{defs:[]},
  U:{TYPE_COLOR:{fairy:'#abc',dark:'#222',water:'#08f',normal:'#eee'}},
  FX:{ring:()=>fx.rings++,burst:()=>fx.bursts++,spark:()=>{},dmgText:()=>{}},
  Camera:{sees:()=>true},
  EnemyMgr:{queryCircle:(x,y,r)=>enemies.filter(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<=r)},
  World:{propsInCircle:()=>props,damageProp:(p,d)=>p.damage=(p.damage||0)+d},
  LIFT:12};
 vm.runInNewContext(read('src/pkmsvv-3ds-combat-stage10.js'),{G,Math},
  {filename:'combat-stage10.js'});
 const p={x:0,y:0,r:12,bodyH:25,atk:2,dead:false,mon:{dex:716}};
 return {G,p,fx,props,enemies,fields,api:G.PKMSVV3DSStage10Combat};
}
test('Geomancy stacks Special Attack only, excludes physical and expires by dt',()=>{
 const f=fixture(),m={id:'geomancy',kind:'buff',pkmsvv3dsNative:true,
  only:[716],stacks:5,amount:.18,dur:8,type:'fairy'};
 for(let i=0;i<7;i++)assert.equal(f.api.spawn(f.fields,f.p,m),true);
 assert.equal(f.p.__pkmsvv3dsSpa.n,5);
 assert.ok(Math.abs(f.api.specialMultiplier(f.p,{cat:'special'})-1.9)<1e-8);
 assert.equal(f.api.specialMultiplier(f.p,{cat:'physical'}),1);
 assert.equal(f.api.specialMultiplier(f.p,{pkmsvv3dsCategory:'special'}),1.9);
 f.api.tickPlayer(f.p,9);
 assert.ok(f.p.__pkmsvv3dsSpa.t>0,'dt should clamp against huge pauses');
 for(let i=0;i<40;i++)f.api.tickPlayer(f.p,.25);
 assert.equal(f.p.__pkmsvv3dsSpa.n,0);
 assert.equal(f.api.specialMultiplier(f.p,{cat:'special'}),1);
});
test('Ghost Geomancy and unauthorized player never alter buffs',()=>{
 const f=fixture(),m={kind:'buff',only:[716],stacks:5,amount:.18,dur:8};
 assert.equal(f.api.spawn(f.fields,f.p,m,true),true);
 assert.equal(f.p.__pkmsvv3dsSpa,undefined);
 f.p.mon.dex=25;
 assert.equal(f.api.spawn(f.fields,f.p,m,false),false);
 assert.equal(f.p.__pkmsvv3dsSpa,undefined);
});
test('Delayed Stun hits enemies once, shortens boss stun and hurts props',()=>{
 const f=fixture(),normal={id:1,x:10,y:0,dead:false},boss={id:2,x:15,y:0,boss:true,dead:false};
 f.enemies.push(normal,boss);
 f.props.push({id:'tree'});
 f.p.target=normal;
 const m={id:'waterfall',kind:'stun',pkmsvv3dsNative:true,type:'water',
  cd:1.4,dmg:23.01,radius:46,stun:.8};
 assert.equal(f.api.spawn(f.fields,f.p,m),true);
 const field=f.fields[0];assert.equal(field.delay,.45);
 const hits=[];const hook={hit:(...a)=>hits.push(a)};
 field.t=.44;assert.equal(f.api.update(field,.01,hook),false);
 assert.equal(hits.length,0);
 field.t=.46;assert.equal(f.api.update(field,.02,hook),true);
 assert.equal(hits.length,2);
 assert.ok(Math.abs(normal._pkmsvv3dsStunT-.8)<1e-8);
 assert.ok(Math.abs(boss._pkmsvv3dsStunT-.28)<1e-8);
 assert.equal(f.props[0].damage,46.02);
 assert.equal(f.api.update(field,.02,hook),true);
 assert.equal(hits.length,2,'Stun must never hit twice');
});
test('Ghost Shove has effects but no actual damage, normal Shove damages',()=>{
 const f=fixture(),e={id:1,x:12,y:0};f.enemies.push(e);
 const m={kind:'shove',id:'relic-song',type:'normal',only:[648],
  radius:110,dmg:84.58,knock:360};
 f.p.mon.dex=648;let hit=0;
 assert.equal(f.api.spawn(f.fields,f.p,m,true),true);
 f.api.update(f.fields[0],.02,{hit:()=>hit++});assert.equal(hit,0);
 f.api.spawn(f.fields,f.p,m,false);
 f.api.update(f.fields[1],.02,{hit:()=>hit++});
 assert.equal(hit,1);
});
test('Psyshock rebounds to unhit enemy, preserves hit log and terminates safely',()=>{
 const f=fixture();const seen={id:1,x:0,y:0},next={id:2,x:90,y:0},
    prev={id:3,x:40,y:0,dead:true};
 f.enemies.push(seen,next,prev);
 const pr={pkmsvv3dsNative:true,bounce:4,vx:360,vy:0,t:.9,
  x:0,y:0,hits:new Set([1]),color:'#aaa'};
 assert.equal(f.api.rebound(pr,seen),true);
 assert.equal(pr.bounce,3);assert.equal(pr.vx,360);assert.equal(pr.t,.4);
 assert.deepEqual([...pr.hits],[1],'original collision log must be preserved');
 pr.hits.add(2);
 assert.equal(f.api.rebound(pr,next),false);
 assert.equal(pr.bounce,3);
});
test('Stage10 patch has real source collision / upgrades / isolation anchors',()=>{
 const s=read('scripts/patch-3ds-stage10-final-moves.cjs');
 for(const text of ['Stage10 Web source anchor drift',
  "case 'bounce':", "G.PKMSVV3DSStage10Combat.rebound(p,e)",
  'specialMultiplier(pl,m)','specialMultiplier(pl,p)',
  "const ADD = ['count', 'pierce', 'stacks', 'bounce']",
  "'charge', 'stun'","pkmsvv3dsCategory:m.cat",
  'G.PKMSVV3DSStage10Combat.tickPlayer(this,dt)'])
  assert.ok(s.includes(text),text);
});
