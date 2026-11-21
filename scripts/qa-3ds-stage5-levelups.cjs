'use strict';
/* True Web source contract smoke, NOT mocked upgrades.
 * Must run after Stage1..5 patchers with vendor/pokesurvivor/js/data/moves.js.
 */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root='vendor/pokesurvivor/js',G={Coop:{active:false}},ctx={G,Math};
const file=name=>fs.readFileSync(root+'/'+name,'utf8');
vm.runInNewContext(file('data/moves.js'),ctx,{filename:'moves.js'});
const baseCount=G.Moves.ALL.length;
for(const part of ['pkmsvv-3ds-move-families','pkmsvv-3ds-stage3-moves','pkmsvv-3ds-stage4-moves','pkmsvv-3ds-stage5-moves'])
 vm.runInNewContext(file('systems/'+part+'.js'),ctx,{filename:part+'.js'});
assert.equal(G.PKMSVV3DSMoveFamilies.registered.length,25,'exactly 25 genuinely new move IDs');
assert.equal(G.Moves.ALL.length,baseCount+25,'new IDs appended without overwriting any pre-existing move');
// The pinned public QA mirror has a smaller original registry than PKMSVV's
// documented 103-move production baseline. Do not present it as main game.
assert.ok(baseCount>=60&&baseCount<=103,'unexpected mirror source drift: '+baseCount);
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
assert.equal(G.Moves.BY_ID.magnitude.kind,'quake');
assert.equal(G.Moves.BY_ID.bubble.kind,'nova');

assert.ok(G.Moves.poolFor({dex:900,types:['rock']}).includes('stone-axe'));
assert.ok(!G.Moves.poolFor({dex:74,types:['rock']}).includes('stone-axe'));
assert.ok(G.Moves.poolFor({dex:487,types:['ghost']}).includes('shadow-force'));
assert.ok(!G.Moves.poolFor({dex:92,types:['ghost']}).includes('shadow-force'));
G.Coop.active=true;
assert.ok(!G.Moves.poolFor({dex:900,types:['rock']}).includes('stone-axe'));
assert.ok(G.Moves.poolFor({dex:900,types:['normal']}).includes('tackle'));
console.log('PKMSVV_3DS_REAL_WEB_SKILL_UPGRADE_PASS original='+baseCount+' staged='+G.Moves.ALL.length+' added=25');
