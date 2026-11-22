'use strict';
// Stage 5 shared-game source patch. After Stage4 support, BEFORE Web bundling.
// Do not merge/deploy without exact pinned base and device gameplay QA.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(rel,from,to){
 const p=path.join(game,rel),text=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 const n=text.split(from).length-1;
 if(n!==1)throw Error('3DS Stage5 source anchor drift: '+rel+' '+n+' '+from.slice(0,105));
 fs.writeFileSync(p,text.replace(from,to),'utf8');
}
for(const name of ['pkmsvv-3ds-stage5-moves','pkmsvv-3ds-combat-stage5'])
 fs.copyFileSync(path.join(root,'src',name+'.js'),path.join(game,'js','systems',name+'.js'));
const anchor='<script defer src="js/systems/pkmsvv-3ds-support-stage4.js"></script>';
patch('dev.html',anchor,anchor+
 '\n<script defer src="js/systems/pkmsvv-3ds-stage5-moves.js"></script>'+
 '\n<script defer src="js/systems/pkmsvv-3ds-combat-stage5.js"></script>');
// The old 103-skill engine multiplies only its old numeric upgrade keys.
// New native Leap upgrades RANGE (not absolute 1.3 px), while Earthquake
// stage2 upgrades KNOCK (not absolute 1.25). No mutation to original moves.
patch('js/data/moves.js',
 "const MULT = ['dmg', 'cd', 'speed', 'radius', 'dur', 'amount', 'arc', 'width', 'spread', 'life', 'size', 'rate'];",
 "const MULT = ['dmg', 'cd', 'speed', 'radius', 'dur', 'amount', 'arc', 'width', 'spread', 'life', 'size', 'rate', 'range', 'knock'];");
// Ensure native physical Scissor, Blitz, Leap and Boom don't waste cooldown
// when no nearby target is present. Weather is autonomous, so no such gate.
// Insert native targeting without replacing the existing CDR/balance expression,
// which differs between official PKMSVV and the public QA mirror.
patch('js/systems/combat.js',
 "    if(m.kind==='rest' && !G.PKMSVV3DSStage4Support.needsRest(pl))",
 '    if(G.PKMSVV3DSStage5Combat.needsTarget(m) &&\n'+
 '      !(pl.target && G.U.dist(pl.x,pl.y,pl.target.x,pl.target.y)<=G.PKMSVV3DSStage5Combat.reach(m))) {\n'+
 '      m.t=0.05;return;\n'+
 '    }\n'+
 "    if(m.kind==='rest' && !G.PKMSVV3DSStage4Support.needsRest(pl))");
// Player PMD 8-direction animations and sounds for new five families.
patch('js/entities/player.js',
 "wave: 'Shoot', tremor: 'Attack' }[m.kind] || 'Attack';",
 "wave: 'Shoot', tremor: 'Attack', scissor: 'Attack', blitz: 'Attack', leap: 'Attack', boom: 'Attack', weather: 'Charge' }[m.kind] || 'Attack';");
patch('js/entities/player.js',
 "wave: 'projectile', tremor: 'nova' };",
 "wave: 'projectile', tremor: 'nova', scissor: 'melee', blitz: 'dash', leap: 'dash', boom: 'nova', weather: 'buff' };");
console.log('PKMSVV_3DS_STAGE5_SCISSOR_BLITZ_LEAP_BOOM_WEATHER_SOURCE_PATCH_PASS');
