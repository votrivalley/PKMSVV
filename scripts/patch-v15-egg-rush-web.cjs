'use strict';
/* Web-only Egg Rush mode after Online hub and Royale patches. */
const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..');
const game=path.join(root,'vendor','pokesurvivor');
function patch(file,from,to){const p=path.join(game,file),src=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 if(src.split(from).length!==2)throw Error('Egg Rush patch anchor changed '+file+': '+from.slice(0,85));
 fs.writeFileSync(p,src.replace(from,to),'utf8');
}
fs.copyFileSync(path.join(root,'src/web/pkmsvv-egg-rush.js'),path.join(game,'js','net','pkmsvv-egg-rush.js'));
patch('dev.html',
 '<script defer src="js/net/pkmsvv-royale.js"></script>',
 '<script defer src="js/net/pkmsvv-royale.js"></script>\n<script defer src="js/net/pkmsvv-egg-rush.js"></script>');
patch('js/net/social.js',
 "mode=mode==='royale'?'royale':'coop';",
 "mode=['coop','royale','eggrush'].includes(mode)?mode:'coop';");
patch('js/net/social.js',
 "const mode=(await fb.rtdb.ref('rooms/' + id + '/mode').get()).val()==='royale'?'royale':'coop';",
 "const requested=(await fb.rtdb.ref('rooms/' + id + '/mode').get()).val();\n    const mode=['royale','eggrush'].includes(requested)?requested:'coop';");
patch('js/net/social.js',
 "['coop','royale'].includes(r.mode)",
 "['coop','royale','eggrush'].includes(r.mode)");
patch('js/ui/social-ui.js',
 "btn.disabled = !room.isHost || ms.length < 2 || connecting || failed;",
 "btn.disabled = !room.isHost || ms.length < (room.mode==='eggrush'?4:2) || connecting || failed;");
patch('js/net/coop.js',
 "const x = (i - (cfg.members.length - 1) / 2) * 34, y = 0;",
 "const position=cfg.mode==='eggrush'?G.EggRush.startPosition(cfg,i):null;\n      const x=position?position[0]:(i - (cfg.members.length - 1) / 2) * 34, y=position?position[1]:0;");
patch('js/net/coop.js',
 "          G.Combat.ghostCast(m.pl, ev[1], ev[2], ev[3], ev[4]);",
 "          G.Combat.ghostCast(m.pl, ev[1], ev[2], ev[3], ev[4]);\n          if(G.EggRush.active)G.EggRush.cast(m.pl,{id:ev[1],lvl:ev[2]});");
patch('js/net/coop.js',
 "      case 'ed': G.EnemyMgr.removeRemote(ev[1], true); break;",
 "      case 'er': G.EggRush.onEvent(ev); break;\n      case 'ed': G.EnemyMgr.removeRemote(ev[1], true); break;");
patch('js/net/coop.js',
 "    if (host) emit(['c', me, m.id, m.lvl, r2(pl.aim), m.evolved ? 1 : 0]);",
 "    if (host) {emit(['c', me, m.id, m.lvl, r2(pl.aim), m.evolved ? 1 : 0]);if(G.EggRush.active)G.EggRush.cast(pl,m);}");
patch('js/net/coop.js',
 "if(typeof ev[1]==='string'&&G.Orbs.onMateUse(m.pl,ev[1],ev[2],ev[3],ev[4]))emit(['ob',ev[1],ev[2],ev[3],ev[4]],from);",
 "if(typeof ev[1]==='string'&&G.Orbs.onMateUse(m.pl,ev[1],ev[2],ev[3],ev[4])){emit(['ob',ev[1],ev[2],ev[3],ev[4]],from);if(G.EggRush.active)G.EggRush.orb(m.pl,ev[1]);}");
patch('js/net/coop.js',
 "if(host)emit(['ob',id,x,y,z]);",
 "if(host){emit(['ob',id,x,y,z]);if(G.EggRush.active)G.EggRush.orb(local,id);}");
patch('js/game.js',
 "    G.Royale.begin(coop);",
 "    G.Royale.begin(coop);\n    G.EggRush.begin(coop);");
patch('js/game.js',
 "if(d&&d.royale)G.Royale.finish(d.royale);",
 "if(d&&d.royale)G.Royale.finish(d.royale);\n      if(d&&d.eggrush)G.EggRush.finish(d.eggrush);");
patch('js/game.js',
 "&& !G.Royale.active ? G.Ranking.submitSolo(",
 "&& !G.Royale.active && !G.EggRush.active ? G.Ranking.submitSolo(");
patch('js/game.js',
 "&& !G.Royale.active ? G.Ranking.submitGroup(",
 "&& !G.Royale.active && !G.EggRush.active ? G.Ranking.submitGroup(");
