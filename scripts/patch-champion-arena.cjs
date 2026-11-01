'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const game=path.join(root,'vendor','pokesurvivor');
function replace(file,needle,insert){
 const p=path.join(game,file),s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 if(s.split(needle).length!==2)throw Error('Champion Arena source drift: '+file+'/'+needle.slice(0,80));
 fs.writeFileSync(p,s.replace(needle,insert));
}
fs.copyFileSync(path.join(root,'src','pkmsvv-champion-arena.js'),path.join(game,'js','ui','pkmsvv-champion-arena.js'));
fs.copyFileSync(path.join(root,'src','pkmsvv-arena-solo.js'),path.join(game,'js','ui','pkmsvv-arena-solo.js'));
fs.copyFileSync(path.join(root,'src','pkmsvv-wiki.js'),path.join(game,'js','ui','pkmsvv-wiki.js'));
fs.copyFileSync(path.join(root,'src','pkmsvv-mega-gacha.js'),path.join(game,'js','ui','pkmsvv-mega-gacha.js'));
replace('dev.html','<script defer src="js/ui/pkmsvv-mega-phase3.js"></script>',
 '<script defer src="js/ui/pkmsvv-mega-phase3.js"></script>\n'+
 '<script defer src="js/ui/pkmsvv-mega-gacha.js"></script>\n'+
 '<script defer src="js/ui/pkmsvv-champion-arena.js"></script>\n'+
 '<script defer src="js/ui/pkmsvv-arena-solo.js"></script>\n'+
 '<script defer src="js/ui/pkmsvv-wiki.js"></script>');

// When a duel ends, invalidate chunks cached as arena terrain. The original
// setArena(null) cleared only the flag but kept the tiles rendered as the arena.
replace('js/world/world.js',
 '      arena = a;\n      if (!a) return;\n      a.th = G.Tiles.ARENA_THEMES[a.type] || G.Tiles.ARENA_THEMES.normal;',
 '      const formerArena=arena;\n      arena=a;\n      if(!a&&!formerArena)return;\n      const zone=a||formerArena;\n      if(a)a.th=G.Tiles.ARENA_THEMES[a.type] || G.Tiles.ARENA_THEMES.normal;');
replace('js/world/world.js','      const R = a.r + 9;','      const R = zone.r + 9;');
replace('js/world/world.js',
 'if (Math.abs(cx * N + N / 2 - a.tx) < R + N && Math.abs(cy * N + N / 2 - a.ty) < R + N)',
 'if (Math.abs(cx * N + N / 2 - zone.tx) < R + N && Math.abs(cy * N + N / 2 - zone.ty) < R + N)');
// New visible Chapters 5/6 are ADDITIVE. Preserve the old story flags and merges.
// Neither a newer offline backup nor another device may erase a Crown Seal.
replace('js/core/db.js',
 '      pkmsvvChapter3Seen:false,pkmsvvChapter3Pending:false,pkmsvvEggSlot3:false,',
 '      pkmsvvChapter3Seen:false,pkmsvvChapter3Pending:false,pkmsvvEggSlot3:false,\n'+
 '      pkmsvvChapter5Seen:false,pkmsvvChapter6Seen:false,\n'+
 '      pkmsvvChapter7Seen:false,pkmsvvChapter8Pending:false,pkmsvvChapter8IntroSeen:false,\n'+
 '      pkmsvvChapter8TenChampionDone:false,pkmsvvChapter9MegaSeen:false,\n'+
 '      pkmsvvChapter9MegaDone:false,pkmsvvChapter9Pending:false,\n'+
 '      pkmsvvChapter10Pending:false,pkmsvvChapter10Seen:false,pkmsvvChapter10Done:false,\n'+
 '      pkmsvvRayquazaDefeated:false,pkmsvvShadowBonusTeased:false,\n'+
 '      pkmsvvMultiplayerDone:{},arenaGacha:{points:0,pity:0,pulls:0,championPaid:{}},');
replace('js/core/db.js',
 '    r.pkmsvvEggSlot3=!!(r.pkmsvvEggSlot3||older.pkmsvvEggSlot3);',
 '    r.pkmsvvEggSlot3=!!(r.pkmsvvEggSlot3||older.pkmsvvEggSlot3);\n'+
 '    r.pkmsvvChapter5Seen=!!(r.pkmsvvChapter5Seen||older.pkmsvvChapter5Seen);\n'+
 '    r.pkmsvvChapter6Seen=!!(r.pkmsvvChapter6Seen||older.pkmsvvChapter6Seen);\n'+
 '    r.pkmsvvChapter7Seen=!!(r.pkmsvvChapter7Seen||older.pkmsvvChapter7Seen);\n'+
 '    for(const k of ["pkmsvvChapter8Pending","pkmsvvChapter8IntroSeen","pkmsvvChapter8TenChampionDone",\n'+
 '      "pkmsvvChapter9MegaSeen","pkmsvvChapter9MegaDone","pkmsvvChapter9Pending",\n'+
 '      "pkmsvvChapter10Pending","pkmsvvChapter10Seen","pkmsvvChapter10Done",\n'+
 '      "pkmsvvRayquazaDefeated","pkmsvvShadowBonusTeased"]){\n'+
 '      r[k]=!!(r[k]||older[k]);}\n'+
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
 '    const crown={trophies:{},seals:{},rewards:{},history:[]};\n'+
 '    const past=[...(localCup.history||[]),...(otherCup.history||[])];\n'+
 '    const seenHistory=new Set();\n'+
 '    for(const record of past){if(!record||!record.region||!record.at)continue;\n'+
 '      const key=[record.region,record.dex,record.at].join(\":\");\n'+
 '      if(seenHistory.has(key))continue;seenHistory.add(key);crown.history.push(record);}\n'+
 '    crown.history.sort((a,b)=>String(a.at).localeCompare(String(b.at)));\n'+
 '    if(crown.history.length>75)crown.history=crown.history.slice(-75);\n'+
 '    for(const region of new Set([...Object.keys(localCup.trophies||{}),...Object.keys(otherCup.trophies||{}),...Object.keys(localCup.seals||{}),...Object.keys(otherCup.seals||{}),...Object.keys(localCup.rewards||{}),...Object.keys(otherCup.rewards||{})])){\n'+
 '      if(localCup.trophies?.[region]||otherCup.trophies?.[region])crown.trophies[region]=true;\n'+
 '      if(localCup.seals?.[region]||otherCup.seals?.[region])crown.seals[region]=true;\n'+
 '      const a=localCup.rewards?.[region],b=otherCup.rewards?.[region];\n'+
 '      if(a||b){const rank=Math.min(Number(a?.rank)||99,Number(b?.rank)||99);\n'+
 '        crown.rewards[region]={rank,tickets:Math.max(Number(a?.tickets)||0,Number(b?.tickets)||0)};}\n'+
 '    }\n'+
 '    r.arenas.pkmChampion=crown;');
