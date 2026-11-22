'use strict';
/* Source-patched real public-mirror JS regression.
 * Never describe this 64-skill QA mirror as 103-skill full PKMSVV production.
 */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root='vendor/pokesurvivor/js',read=p=>fs.readFileSync(root+'/'+p,'utf8');
const G={Coop:{active:false}},ctx={G,Math};
vm.runInNewContext(read('data/moves.js'),ctx,{filename:'moves.js'});
const before=G.Moves.ALL.length,old=new Map(G.Moves.ALL.map(m=>[m.id,m]));
const sources=['move-families','stage3-moves','stage4-moves','stage5-moves',
 'stage6-projectiles','stage7-dash-meteor','stage8-beam-nova-charge',
 'stage9-homing-cone-melee','stage10-final-moves'];
for(const s of sources)
 vm.runInNewContext(read('systems/pkmsvv-3ds-'+s+'.js'),ctx,{filename:s});
const added=73+['rapid-spin','whirlpool'].filter(id=>!old.has(id)).length;
assert.equal(G.PKMSVV3DSMoveFamilies.registered.length,added);
assert.equal(G.Moves.ALL.length,before+added);
assert.equal(new Set(G.Moves.ALL.map(d=>d.id)).size,G.Moves.ALL.length);
for(const [id,d]of old)assert.equal(G.Moves.BY_ID[id],d,'legacy overwrite '+id);
const M=G.Moves,inst=(id,lv,key)=>M.instance(id,lv)[key];
const near=(got,want,label)=>assert.ok(Math.abs(got-want)<1e-7,
 (label||'numeric')+' got '+got+' expected '+want);
near(inst('relic-song',5,'knock'),360*1.5);
near(inst('relic-song',5,'radius'),110*1.25);
near(inst('relic-song',5,'dmg'),84.58*1.4*1.4);
near(inst('clanging-scales',5,'knock'),300*1.5);
near(inst('mortal-spin',5,'count'),5);
near(inst('mortal-spin',5,'poison'),1.5);
near(inst('mortal-spin',5,'cd'),.75);
near(inst('darkest-lariat',5,'radius'),78*1.25);
near(inst('waterfall',5,'stun'),.8*1.5);
near(inst('waterfall',5,'dmg'),23.01*1.4*1.3);
near(inst('dark-void',5,'radius'),110*1.25);
near(inst('dark-void',5,'stun'),1.8*1.5);
near(inst('glaciate',5,'radius'),190*1.25*1.2);
near(inst('glaciate',5,'slow'),.6);
near(inst('psyshock',5,'bounce'),6);
near(inst('psyshock',5,'count'),2);
near(inst('psyshock',5,'spread'),.12*1.3);
near(inst('geomancy',5,'amount'),.18*1.4*1.4);
near(inst('geomancy',5,'dur'),8*1.5);
near(inst('geomancy',5,'stacks'),7);
near(inst('precipice-blades',5,'count'),12);
near(inst('precipice-blades',5,'radius'),40*1.25);
for(const [id,dex,type]of [
 ['relic-song',648,'normal'],['clanging-scales',784,'dragon'],
 ['mortal-spin',970,'poison'],['darkest-lariat',727,'dark'],
 ['dark-void',491,'dark'],['glaciate',646,'ice'],
 ['geomancy',716,'fairy'],['precipice-blades',383,'ground']
]){
 assert.ok(M.poolFor({dex,types:[type]}).includes(id),'owner '+id);
 assert.ok(!M.poolFor({dex:25,types:[type]}).includes(id),'blocked '+id);
}
G.Coop.active=true;
for(const d of G.PKMSVV3DSStage10Moves.defs)
 assert.ok(!M.poolFor({dex:d.only?.[0]||25,types:[d.type]}).includes(d.id),
  'Live Co-op cannot learn '+d.id);
const combat=read('systems/combat.js'),
      player=read('entities/player.js'),
      moves=read('data/moves.js'),
      stageFX=read('systems/pkmsvv-3ds-combat-stage10.js');
for(const part of [
 '"bounce"].includes(m.kind)','PKMSVV3DSStage10Combat.needsTarget(m)',
 "case 'bounce':     fireProjectiles(pl, m)",
 'PKMSVV3DSStage10Combat.rebound(p,e)',
 'PKMSVV3DSStage10Combat.specialMultiplier(pl,m)',
 'PKMSVV3DSStage10Combat.specialMultiplier(pl,p)',
 'pkmsvv3dsCategory:m.cat||null',
 'pkmsvv3dsShredT','p.splash>0',
 'PKMSVV3DSStage6ProjectileFX.onHit(p,e)'
])assert.ok(combat.includes(part),'missing combat route '+part);
assert.ok(player.includes('G.PKMSVV3DSStage10Combat.tickPlayer(this,dt)'));
assert.ok(moves.includes("'charge', 'stun'"));
assert.ok(moves.includes("'stacks', 'bounce'"));
assert.ok(stageFX.includes("f.kind===PREFIX+'stun'"));
console.log('PKMSVV_3DS_STAGE10_REAL_WEB_SOURCE_PASS base='+before+
 ' added='+added+' mirrorTotal='+G.Moves.ALL.length+' productionNew=73');
