'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
function text(p){return fs.readFileSync(path.join(root,p),'utf8');}
const src=[
 'src/pkmsvv-3ds-move-families.js',
 'src/pkmsvv-3ds-combat-families.js',
 'src/pkmsvv-3ds-stage3-moves.js',
 'src/pkmsvv-3ds-combat-stage3.js'
].map(text);
const NATIVE=[
 ['fire-punch',10.37,.85,'punch'],['ice-punch',15.69,.85,'punch'],
 ['thunder-punch',11.98,.85,'punch'],['drain-punch',17.12,.90,'punch'],
 ['plasma-fists',10.19,.80,'punch'],['fire-blast',15.9,1.6,'cross'],
 ['seed-flare',23.2,1.4,'cross'],['thunder',4.29,1.5,'storm'],
 ['judgment',2.85,1.4,'storm']
];
function fixture(){
 const attacks={hits:[],blasts:[],fx:[],props:[],kicks:0,heals:[]};
 const enemies=[],fields=[];
 const real={id:'tackle',type:'normal',kind:'melee',cd:.5};
 const registry={ALL:[real],BY_ID:{tackle:real},POOL:{normal:['tackle']},
  poolFor(mon){const ids=new Set(this.POOL.normal);for(const t of mon.types||[])
    for(const id of this.POOL[t]||[])ids.add(id);return [...ids];},
  instance(id){const def=this.BY_ID[id];if(!def)throw Error(id);return {...def,def,lvl:1,t:0};}
 };
 const fx={};
 for(const k of ['slash','ring','burst','sp','beam'])fx[k]=(...args)=>attacks.fx.push({k,args});
 const G={Moves:registry,Coop:{active:false},LIFT:12,
  U:{TYPE_COLOR:{normal:'#fff',electric:'#eee',fire:'#f42',grass:'#4f4',fighting:'#e44',ice:'#9ef',ground:'#997',water:'#4cf'}},
  Camera:{sees:()=>true,kick(){attacks.kicks++;}},FX:fx,
  World:{propsInCircle:()=>[],damageProp:(p,d)=>attacks.props.push({p,d}),isWall:()=>false},
  EnemyMgr:{all:()=>enemies,
   queryCircle:(x,y,r)=>enemies.filter(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<=r)},
  VFX:{forMove:m=>({pal:m.type}),draw(){}}
 };
 const sandbox={G,Math,performance:{now:()=>1000}};
 for(const c of src)vm.runInNewContext(c,sandbox);
 const p={mon:{dex:25,types:['electric']},x:0,y:0,aim:0,atk:2,hp:15,maxHp:100,
  heal(n){attacks.heals.push(n);this.hp=Math.min(this.maxHp,this.hp+n);}};
 const hit=(owner,e,dmg,col,dx,dy,knock,m)=>attacks.hits.push({id:m.id,e,dmg,col,dx,dy,knock});
 const blast=(f,r)=>attacks.blasts.push({kind:f.kind,x:f.x,y:f.y,r,ghost:f.ghost});
 const hooks={hit,blast};
 function cast(id,ghost=false){
  const m=registry.instance(id);
  const result=G.PKMSVV3DSCombatFX.spawn(fields,p,m,ghost);
  return {result,fields:fields.filter(f=>f.m?.id===id),m};
 }
 function update(field,dt){field.t+=dt;return G.PKMSVV3DSCombatFX.update(field,dt,hooks);}
 return {G,attacks,enemies,fields,p,cast,update};
}
test('9 native profiles exactly retain type, id, 3DS base damage/cooldown and 4 rank upgrades',()=>{
 const f=fixture(),defs=f.G.PKMSVV3DSStage3Moves.defs;
 assert.equal(defs.length,9);
 for(const [id,dmg,cd,kind] of NATIVE){
  const m=f.G.Moves.BY_ID[id];
  assert.equal(m.id,id);assert.equal(m.kind,kind);
  assert.equal(m.dmg,dmg,id);assert.equal(m.cd,cd,id);
  assert.equal(m.maxLvl,5,id);assert.equal(m.ups.length,4,id);
  assert.ok(f.G.PKMSVV3DSMoveFamilies.isNativeMove(id),id);
 }
 assert.equal(f.G.Moves.BY_ID.tackle, f.G.Moves.ALL[0]);
 assert.equal(f.G.Moves.ALL.length,14,'1 dummy original + 4 Stage2 + 9 Stage3');
 assert.equal(f.G.PKMSVV3DSMoveFamilies.addDefs([]),0,'idempotent registry');
});
test('Native 3DS upgrade ladders preserve exact multiplier/additive values',()=>{
 const {ladders}=fixture().G.PKMSVV3DSStage3Moves;
 assert.equal(ladders.punch[0].m.dmg,1.4);
 assert.equal(ladders.punch[1].m.count,1);
 assert.equal(ladders.punch[2].m.cd,.75);
 assert.equal(ladders.punch[3].m.radius,1.2);
 assert.equal(ladders.cross[3].m.width,1.4);
 assert.equal(ladders.storm[0].m.count,2);
 assert.equal(ladders.storm[3].m.radius,1.3);
});
test('Zeraora, Shaymin and Arceus only get their own 3DS exclusive skills',()=>{
 const f=fixture();
 const p=f.G.Moves.poolFor;
 let ids=p({dex:25,types:['electric']});
 assert.ok(ids.includes('thunder'));
 assert.ok(!ids.includes('plasma-fists'));
 assert.ok(!ids.includes('judgment'),'Normal-type Judgment must not appear for Pikachu');
 ids=p({dex:807,types:['electric']});
 assert.ok(ids.includes('plasma-fists'));
 ids=p({dex:492,types:['grass']});
 assert.ok(ids.includes('seed-flare'));
 ids=p({dex:493,types:['normal']});
 assert.ok(ids.includes('judgment'));
 f.G.Coop.active=true;
 assert.ok(!p({dex:807,types:['electric']}).includes('plasma-fists'));
 assert.ok(!p({dex:493,types:['normal']}).includes('judgment'));
 assert.ok(p({dex:493,types:['normal']}).includes('tackle'));
});
test('exclusive moves cannot be manually cast by unrelated Pokemon',()=>{
 const f=fixture();
 assert.equal(f.cast('plasma-fists').result,false);
 assert.equal(f.cast('judgment').result,false);
 f.p.mon.dex=807;
 assert.equal(f.cast('plasma-fists').result,true);
 f.p.mon.dex=493;
 f.enemies.push({x:90,y:0,dead:false});
 assert.equal(f.cast('judgment').result,true,'Storm needs at least one visible monster');
});
test('Fire Punch: three timed arc hits with 1.4x final strike, physical knockback and slash FX',()=>{
 const f=fixture(),e={x:30,y:0,dead:false};
 f.enemies.push(e);
 const cast=f.cast('fire-punch');
 assert.ok(cast.result);
 const field=cast.fields[0];
 for(let i=0;i<3;i++){const done=f.update(field,.09);assert.equal(done,i===2);}
 assert.equal(f.attacks.hits.length,3);
 assert.equal(f.attacks.hits[0].dmg,20.74);
 assert.ok(Math.abs(f.attacks.hits[2].dmg-20.74*1.4)<1e-8);
 assert.equal(f.attacks.hits[2].knock,70);
 assert.equal(f.attacks.fx.filter(x=>x.k==='slash').length,3);
});
test('Drain Punch heals by 1.5 HP per enemy per hit, with 6 HP cap each pulse',()=>{
 const f=fixture(),enemy={x:35,y:0,dead:false};f.enemies.push(enemy);
 const field=f.cast('drain-punch').fields[0];
 for(let i=0;i<3;i++)f.update(field,.09);
 assert.equal(f.attacks.hits.length,3);
 assert.equal(f.attacks.heals.length,3);
 assert.equal(f.p.hp,19.5);
});
test('Ice Punch last hit freezes briefly; Thunder Punch last hit chains electric damage',()=>{
 const f=fixture(),primary={x:30,y:0,dead:false,
    applySlow(v,d){this.slow=[v,d];}},near={x:45,y:15,dead:false};
 f.enemies.push(primary,near);
 let field=f.cast('ice-punch').fields[0];
 for(let i=0;i<3;i++)f.update(field,.09);
 assert.ok(primary.slow,'short freeze fallback applies when Web has no native stun API');
 assert.equal(primary.slow[1],.35);
 f.attacks.hits.length=0;
 field=f.cast('thunder-punch').fields[0];
 for(let i=0;i<3;i++)f.update(field,.09);
 assert.ok(f.attacks.hits.length>=4,'last hit should cause another chain hit');
 assert.ok(f.attacks.hits.some(h=>h.id==='thunder-punch'&&h.dmg<23.96));
});
test('Fire Blast is a delayed target-centered cross; exact hit geometry and once-only props',()=>{
 const f=fixture(),target={x:100,y:50,dead:false};
 const hitOnArm={x:168,y:50,dead:false,r:6};
 const outside={x:173,y:104,dead:false,r:6};
 const prop={x:100,y:75,r:8,gone:false};
 f.p.target=target;f.enemies.push(target,hitOnArm,outside);
 f.G.World.propsInCircle=()=>[prop];
 const field=f.cast('fire-blast').fields[0];
 assert.equal(field.x,100);assert.equal(field.y,50);assert.equal(field.delay,.3);
 assert.equal(f.update(field,.2),false);
 assert.equal(f.attacks.hits.length,0);
 assert.equal(f.update(field,.15),true);
 assert.ok(f.attacks.hits.some(x=>x.e===hitOnArm));
 assert.ok(!f.attacks.hits.some(x=>x.e===outside));
 assert.equal(f.attacks.props.length,1);
 const n=f.attacks.hits.length;
 assert.equal(f.update(field,.1),true);
 assert.equal(f.attacks.hits.length,n,'no double-hit');
});
test('Storm creates staggered lightning fields on visible monsters, then genuine AoE blast',()=>{
 const f=fixture(),enemy={x:70,y:50,dead:false};
 f.enemies.push(enemy);
 const c=f.cast('thunder');
 assert.equal(c.fields.length,5);
 assert.deepEqual(Array.from(c.fields).map(x=>+x.t.toFixed(2)),[0,-.09,-.18,-.27,-.36]);
 for(let k=0;k<9;k++)for(const field of c.fields)f.update(field,.09);
 assert.equal(f.attacks.blasts.length,5);
 assert.ok(f.attacks.fx.some(x=>x.k==='beam'));
});
test('Ghost Punch, Cross and Storm have 0 gameplay effects',()=>{
 const f=fixture(),e={x:40,y:0,dead:false};
 f.enemies.push(e);f.p.target=e;
 for(const id of ['fire-punch','fire-blast','thunder']){
  const arr=f.cast(id,true).fields;
  for(let t=0;t<10;t++)for(const field of arr)f.update(field,.09);
 }
 assert.equal(f.attacks.hits.length,0);
 assert.equal(f.attacks.blasts.length,0);
 assert.equal(f.attacks.props.length,0);
});
test('Stage 3 is bundled after source-level Stage2 registry + FX and leaves save schema untouched',()=>{
 const script=text('scripts/patch-3ds-move-families.cjs');
 const prepare=text('scripts/prepare-game.cjs');
 assert.ok(script.includes('pkmsvv-3ds-stage3-moves'));
 assert.ok(script.includes('pkmsvv-3ds-combat-stage3'));
 assert.ok(prepare.includes('patch-3ds-move-families'));
 assert.doesNotMatch(src[2]+src[3],/localStorage|SaveGuardian|save\.json|signingKey|firebase/i);
});
