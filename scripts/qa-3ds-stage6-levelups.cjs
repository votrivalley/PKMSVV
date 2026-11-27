'use strict';
// Actual patched public Web moves.js, not a stand-in for the production PKMSVV source.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const G={Coop:{active:false}},ctx={G,Math},read=n=>fs.readFileSync('vendor/pokesurvivor/js/'+n,'utf8');
vm.runInNewContext(read('data/moves.js'),ctx,{filename:'moves.js'});
const oldCount=G.Moves.ALL.length,existing=new Map(G.Moves.ALL.map(x=>[x.id,x]));
for(const name of ['pkmsvv-3ds-move-families','pkmsvv-3ds-stage3-moves',
 'pkmsvv-3ds-stage4-moves','pkmsvv-3ds-stage5-moves','pkmsvv-3ds-stage6-projectiles'])
 vm.runInNewContext(read('systems/'+name+'.js'),ctx,{filename:name+'.js'});
const added=34+['rapid-spin','whirlpool'].filter(id=>!existing.has(id)).length;
assert.equal(G.Moves.ALL.length,oldCount+added);
assert.equal(G.PKMSVV3DSMoveFamilies.registered.length,added);
for(const [id,def] of existing)assert.equal(G.Moves.BY_ID[id],def,'overwrote original '+id);
const chk=(id,lvl,key,want)=>assert.ok(Math.abs(G.Moves.instance(id,lvl)[key]-want)<1e-8,id+' '+key);
chk('dragon-pulse',5,'count',3);
chk('dragon-pulse',5,'pierce',100);
chk('sludge-bomb',5,'puddle',3);
chk('scald',5,'burn',1);
chk('stone-edge',5,'critUp',.3);
chk('snipe-shot',5,'speed',520);
chk('snipe-shot',5,'dmg',10.71*1.45);
chk('spirit-shackle',5,'slow',.5);
for(const [id,own,type] of [['pyro-ball',815,'fire'],['snipe-shot',818,'water'],['spirit-shackle',724,'ghost']]){
 assert.ok(G.Moves.poolFor({dex:own,types:[type]}).includes(id));
 assert.ok(!G.Moves.poolFor({dex:25,types:[type]}).includes(id));
}
G.Coop.active=true;
assert.ok(!G.Moves.poolFor({dex:815,types:['fire']}).includes('pyro-ball'));
console.log('PKMSVV_3DS_STAGE6_WEB_SOURCE_REGRESSION_PASS base='+oldCount+' new='+added+' total='+G.Moves.ALL.length);