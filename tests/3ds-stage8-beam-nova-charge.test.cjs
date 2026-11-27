'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function registry(){
 const tackle={id:'tackle',type:'normal',kind:'melee'};
 const moves={ALL:[tackle],BY_ID:{tackle},POOL:{normal:['tackle']},
  poolFor(mon){return [...new Set([...(this.POOL.normal||[]),
   ...(mon.types||[]).flatMap(t=>this.POOL[t]||[])])];}};
 const G={Moves:moves,Coop:{active:false}};
 for(const part of ['move-families','stage3-moves','stage4-moves','stage5-moves',
   'stage6-projectiles','stage7-dash-meteor','stage8-beam-nova-charge'])
  vm.runInNewContext(read('src/pkmsvv-3ds-'+part+'.js'),{G,Math},{filename:part});
 return {G,moves};
}
const rows=[
 ['blue-flare','fire','beam',1.6,16.81,643],
 ['aeroblast','flying','beam',1.3,33.08,249],
 ['moongeist-beam','ghost','beam',1.5,34.4,792],
 ['lava-plume','fire','nova',1.4,7.09,null],
 ['psystrike','psychic','nova',1.2,12.26,150],
 ['origin-pulse','water','nova',1.3,21.56,382],
 ['sparkling-aria','water','nova',1.2,15.32,730],
 ['roar-of-time','dragon','charge',2.4,37.64,483],
 ['photon-geyser','psychic','charge',2.3,37.21,800],
 ['dynamax-cannon','dragon','charge',2.4,35.28,890]
];
test('Stage8 registers exactly 10 native moves with correct type/kind/CD/damage',()=>{
 const {G,moves}=registry();
 assert.equal(G.PKMSVV3DSStage8Moves.count,10);
 assert.equal(G.PKMSVV3DSStage8Moves.defs.length,10);
 for(const [id,type,kind,cd,dmg,dex]of rows){
  const m=moves.BY_ID[id];assert.ok(m,id);
  assert.equal(m.type,type);assert.equal(m.kind,kind);
  assert.equal(m.cd,cd);assert.equal(m.dmg,dmg);
  assert.equal(m.maxLvl,5);assert.equal(m.ups.length,4);
  if(dex!==null)assert.equal(m.only[0],dex);
 }
});
test('Beam and Nova source stats preserve burn, homing, count and puddles',()=>{
 const m=registry().moves.BY_ID;
 assert.equal(m['blue-flare'].radius,300);assert.equal(m['blue-flare'].burn,1.5);
 assert.equal(m.aeroblast.width,36);
 assert.equal(m['lava-plume'].count,8);
 assert.equal(m['lava-plume'].puddle,2.5);assert.equal(m['lava-plume'].pr,24);
 assert.equal(m.psystrike.count,16);assert.equal(m.psystrike.homing,1.2);
 assert.equal(m['origin-pulse'].knock,60);
 assert.equal(m['sparkling-aria'].pierce,2);
});
test('Charge source stats and four exact ladders preserve true multiplication',()=>{
 const {G,moves}=registry(),L=G.PKMSVV3DSStage8Moves.ladders;
 assert.equal(moves.BY_ID['roar-of-time'].charge,.8);
 assert.equal(moves.BY_ID['photon-geyser'].charge,.7);
 assert.equal(moves.BY_ID['dynamax-cannon'].charge,.8);
 assert.equal(L.charge[2].m.charge,.7);assert.equal(L.charge[2].m.cd,.8);
 assert.equal(L.charge[1].m.width,1.3);
 assert.equal(L.nova[0].m.count,4);assert.equal(L.nova[3].m.pierce,1);
 assert.equal(L.beam[3].m.dmg,1.5);
});
test('Nine signature abilities cannot be learned by another species of the same type',()=>{
 const {moves}=registry();
 for(const [id,type,kind,cd,dmg,dex]of rows){
  if(dex===null)continue;
  assert.ok(moves.poolFor({dex,types:[type]}).includes(id),id+' rightful owner');
  const other=[1,10,25,150,243].find(i=>i!==dex);
  assert.ok(!moves.poolFor({dex:other,types:[type]}).includes(id),id+' unauthorized owner');
 }
 assert.ok(moves.poolFor({dex:4,types:['fire']}).includes('lava-plume'));
});
test('Live Co-op excludes all 10 staged native moves without excluding legacy tackle',()=>{
 const {G,moves}=registry();G.Coop.active=true;
 const pool=moves.poolFor({dex:643,types:['normal','fire','ghost','water','psychic','dragon','flying']});
 for(const [id]of rows)assert.ok(!pool.includes(id),id);
 assert.ok(pool.includes('tackle'));
});
function chargeFixture(){
 const G={PKMSVV3DSStage8Moves:{defs:[]},
  PKMSVV3DSCombatFX:{isPortField:()=>false,spawn:()=>false,update:()=>false,draw:()=>{}},
  U:{TYPE_COLOR:{dragon:'#a5b'}},LIFT:12,FX:{ring:(...a)=>log.rings.push(a)}};
 const log={beams:[],rings:[]},fields=[],p={x:2,y:3,r:10,dead:false,mon:{dex:483}};
 vm.runInNewContext(read('src/pkmsvv-3ds-charge-stage8.js'),{G,Math},{filename:'charge-stage8.js'});
 return {G,fields,log,p,fx:G.PKMSVV3DSStage8Charge,m:{id:'roar-of-time',kind:'charge',type:'dragon',charge:.8,only:[483]}};
}
test('Charge winds up, follows owner, and calls original beam only after .8s',()=>{
 const f=chargeFixture();
 assert.equal(f.fx.spawn(f.fields,f.p,f.m),true);
 assert.equal(f.fields.length,1);
 const field=f.fields[0];assert.equal(field.at,.8);
 assert.ok(f.G.PKMSVV3DSCombatFX.isPortField(field));
 assert.equal(f.log.rings.length,1);
 f.p.x=47;f.p.y=88;field.t=.79;
 assert.equal(f.fx.update(field,.01,{beam:(p,m)=>f.log.beams.push({p,m})}),false);
 assert.equal(field.x,47);assert.equal(field.y,88);assert.equal(f.log.beams.length,0);
 field.t=.8;
 assert.equal(f.fx.update(field,.01,{beam:(p,m)=>f.log.beams.push({p,m})}),true);
 assert.equal(f.log.beams.length,1);assert.equal(f.log.beams[0].m.id,'roar-of-time');
 assert.equal(f.fx.update(field,.1,{beam:()=>f.log.beams.push(1)}),true);
 assert.equal(f.log.beams.length,1,'must not fire twice');
});
test('Ghost charge has visible windup but never invokes damage beam',()=>{
 const f=chargeFixture();
 assert.equal(f.fx.spawn(f.fields,f.p,f.m,true),true);
 const field=f.fields[0];field.t=1.2;
 assert.equal(f.fx.update(field,.1,{beam:()=>f.log.beams.push(1)}),true);
 assert.equal(f.log.beams.length,0);assert.equal(f.log.rings.length,1);
});
test('Charge rejects non-owner and KO before spawning or applying effects',()=>{
 const f=chargeFixture();f.p.mon.dex=25;
 assert.equal(f.fx.spawn(f.fields,f.p,f.m),false);assert.equal(f.fields.length,0);
 f.p.mon.dex=483;f.p.dead=true;
 assert.equal(f.fx.spawn(f.fields,f.p,f.m),false);
 f.p.dead=false;assert.equal(f.fx.spawn(f.fields,f.p,f.m),true);
 f.p.dead=true;f.fields[0].t=1;
 assert.equal(f.fx.update(f.fields[0],.1,{beam:()=>f.log.beams.push(1)}),true);
 assert.equal(f.log.beams.length,0);
});
test('Stage8 source patch contains original Beam callback and charge multiplier',()=>{
 const src=read('scripts/patch-3ds-stage8-beam-nova-charge.cjs');
 for(const part of ['"beam","nova"','beam:(owner,m)=>beam(owner,m)',
   "['projectile','nova'].includes(m.kind)",'m.kind==="charge"',
   " 'range', 'knock', 'charge'",'Stage8 source anchor drift'])
  assert.ok(src.includes(part),part);
});
