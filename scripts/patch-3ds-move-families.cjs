'use strict';
// 3DS native skill mechanics → the shared uncompiled source for all clients.
// Must run AFTER patch-3ds-skill-effects-passives.cjs and BEFORE tools/build.js.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(file,from,to){
 const target=path.join(game,file);
 const text=fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n');
 const n=text.split(from).length-1;
 if(n!==1)throw Error('3DS skill family source anchor drift: '+file+' '+n+' for '+from.slice(0,90));
 fs.writeFileSync(target,text.replace(from,to),'utf8');
}
for(const name of ['pkmsvv-3ds-move-families','pkmsvv-3ds-combat-families'])
 fs.copyFileSync(path.join(root,'src',name+'.js'),
   path.join(game,'js','systems',name+'.js'));
const anchor='<script defer src="js/systems/pkmsvv-3ds-skill-port.js"></script>';
patch('dev.html',anchor,anchor+
 '\n<script defer src="js/systems/pkmsvv-3ds-move-families.js"></script>'+
 '\n<script defer src="js/systems/pkmsvv-3ds-combat-families.js"></script>');

patch('js/systems/combat.js',
 "      case 'cone':       cone(pl, m); break;",
 "      case 'cone':       cone(pl, m); break;\n"+
 "      case 'spin':\n"+
 "      case 'quake':\n"+
 "      case 'vortex':    G.PKMSVV3DSCombatFX.spawn(fields,pl,m,ghost); break;");

patch('js/systems/combat.js',
 '      f.t += dt;\n      if (f.gone || !f.owner ||',
 '      f.t += dt;\n'+
 '      if(G.PKMSVV3DSCombatFX.isPortField(f)){\n'+
 '        const finished=G.PKMSVV3DSCombatFX.update(f,dt,{\n'+
 '          blast:(field,r)=>blast(field,r),\n'+
 '          hit:(owner,e,dmg,col,dx,dy,knock,m)=>hit(owner,e,dmg,col,dx,dy,knock,m)\n'+
 '        });\n'+
 '        if(finished)fields.splice(i,1);\n'+
 '        continue;\n'+
 '      }\n'+
 '      if (f.gone || !f.owner ||');

patch('js/systems/combat.js',
 "      ctx.save();\n      if (f.kind === 'patch') {",
 "      ctx.save();\n"+
 "      if(G.PKMSVV3DSCombatFX.isPortField(f)){\n"+
 "        G.PKMSVV3DSCombatFX.draw(ctx,f,now);\n"+
 "        ctx.restore();continue;\n"+
 "      }\n"+
 "      if (f.kind === 'patch') {");

console.log('PKMSVV_3DS_NATIVE_SPIN_QUAKE_VORTEX_COMBAT_PORT_PASS');
