'use strict';
/* Real Web move-registry / Stage8 charge regression after Stage1..8 patchers.
 * This validates the pinned public QA mirror, not complete PKMSVV production.
 */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root='vendor/pokesurvivor/js',read=p=>fs.readFileSync(root+'/'+p,'utf8');
const G={Coop:{active:false}},ctx={G,Math};
vm.runInNewContext(read('data/moves.js'),ctx,{filename:'moves.js'});
const before=G.Moves.ALL.length,old=new Map(G.Moves.ALL.map(d=>[d.id,d]));
for(const n of ['pkmsvv-3ds-move-families','pkmsvv-3ds-stage3-moves',
 'pkmsvv-3ds-stage4-moves','pkmsvv-3ds-stage5-moves',
 'pkmsvv-3ds-stage6-projectiles','pkmsvv-3ds-stage7-dash-meteor',
 'pkmsvv-3ds-stage8-beam-nova-charge'])
 vm.runInNewContext(read('systems/'+n+'.js'),ctx,{filename:n+'.js'});
const additions=54+['rapid-spin','whirlpool'].filter(id=>!old.has(id)).length;
assert.equal(G.PKMSVV3DSMoveFamilies.registered.length,additions);
assert.equal(G.Moves.ALL.length,before+additions);
for(const [id,def]of old)assert.equal(G.Moves.BY_ID[id],def,'original overwritten '+id);
const check=(id,rank,key,expect)=>assert.ok(
 Math.abs(G.Moves.instance(id,rank)[key]-expect)<1e-8,
 id+' level '+rank+' '+key+' actual '+G.Moves.instance(id,rank)[key]+' expected '+expect);
check('blue-flare',5,'dmg',16.81*1.45*1.5);
check('blue-flare',5,'radius',390);
check('blue-flare',5,'width',52);
check('aeroblast',5,'cd',1.3*.75);
check('lava-plume',5,'count',16);
check('lava-plume',5,'puddle',2.5);
check('lava-plume',5,'pr',24);
check('psystrike',5,'homing',1.2);
check('psystrike',5,'count',24);
check('origin-pulse',5,'knock',60);
check('roar-of-time',5,'charge',.8*.7);
check('roar-of-time',5,'width',58*1.3);
check('photon-geyser',5,'charge',.7*.7);
check('dynamax-cannon',5,'radius',340*1.3);
check('dynamax-cannon',5,'cd',2.4*.8);
const owners=[
 ['blue-flare',643,'fire'],['aeroblast',249,'flying'],
 ['moongeist-beam',792,'ghost'],['psystrike',150,'psychic'],
 ['origin-pulse',382,'water'],['sparkling-aria',730,'water'],
 ['roar-of-time',483,'dragon'],['photon-geyser',800,'psychic'],
 ['dynamax-cannon',890,'dragon']
];
for(const [id,dex,type]of owners){
 assert.ok(G.Moves.poolFor({dex,types:[type]}).includes(id),id+' owner');
 const other=[1,25,150,243].find(x=>x!==dex);
 assert.ok(!G.Moves.poolFor({dex:other,types:[type]}).includes(id),id+' non-owner');
}
assert.ok(G.Moves.poolFor({dex:4,types:['fire']}).includes('lava-plume'));
G.Coop.active=true;
for(const id of G.PKMSVV3DSStage8Moves.defs.map(d=>d.id))
 assert.ok(!G.Moves.poolFor({dex:643,types:['fire','flying','dragon','psychic','water','ghost']}).includes(id),'Co-op gate '+id);
const combat=read('systems/combat.js');
assert.ok(combat.includes('["projectile","dash","meteor","beam","nova"].includes(m.kind)'),'Stage8 built-in dispatch');
assert.ok(combat.includes('beam:(owner,m)=>beam(owner,m)'),'Stage8 delayed beam hook');
assert.ok(combat.includes('m.kind==="charge"'),'Stage8 target gate');
const bridge=read('systems/pkmsvv-3ds-projectile-stage6-fx.js');
assert.ok(bridge.includes("!['projectile','nova'].includes(m.kind)"),'Lava Plume native Nova zones');
console.log('PKMSVV_3DS_STAGE8_REAL_WEB_SOURCE_PASS original='+before+' added='+additions+' staged='+G.Moves.ALL.length+' productionNew=54');
