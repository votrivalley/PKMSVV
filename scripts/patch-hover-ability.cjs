'use strict';
/* Final terrain-speed integration AFTER Kecleon's Ability patch.
 * The Ability system replaces Player.spd and must preserve the airborne
 * National Dex overlay installed earlier by patch-power015.cjs.
 * Important: status-slow immunity (ab.steady) does NOT grant water/swamp
 * movement immunity. Only Water/Flying types, true Levitate (via inLiquid=false)
 * and explicitly hovering species are exempt from liquid movement slowdown.
 */
const fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'..','vendor','pokesurvivor','js','entities','player.js');
const source=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
const old='    const slow=this.inLiquid&&!ab.steady?(G.World.liquidEffect(this.mon.types).slow||1):1;';
const updated='    const slow=this.inLiquid&&!G.PKMSVVWaterHoverDex.has(this.dex)&&!this._pkmsvvMegaIgnoresWater?(G.World.liquidEffect(this.mon.types).slow||1):1;';
if(source.split(old).length!==2)throw Error('Hover+Ability movement anchor changed');
if(!source.includes('G.PKMSVVWaterHoverDex = new Set('))throw Error('Missing airborne Dex set');
fs.writeFileSync(file,source.replace(old,updated),'utf8');
console.log('PKMSVV: preserve hovering Pokémon water movement with Nature/Ability speed calculation.');
