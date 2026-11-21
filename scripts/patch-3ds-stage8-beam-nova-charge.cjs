'use strict';
/* Stage8 AFTER Stage7, BEFORE original Web tools/build.js; fail closed.
 * Native Beam/Nova use original Web hit, wall clipping, shots, weather,
 * crit and props; Charge delegates delayed fire to that SAME beam() path.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(rel,from,to){
 const p=path.join(game,rel),src=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 const hits=src.split(from).length-1;
 if(hits!==1)throw Error('3DS Stage8 source anchor drift: '+rel+' matches='+hits+' '+from.slice(0,90));
 fs.writeFileSync(p,src.replace(from,to),'utf8');
}
for(const name of ['pkmsvv-3ds-stage8-beam-nova-charge','pkmsvv-3ds-charge-stage8'])
 fs.copyFileSync(path.join(root,'src',name+'.js'),path.join(game,'js','systems',name+'.js'));
const anchor='<script defer src="js/systems/pkmsvv-3ds-stage7-dash-meteor.js"></script>';
patch('dev.html',anchor,anchor+
 '\n<script defer src="js/systems/pkmsvv-3ds-stage8-beam-nova-charge.js"></script>'+
 '\n<script defer src="js/systems/pkmsvv-3ds-charge-stage8.js"></script>');
// Previous Stage7 routes existing native projectile/dash/meteor via built-in engine.
// Beam and Nova are native built-in kinds too; only Charge needs field runtime.
patch('js/systems/combat.js',
 '["projectile","dash","meteor"].includes(m.kind)',
 '["projectile","dash","meteor","beam","nova"].includes(m.kind)');
patch('js/systems/combat.js',
 '!["projectile","dash","meteor"].includes(m.kind)',
 '!["projectile","dash","meteor","beam","nova"].includes(m.kind)');
// Add delayed beam as an extra callback to the native Stage2..Stage5 FX wrapper.
patch('js/systems/combat.js',
 '          hit:(owner,e,dmg,col,dx,dy,knock,m)=>hit(owner,e,dmg,col,dx,dy,knock,m)\n',
 '          hit:(owner,e,dmg,col,dx,dy,knock,m)=>hit(owner,e,dmg,col,dx,dy,knock,m),\n'+
 '          beam:(owner,m)=>beam(owner,m)\n');
// Source target gating: native charge has the same range rule as Beam and must
// not consume cooldown or flash the cast animation without a nearby enemy.
patch('js/systems/combat.js',
 '    if(G.PKMSVV3DSStage5Combat.needsTarget(m) &&',
 '    if(m.pkmsvv3dsNative && m.kind==="charge" &&\n'+
 '      !(pl.target && !pl.target.dead && G.U.dist(pl.x,pl.y,pl.target.x,pl.target.y)<=m.radius+20)){\n'+
 '      m.t=.05;return;\n'+
 '    }\n'+
 '    if(G.PKMSVV3DSStage5Combat.needsTarget(m) &&');
// Charge ladder rank four reduces charge time by ×0.7 (not to 0.7 seconds).
patch('js/data/moves.js',"'rate', 'range', 'knock'];","'rate', 'range', 'knock', 'charge'];");
// Original Stage6 status bridge explicitly recognized native Projectile;
// allow native Nova lava drops through EXACT same swept collision and
// expiry hooks, without changing any existing non-native bullets.
patch('js/systems/pkmsvv-3ds-projectile-stage6-fx.js',
 "m.kind!=='projectile'","!['projectile','nova'].includes(m.kind)");
// Show native PMD charge animation/SFX while the real beam waits to fire.
patch('js/entities/player.js',
 "weather: 'Charge' }[m.kind] || 'Attack';",
 "weather: 'Charge', charge: 'Charge' }[m.kind] || 'Attack';");
patch('js/entities/player.js',
 "weather: 'buff' };",
 "weather: 'buff', charge: 'beam' };");
console.log('PKMSVV_3DS_STAGE8_BEAM_NOVA_CHARGE_SOURCE_PATCH_PASS');