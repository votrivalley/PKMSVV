'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const game=path.join(root,'vendor','pokesurvivor');
function replace(file,needle,insert){
 const p=path.join(game,file),s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 if(s.split(needle).length!==2)throw Error('Champion Arena source drift: '+file+'/'+needle.slice(0,80));
 fs.writeFileSync(p,s.replace(needle,insert));
}
fs.copyFileSync(path.join(root,'src','pkmsvv-champion-arena.js'),path.join(game,'js','ui','pkmsvv-champion-arena.js'));
fs.copyFileSync(path.join(root,'src','pkmsvv-mega-gacha.js'),path.join(game,'js','ui','pkmsvv-mega-gacha.js'));
replace('dev.html','<script defer src="js/ui/pkmsvv-mega-phase3.js"></script>',
 '<script defer src="js/ui/pkmsvv-mega-phase3.js"></script>\n'+
 '<script defer src="js/ui/pkmsvv-mega-gacha.js"></script>\n'+
 '<script defer src="js/ui/pkmsvv-champion-arena.js"></script>');

// New visible Chapters 5/6 are ADDITIVE. Preserve the old story flags and merges.
// Neither a newer offline backup nor another device may erase a Crown Seal.
replace('js/core/db.js',
 '      pkmsvvChapter3Seen:false,pkmsvvChapter3Pending:false,pkmsvvEggSlot3:false,',
 '      pkmsvvChapter3Seen:false,pkmsvvChapter3Pending:false,pkmsvvEggSlot3:false,\n'+
 '      pkmsvvChapter5Seen:false,pkmsvvChapter6Seen:false,\n'+
 '      pkmsvvChapter7Seen:false,pkmsvvMultiplayerDone:{},arenaGacha:{points:0,pity:0,pulls:0,championPaid:{}},');
replace('js/core/db.js',
 '    r.pkmsvvEggSlot3=!!(r.pkmsvvEggSlot3||older.pkmsvvEggSlot3);',
 '    r.pkmsvvEggSlot3=!!(r.pkmsvvEggSlot3||older.pkmsvvEggSlot3);\n'+
 '    r.pkmsvvChapter5Seen=!!(r.pkmsvvChapter5Seen||older.pkmsvvChapter5Seen);\n'+
 '    r.pkmsvvChapter6Seen=!!(r.pkmsvvChapter6Seen||older.pkmsvvChapter6Seen);\n'+
 '    r.pkmsvvChapter7Seen=!!(r.pkmsvvChapter7Seen||older.pkmsvvChapter7Seen);\n'+
 '    r.arenaGacha=r.arenaGacha||{points:0,pity:0,pulls:0,championPaid:{}};\n'+
 '    const oldAG=older.arenaGacha||{};\n'+
 '    r.arenaGacha.championPaid={...(oldAG.championPaid||{}),...(r.arenaGacha.championPaid||{})};\n'+
 '    r.arenaGacha.points=Math.max(0,Number(r.arenaGacha.points)||0);\n'+
 '    r.arenaGacha.pity=Math.max(0,Number(r.arenaGacha.pity)||0);\n'+
 '    r.arenaGacha.pulls=Math.max(0,Number(r.arenaGacha.pulls)||0);\n'+
 '    r.pkmsvvMultiplayerDone=r.pkmsvvMultiplayerDone||{};\n'+
 '    for(const mode of ["coop","royale","eggrush"]){r.pkmsvvMultiplayerDone[mode]=!!(r.pkmsvvMultiplayerDone[mode]||older.pkmsvvMultiplayerDone?.[mode]);}\n'+
 '    r.arenas=r.arenas||{};\n'+
 '    const localCup=r.arenas.pkmChampion||{},otherCup=older.arenas?.pkmChampion||{};\n'+
 '    const crown={trophies:{},seals:{},rewards:{}};\n'+
 '    for(const region of new Set([...Object.keys(localCup.trophies||{}),...Object.keys(otherCup.trophies||{}),...Object.keys(localCup.seals||{}),...Object.keys(otherCup.seals||{}),...Object.keys(localCup.rewards||{}),...Object.keys(otherCup.rewards||{})])){\n'+
 '      if(localCup.trophies?.[region]||otherCup.trophies?.[region])crown.trophies[region]=true;\n'+
 '      if(localCup.seals?.[region]||otherCup.seals?.[region])crown.seals[region]=true;\n'+
 '      const a=localCup.rewards?.[region],b=otherCup.rewards?.[region];\n'+
 '      if(a||b){const rank=Math.min(Number(a?.rank)||99,Number(b?.rank)||99);\n'+
 '        crown.rewards[region]={rank,tickets:Math.max(Number(a?.tickets)||0,Number(b?.tickets)||0)};}\n'+
 '    }\n'+
 '    r.arenas.pkmChampion=crown;');
// Capture a genuine group-run completion before the upstream endRun closes Co-op.
// The quit path exits Co-op before endRun; it cannot count as a completed mode.
replace('js/game.js',
 '    const coop = !!pl.uid;                    // sólo las partidas en grupo le ponen uid',
 '    const pkmsvvFinishedMode=G.Coop.active?G.Social?.room?.mode:null;\n'+
 '    const coop = !!pl.uid;                    // sólo las partidas en grupo le ponen uid');
replace('js/game.js',
 "    G.DB.commit('run');",
 "    G.PKMSVVStory?.recordMultiplayerCompletion?.(pkmsvvFinishedMode,{time,\n"+
 "      result:pkmsvvFinishedMode==='royale'?G.Royale?.outcome:\n"+
 "             pkmsvvFinishedMode==='eggrush'?G.EggRush?.outcome:null});\n"+
 "    G.DB.commit('run');");
// No other js/game.js rewrites: runtime wrappers handle Spawner/Rift/Judgment/EnemyMgr.
fs.appendFileSync(path.join(game,'css','style.css'),'\n'+fs.readFileSync(path.join(root,'src','pkmsvv-champion-arena.css'),'utf8')+'\n'+
 fs.readFileSync(path.join(root,'src','pkmsvv-mega-gacha.css'),'utf8')+'\n');
console.log('Champion Arena: live 1v1 boss combat, bracket, 10 regions, real-earned Crown Seals.');
