'use strict';
/* v0.9.6: flying Pokémon are not slowed by water/swamp;
 * area + effect-duration permanently modify the real move instances.
 */
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(file,from,to){
 const name=path.join(base,file);
 const raw=fs.readFileSync(name,'utf8').replace(/\r\n/g,'\n');
 const parts=raw.split(from);
 if(parts.length!==2)throw Error('Power-15 patch: expected a unique anchor in '+file+' ('+from.slice(0,90)+')');
 fs.writeFileSync(name,parts.join(to),'utf8');
}
patch('js/world/world.js',
 "water: { slow: 0.6, immune: ['water'] },",
 "water: { slow: 0.6, immune: ['water', 'flying'] },");
patch('js/world/world.js',
 "swamp: { slow: 0.45, immune: ['water'] },",
 "swamp: { slow: 0.45, immune: ['water', 'flying'] },");
patch('js/entities/player.js',
 '    this.coinMul = perks.coinMul || 1;',
 '    this.coinMul = perks.coinMul || 1;\n'+
 '    this.areaMul = perks.areaMul || 1;  // Votri Valley: attack AoE size\n'+
 '    this.durationMul = perks.durationMul || 1; // Votri Valley: effect lifetime');
patch('js/entities/player.js',
 '    const m = G.Moves.instance(id, 1);',
 '    const m = G.GlobalPower.applyMove(G.Moves.instance(id, 1), this);');
console.log('PKMSVV: flying water/swamp normal speed; all team powerups active (15).');
