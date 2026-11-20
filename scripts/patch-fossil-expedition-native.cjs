'use strict';
/* QA-only engine integration. Run AFTER patch-berry-coop.cjs and BEFORE
 * tools/build.js. Never enable on public production without browser/LAN
 * gameplay QA, genuine reward settlement and guest action replication.
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(rel,old,next){
 const file=path.join(game,rel),src=fs.readFileSync(file,'utf8');
 if(src.split(old).length!==2)throw Error('Fossil native QA anchor drift '+rel+': '+old.slice(0,100));
 fs.writeFileSync(file,src.replace(old,next));
}
const mode="'fossil_lab'";
for(const [old,nw] of [
 ["['coop','royale','eggrush','berry','berryeasy'].includes(mode)?mode:'coop'",
  "['coop','royale','eggrush','berry','berryeasy','fossil_lab'].includes(mode)?mode:'coop'"],
 ["['royale','eggrush','berry','berryeasy'].includes(requested)?requested:'coop'",
  "['royale','eggrush','berry','berryeasy','fossil_lab'].includes(requested)?requested:'coop'"],
 ["['coop','royale','eggrush','berry','berryeasy'].includes(r.mode)",
  "['coop','royale','eggrush','berry','berryeasy','fossil_lab'].includes(r.mode)"]])
 patch('js/net/social.js',old,nw);
patch('js/net/coop.js',
 "      case 'br': G.PKMSVVBerryRescue?.onEvent?.(ev); break;",
 "      case 'fx': G.PKMSVVFossilExpedition?.onEvent?.(ev); break;\n"+
 "      case 'br': G.PKMSVVBerryRescue?.onEvent?.(ev); break;");

/* Berry already redirects enemies toward its living trees. Fossil defense
 * adds the same native Enemy.update() target after Rotom activates the machine.
 * 80% prefer the machine, 20% still pressure the trainers. No polling loops. */
patch('js/entities/enemy.js',
 'e.update(dt,G.PKMSVVBerryRescue?.targetFor?.(e)||G.PKMSVVEggs?.enemyTarget?.(e,lead,dt)||lead);',
 'e.update(dt,G.PKMSVVFossilExpedition?.targetFor?.(e)||G.PKMSVVBerryRescue?.targetFor?.(e)||G.PKMSVVEggs?.enemyTarget?.(e,lead,dt)||lead);');
patch('js/entities/enemy.js',
 'const near = G.PKMSVVBerryRescue?.targetFor?.(e) || nearestPlayer(players, e.x, e.y) || pl;',
 'const near = G.PKMSVVFossilExpedition?.targetFor?.(e) || G.PKMSVVBerryRescue?.targetFor?.(e) || nearestPlayer(players, e.x, e.y) || pl;');

// Crucial: the existing Berry/Royale startup hook runs at the TOP of
// Game.startRun(), BEFORE G.World.reset(coop.seed). Fossil placement there
// was invalidated by the new seeded terrain immediately afterward.
// Begin Fossil only after native World.reset/setBiome and Coop.begin.
patch('js/game.js',
 "    G.Camera.x = pl.x; G.Camera.y = pl.y; G.Camera.shake = 0;",
 "    G.PKMSVVFossilExpedition?.begin?.({mode:G.Social?.room?.mode});\\n"+
 "    G.Camera.x = pl.x; G.Camera.y = pl.y; G.Camera.shake = 0;");
patch('js/game.js',
 "      if(G.PKMSVVBerryRescue?.active)G.PKMSVVBerryRescue.tick(dt,time,all,result=>{",
 "      if(G.PKMSVVFossilExpedition?.active)G.PKMSVVFossilExpedition.tick(dt,time,all,result=>{\n"+
 "        G.PKMSVVFossilExpedition.reward(result);\n"+
 "        G.Coop.over(Object.assign(summary(),{fossilExpedition:result}));endRun(!result.success);\n"+
 "      });\n"+
 "      if(G.PKMSVVBerryRescue?.active)G.PKMSVVBerryRescue.tick(dt,time,all,result=>{");
patch('js/game.js',
 "if(d?.berryRescue)G.PKMSVVBerryRescue?.reward?.(d.berryRescue);",
 "if(d?.berryRescue)G.PKMSVVBerryRescue?.reward?.(d.berryRescue);"+
 "if(d?.fossilExpedition)G.PKMSVVFossilExpedition?.reward?.(d.fossilExpedition);");
patch('js/game.js',
 "G.PKMSVVBerryRescue?.beginFrame?.();",
 "G.PKMSVVBerryRescue?.beginFrame?.();G.PKMSVVFossilExpedition?.beginFrame?.();");
patch('js/game.js',
 "G.PKMSVVBerryRescue?.drawMissing?.(ctx);",
 "G.PKMSVVBerryRescue?.drawMissing?.(ctx);G.PKMSVVFossilExpedition?.drawMissing?.(ctx);");
patch('js/game.js',
 "if(G.PKMSVVBerryRescue?.active)for(const e of G.PKMSVVBerryRescue.drawables())items.push({y:e.y,ent:e});",
 "if(G.PKMSVVBerryRescue?.active)for(const e of G.PKMSVVBerryRescue.drawables())items.push({y:e.y,ent:e});\n"+
 "    if(G.PKMSVVFossilExpedition?.active)for(const e of G.PKMSVVFossilExpedition.drawables())items.push({y:e.y,ent:e});");
patch('js/game.js',
 "G.PKMSVVBerryRescue?.hud?.(ctx,w,h);",
 "G.PKMSVVBerryRescue?.hud?.(ctx,w,h);G.PKMSVVFossilExpedition?.hud?.(ctx,w,h);");
const core=fs.readFileSync(path.join(root,'src/pkmsvv-fossil-expedition-core.cjs'),'utf8');
const adapter=fs.readFileSync(path.join(root,'src/pkmsvv-fossil-expedition-native.js'),'utf8');
const bundle="G.PKMSVVFossilExpeditionCore=(()=>{const module={exports:{}};\n"+
 core+"\nreturn module.exports;})();\n"+adapter;
new vm.Script(bundle,{filename:'fossil-expedition-native-qa.js'});
const file=path.join(game,'js/ui/pkmsvv-fossil-expedition-native.js');
fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bundle);
patch('dev.html','<script defer src="js/ui/pkmsvv-fossil-system.js"></script>',
 '<script defer src="js/ui/pkmsvv-fossil-system.js"></script>\n'+
 '<script defer src="js/ui/pkmsvv-fossil-expedition-native.js"></script>');
console.log('Fossil Expedition native QA adapter added (2–4, three site mining, defense, 6–8m; rewards deliberately disabled).');
