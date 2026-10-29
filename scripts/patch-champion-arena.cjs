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
// No unplanned horde spawns while a real tournament duel is active.
replace('js/game.js',
 '    if (!coop || G.Coop.isHost) { G.Path.update(dt, all); G.Spawner.update(dt, all, time); }',
 '    if (!coop || G.Coop.isHost) { G.Path.update(dt, all); if(!G.PKMSVVChampionArena?.active) G.Spawner.update(dt, all, time); }');
// The real enemy system runs first; only its actual death may move the bracket.
replace('js/game.js',
 '    G.EnemyMgr.update(dt, all);',
 '    G.EnemyMgr.update(dt, all);\n    G.PKMSVVChampionArena?.update(dt);');
replace('js/game.js',
 '    G.Rift.update(dt, pl, time);',
 '    if(!G.PKMSVVChampionArena?.active)G.Rift.update(dt, pl, time);');
replace('js/game.js',
 '    G.Judgment.update(dt, pl, time);',
 '    if(!G.PKMSVVChampionArena?.active)G.Judgment.update(dt, pl, time);');
fs.appendFileSync(path.join(game,'css','style.css'),'\n'+fs.readFileSync(path.join(root,'src','pkmsvv-champion-arena.css'),'utf8')+'\n');
console.log('Champion Arena: live 1v1 boss combat, bracket, 10 regions, real-earned Crown Seals.');
