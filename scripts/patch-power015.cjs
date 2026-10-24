'use strict';
/* v0.9.6+: water/flying types and visually airborne species ignore water/swamp
 * movement penalties. Hover immunity is movement-only, not lava/poison immunity.
 * Area + effect-duration permanently modify the real move instances.
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
// National Dex IDs, not type/ability checks: Celebi/Jirachi and other winged or
// hovering Pokemon should skim the water even if they are not Flying-type.
// Levitate is handled separately by the Ability system. Never suppress hazards.
const HOVER_DEX = Object.freeze([
  // Wings or constant aerial movement (without needing the Flying type)
  15, 49, 251, 269, 313, 314, 329, 330, 494, 742, 743, 804, 873, 994,
  // Hovering/levitating models, including legends and Psychic/Ghost/Steel
  81, 82, 92, 93, 109, 110, 150, 151, 200, 201, 233, 337, 338, 343, 344, 351, 353, 355, 358, 374, 375, 380, 381, 385, 386, 433, 436, 437, 462, 474, 479, 480, 481, 482, 488, 491, 517, 518, 546, 547, 577, 578, 579, 582, 583, 584, 599, 600, 601, 605, 606, 607, 608, 609, 615, 648, 679, 680, 681, 703, 707, 719, 720, 789, 790, 792, 793, 800, 803, 854, 855, 868, 898, 987, 1000, 1025
]);
patch('js/entities/player.js',
 'G.Player = class Player {',
 'G.PKMSVVWaterHoverDex = new Set(' + JSON.stringify(HOVER_DEX) + ');\nG.Player = class Player {');
// Use the evolved form's dex ID (this.dex), never the initial selected species.
// Water and swamp are the only terrain types using a movement-slow modifier.
patch('js/entities/player.js',
 '    const slow = this.inLiquid ? G.World.liquidEffect(this.mon.types).slow || 1 : 1;',
 '    const slow = this.inLiquid && !G.PKMSVVWaterHoverDex.has(this.dex) ? G.World.liquidEffect(this.mon.types).slow || 1 : 1;');
patch('js/entities/player.js',
 '    this.coinMul = perks.coinMul || 1;',
 '    this.coinMul = perks.coinMul || 1;\n'+
 '    this.areaMul = perks.areaMul || 1;  // Votri Valley: attack AoE size\n'+
 '    this.durationMul = perks.durationMul || 1; // Votri Valley: effect lifetime');
patch('js/entities/player.js',
 '    const m = G.Moves.instance(id, 1);',
 '    const m = G.GlobalPower.applyMove(G.Moves.instance(id, 1), this);');
console.log('PKMSVV: water/flying and hovering species traverse water/swamp normally; all team powerups active (15).');
