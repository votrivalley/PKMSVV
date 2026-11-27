'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,'..','src',n+'.js'),'utf8');
function fixture(){
 const enemies=[],hit=[];
 const old={id:'tackle',type:'normal',kind:'melee'};
 const moves={ALL:[old],BY_ID:{tackle:old},POOL:{normal:['tackle']},
  poolFor(mon){return [...new Set([...this.POOL.normal,...(mon.types||[]).flatMap(t=>this.POOL[t]||[])])];}};
 const G={Moves:moves,Coop:{active:false},FX:{ring:(...args)=>hit.push(args)},
  EnemyMgr:{queryCircle:()=>enemies},Types:{mult:()=>1},Weather:{mult:()=>1},Camera:{sees:()=>true}};
 const context={G,Math};
 for(const n of ['pkmsvv-3ds-move-families','pkmsvv-3ds-stage3-moves',
  'pkmsvv-3ds-stage4-moves','pkmsvv-3ds-stage5-moves',
  'pkmsvv-3ds-stage6-projectiles','pkmsvv-3ds-projectile-stage6-fx'])
  vm.runInNewContext(read(n),context,{filename:n});
 return {G,moves,enemies,fx:G.PKMSVV3DSStage6ProjectileFX};
}
test('Stage6 9 native projectile move IDs with exact CD and damage',()=>{
 const f=fixture(),rows=[['dragon-pulse',.9,18.17],['sludge-bomb',.75,3.82],
 ['scald',.55,22.9],['hurricane',1,57.68],['water-pulse',.7,44.11],
 ['stone-edge',.85,42.72],['pyro-ball',.7,18.56],['snipe-shot',.6,10.71],
 ['spirit-shackle',.75,24.41]];
 for(const [id,cd,dmg] of rows){const m=f.moves.BY_ID[id];
  assert.equal(m.kind,'projectile');assert.equal(m.cd,cd);assert.equal(m.dmg,dmg);
  assert.equal(m.ups.length,4);assert.equal(m.maxLvl,5);}
 assert.equal(f.G.PKMSVV3DSStage6Projectiles.defs.length,9);
});
test('Native unique projectile effects have their source values',()=>{
 const m=fixture().moves.BY_ID;
 assert.equal(m['dragon-pulse'].pierce,99);
 assert.equal(m['sludge-bomb'].puddle,3);assert.equal(m['sludge-bomb'].pr,32);
 assert.equal(m['water-pulse'].stun,.45);assert.equal(m['stone-edge'].critUp,.3);
 assert.equal(m['hurricane'].knock,240);assert.equal(m['scald'].burn,1);
});
test('Four-rank native projectile ladder maintains count/spread/damage/CD/pierce',()=>{
 const L=fixture().G.PKMSVV3DSStage6Projectiles.ladder;
 assert.equal(L[0].m.count,1);assert.equal(L[0].m.spread,1.4);
 assert.equal(L[1].m.dmg,1.45);assert.equal(L[2].m.cd,.75);
 assert.equal(L[3].m.pierce,1);
});
test('Cinderace Inteleon Decidueye signature moves locked offline and online',()=>{
 const f=fixture();
 for(const [id,dex,type] of [['pyro-ball',815,'fire'],['snipe-shot',818,'water'],['spirit-shackle',724,'ghost']]){
  assert.equal(f.moves.BY_ID[id].only[0],dex);
  assert.ok(f.moves.poolFor({dex,types:[type]}).includes(id));
  assert.ok(!f.moves.poolFor({dex:25,types:[type]}).includes(id));}
 f.G.Coop.active=true;
 assert.ok(!f.moves.poolFor({dex:815,types:['fire']}).includes('pyro-ball'));
});
test('Original projectiles get no Stage6 status; new projectile gets only extra properties',()=>{
 const f=fixture();
 assert.equal(Object.keys(f.fx.payload(f.moves.BY_ID.tackle)).length,0);
 assert.equal(f.fx.payload(f.moves.BY_ID['water-pulse']).stun,.45);
 assert.equal(f.fx.payload(f.moves.BY_ID['sludge-bomb']).puddle,3);
});
test('Water Pulse stun works on real enemy object but never on ghost visual',()=>{
 const f=fixture(),e={dead:false},p={pkmsvv3dsId:'water-pulse',stun:.45};
 f.fx.onHit(p,e);assert.equal(e._pkmsvv3dsStunT,.45);
 f.fx.onHit({...p,ghost:true},e);assert.equal(e._pkmsvv3dsStunT,.45);
});
test('Extra projectile crit does not permanently increase player stats',()=>{
 const f=fixture(),pl={critChance:.7};
 assert.equal(f.fx.rollCrit(pl,{critUp:.3}),true);
 assert.equal(f.fx.rollCrit(pl,{critUp:1,ghost:true}),false);
 assert.equal(pl.critChance,.7);
});
test('Sludge Bomb poison puddle damages within radius, caps at 24, clears on match reset',()=>{
 const f=fixture();let dmg=0,poison=0,dealt=0;
 f.enemies.push({x:2,y:1,dead:false,types:['grass'],hurt:n=>{dmg+=n;},applyPoison:()=>poison++});
 const owner={dmgDealt:0,onDealt:()=>dealt++};
 const p={pkmsvv3dsId:'sludge-bomb',x:0,y:0,puddle:3,pr:32,dmg:4,owner,mtype:'poison'};
 f.fx.onEnd(p);assert.equal(f.fx.zones.length,1);
 f.fx.onHit(p,{x:2,y:1,dead:false});assert.equal(f.fx.zones.length,1);
 f.fx.update(.2);assert.ok(dmg>0);assert.ok(poison>0);assert.ok(dealt>0);
 for(let i=0;i<30;i++)f.fx.onEnd({...p,_pkmsvv3dsPuddlePlaced:false});
 assert.ok(f.fx.zones.length<=24);
 f.fx.clear();assert.equal(f.fx.zones.length,0);
});
test('Ghost projectile never creates Sludge Bomb status or poison zones',()=>{
 const f=fixture(),p={pkmsvv3dsId:'sludge-bomb',ghost:true,puddle:3,pr:32,x:0,y:0};
 f.fx.onEnd(p);f.fx.onHit(p,{dead:false});
 assert.equal(f.fx.zones.length,0);
});
test('Stage6 patcher anchors actual Web collision, life and state routing',()=>{
 const src=fs.readFileSync(path.join(__dirname,'..','scripts/patch-3ds-stage6-projectiles.cjs'),'utf8');
 for(const x of ['m.kind!=="projectile"','Stage6ProjectileFX.onHit(p,e)',
  'Stage6ProjectileFX.onEnd(p)','Stage6ProjectileFX.rollCrit(pl,p)',
  'Stage6ProjectileFX.update(dt)','Stage6ProjectileFX.clear(owner)',
  '_pkmsvv3dsStunT'])assert.ok(src.includes(x),x);
});