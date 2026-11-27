'use strict';
/* Stage7 extends the Stage6 public-mirror patch, without changing
 * original dash / meteor behavior or full-game save / online structures.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(rel,from,to){
 const p=path.join(game,rel),s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 const occurrences=s.split(from).length-1;
 if(occurrences!==1)throw Error('Stage7 Web source anchor drift: '+rel+' '+occurrences+' '+from.slice(0,80));
 fs.writeFileSync(p,s.replace(from,to),'utf8');
}
fs.copyFileSync(path.join(root,'src','pkmsvv-3ds-stage7-dash-meteor.js'),
 path.join(game,'js','systems','pkmsvv-3ds-stage7-dash-meteor.js'));
const anchor='<script defer src="js/systems/pkmsvv-3ds-projectile-stage6-fx.js"></script>';
patch('dev.html',anchor,anchor+
 '\n<script defer src="js/systems/pkmsvv-3ds-stage7-dash-meteor.js"></script>');
// Stage6 routes newly-native projectile shots to original Web collision.
// Stage7 adds the two remaining built-in engine kinds, unlike special fields.
// Both ordinary existing and new 3DS moves remain compatible.
patch('js/systems/combat.js',
 'if(G.PKMSVV3DSMoveFamilies.isNativeMove(m.id) && m.kind==="projectile" &&',
 'if(G.PKMSVV3DSMoveFamilies.isNativeMove(m.id) && ["projectile","dash","meteor"].includes(m.kind) &&');
patch('js/systems/combat.js',
 'if (G.PKMSVV3DSMoveFamilies.isNativeMove(m.id) && m.kind!=="projectile") {',
 'if (G.PKMSVV3DSMoveFamilies.isNativeMove(m.id) && !["projectile","dash","meteor"].includes(m.kind)) {');
// Cap only new native meteor fields: an 8-AUTO-skill solo build can spawn
// too many delayed impacts. Do NOT change the pre-existing Web meteor logic.
patch('js/systems/combat.js',
 '    for (let i = 0; i < n; i++) {\n      const e = near[i];',
 '    for (let i = 0; i < n; i++) {\n'+
 '      if(m.pkmsvv3dsNative && fields.filter(f=>f.kind==="meteor"&&f.m?.pkmsvv3dsNative).length>=32)break;\n'+
 '      const e = near[i];');
console.log('PKMSVV_3DS_STAGE7_WEB_DASH_METEOR_SOURCE_PATCH_PASS');