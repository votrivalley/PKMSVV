'use strict';
/* True Web source contract smoke, NOT mocked upgrades.
 * Must run after Stage1..5 patchers with vendor/pokesurvivor/js/data/moves.js.
 */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root='vendor/pokesurvivor/js',G={Coop:{active:false}},ctx={G,Math};
const file=name=>fs.readFileSync(root+'/'+name,'utf8');
vm.runInNewContext(file('data/moves.js'),ctx,{filename:'moves.js'});
const baseCount=G.Moves.ALL.length;
const originalDefs=new Map(G.Moves.ALL.map(def=>[def.id,def]));
for(const part of ['pkmsvv-3ds-move-families','pkmsvv-3ds-stage3-moves','pkmsvv-3ds-stage4-moves','pkmsvv-3ds-stage5-moves'])
 vm.runInNewContext(file('systems/'+part+'.js'),ctx,{filename:part+'.js'});
// The 64-skill public QA mirror omits Rapid Spin/Whirlpool. PKMSVV's
// documented 103-skill original already contains them. On the mirror the
// stage adapter adds those two as well, for 27 mirror add-ons instead of 25.
const missingFromMirror=['rapid-spin','whirlpool'].filter(id=>!originalDefs.has(id));
const expectedAdditions=25+missingFromMirror.length;
assert.equal(G.PKMSVV3DSMoveFamilies.registered.length,expectedAdditions,
  'new IDs only plus missing legacy Rapid Spin/Whirlpool in public QA mirror');
assert.equal(G.Moves.ALL.length,baseCount+expectedAdditions,
  'new IDs appended without overwriting any pre-existing move');
for(const [id,def] of originalDefs)
 assert.equal(G.Moves.BY_ID[id],def,'pre-existing move was overwritten: '+id);
assert.ok(baseCount>=60&&baseCount<=103,'unexpected public mirror source drift: '+baseCount);
const check=(id,rank,prop,want)=>assert.ok(
 Math.abs(G.Moves.instance(id,rank)[prop]-want)<1e-8,
 id+' rank '+rank+' '+prop+': '+G.Moves.instance(id,rank)[prop]+' != '+want);
check('acrobatics',5,'range',286);
check('acrobatics',5,'noItem',1.5);
check('earthquake',4,'knock',65*1.25);
check('extreme-speed',5,'count',6);
check('sunny-day',5,'dur',20*1.35**3*1.5);
check('x-scissor',5,'arc',1.3*1.3);
check('explosion',5,'radius',150*1.25);
check('protect',5,'minCd',5);
assert.equal(G.Moves.BY_ID['rapid-spin'].kind,'spin');
assert.equal(G.Moves.BY_ID.whirlpool.kind,'vortex');
if(originalDefs.has('magnitude'))assert.equal(G.Moves.BY_ID.magnitude.kind,'quake');
if(originalDefs.has('bubble'))assert.equal(G.Moves.BY_ID.bubble.kind,'nova');

assert.ok(G.Moves.poolFor({dex:900,types:['rock']}).includes('stone-axe'));
assert.ok(!G.Moves.poolFor({dex:74,types:['rock']}).includes('stone-axe'));
assert.ok(G.Moves.poolFor({dex:487,types:['ghost']}).includes('shadow-force'));
assert.ok(!G.Moves.poolFor({dex:92,types:['ghost']}).includes('shadow-force'));
G.Coop.active=true;
assert.ok(!G.Moves.poolFor({dex:900,types:['rock']}).includes('stone-axe'));
assert.ok(G.Moves.poolFor({dex:900,types:['normal']}).includes('tackle'));
console.log('PKMSVV_3DS_REAL_WEB_SKILL_UPGRADE_PASS original='+baseCount+' staged='+G.Moves.ALL.length+' added='+expectedAdditions+' productionNew=25');
