'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),base=path.join(root,'vendor/pokesurvivor');
const mod='js/ui/pkmsvv-season-event.js';
fs.copyFileSync(path.join(root,'src/pkmsvv-season-event.js'),path.join(base,mod));
function patch(file,from,to){
 const p=path.join(base,file),s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 if(s.split(from).length!==2)throw Error('Season pilot patch drift: '+file+': '+from.slice(0,105));
 fs.writeFileSync(p,s.replace(from,to));
}
const anchor='<script defer src="js/ui/pkmsvv-bond-fusion.js"></script>';
patch('dev.html',anchor,anchor+'\n<script defer src="'+mod+'"></script>');
patch('js/game.js',
 '    G.World.reset(coop ? coop.seed : Math.floor(Math.random() * 1e6));',
 "    const pkmsvvSeasonSeed=coop?coop.seed:Math.floor(Math.random()*1e6);\n"+
 "    G.World.reset(pkmsvvSeasonSeed);\n"+
 "    G.PKMSVVSeason?.begin?.({seed:pkmsvvSeasonSeed,\n"+
 "      mode:coop?(G.Social?.room?.mode||coop.mode||'coop'):\n"+
 "        (G.PKMSVVChampionArena?.active?'champion':\n"+
 "         G.PKMSVVArenaSolo?.active?'arena-solo':'solo'),\n"+
 "      seasonId:coop?.seasonId,weatherState:coop?.weatherState});");
patch('js/game.js',
 '    G.World.drawGround(ctx, cam);',
 '    G.World.drawGround(ctx, cam);\n    G.PKMSVVSeason?.draw?.(ctx,cam);');
patch('js/ui/social-ui.js',
 '      G.Social.setOpen(false);\n      G.Net.broadcast(cfg);',
 "      // Host stamps season/weather on the same existing start packet. All\n"+
 "      // clients reconstruct visuals from the already-shared world seed.\n"+
 "      Object.assign(cfg,G.PKMSVVSeason?.hostPacket?.(cfg.seed,room.mode)||{});\n"+
 "      G.Social.setOpen(false);\n      G.Net.broadcast(cfg);");
const css="\n/* E: real seasonal notice shown on home menu, no fake loot/rewards. */\n#scr-menu .menu-left .pkmsvv-season-banner{\n margin:6px auto 9px;padding:7px 12px;max-width:min(93%,590px);\n border:2px solid #8cd9c4;border-radius:11px;text-align:center;\n background:#183d48;color:#e6ffeb;font:800 12px/1.45 \"Segoe UI\",sans-serif;\n text-shadow:none;overflow-wrap:anywhere;flex:0 0 auto;isolation:isolate;\n}\n@media(orientation:landscape) and (max-height:430px){\n #scr-menu .menu-left .pkmsvv-season-banner{font-size:10px;padding:4px 7px}\n}\n";
fs.appendFileSync(path.join(base,'css/style.css'),'\n'+css+'\n');
console.log('PKMSVV E: UTC season packet and 3 seed-matched visual landscapes installed.');