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
fs.copyFileSync(path.join(root,'src','pkmsvv-berry-rescue.js'),path.join(game,'js','ui','pkmsvv-berry-rescue.js'));
require('./install-berry-sprites.cjs');
patch('dev.html',
 '<script defer src="js/ui/pkmsvv-arena-solo.js"></script>',
 '<script defer src="js/ui/pkmsvv-arena-solo.js"></script>\n'+
 '<script defer src="js/ui/pkmsvv-berry.js"></script>\n'+
 '<script defer src="js/ui/pkmsvv-berry-rescue.js"></script>');
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

/* The Berry mode is based on existing LAN room sessions and replicated
 * enemy snapshots, not a second one-off game loop or online-only server.
 */
patch('js/net/social.js',
 "['coop','royale','eggrush'].includes(mode)?mode:'coop'",
 "['coop','royale','eggrush','berry'].includes(mode)?mode:'coop'");
patch('js/net/social.js',
 "['royale','eggrush'].includes(requested)?requested:'coop'",
 "['royale','eggrush','berry'].includes(requested)?requested:'coop'");
patch('js/net/social.js',
 "['coop','royale','eggrush'].includes(r.mode)",
 "['coop','royale','eggrush','berry'].includes(r.mode)");
patch('js/ui/social-ui.js',
 "(room.mode==='eggrush'?4:2)",
 "(['eggrush','berry'].includes(room.mode)?4:2)");
// The host owns each Berry tree's HP. Guests get authoritative half-second
// updates via the already running Co-op host event stream.
patch('js/net/coop.js',
 "      case 'jd': case 'jk': G.Judgment.onEvent(ev); break;",
 "      case 'br': G.PKMSVVBerryRescue?.onEvent?.(ev); break;\n"+
 "      case 'mg': G.PKMSVVMegaPhase3?.remoteMega?.(ev[1],Number(ev[2])||0); break;\n"+
 "      case 'jd': case 'jk': G.Judgment.onEvent(ev); break;");
patch('js/net/coop.js',
 "        case 'pb':",
 "        case 'mg': {\n"+
 "          const f=(G.PKMSVV_MEGA_CATALOG||[]).find(x=>x.dex===m.pl.dex&&x.spriteId===Number(ev[1])&&x.artReady&&G.SPRITE_META?.[x.spriteId]?.a?.Idle);\n"+
 "          const sprite=f?.spriteId||0;\n"+
 "          G.PKMSVVMegaPhase3?.remoteMega?.(from,sprite);\n"+
 "          emit(['mg',from,sprite],from);break;\n"+
 "        }\n"+
 "        case 'pb':");
patch('js/game.js',
 "    G.EggRush.begin(coop);G.Arena.begin(coop);",
 "    G.EggRush.begin(coop);G.Arena.begin(coop);G.PKMSVVBerryRescue.begin(coop);");
patch('js/systems/spawner.js',
 "if (b && t >= b.at) { spawnBoss(anchor(), t, b); bossIdx++; }",
 "if (b && !G.PKMSVVBerryRescue?.active && t >= b.at) { spawnBoss(anchor(), t, b); bossIdx++; }");
patch('js/game.js',
 "    if(!(coop && G.Social?.room?.mode==='eggrush'))G.Rift.update(dt, pl, time);",
 "    if(!G.PKMSVVBerryRescue?.active&&!(coop && G.Social?.room?.mode==='eggrush'))G.Rift.update(dt, pl, time);");
patch('js/game.js',
 "    G.Judgment.update(dt, pl, time);",
 "    if(!G.PKMSVVBerryRescue?.active)G.Judgment.update(dt, pl, time);");
patch('js/game.js',
 "    G.Events.update(dt, all, time);",
 "    if(!G.PKMSVVBerryRescue?.active)G.Events.update(dt, all, time);");
patch('js/game.js',
 "    G.PKMSVVEggs.update(dt,pl,time,coop);",
 "    if(!G.PKMSVVBerryRescue?.active)G.PKMSVVEggs.update(dt,pl,time,coop);");
patch('js/game.js',
 "    G.Interact.update(dt, pl);",
 "    if(!G.PKMSVVBerryRescue?.active)G.Interact.update(dt, pl);");
patch('js/game.js',
 "G.Path.update(dt, all); G.Spawner.update(dt, all, time);",
 "if(!G.PKMSVVBerryRescue?.active)G.Path.update(dt, all); G.Spawner.update(dt, all, time);");
patch('js/game.js',
 "      else checkAllDown(dt);",
 "      else if(!G.PKMSVVBerryRescue?.active)checkAllDown(dt);");
// Berry mode runs a separate Host-authoritative objective, not death-all check.
patch('js/game.js',
 "    if (G.Coop.isHost) {",
 "    if (G.Coop.isHost) {\n"+
 "      if(G.PKMSVVBerryRescue?.active)G.PKMSVVBerryRescue.tick(dt,time,all,result=>{\n"+
 "        G.PKMSVVBerryRescue.reward(result);\n"+
 "        G.Coop.over(Object.assign(summary(),{berryRescue:result}));endRun(!result.success);\n"+
 "      });");
patch('js/game.js',
 "      if (d && d.t) time = d.t;",
 "      if (d && d.t) time = d.t;\n"+
 "      if(d?.berryRescue)G.PKMSVVBerryRescue?.reward?.(d.berryRescue);");
patch('js/game.js',
 "  G.onRescue = (dex, name) => {",
 "  G.onRescue = (dex, name) => {\n"+
 "    if(G.Royale?.active||G.EggRush?.active||G.PKMSVVBerryRescue?.active||G.PKMSVVArenaSolo?.active||G.PKMSVVChampionArena?.active)return;");
patch('js/game.js',
 "if(G.EggRush.active)G.EggRush.draw(ctx);",
 "if(G.EggRush.active)G.EggRush.draw(ctx);G.PKMSVVBerryRescue?.draw?.(ctx);");
patch('js/game.js',
 "if(G.EggRush.active)G.EggRush.hud(ctx,w,h);",
 "if(G.EggRush.active)G.EggRush.hud(ctx,w,h);G.PKMSVVBerryRescue?.hud?.(ctx,w,h);");

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
