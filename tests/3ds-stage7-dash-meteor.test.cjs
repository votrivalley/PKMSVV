'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
function game(){
 const tackle={id:'tackle',kind:'melee',type:'normal'};
 const moves={ALL:[tackle],BY_ID:{tackle},POOL:{normal:['tackle']},
  poolFor(mon){return [...new Set([...(this.POOL.normal||[]),
   ...(mon.types||[]).flatMap(t=>this.POOL[t]||[])])];}};
 const G={Moves:moves,Coop:{active:false}};
 for(const n of ['move-families','stage3-moves','stage4-moves','stage5-moves',
  'stage6-projectiles','stage7-dash-meteor']){
  vm.runInNewContext(read('src/pkmsvv-3ds-'+n+'.js'),{G,Math},{filename:n});
 }
 return {G,moves,tackle};
}
const rows=[
 ['megahorn','bug','dash',1.8,41.68,220,40,120,[]],
 ['dragon-ascent','flying','dash',.9,17.61,175,50,100,[384]],
 ['volt-tackle','electric','dash',.9,22.14,150,44,120,[172,25,26]],
 ['meteor-assault','fighting','dash',1.1,32.74,180,50,140,[865]],
 ['sunsteel-strike','steel','dash',1,20.33,170,52,120,[791]],
 ['sacred-fire','fire','meteor',1.3,4.49,4,58,1.5,[244,250]],
 ['diamond-storm','rock','meteor',1.25,8.87,5,50,50,[719]],
 ['doom-desire','steel','meteor',2.4,22.14,1,95,120,[385]],
 ['glacial-lance','ice','meteor',1.4,5.69,4,60,.5,[898]],
 ['thousand-arrows','ground','meteor',1.3,4.84,7,44,0,[718]]
];
test('Ten native Stage7 skill IDs preserve types, kinds, CD, damage, dimensions and owners',()=>{
 const {G,moves}=game(),defs=G.PKMSVV3DSStage7Moves.defs;
 assert.equal(defs.length,10);assert.equal(G.PKMSVV3DSStage7Moves.count,10);
 assert.equal(moves.BY_ID.tackle.id,'tackle');
 for(const [id,type,kind,cd,dmg,value,second,extra,only]of rows){
  const d=moves.BY_ID[id];
  assert.equal(d.type,type,id);assert.equal(d.kind,kind,id);
  assert.equal(d.cd,cd,id);assert.equal(d.dmg,dmg,id);
  assert.equal(d[kind==='dash'?'radius':'count'],value,id);
  assert.equal(d[kind==='dash'?'width':'radius'],second,id);
  if(id==='sacred-fire')assert.equal(d.burn,extra);
  if(id==='glacial-lance')assert.equal(d.slow,extra);
  if(id==='diamond-storm'||id==='doom-desire'||kind==='dash')assert.equal(d.knock,extra);
  assert.equal(JSON.stringify(Array.from(d.only||[])),JSON.stringify(only));
  assert.equal(d.ups.length,4);assert.equal(d.maxLvl,5);
 }
});
test('Dash native 4 upgrades multiply distance, width and damage without changing CD',()=>{
 const l=game().G.PKMSVV3DSStage7Moves.ladders.dash;
 assert.equal(l[0].m.dmg,1.4);assert.equal(l[1].m.radius,1.3);
 assert.equal(l[2].m.cd,.75);assert.equal(l[3].m.dmg,1.6);
 assert.equal(l[3].m.width,1.4);
});
test('Meteor native 4 upgrades add counts, multiply radius, damage and CD',()=>{
 const l=game().G.PKMSVV3DSStage7Moves.ladders.meteor;
 assert.equal(l[0].m.count,1);assert.equal(l[1].m.dmg,1.45);
 assert.equal(l[2].m.radius,1.3);assert.equal(l[3].m.count,2);
 assert.equal(l[3].m.cd,.8);
});
test('Only Entei and Ho-Oh learn Sacred Fire, not arbitrary Fire types',()=>{
 const {moves}=game();
 for(const dex of [244,250])assert.ok(moves.poolFor({dex,types:['fire']}).includes('sacred-fire'));
 for(const dex of [4,6,37])assert.ok(!moves.poolFor({dex,types:['fire']}).includes('sacred-fire'));
});
test('Volt Tackle is restricted to Pichu, Pikachu and Raichu',()=>{
 const {moves}=game();
 for(const dex of [172,25,26])assert.ok(moves.poolFor({dex,types:['electric']}).includes('volt-tackle'));
 assert.ok(!moves.poolFor({dex:807,types:['electric']}).includes('volt-tackle'));
});
test('All nine signature Dash/Meteor abilities deny non-owner even if type matches',()=>{
 const {moves}=game();
 for(const d of rows){
  const [id,type,,,,,,,only]=d;if(!only.length)continue;
  const deny=[1,10,25,300,650].find(x=>!only.includes(x));
  assert.ok(!moves.poolFor({dex:deny,types:[type]}).includes(id),id);
 }
});
test('Active Co-op excludes all 10 new IDs while old move remains',()=>{
 const {G,moves}=game();G.Coop.active=true;
 const pool=moves.poolFor({dex:384,types:['normal','bug','flying','electric','fire','steel','ground','rock','ice','fighting']});
 for(const [id]of rows)assert.ok(!pool.includes(id),id);
 assert.ok(pool.includes('tackle'));
});
test('Stage7 Web patch keeps existing gameplay kinds and adds only restricted dispatch',()=>{
 const src=read('scripts/patch-3ds-stage7-dash-meteor.cjs');
 for(const part of ['"projectile","dash","meteor"',
  'fields.filter(f=>f.kind===','pkmsvv3dsNative','Stage7 Web source anchor drift'])
  assert.ok(src.includes(part),part);
});
test('Distinct ID families do not overwrite previously staged 3DS skills',()=>{
 const {G,moves}=game();
 assert.equal(moves.ALL.length,47);  // 1 original + (2+2 mirror-only+9+5+9+9+10)
 assert.equal(G.PKMSVV3DSMoveFamilies.registered.length,46);
 assert.equal(moves.BY_ID['dragon-pulse'].kind,'projectile');
 assert.equal(moves.BY_ID['x-scissor'].kind,'scissor');
 assert.equal(moves.BY_ID['earthquake'].kind,'tremor');
});
