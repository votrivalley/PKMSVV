'use strict';
/* Berry is additive and offline-first: never delete or rewrite existing player saves.
 * Runs AFTER patch-champion-arena, BEFORE original build.js and Web/LAN rebuild.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(rel,from,to){
 const target=path.join(game,rel),c=fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n');
 if(c.split(from).length!==2)throw Error('Berry source drift: '+rel+' -> '+from.slice(0,80));
 fs.writeFileSync(target,c.replace(from,to),'utf8');
}
fs.copyFileSync(path.join(root,'src','pkmsvv-berry.js'),path.join(game,'js','ui','pkmsvv-berry.js'));
patch('dev.html',
 '<script defer src="js/ui/pkmsvv-arena-solo.js"></script>',
 '<script defer src="js/ui/pkmsvv-arena-solo.js"></script>\n'+
 '<script defer src="js/ui/pkmsvv-berry.js"></script>');
fs.appendFileSync(path.join(game,'css','style.css'),'\n'+fs.readFileSync(path.join(root,'src','pkmsvv-berry.css'),'utf8')+'\n');
patch('js/core/db.js',
 '    r.pkmsvvChapter5Seen=!!(r.pkmsvvChapter5Seen||older.pkmsvvChapter5Seen);',
 '    r.pkmsvvChapter5Seen=!!(r.pkmsvvChapter5Seen||older.pkmsvvChapter5Seen);\n'+
 '    r.pkmsvvBerryChapterDone=!!(r.pkmsvvBerryChapterDone||older.pkmsvvBerryChapterDone);\n'+
 '    r.pkmsvvBerryIntroSeen=!!(r.pkmsvvBerryIntroSeen||older.pkmsvvBerryIntroSeen);\n'+
 '    r.pkmsvvBerry=r.pkmsvvBerry||older.pkmsvvBerry||{bag:{},used:{},last:[],rescueWins:0};\n'+
 '    const formerBerry=older.pkmsvvBerry||{};\n'+
 '    r.pkmsvvBerry.used={...(formerBerry.used||{}),...(r.pkmsvvBerry.used||{})};\n'+
 '    r.pkmsvvBerry.bag=r.pkmsvvBerry.bag||{}; // newer stock prevails: never duplicate consumed berries\n'+
 '    r.pkmsvvBerry.last=Array.isArray(r.pkmsvvBerry.last)?r.pkmsvvBerry.last:[];\n'+
 '    r.pkmsvvBerry.rescueWins=Math.max(0,Number(r.pkmsvvBerry.rescueWins)||0,Number(formerBerry.rescueWins)||0);');
// Art may be staged after this build: use existing approved Chapter 3 artwork as
// offline fallbacks, never produce a blank pane or require an external image API.
for(const [name,fallback] of [['chapter6-berry-grove','chapter3-nest'],['chapter6-berry-rescue','chapter3-hatch']]){
 const dest=path.join(game,'assets','story',name+'.webp');
 const approved=path.join(root,'src','story-art',name+'.webp');
 const existing=path.join(game,'assets','story',fallback+'.webp');
 if(fs.existsSync(approved))fs.copyFileSync(approved,dest);
 else if(fs.existsSync(existing))fs.copyFileSync(existing,dest);
}
console.log('PKMSVV Berry: ten types, 4s pre-battle choice, persistent bag, 5-type Chapter 6 quest.');
