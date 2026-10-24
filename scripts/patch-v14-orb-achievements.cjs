'use strict';
// Stage achievement definitions alongside original medals. No separate save service.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(p,a,b){const file=path.join(game,p),s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');if(s.split(a).length!==2)throw Error('Orb achievement patch drift '+p+': '+a.slice(0,80));fs.writeFileSync(file,s.replace(a,b),'utf8');}
fs.copyFileSync(path.join(root,'src','v14','orb-achievements.js'),path.join(game,'js','data','pkmsvv-orb-achievements.js'));
patch('dev.html',
 '<script defer src="js/data/achievements.js"></script>',
 '<script defer src="js/data/achievements.js"></script>\n<script defer src="js/data/pkmsvv-orb-achievements.js"></script>');
// Existing multi-device save reconciles all achievement IDs; bitmask needs a union
// rather than max so two devices' different Orb types are never forgotten.
patch('js/core/db.js',
 '    for (const k in older.stats || {}) r.stats[k] = Math.max(r.stats[k] || 0, older.stats[k] || 0);',
 '    for (const k in older.stats || {}) r.stats[k] = Math.max(r.stats[k] || 0, older.stats[k] || 0);\n'+
 '    r.stats.pkmsvvOrbTypeMask = ((r.stats.pkmsvvOrbTypeMask||0)|(older.stats&&older.stats.pkmsvvOrbTypeMask||0))&63;');
console.log('SVV achievements: 8 slots, 8 learned moves, first/10 Orb pickups, 10 Orb uses and six-type mastery.');