patch('js/game.js',
 "royale: G.Royale.active ? G.Royale.outcome : null,",
 "royale: G.Royale.active ? G.Royale.outcome : null,\n      eggrush: G.EggRush.active ? G.EggRush.outcome : null,");
patch('js/game.js',
 "    G.PKMSVVEggs.update(dt,pl,time,coop);",
 "    G.PKMSVVEggs.update(dt,pl,time,coop);\n    if(coop&&G.EggRush.active&&!G.Coop.isHost)G.EggRush.update(dt,time,G.Coop.players(),()=>{});");
patch('js/game.js',
 "      if (G.Royale.active) G.Royale.check(G.Coop.players(),time,result=>{",
 "      if (G.EggRush.active)G.EggRush.update(dt,time,G.Coop.players(),result=>{\n        G.Coop.over(Object.assign(summary(),{eggrush:result}));endRun(result.winner!==G.Social.uid);\n      });\n      else if (G.Royale.active) G.Royale.check(G.Coop.players(),time,result=>{");
patch('js/game.js',
 "      else checkAllDown(dt);",
 "      else checkAllDown(dt);");
patch('js/game.js',
 "    G.PKMSVVEggs.draw(ctx);",
 "    G.PKMSVVEggs.draw(ctx);\n    if(G.EggRush.active)G.EggRush.draw(ctx);");
patch('js/game.js',
 "    if(G.Royale.active)G.Royale.draw(ctx,w,h,G.Coop.players());",
 "    if(G.Royale.active)G.Royale.draw(ctx,w,h,G.Coop.players());\n    if(G.EggRush.active)G.EggRush.hud(ctx,w,h);");
patch('js/ui/run-ui.js',
 "r.royale ? (r.royale.winner===G.Social.uid?",
 "r.eggrush ? (r.eggrush.winner===G.Social.uid?'Tranh Trứng · Chiến thắng':'Kết quả Tranh Trứng') : r.royale ? (r.royale.winner===G.Social.uid?");
patch('js/ui/run-ui.js',
 "if(r.royale)$('over-stats').insertAdjacentHTML('afterbegin',G.Royale.html(r.royale));",
 "if(r.royale)$('over-stats').insertAdjacentHTML('afterbegin',G.Royale.html(r.royale));\n    if(r.eggrush)$('over-stats').insertAdjacentHTML('afterbegin',G.EggRush.html(r.eggrush));");
// The Online hub exists after patch-multiplayer-hub. Insert a 3rd quick-match card and room controls.
const htmlFile=path.join(game,'dev.html');let html=fs.readFileSync(htmlFile,'utf8').replace(/\r\n/g,'\n');
const idx=html.indexOf('id="pkmsvv-quick-royale"');
if(idx<0)throw Error('Egg Rush: Royale mode card missing');
const close=html.indexOf('</button>',idx)+9;
const card='\n   <button type="button" class="btn pkmsvv-mode-card eggrush" id="pkmsvv-quick-eggrush">'+
 '<span class="pkmsvv-mode-art"><canvas id="pkmsvv-mode-sprite-eggrush" width="144" height="144" aria-hidden="true"></canvas></span>'+
 '<span class="pkmsvv-mode-copy"><strong class="pkmsvv-mode-title">Tranh Trứng</strong><small class="pkmsvv-mode-cap">4 người</small>'+
 '<small class="pkmsvv-mode-description">10 trứng · 5 đợt · đối kháng nhẹ</small><span class="pkmsvv-mode-action">▶ Chơi nhanh</span></span></button>';
html=html.slice(0,close)+card+html.slice(close);
const privateBtn='<button class="btn" id="pkmsvv-royale-private">Sống Còn · Riêng tư</button>';
if(html.split(privateBtn).length!==2)throw Error('Egg Rush: private room card drift');
html=html.replace(privateBtn,privateBtn+'\n   <button class="btn" id="pkmsvv-eggrush-public">Tranh Trứng · Công khai</button>\n   <button class="btn" id="pkmsvv-eggrush-private">Tranh Trứng · Riêng tư</button>');
fs.writeFileSync(htmlFile,html,'utf8');
fs.appendFileSync(path.join(game,'css','style.css'),
 '\n#scr-multiplayer .pkmsvv-mode-card.eggrush{border-color:#f0d47f;background:linear-gradient(135deg,#234f59,#1c3b4c)}\n'+
 '#scr-multiplayer .pkmsvv-mode-grid{grid-template-columns:repeat(3,minmax(0,1fr))}\n'+
 '@media(max-width:930px){#scr-multiplayer .pkmsvv-mode-grid{grid-template-columns:1fr}}\n','utf8');
console.log('PKMSVV v1.5 Web: Egg Rush room/matchmaking, 4-way starts, host egg scoring and PvP routing.');