// Capture the actual mode when the game starts, before any room teardown.
// Android standalone AI may reset G.Social.room before a party-wipe game over.
replace('js/game.js',
 '  function quitRun() {\n    if (G.Coop.active) G.Coop.leave();',
 "  let pkmsvvQuitMode=null,pkmsvvActiveMode=null,pkmsvvManualExit=false;\n"+
 "  function quitRun() {\n"+
 "    pkmsvvManualExit=true;\n"+
 "    pkmsvvQuitMode=pkmsvvActiveMode||(G.Coop.active?G.Social?.room?.mode:null);\n"+
 "    if (G.Coop.active) G.Coop.leave();");
replace('js/game.js',
 '  function startRun(coop = null) {',
 "  function startRun(coop = null) {\n"+
 "    pkmsvvManualExit=false;pkmsvvQuitMode=null;\n"+
 "    pkmsvvActiveMode=coop?(G.Social?.room?.mode||coop.mode||G.LanBus?.room?.mode||null):null;");
replace('js/game.js',
 '    const coop = !!pl.uid;                    // sólo las partidas en grupo le ponen uid',
 '    const pkmsvvFinishedMode=(G.Coop.active?G.Social?.room?.mode:null)||pkmsvvActiveMode||pkmsvvQuitMode||\n'+
 "      (G.Royale?.active?'royale':G.EggRush?.active?'eggrush':G.PKMSVVBerryRescue?.active?'berry':(pl.uid?'coop':null));\n"+
 '    const pkmsvvWasManualExit=pkmsvvManualExit;\n'+
 '    pkmsvvActiveMode=null;pkmsvvQuitMode=null;pkmsvvManualExit=false;\n'+
 '    const coop = !!pl.uid;                    // sólo las partidas en grupo le ponen uid');
replace('js/game.js',
 "    G.DB.commit('run');",
 "    G.PKMSVVStory?.recordMultiplayerCompletion?.(pkmsvvFinishedMode,{time,\n"+
 "      completed:!pkmsvvWasManualExit,abandoned:pkmsvvWasManualExit&&time<60,\n"+
 "      result:pkmsvvFinishedMode==='royale'?G.Royale?.outcome:\n"+
 "             pkmsvvFinishedMode==='eggrush'?G.EggRush?.outcome:null});\n"+
 "    G.DB.commit('run');");
// Feed the actual completed mode into the existing run-result UI.
replace('js/game.js',
 '    G.RunUI.showOver({',
 '    G.RunUI.showOver({\n      pkmsvvFinishedMode,');
replace('js/ui/run-ui.js',
 "    G.UI.show('scr-over');",
 `    G.UI.show('scr-over');
    if(r.pkmsvvFinishedMode==='coop'){
      const box=document.getElementById('over-stats');
      const progress=G.PKMSVVStory?.multiplayerProgress?.();
      const counted=G.DB.save?.pkmsvvMultiplayerDone?.coop===true;
      if(box){
        const notice=document.createElement('div');
        notice.style.cssText='grid-column:1/-1;padding:10px;border:2px solid #e4c56b;border-radius:9px;background:#183746;color:#f9e7ac';
        notice.textContent=counted?
          '✅ Sống Sót đã được tính · '+(progress?.count||1)+'/2 nhiệm vụ · Tiếp theo: Sống Còn → Berry → Arena':
          !G.DB.save?.pkmsvvChapter3Seen?
           '🔒 Hoàn thành Chương 4 trước khi nhận tiến độ Sống Sót':
          r.time<60?'Sống Sót: cần chơi tối thiểu 60 giây để tính nhiệm vụ':
          'Sống Sót chưa được ghi nhận · vui lòng kiểm tra lại tiến trình';
        box.prepend(notice);
      }
    }`);
// No other js/game.js rewrites: runtime wrappers handle Spawner/Rift/Judgment/EnemyMgr.
fs.appendFileSync(path.join(game,'css','style.css'),'\n'+fs.readFileSync(path.join(root,'src','pkmsvv-champion-arena.css'),'utf8')+'\n'+
 fs.readFileSync(path.join(root,'src','pkmsvv-mega-gacha.css'),'utf8')+'\n'+
 fs.readFileSync(path.join(root,'src','pkmsvv-arena-solo.css'),'utf8')+'\n');
console.log('Champion Arena: live 1v1 boss combat, bracket, 10 regions, real-earned Crown Seals.');
