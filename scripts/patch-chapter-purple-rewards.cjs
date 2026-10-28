'use strict';
/* v1.5.35: one existing purple Gacha x10 ticket for each completed story chapter. */
const fs=require('node:fs'),path=require('node:path');
const game=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(file,from,to){
 const full=path.join(game,file),source=fs.readFileSync(full,'utf8').replace(/\r\n/g,'\n');
 if(source.split(from).length!==2)throw Error('Chapter purple reward patch drift: '+file+' '+from.slice(0,95));
 fs.writeFileSync(full,source.replace(from,to),'utf8');
}
// Defaults for new saves and additive migration for old saves.
// Existing saves intentionally DON'T pre-claim rewards: old Chapter 0–3
// completions are eligible retroactively on first menu open.
patch('js/core/db.js',
 '      pkmsvvChapter3Seen:false,pkmsvvChapter3Pending:false,pkmsvvEggSlot3:false,',
 '      pkmsvvChapter3Seen:false,pkmsvvChapter3Pending:false,pkmsvvEggSlot3:false,\n'+
 '      pkmsvvChapterPurpleRewards:{}, // chapter IDs 0–3 already awarded (Gacha x10)');
patch('js/core/db.js',
 '    r.pkmsvvEggSlot3=!!(r.pkmsvvEggSlot3||older.pkmsvvEggSlot3);',
 '    r.pkmsvvEggSlot3=!!(r.pkmsvvEggSlot3||older.pkmsvvEggSlot3);\n'+
 '    // Idempotent chapter claims survive save imports/cloud merges.\n'+
 '    r.pkmsvvChapterPurpleRewards=r.pkmsvvChapterPurpleRewards||{};\n'+
 '    for(const ch of [0,1,2,3]){\n'+
 '      r.pkmsvvChapterPurpleRewards[ch]=!!(r.pkmsvvChapterPurpleRewards[ch]||older.pkmsvvChapterPurpleRewards?.[ch]);\n'+
 '    }');
// In particular, initial Chapter 0 skip/quiz skip still forces starter choice;
// the bonus is only awarded after the player actually has a starter and enters
// their normal menu. Replay opens the menu too but cannot double-credit.
// Compose with the pre-existing v1.5 UI menu wrapper without editing its internals.
fs.appendFileSync(path.join(game,'js','ui','menu.js'),"\n/* v1.5.35: one-time chapter reward reconciliation at normal menu open. */\n(()=>{\n const previous=G.MenuUI?.open;\n if(typeof previous!=='function')throw Error('Missing MenuUI.open for chapter reward reconciliation');\n G.MenuUI.open=function(...args){\n  G.PKMSVVStory?.syncChapterPurpleRewards?.();\n  return previous.apply(this,args);\n };\n})();\n",'utf8');
console.log('PKMSVV Chapter rewards: one permanent purple x10 ticket per Chapter 0–3 (once per save, retroactive).');
