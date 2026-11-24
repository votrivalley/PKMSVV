'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
const MODULES=[
 'src/pkmsvv-3ds-move-families.js',
 'src/pkmsvv-3ds-combat-families.js',
 'src/pkmsvv-3ds-stage3-moves.js',
 'src/pkmsvv-3ds-combat-stage3.js',
 'src/pkmsvv-3ds-stage4-moves.js',
 'src/pkmsvv-3ds-support-stage4.js'
];
function fixture(){
 const stats={fx:[],hurt:0,heal:0,draw:0},enemies=[],fields=[];
 const m={id:'tackle',type:'normal',kind:'melee',cd:.5};
 const registry={ALL:[m],BY_ID:{tackle:m},POOL:{normal:['tackle']},
  poolFor(mon){const ids=new Set(this.POOL.normal);for(const t of mon.types||[])
    for(const id of this.POOL[t]||[])ids.add(id);return [...ids];},
  instance(id){const def=this.BY_ID[id];if(!def)throw Error(id);return {...def,def,lvl:1,t:0};}
 };
 const FX={};
 for(const k of ['ring','burst','slash','sp','dmgText','beam'])FX[k]=(...args)=>stats.fx.push({k,args});
 const G={Moves:registry,Coop:{active:false},LIFT:12,
  Camera:{sees:()=>true,kick(){}},FX,
  U:{TYPE_COLOR:{normal:'#fff',psychic:'#f7a',water:'#4bf',electric:'#eea',fire:'#f44',ground:'#998',grass:'#4f4'}},
  World:{propsInCircle:()=>[],damageProp(){},isWall:()=>false},
  EnemyMgr:{all:()=>enemies,
   queryCircle:(x,y,r)=>enemies.filter(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<=r)},
  VFX:{forMove:m=>({pal:m.type}),draw(){}}
 };
 const p={x:100,y:100,aim:0,r:12,bodyH:24,mon:{dex:25,types:['electric']},
  hp:20,maxHp:100,atk:2,invuln:0,dead:false,
  anim:{draw(){stats.draw++;}},
  hurt(n){stats.hurt+=n;this.hp-=n;},
  heal(n){stats.heal+=n;this.hp=Math.min(this.maxHp,this.hp+n);}};
 const sandbox={G,Math,performance:{now:()=>1000}};
 for(const mod of MODULES)vm.runInNewContext(read(mod),sandbox,{filename:mod});
 const support=G.PKMSVV3DSStage4Support;
 function cast(id,ghost=false){const m=registry.instance(id);
  const result=G.PKMSVV3DSCombatFX.spawn(fields,p,m,ghost);
  return {result,m,fields:fields.filter(f=>f.m?.id===id)};
 }
 function update(field,dt){field.t+=dt;return G.PKMSVV3DSCombatFX.update(field,dt,{});}
 return {G,p,support,fields,enemies,stats,cast,update};
}
test('five 3DS native support moves exactly preserve generated stats and upgrade ladders',()=>{
 const f=fixture(),D=f.G.Moves.BY_ID;
 const expect=[
  ['protect','normal','guard',7,1.5],
  ['reflect','psychic','screen',10,8],
  ['light-screen','psychic','screen',10,8],
  ['rest','psychic','rest',18,2],
  ['double-team','normal','decoy',8,4]
 ];
 for(const [id,type,kind,cd,dur] of expect){
  const m=D[id];
  assert.equal(m.id,id);assert.equal(m.type,type);assert.equal(m.kind,kind);
  assert.equal(m.cd,cd);assert.equal(m.dur,dur);assert.equal(m.maxLvl,5);
  assert.equal(m.ups.length,4);
  assert.ok(f.G.PKMSVV3DSMoveFamilies.isNativeMove(id));
 }
 assert.equal(D.protect.minCd,5);
 assert.equal(D.reflect.amount,.35);assert.equal(D.reflect.shield,0);
 assert.equal(D['light-screen'].amount,.35);assert.equal(D['light-screen'].shield,1);
 assert.equal(D.rest.amount,.6);
 assert.equal(D['double-team'].count,1);assert.equal(D['double-team'].radius,260);
 assert.equal(f.G.Moves.ALL.length,19);
});
test('support rank upgrades match generated native guard/screen/rest/decoy ladders',()=>{
 const L=fixture().G.PKMSVV3DSStage4Moves.ladders;
 assert.equal(L.guard[0].m.dur,1.25);
 assert.equal(L.guard[1].m.cd,.85);
 assert.equal(L.guard[3].m.dur,1.2);
 assert.equal(L.screen[1].m.amount,1.15);
 assert.equal(L.screen[3].m.dur,1.3);
 assert.equal(L.rest[0].m.amount,1.15);
 assert.equal(L.rest[1].m.dur,.85);
 assert.equal(L.decoy[1].m.count,1);
 assert.equal(L.decoy[3].m.radius,1.3);
});
test('new support moves appear only in correct type pool; network mode hides them',()=>{
 const f=fixture(),pool=f.G.Moves.poolFor;
 const pika=pool({dex:25,types:['electric']});
 assert.ok(pika.includes('protect')&&pika.includes('double-team'));
 assert.ok(!pika.includes('reflect'));
 const abra=pool({dex:63,types:['psychic']});
 assert.ok(abra.includes('reflect')&&abra.includes('light-screen')&&abra.includes('rest'));
 f.G.Coop.active=true;
 const online=pool({dex:63,types:['psychic']});
 for(const id of ['protect','reflect','light-screen','rest','double-team'])assert.ok(!online.includes(id),id);
 assert.ok(online.includes('tackle'),'existing skill must never be disabled');
});
test('Protect grants 1.5 seconds immunity, stops ordinary damage but never pure Judgment',()=>{
 const f=fixture();
 assert.equal(f.cast('protect').result,true);
 assert.equal(f.support.data(f.p).guard,1.5);
 const hit=f.support.incomingDamage(f.p,40,false,'physical');
 assert.equal(hit.blocked,true);assert.equal(f.p.invuln,.2);
 assert.equal(f.support.incomingDamage(f.p,40,true,'physical').blocked,false);
 f.support.tickPlayer(f.p,.25);
 assert.equal(f.support.data(f.p).guard,1.25);
 for(let i=0;i<5;i++)f.support.tickPlayer(f.p,.25);
 assert.equal(f.support.data(f.p).guard,0);
 assert.equal(f.support.incomingDamage(f.p,40,false,'physical').blocked,false);
});
test('Reflect reduces physical damage by 35%, never special; Light Screen vice versa',()=>{
 const f=fixture();
 f.cast('reflect');
 assert.equal(f.support.incomingDamage(f.p,100,false,'physical').amount,65);
 assert.equal(f.support.incomingDamage(f.p,100,false,'special').amount,100);
 f.cast('light-screen');
 assert.equal(f.support.incomingDamage(f.p,100,false,'physical').amount,65);
 assert.equal(f.support.incomingDamage(f.p,100,false,'special').amount,65);
 assert.equal(f.support.incomingDamage(f.p,100,true,'physical').amount,100);
 assert.equal(f.support.data(f.p).physical.t,8);
 assert.equal(f.support.data(f.p).special.t,8);
 for(let i=0;i<32;i++)f.support.tickPlayer(f.p,.25);
 assert.equal(f.support.incomingDamage(f.p,100,false,'physical').amount,100);
 assert.equal(f.support.incomingDamage(f.p,100,false,'special').amount,100);
});
test('two screens can independently refresh, separate damage categories and clamp strength',()=>{
 const f=fixture();
 f.cast('reflect');f.support.tickPlayer(f.p,.25);
 f.cast('light-screen');
 assert.equal(f.support.data(f.p).physical.t,7.75);
 assert.equal(f.support.data(f.p).special.t,8);
 const m=f.G.Moves.instance('reflect');m.amount=100;
 f.G.PKMSVV3DSCombatFX.spawn(f.fields,f.p,m,false);
 assert.equal(f.support.incomingDamage(f.p,100,false,'physical').amount,100*(1-.9));
});
test('Rest heals 60% maximum HP and immobilizes attacks for two seconds; does not loop at full HP',()=>{
 const f=fixture();
 assert.equal(f.support.needsRest(f.p),true);
 assert.equal(f.cast('rest').result,true);
 assert.equal(f.p.hp,80);
 assert.equal(f.stats.heal,60);
 assert.equal(f.support.isResting(f.p),true);
 for(let i=0;i<8;i++)f.support.tickPlayer(f.p,.25);
 assert.equal(f.support.isResting(f.p),false);
 assert.ok(f.stats.fx.some(z=>z.k==='dmgText'&&z.args.includes('Z')));
 f.p.hp=40;
 assert.equal(f.support.needsRest(f.p),false);
 assert.equal(f.cast('rest').result,false);
 f.p.hp=39;
 assert.equal(f.support.needsRest(f.p),true);
 f.p.hp=99;
 assert.equal(f.support.needsRest(f.p),false);
 assert.equal(f.cast('rest').result,false);
 assert.equal(f.p.hp,99);
});
test('Double Team places a stationary player sprite behind caster and attracts regular monsters',()=>{
 const f=fixture();
 const enemy={x:60,y:100,dead:false,boss:false};
 assert.equal(f.cast('double-team').result,true);
 const clone=f.fields[0];
 assert.equal(clone.kind,'pkmsvv3ds-decoy');
 assert.equal(clone.x,50);assert.ok(Math.abs(clone.y-100)<1e-6);
 assert.equal(clone.pull,260);assert.equal(clone.life,4);
 assert.ok(f.G.PKMSVV3DSCombatFX.isPortField(clone));
 const bait=f.support.decoyFor(enemy,f.p);
 assert.ok(bait);assert.equal(bait.x,50);assert.equal(bait.y,100);
 bait.hurt(15);
 assert.equal(f.stats.hurt,0,'clone cannot hurt actual player');
 assert.equal(f.p.hp,20);
 const ctx={save(){},restore(){},fillRect(){}};
 f.G.PKMSVV3DSCombatFX.draw(ctx,clone,0);
 assert.equal(f.stats.draw,1,'decoy uses caster real PMD sprite');
});
test('Double Team never redirects bosses, Judgment enemies, out-of-range or ghost decoys',()=>{
 const f=fixture();
 f.cast('double-team');
 assert.equal(f.support.decoyFor({x:45,y:100,boss:true},f.p),null);
 assert.equal(f.support.decoyFor({x:45,y:100,arceus:true},f.p),null);
 assert.equal(f.support.decoyFor({x:45,y:100,judge:true},f.p),null);
 assert.equal(f.support.decoyFor({x:500,y:500},f.p),null);
 f.update(f.fields[0],4);
 assert.equal(f.support.decoyFor({x:45,y:100},f.p),null);
 const g=fixture();g.cast('double-team',true);
 assert.equal(g.support.decoyFor({x:45,y:100},g.p),null);
});
test('Double Team limits the number of live sprites per player and does no combat damage',()=>{
 const f=fixture();
 const m=f.G.Moves.instance('double-team');m.count=4;
 for(let i=0;i<3;i++)f.G.PKMSVV3DSCombatFX.spawn(f.fields,f.p,m,false);
 assert.ok(f.fields.length<=6);
 for(const e of f.fields)f.update(e,.1);
 assert.ok(f.fields.every(x=>x.kind==='pkmsvv3ds-decoy'));
});
test('Stage4 bridge recognizes earlier Stage3 punch fields (fixes silent runtime field stall)',()=>{
 const f=fixture();const m=f.G.Moves.instance('fire-punch');
 f.G.PKMSVV3DSCombatFX.spawn(f.fields,f.p,m,false);
 assert.equal(f.fields.length,1);
 assert.equal(f.G.PKMSVV3DSCombatFX.isPortField(f.fields[0]),true);
});
test('shared source patch wires real incoming player damage, Rest pause and enemy aggro',()=>{
 const patch=read('scripts/patch-3ds-support-families.cjs'),prepare=read('scripts/prepare-game.cjs');
 for(const s of ['incomingDamage','tickPlayer','isResting','needsRest','decoyFor','minCd','special','pkmsvv-3ds-stage4-moves'])
  assert.ok(patch.includes(s),'missing '+s);
 assert.ok(prepare.includes('patch-3ds-support-families.cjs'));
 assert.ok(!patch.includes('save.json'),'runtime ephemeral only');
});
