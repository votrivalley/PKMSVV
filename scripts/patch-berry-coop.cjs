'use strict';
const fs=require('node:fs'),path=require('node:path');
const game=path.join(__dirname,'..','vendor','pokesurvivor');
// One compact lossless WebP (3 trees × 6 HP states) is an optional source asset.
// Keep old canvas-rendered trees as a safe fallback until the file is uploaded.
const atlasSource=path.join(__dirname,'..','src','berry-tree-assets','berry_trees_3x6.webp');
if(fs.existsSync(atlasSource)){
 const dst=path.join(game,'assets','berry-trees');
 fs.mkdirSync(dst,{recursive:true});
 fs.copyFileSync(atlasSource,path.join(dst,'berry_trees_3x6.webp'));
 console.log('Berry Rescue: bundled lossless WebP HP-tree atlas for offline PC/Web/Android');
}else console.log('Berry Rescue: WebP atlas not uploaded yet; using existing Canvas tree fallback');
function patch(rel,from,to){
 const file=path.join(game,rel),src=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 if(src.split(from).length!==2)throw Error('Berry Co-op source drift: '+rel+' -> '+from.slice(0,95));
 fs.writeFileSync(file,src.replace(from,to),'utf8');
}
/* The Berry mode is based on existing LAN room sessions and replicated
 * enemy snapshots, not a second one-off game loop or online-only server.
 */
patch('js/net/social.js',
 "['coop','royale','eggrush'].includes(mode)?mode:'coop'",
 "['coop','royale','eggrush','berry','berryeasy'].includes(mode)?mode:'coop'");
patch('js/net/social.js',
 "['royale','eggrush'].includes(requested)?requested:'coop'",
 "['royale','eggrush','berry','berryeasy'].includes(requested)?requested:'coop'");
patch('js/net/social.js',
 "['coop','royale','eggrush'].includes(r.mode)",
 "['coop','royale','eggrush','berry','berryeasy'].includes(r.mode)");
patch('js/ui/social-ui.js',
 "(room.mode==='eggrush'?4:2)",
 "(['eggrush','berry','berryeasy'].includes(room.mode)?4:2)");
// The host owns each Berry tree's HP. Guests get authoritative half-second
// updates via the already running Co-op host event stream.
patch('js/net/coop.js',
 "      case 'jd': case 'jk': case 'jb': G.Judgment.onEvent(ev); break;",
 "      case 'br': G.PKMSVVBerryRescue?.onEvent?.(ev); break;\n"+
 "      case 'mg': G.PKMSVVMegaPhase3?.remoteMega?.(ev[1],Number(ev[2])||0); break;\n"+
 "      case 'jd': case 'jk': case 'jb': G.Judgment.onEvent(ev); break;");
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
 "if (b && t >= b.at) { if(spawnBoss(anchor(), t, b))bossIdx++; }",
 "if (b && !G.PKMSVVBerryRescue?.active && t >= b.at) { if(spawnBoss(anchor(), t, b))bossIdx++; }");
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
// Keep trainers outside the solid base of each objective tree.
patch('js/game.js',
 "    if(coop&&G.Coop.isHost)G.LanAI.update(dt,time);",
 "    if(coop&&G.Coop.isHost)G.LanAI.update(dt,time);\n"+
 "    if(G.PKMSVVBerryRescue?.active){\n"+
 "      G.PKMSVVBerryRescue.keepOutsideTrunks(pl);\n"+
 "      if(coop&&G.Coop.isHost)for(const p of G.Coop.puppets())G.PKMSVVBerryRescue.keepOutsideTrunks(p);\n"+
 "    }");
patch('js/game.js',
 "  function checkAllDown(dt) {",
 "  function checkAllDown(dt) {\n    if(G.PKMSVVBerryRescue?.active)return;");
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
// Berry tree objects share the game's normal Y-sorted drawable list.
// This preserves occlusion: Pokémon in front of a tree draw in front of it.
patch('js/game.js',
 "if (state!=='ui')for(const e of G.PKMSVVEggs?.drawables?.(cam)||[])items.push({y:e.y,ent:e});",
 "if (state!=='ui')for(const e of G.PKMSVVEggs?.drawables?.(cam)||[])items.push({y:e.y,ent:e});\n"+
 "    if(G.PKMSVVBerryRescue?.active)for(const e of G.PKMSVVBerryRescue.drawables())items.push({y:e.y,ent:e});");
patch('js/game.js',
 "if(G.EggRush.active)G.EggRush.hud(ctx,w,h);",
 "if(G.EggRush.active)G.EggRush.hud(ctx,w,h);G.PKMSVVBerryRescue?.hud?.(ctx,w,h);");


console.log('Berry Rescue: 4-player Host-authoritative objectives installed after competitive mode patches.');
