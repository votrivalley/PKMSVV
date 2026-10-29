'use strict';
const fs=require('node:fs'),path=require('node:path'),game=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(p,a,b){const fp=path.join(game,p),s=fs.readFileSync(fp,'utf8').replace(/\r\n/g,'\n');if(s.split(a).length!==2)throw Error('Chapter2 patch anchor '+p+': '+a.slice(0,85));fs.writeFileSync(fp,s.replace(a,b),'utf8');}
// Save chapter progress in existing save, merged safely across Cloud devices.
patch('js/core/db.js',
 "      pkmsvvNameChosen: false, // player nickname chosen in Chapter 0",
 "      pkmsvvNameChosen: false, // player nickname chosen in Chapter 0\n      pkmsvvChapter1Seen:false,pkmsvvChapter1Pending:false,\n      pkmsvvChapter2Seen:false,pkmsvvChapter2Pending:false,");
patch('js/core/db.js',
 "    r.pkmsvvNameChosen = !!(r.pkmsvvNameChosen || older.pkmsvvNameChosen);",
 "    r.pkmsvvNameChosen = !!(r.pkmsvvNameChosen || older.pkmsvvNameChosen);\n"+
 "    for(const ch of [1,2]){\n"+
 "      r['pkmsvvChapter'+ch+'Seen']=!!(r['pkmsvvChapter'+ch+'Seen']||older['pkmsvvChapter'+ch+'Seen']);\n"+
 "      r['pkmsvvChapter'+ch+'Pending']=!r['pkmsvvChapter'+ch+'Seen']&&!!(r['pkmsvvChapter'+ch+'Pending']||older['pkmsvvChapter'+ch+'Pending']);\n"+
 "    }");
patch('js/game.js',
 "    save.stats.runs++;\n",
 "    save.stats.runs++;\n    if(!save.pkmsvvChapter1Seen&&!save.pkmsvvChapter1Pending)G.PKMSVVStory.markChapter1();\n");
patch('js/game.js',
 "    }, () => { pl = null; G.Flow.afterRun(); });",
 "    }, () => {\n       pl=null;\n       const after=()=>G.Flow.afterRun();\n       const chapter2=()=>G.PKMSVVStory.chapter2Pending()?G.PKMSVVStory.chapter2(after):after();\n       if(G.PKMSVVStory.chapter1Pending())G.PKMSVVStory.chapter1(chapter2);\n       else chapter2();\n    });");
patch('js/ui/menu.js',
 "        else if (go === 'memories') G.PKMSVVStory.replay();",
 "        else if (go === 'memories') G.PKMSVVStory.memories();");
patch('js/ui/menu.js',
 "Xem lại Chương 1 · Thức tỉnh",
 "Chương 0–2 · Xem lại truyện");
fs.appendFileSync(path.join(game,'css','style.css'),'\n'+
 '.pkmsvv-memory-chooser{position:fixed;inset:0;z-index:11000;background:rgba(5,12,28,.91);display:grid;place-items:center;padding:22px}\n'+
 '.pkmsvv-memory-inner{display:flex;flex-direction:column;gap:12px;width:min(440px,96vw);padding:22px;background:#172a46;border:2px solid #efca78;border-radius:16px;box-shadow:0 8px 60px #000;color:#fff}\n'+
 '.pkmsvv-memory-inner h2{text-align:center;margin:0 0 7px;color:#ffe395}\n','utf8');
console.log('PKMSVV Chapters 1/2: first-run reflections, eight-skill Orb revelation, persistent replay.');
