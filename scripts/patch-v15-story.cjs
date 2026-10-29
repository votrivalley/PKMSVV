'use strict';
/* Chapter 3 is additive: do not reset legacy Chapter 0–2 saves or re-show old cutscenes. */
const fs=require('node:fs'),path=require('node:path');
const game=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(rel,from,to){
 const p=path.join(game,rel),s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 if(s.split(from).length!==2)throw Error('Chapter 3 anchor changed '+rel+': '+from.slice(0,95));
 fs.writeFileSync(p,s.replace(from,to),'utf8');
}
patch('js/core/db.js',
 '      pkmsvvChapter2Seen:false,pkmsvvChapter2Pending:false,',
 '      pkmsvvChapter2Seen:false,pkmsvvChapter2Pending:false,\n'+
 '      pkmsvvChapter3Seen:false,pkmsvvChapter3Pending:false,pkmsvvEggSlot3:false,');
patch('js/core/db.js',
 '    for(const ch of [1,2]){',
 '    for(const ch of [1,2,3]){');
patch('js/core/db.js',
 "    r.stats.pkmsvvOrbTypeMask = ((r.stats.pkmsvvOrbTypeMask||0)|(older.stats&&older.stats.pkmsvvOrbTypeMask||0))&63;",
 "    r.stats.pkmsvvOrbTypeMask = ((r.stats.pkmsvvOrbTypeMask||0)|(older.stats&&older.stats.pkmsvvOrbTypeMask||0))&63;\n"+
 "    r.pkmsvvEggSlot3=!!(r.pkmsvvEggSlot3||older.pkmsvvEggSlot3);\n"+
 "    r.stats.pkmsvvEgg15min=!!(r.stats.pkmsvvEgg15min||(older.stats&&older.stats.pkmsvvEgg15min));");
patch('js/game.js',
 '       const chapter2=()=>G.PKMSVVStory.chapter2Pending()?G.PKMSVVStory.chapter2(after):after();',
 '       const chapter3=()=>G.PKMSVVStory.chapter3Pending()?G.PKMSVVStory.chapter3(after):after();\n'+
 '       const chapter2=()=>G.PKMSVVStory.chapter2Pending()?G.PKMSVVStory.chapter2(chapter3):chapter3();');
// Old v1.4 saves may already have all six Orb bits. Detect them at menu open
// instead of requiring the player to use an extra Orb after updating.
patch('js/ui/menu.js',
 "    const memo = document.getElementById('pkmsvv-memory-title');",
 "    const memo = document.getElementById('pkmsvv-memory-title');\n    G.PKMSVVStory.markChapter3();");
patch('js/ui/menu.js',
 'Chương 0–2 · Xem lại truyện',
 'Chương 1–6 · Xem lại truyện');
// Missing storyboard art does not fail builds: keep the two original Chapter 2
// images as safe placeholders until approved Chapter 3 illustrations are staged.
for(const [next,old] of [['chapter3-nest','chapter2-orbs'],['chapter3-hatch','chapter2-shadow']]){
 const image=path.join(game,'assets','story',next+'.webp');
 const approved=path.join(__dirname,'..','src','story-art',next+'.webp');
 const fallback=path.join(game,'assets','story',old+'.webp');
 if(fs.existsSync(approved))fs.copyFileSync(approved,image);
 else if(fs.existsSync(fallback))fs.copyFileSync(fallback,image);
}
console.log('PKMSVV Chapter 3: six Orb types unlock Forgotten Life; progress safely merged.');