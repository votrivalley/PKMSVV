'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const files=['move-families','stage3-moves','stage4-moves','stage5-moves',
 'stage6-projectiles','stage7-dash-meteor','stage8-beam-nova-charge',
 'stage9-homing-cone-melee'];
function registry(){
 const tackle={id:'tackle',type:'normal',kind:'melee'};
 const M={ALL:[tackle],BY_ID:{tackle},POOL:{normal:['tackle']},
  poolFor(mon){return [...new Set([...(this.POOL.normal||[]),
   ...(mon.types||[]).flatMap(t=>this.POOL[t]||[])])];}};
 const G={Moves:M,Coop:{active:false}};
 for(const file of files)vm.runInNewContext(read('src/pkmsvv-3ds-'+file+'.js'),{G,Math},{filename:file});
 return {G,M,tackle};
}
const rows=[
 ['moonblast','fairy','homing',.8,7.61,null],
 ['attack-order','bug','homing',.75,22.69,416],
 ['flower-trick','grass','homing',.8,22.54,908],
 ['blizzard','ice','cone',.9,15.74,null],
 ['silver-wind','bug','cone',.75,10.60,null],
 ['crunch','dark','melee',1,16.74,null],
 ['behemoth-blade','steel','melee',.9,24.82,888],
 ['secret-sword','fighting','boomerang',.85,11.70,647],
 ['malignant-chain','poison','chain',1,34.30,1025]
];
test('Stage9 installs nine genuine native IDs, no duplicates or original ID changes',()=>{
 const {G,M,tackle}=registry();
 assert.equal(G.PKMSVV3DSStage9Moves.count,9);
 assert.equal(G.PKMSVV3DSStage9Moves.defs.length,9);
 assert.equal(M.BY_ID.tackle,tackle);
 assert.equal(new Set(M.ALL.map(x=>x.id)).size,M.ALL.length);
 for(const [id,type,kind,cd,dmg,dex]of rows){
  const m=M.BY_ID[id];assert.ok(m,id);
  assert.equal(m.type,type);assert.equal(m.kind,kind);
  assert.equal(m.cd,cd);assert.equal(m.dmg,dmg);
  assert.equal(m.ups.length,4);assert.equal(m.maxLvl,5);
  if(dex!==null)assert.equal(m.only[0],dex);
 }
});
test('Native source extra mechanics are preserved for Moonblast/Flower Trick/Silver Wind/Crunch',()=>{
 const {M}=registry();
 assert.equal(M.BY_ID.moonblast.splash,56);
 assert.equal(M.BY_ID['flower-trick'].critUp,.5);
 assert.equal(M.BY_ID['silver-wind'].boost,.15);
 assert.equal(M.BY_ID.crunch.shred,4);
 assert.equal(M.BY_ID['malignant-chain'].poison,2);
});
test('All five source ladders and full-circle melee are retained',()=>{
 const {G,M}=registry();const L=G.PKMSVV3DSStage9Moves.ladders;
 assert.equal(L.homing[0].m.size,1.3);assert.equal(L.homing[3].m.count,1);
 assert.equal(L.cone[2].m.life,1.3);assert.equal(L.cone[3].m.pierce,1);
 assert.equal(L.chain[0].m.count,2);assert.equal(L.boomerang[2].m.radius,1.3);
 for(const id of ['crunch','behemoth-blade']){
  const m=M.BY_ID[id];
  assert.equal(m.arc*m.ups[3].m.arc,9,'360 degrees at rank five');
  assert.equal(m.ups[3].m.dmg,1.5);
 }
});
test('Signature skills remain species-only and all new IDs gated in Co-op',()=>{
 const {G,M}=registry();
 for(const [id,type,, , ,dex]of rows){
  if(dex===null)continue;
  assert.ok(M.poolFor({dex,types:[type]}).includes(id),id);
  assert.ok(!M.poolFor({dex:25,types:[type]}).includes(id),id+' should be exclusive');
 }
 assert.ok(M.poolFor({dex:25,types:['fairy']}).includes('moonblast'));
 assert.ok(M.poolFor({dex:25,types:['ice']}).includes('blizzard'));
 G.Coop.active=true;
 for(const [id,type,, , ,dex]of rows)
  assert.ok(!M.poolFor({dex:dex||25,types:[type]}).includes(id),id+' Co-op');
 assert.ok(M.poolFor({dex:25,types:['normal']}).includes('tackle'));
});
test('Stage9 patch routes 5 kinds via real Web logic and upgrades native-only statuses',()=>{
 const s=read('scripts/patch-3ds-stage9-homing-cone-melee.cjs');
 for(const part of ['"homing","cone","melee","boomerang","chain"',
  "case 'homing':", 'm.id==="silver-wind"', 'pkmsvv3dsShredT',
  'p.critUp>0','p.splash>0','splashDamage=p.dmg*k*.6',
  'Stage9 Web source anchor drift'])
  assert.ok(s.includes(part),part);
});
