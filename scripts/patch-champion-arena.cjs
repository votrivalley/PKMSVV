'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const game=path.join(root,'vendor','pokesurvivor');
function replace(file,needle,insert){
 const p=path.join(game,file),s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 if(s.split(needle).length!==2)throw Error('Champion Arena source drift: '+file+'/'+needle.slice(0,80));
 fs.writeFileSync(p,s.replace(needle,insert));
}
fs.copyFileSync(path.join(root,'src','pkmsvv-champion-arena.js'),path.join(game,'js','ui','pkmsvv-champion-arena.js'));
replace('dev.html','<script defer src="js/ui/pkmsvv-mega-phase3.js"></script>',
 '<script defer src="js/ui/pkmsvv-mega-phase3.js"></script>\n'+
 '<script defer src="js/ui/pkmsvv-champion-arena.js"></script>');
// No js/game.js rewrites: runtime wrappers handle Spawner/Rift/Judgment/EnemyMgr.
fs.appendFileSync(path.join(game,'css','style.css'),'\n'+fs.readFileSync(path.join(root,'src','pkmsvv-champion-arena.css'),'utf8')+'\n');
console.log('Champion Arena: live 1v1 boss combat, bracket, 10 regions, real-earned Crown Seals.');
