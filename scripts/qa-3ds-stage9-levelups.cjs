'use strict';
/* Final Stage9 source smoke: after running Stage1..9 patchers on the Web
 * QA mirror. Baseline mirror: 64 IDs, true original PKMSVV: 103 IDs.
 */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir='vendor/pokesurvivor/js',read=p=>fs.readFileSync(dir+'/'+p,'utf8');
const G={Coop:{active:false}},ctx={G,Math};
vm.runInNewContext(read('data/moves.js'),ctx,{filename:'moves.js'});
const before=G.Moves.ALL.length,original=new Map(G.Moves.ALL.map(m=>[m.id,m]));
for(const s of ['move-families','stage3-moves','stage4-moves','stage5-moves',
 'stage6-projectiles','stage7-dash-meteor','stage8-beam-nova-charge',
 'stage9-homing-cone-melee'])
 vm.runInNewContext(read('systems/pkmsvv-3ds-'+s+'.js'),ctx,{filename:s});
const expected=63+['rapid-spin','whirlpool'].filter(id=>!original.has(id)).length;
assert.equal(G.PKMSVV3DSMoveFamilies.registered.length,expected);
assert.equal(G.Moves.ALL.length,before+expected);
for(const [id,v]of original)assert.equal(G.Moves.BY_ID[id],v,id+' was replaced');
const inst=(id,lvl,key)=>G.Moves.instance(id,lvl)[key];
const near=(n,v)=>assert.ok(Math.abs(n-v)<1e-7,'found '+n+' expected '+v);
near(inst('moonblast',5,'count'),3);
near(inst('moonblast',5,'spread'),.12*1.3);
near(inst('moonblast',5,'dmg'),7.61*1.45*1.4);
near(inst('flower-trick',5,'critUp'),.5);
near(inst('blizzard',5,'count'),15);
near(inst('blizzard',5,'life'),.55*1.3);
near(inst('silver-wind',5,'boost'),.15);
near(inst('crunch',5,'arc'),9);
near(inst('behemoth-blade',5,'arc'),9);
near(inst('crunch',5,'shred'),4);
near(inst('secret-sword',5,'count'),4);
near(inst('secret-sword',5,'radius'),240*1.3);
near(inst('malignant-chain',5,'count'),10);
near(inst('malignant-chain',5,'poison'),2);
for(const [id,dex,type]of [['attack-order',416,'bug'],['flower-trick',908,'grass'],
 ['behemoth-blade',888,'steel'],['secret-sword',647,'fighting'],
 ['malignant-chain',1025,'poison']]){
 assert.ok(G.Moves.poolFor({dex,types:[type]}).includes(id),'owner '+id);
 assert.ok(!G.Moves.poolFor({dex:25,types:[type]}).includes(id),'blocked '+id);
}
G.Coop.active=true;
for(const {id,type,only}of G.PKMSVV3DSStage9Moves.defs)
 assert.ok(!G.Moves.poolFor({dex:only?.[0]||25,types:[type]}).includes(id),'Co-op '+id);
const combat=read('systems/combat.js'),enemy=read('entities/enemy.js');
for(const p of ['"homing","cone","melee","boomerang","chain"',
 "case 'homing':", 'pkmsvv3dsShredT','p.critUp>0','p.splash>0',
 'm.id==="silver-wind"'])assert.ok(combat.includes(p),p);
assert.ok(enemy.includes('pkmsvv3dsShredT-dt'),'dt-based status expiration');
console.log('PKMSVV_3DS_STAGE9_REAL_WEB_SOURCE_PASS original='+before+
 ' added='+expected+' staged='+G.Moves.ALL.length+' productionNew=63');
