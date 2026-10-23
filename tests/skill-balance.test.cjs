'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..','vendor','pokesurvivor');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function load(){
 const G={};new Function('G',read('js/data/moves.js'))(G);
 new Function('G',read('js/data/pkmsvv-skill-balance.js'))(G);return G;
}
test('all 103 skills have a cooldown policy across 23 effect families',()=>{
 const G=load(),audit=G.PKMSVVBalance.audit();
 assert.equal(audit.length,103);assert.equal(new Set(audit.map(x=>x.kind)).size,23);
 for(const x of audit){assert.ok(x.baseCd>0 && x.minEffective>0,x.id);assert.ok(x.baseCd>=x.minEffective||x.kind==='orbit',x.id)}
});
test('six buffs have downtime from level 1 to 4 then one permanent max-level effect',()=>{
 const G=load(),buffs=Object.values(G.Moves.BY_ID).filter(x=>x.kind==='buff');
 assert.equal(buffs.length,6);
 for(const d of buffs){
  const m=G.Moves.instance(d.id),pl={cdMul:0.01};
  for(let lvl=1;lvl<5;lvl++){
   assert.ok(m.dur<G.PKMSVVBalance.effectiveCooldown(pl,m),d.id+' Lv'+lvl);
   G.Moves.levelUp(m);
  }
  assert.equal(m.lvl,5);
  const owner={buffs:{[m.stat]:{n:0,t:0,amount:0}}};
  assert.equal(G.PKMSVVBalance.refreshBuff(owner,m),true);
  assert.equal(owner.buffs[m.stat].n,1);
  assert.equal(owner.buffs[m.stat].t,Infinity);
  assert.equal(m.t,Infinity);
 }
});
test('global cooldown reduction cannot create infinite skill spam',()=>{
 const G=load(),pl={cdMul:0.00001};
 for(const def of Object.values(G.Moves.BY_ID)){
  if(def.kind==='buff'||def.kind==='orbit')continue;
  const m=G.Moves.instance(def.id),min=G.PKMSVVBalance.profiles[m.kind].floor;
  assert.ok(G.PKMSVVBalance.effectiveCooldown(pl,m)>=min,def.id);
 }
});
test('buff indicators, nonstack and combat guard are integrated',()=>{
 const player=read('js/entities/player.js'),hud=read('js/ui/hud.js'),combat=read('js/systems/combat.js');
 assert.match(player,/b\.n = 1; \/\/ PKMSVV/);
 assert.match(hud,/OFF '/);assert.match(hud,/ON '/);assert.match(hud,/MAX/);
 assert.match(combat,/G\.PKMSVVBalance\.effectiveCooldown\(pl, m\)/);
 assert.match(combat,/G\.PKMSVVBalance\.refreshBuff\(pl, m\)/);
});

test('survival retune keeps opening attacks responsive and buff downtime short',()=>{
 const G=load();
 const sample={tackle:[0.8,1.2],ember:[0.9,1.35],'water-gun':[0.9,1.35],confusion:[0.9,1.4]};
 for(const [id,[min,max]] of Object.entries(sample)){
   const d=G.Moves.BY_ID[id];
   assert.ok(d.cd>=min && d.cd<=max,id+': '+d.cd);
   assert.ok(G.PKMSVVBalance.effectiveCooldown({cdMul:1},G.Moves.instance(id))<=max,id);
 }
 const buffs=Object.values(G.Moves.BY_ID).filter(m=>m.kind==='buff');
 for(const d of buffs){
   const m=G.Moves.instance(d.id);
   const fresh=G.PKMSVVBalance.effectiveCooldown({cdMul:1},m);
   assert.ok(fresh>=m.dur+0.8-1e-8,d.id);
   assert.ok(fresh<=10,d.id+' takes too long to recover: '+fresh);
   const haste=G.PKMSVVBalance.effectiveCooldown({cdMul:0.75},m);
   assert.ok(haste>=m.dur+0.8-1e-8);
   assert.ok(haste<=fresh);
 }
});
test('legendary rifts add capped team resonance without requiring manual slot fusion',()=>{
 const G=load(),p={atkMul:1,cdMul:1,maxMoves:6};
 for(let i=0;i<5;i++)G.PKMSVVBalance.rewardRift(p);
 assert.equal(p.maxMoves,6);
 assert.equal(p.pkmsvvResonance,3);
 assert.ok(Math.abs(p.atkMul-Math.pow(1.08,3))<1e-9);
 assert.ok(Math.abs(p.cdMul-Math.pow(.96,5))<1e-9);
 assert.match(read('js/systems/rift.js'),/PKMSVVBalance.rewardRift\(pl\)/);
 assert.match(read('js/systems/combat.js'),/for \(const m of pl\.moves\) tickMove/);
});
test('Life Orb pays HP at most once in a 2-second window with simultaneous auto skills',()=>{
 const src=read('js/entities/player.js');
 const G={Audio:{sfx(){}},Game:{st:{time:0}},Sprites:{animMeta:()=>null},PKMSVVEvo:{onCast(){}}};
 new Function('G',src)(G);
 const pl={
   hp:100,maxHp:100,hasItem:()=>true,remote:false,
   anim:{busy:()=>true,progress:()=>0,play(){}}
 };
 const cast=G.Player.prototype.cast;
 for(let i=0;i<6;i++)cast.call(pl,{kind:'projectile',cd:1});
 assert.equal(pl.hp,99,'six simultaneous casts must cost only one fee');
 G.Game.st.time=1;cast.call(pl,{kind:'projectile',cd:1});
 assert.equal(pl.hp,99);
 G.Game.st.time=2;cast.call(pl,{kind:'projectile',cd:1});
 assert.equal(pl.hp,98);
 G.Game.st.time=4;cast.call(pl,{kind:'buff',cd:8.5});
 assert.equal(pl.hp,98,'buff should not drain life');
 cast.call(pl,{kind:'projectile',cd:1});
 assert.equal(pl.hp,97);
 const item=read('js/data/items.js');
 assert.match(item,/pierde hasta un 1% de PS cada 2 s/);
});
