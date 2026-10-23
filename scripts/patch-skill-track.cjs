'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(rel,from,to){
 const p=path.join(game,rel),src=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 if(src.split(from).length!==2)throw Error('Skill patch anchor drift: '+rel+' / '+from.slice(0,80));
 fs.writeFileSync(p,src.replace(from,to),'utf8');
}
fs.copyFileSync(path.join(root,'src','pkmsvv-skill-track.js'),path.join(game,'js','data','pkmsvv-skill-track.js'));
patch('dev.html','<script defer src="js/data/pkmsvv-global-power.js"></script>',
 '<script defer src="js/data/pkmsvv-global-power.js"></script>\n<script defer src="js/data/pkmsvv-skill-track.js"></script>');
patch('js/entities/player.js','this.maxMoves = 6;         // PKMSVV: all six skills automatically fire',
 'this.maxMoves = G.PKMSVVSkillTrack.progress(G.DB.save).count; // 3–8 permanently shared skill slots');
patch('js/core/db.js',
 '      globalSpent: {},        // PKMSVV: real cost ledger for correct refunds across price updates',
 '      globalSpent: {},        // PKMSVV: real cost ledger for correct refunds across price updates\n      pkmsvvSkillMarks: {},   // permanently unlocked shared skill slots');
patch('js/core/db.js','    s.globalUpgrades = G.GlobalPower.clean(s.globalUpgrades);',
 '    s.pkmsvvSkillMarks = G.PKMSVVSkillTrack.progress(s).marks;\n    s.globalUpgrades = G.GlobalPower.clean(s.globalUpgrades);');
patch('js/core/db.js','    r.globalUpgrades = G.GlobalPower.merge(r.globalUpgrades,older.globalUpgrades);',
 '    r.pkmsvvSkillMarks = G.PKMSVVSkillTrack ? G.PKMSVVSkillTrack.merge(r.pkmsvvSkillMarks,older.pkmsvvSkillMarks) : Object.assign({},older.pkmsvvSkillMarks||{},r.pkmsvvSkillMarks||{});\n    r.globalUpgrades = G.GlobalPower.merge(r.globalUpgrades,older.globalUpgrades);');
patch('js/entities/enemy.js','          pl.kills++;\n          if (e.boss && !e.judge) pl.bosses++;',
 '          pl.kills++;\n          G.PKMSVVSkillTrack.refresh(G.DB.save,pl,true);\n          if (e.boss && !e.judge) pl.bosses++;');
patch('js/game.js','    save.stats.totalKills += pl.kills;',
 '    save.stats.totalKills += pl.kills;\n    G.PKMSVVSkillTrack.refresh(save,null,false,0);');
patch('js/ui/menu.js','        lv[u.id] = now + 1;\n        G.DB.commit(true);',
 '        lv[u.id] = now + 1;\n        G.PKMSVVSkillTrack.refresh(sv);\n        G.DB.commit(true);');
patch('js/ui/pkmsvv-global-power-ui.js',"        G.DB.commit(true);G.Audio.sfx('buy');G.UI.refreshCoins();",
 "        G.PKMSVVSkillTrack.refresh(G.DB.save);G.DB.commit(true);G.Audio.sfx('buy');G.UI.refreshCoins();");
console.log('PKMSVV: permanent shared 3–8 skill slots installed');
