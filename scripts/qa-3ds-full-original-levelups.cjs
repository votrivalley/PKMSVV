'use strict';
/* For the exact original 103-move PKMSVV source, NOT the 64-move public mirror.
 * Execute after full prepare-game.cjs and Stage6–10, before final bundling.
 */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..','vendor','pokesurvivor','js');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const G={Coop:{active:false}},ctx={G,Math};
vm.runInNewContext(read('data/moves.js'),ctx,{filename:'pinned-original-moves.js'});
const original=G.Moves.ALL.length;
assert.equal(original,103,'exact pinned PKMSVV requires 103 base move IDs, not the public QA mirror');
const before=new Map(G.Moves.ALL.map(m=>[m.id,m]));
const files=['move-families','stage3-moves','stage4-moves','stage5-moves',
 'stage6-projectiles','stage7-dash-meteor','stage8-beam-nova-charge',
 'stage9-homing-cone-melee','stage10-final-moves'];
for(const key of files)vm.runInNewContext(
 read('systems/pkmsvv-3ds-'+key+'.js'),ctx,{filename:key+'.js'});
const {Moves:M}=G;
assert.equal(G.PKMSVV3DSMoveFamilies.alreadyInGame.length,2,'Rapid Spin and Whirlpool already existed');
assert.equal(G.PKMSVV3DSMoveFamilies.registered.length,73,'must register exactly 73 genuine IDs');
assert.equal(M.ALL.length,176,'the complete PKMSVV catalog should have 176 unique IDs');
assert.equal(new Set(M.ALL.map(m=>m.id)).size,176,'move ID collision');
for(const [id,def]of before)assert.equal(M.BY_ID[id],def,'original skill overwritten '+id);
for(const d of M.ALL.filter(m=>m.pkmsvv3dsNative)){
 assert.equal(d.ups.length,4,'all new skills have exactly four upgrades: '+d.id);
 assert.equal(d.maxLvl,5,'all new skills have five levels: '+d.id);
 const top=M.instance(d.id,5);
 assert.equal(top.lvl,5,'skill upgrades failed: '+d.id);
}
for(const [id,dex]of [['geomancy',716],['relic-song',648],['precipice-blades',383],
 ['dark-void',491],['glaciate',646],['mortal-spin',970]]){
 const d=M.BY_ID[id];
 assert.ok(d.only?.includes(dex),'species gate missing: '+id);
 assert.ok(M.poolFor({dex,types:[d.type]}).includes(id),'owner cannot learn '+id);
 assert.ok(!M.poolFor({dex:25,types:[d.type]}).includes(id),'nonowner received '+id);
}
G.Coop.active=true;
for(const d of M.ALL.filter(m=>m.pkmsvv3dsNative))
 assert.ok(!M.poolFor({dex:d.only?.[0]||25,types:[d.type]}).includes(d.id),'Co-op unlocked '+d.id);
console.log('PKMSVV_FULL_PINNED_176_MOVES_PASS base='+original+
 ' new='+G.PKMSVV3DSMoveFamilies.registered.length+
 ' total='+M.ALL.length+' noOverwrite=true soloOnly=true');
