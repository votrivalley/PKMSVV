'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),base=path.join(root,'vendor','pokesurvivor');
function patch(file,from,to){
 const p=path.join(base,file),s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'),pieces=s.split(from);
 if(pieces.length!==2)throw Error('Multiplayer source anchor changed: '+file+' : '+from.slice(0,100));
 fs.writeFileSync(p,pieces.join(to),'utf8');
}
fs.copyFileSync(path.join(root,'src/web/pkmsvv-royale.js'),path.join(base,'js/net/pkmsvv-royale.js'));
patch('dev.html','<script defer src="js/net/coop.js"></script>',
 '<script defer src="js/net/coop.js"></script>\n<script defer src="js/net/pkmsvv-royale.js"></script>');
// Rooms: original co-op stays 4, separately labeled survival supports 2–10.
patch('js/net/social.js','  const MAX_PLAYERS = 4;',
 "  const MAX_PLAYERS = 10;\n  const roomLimit = r => r&&r.mode==='royale'?10:4;");
patch('js/net/social.js','  async function createRoom() {',
 "  async function createRoom(mode = 'coop') {\n    mode=mode==='royale'?'royale':'coop';");
patch('js/net/social.js',"await fb.rtdb.ref('rooms/' + id).set({ host: uid, open: true, at: ts(), m: { [uid]: memberInfo() } });",
 "await fb.rtdb.ref('rooms/' + id).set({ host: uid, mode, open: true, at: ts(), m: { [uid]: memberInfo() } });");
patch('js/net/social.js','    enterRoom(id, uid);','    enterRoom(id, uid, mode);');
patch('js/net/social.js',"    const n = (await fb.rtdb.ref('rooms/' + id + '/m').get()).numChildren();",
 "    const mode=(await fb.rtdb.ref('rooms/' + id + '/mode').get()).val()==='royale'?'royale':'coop';\n    const n = (await fb.rtdb.ref('rooms/' + id + '/m').get()).numChildren();");
patch('js/net/social.js','    if (n > MAX_PLAYERS) {','    if (n > roomLimit({mode})) {');
patch('js/net/social.js',"'La sala está llena (máximo ' + MAX_PLAYERS + ').'","'La sala está llena (máximo ' + roomLimit({mode}) + ').'");
patch('js/net/social.js','    enterRoom(id, host);','    enterRoom(id, host, mode);');
patch('js/net/social.js','  function enterRoom(id, host) {','  function enterRoom(id, host, mode = "coop") {');
patch('js/net/social.js','room = { id, host, isHost: host === uid, members: [], open: true };',
 'room = { id, host, mode, isHost: host === uid, members: [], open: true };');
patch('js/net/social.js','if (room && room.members.length >= MAX_PLAYERS)',
 'if (room && room.members.length >= roomLimit(room))');
patch('js/net/social.js','    VALID, MAX_PLAYERS','    VALID, MAX_PLAYERS, roomLimit');
// Player-host UI to choose explicit mode before inviting.
patch('dev.html','<div id="fr-list" class="fr-list"></div>',
 '<div id="pkmsvv-create-modes" class="row wrap" translate="no" style="gap:8px;margin:10px 0 16px">\n'+
 '  <button class="btn small gold" id="pkmsvv-create-coop" type="button">🤝 Co-op · 2–4</button>\n'+
 '  <button class="btn small" id="pkmsvv-create-royale" type="button">🏆 Sinh tồn · 2–10</button>\n'+
 '</div><div id="fr-list" class="fr-list"></div>');
patch('js/ui/social-ui.js',"      $('fr-room').onclick = () => G.LobbyUI.open();",
 ["      $('fr-room').onclick = () => G.LobbyUI.open();",
  "      const mk=async mode=>{",
  "        if(G.Social.room){G.LobbyUI.open();return;}",
  "        try{await G.Social.createRoom(mode);G.LobbyUI.open();}",
  "        catch(e){G.UI.toast((e&&e.message)||'Không tạo được phòng online',3200);}",
  "      };",
  "      $('pkmsvv-create-coop').onclick=()=>mk('coop');",
  "      $('pkmsvv-create-royale').onclick=()=>mk('royale');"].join('\n'));
patch('js/ui/social-ui.js',"      $('fr-room').classList.toggle('hidden', !room);",
 ["      $('fr-room').classList.toggle('hidden', !room);",
  "      $('pkmsvv-create-modes').classList.toggle('hidden', !!room);",
  "      $('pkmsvv-create-royale').textContent=G.I18n.lang==='vi'?'🏆 Sinh tồn · 2–10':'🏆 Survival · 2–10';"].join('\n'));
const lp=path.join(base,'js/ui/social-ui.js');let lobby=fs.readFileSync(lp,'utf8');
if((lobby.match(/G\.Social\.MAX_PLAYERS/g)||[]).length!==4)throw Error('Lobby must use 4 limit references');
lobby=lobby.replace(/G\.Social\.MAX_PLAYERS/g,'G.Social.roomLimit(room)');fs.writeFileSync(lp,lobby);
patch('js/ui/social-ui.js',"      const ms = room.members;\n      $('lobby-sub').textContent",
 "      const ms = room.members;\n      $('lobby-note').dataset.mode=room.mode||'coop';\n      $('lobby-sub').textContent");
patch('js/ui/social-ui.js',"'Eres el anfitrión. Invita a tus amigos (hasta ' + G.Social.roomLimit(room) + ') y empezad cuando estéis.'",
 "(room.mode==='royale'?'🏆 Sinh tồn: mời tối đa ':'🤝 Co-op: mời tối đa ')+G.Social.roomLimit(room)+' người, bắt đầu từ 2.'");
patch('js/ui/social-ui.js',"        k: 'start', seed: Math.floor(Math.random() * 1e6), host: room.host,",
 "        k: 'start', seed: Math.floor(Math.random() * 1e6), host: room.host, mode: room.mode||'coop',");
patch('js/ui/social-ui.js',"      btn.textContent = 'Empezar partida (' + ms.length + '/' + G.Social.roomLimit(room) + ')';",
 "      btn.textContent = (G.I18n.lang==='vi'?'Bắt đầu trận (':'Start match (') + ms.length + '/' + G.Social.roomLimit(room) + ')';");
patch('js/net/coop.js',"const COLORS = ['#ffcb3d', '#5fc8ff', '#7ee07a', '#ff8ad8'];",
 "const COLORS = ['#ffcb3d','#5fc8ff','#7ee07a','#ff8ad8','#ff9c54','#b994ff','#71e4cc','#f0ed83','#f17c91','#9bb3ff'];");
patch('js/net/coop.js','const rateFor = u => (G.Net.slow(u) ? RATE_SLOW : RATE_FAST);',
 'const rateFor = u => G.Royale.active ? (G.Net.slow(u) ? RATE_SLOW : 1 / 7) : (G.Net.slow(u) ? RATE_SLOW : RATE_FAST);');
patch('js/net/coop.js','const scaleRate = n => 1 + 0.75 * Math.max(0, n - 1);',
 'const scaleRate = n => G.Royale.active ? 1 + 0.2 * Math.max(0,n-1) : 1 + 0.75 * Math.max(0, n - 1);');
patch('js/net/coop.js','const scaleHp = n => 1 + 0.3 * Math.max(0, n - 1);',
 'const scaleHp = n => G.Royale.active ? 1 + 0.12 * Math.max(0,n-1) : 1 + 0.3 * Math.max(0, n - 1);');
patch('js/systems/spawner.js',
 'return (1.6 + t * 0.028 + Math.pow(t / 60, 1.6) * 0.5) * DENSITY * openingSpawnFactor(t);',
 'return (1.6 + t * 0.028 + Math.pow(t / 60, 1.6) * 0.5) * DENSITY * openingSpawnFactor(t) * (G.Royale.active?G.Royale.intensity(t).density:1);');
patch('js/systems/spawner.js','e.dmg *= DMG_K; e.xp = Math.round(e.xp * XP_K);',
 'e.dmg *= DMG_K; e.xp = Math.round(e.xp * XP_K);\n    if(G.Royale.active){const k=G.Royale.intensity(t);e.maxHp=e.hp=Math.round(e.hp*k.hp);e.dmg*=k.dmg;}');
patch('js/game.js','  function startRun(coop = null) {',
 '  function startRun(coop = null) {\n    G.Royale.begin(coop);');
patch('js/game.js',"      if (d && d.t) time = d.t;",
 "      if (d && d.t) time = d.t;\n      if(d&&d.royale)G.Royale.finish(d.royale);");
patch('js/game.js','    const sent = ok && !coop ? G.Ranking.submitSolo(',
 '    const sent = ok && !coop && !G.Royale.active ? G.Ranking.submitSolo(');
patch('js/game.js','               : ok && wasHost ? G.Ranking.submitGroup(',
 '               : ok && wasHost && !G.Royale.active ? G.Ranking.submitGroup(');
patch('js/game.js','      dead, time, level: pl.level, kills: pl.kills, bosses: pl.bosses, coins, record, t1: pl.t1, t10: pl.t10, judge,',
 '      dead, time, level: pl.level, kills: pl.kills, bosses: pl.bosses, coins, record, t1: pl.t1, t10: pl.t10, judge,\n      royale: G.Royale.active ? G.Royale.outcome : null,');
patch('js/game.js','      if (pl.dead) reviveTick(dt);',
 '      if (pl.dead && !G.Royale.active) reviveTick(dt);');
patch('js/game.js','    if (G.Coop.isHost) checkAllDown(dt);',
 ["    if (G.Coop.isHost) {",
  "      if (G.Royale.active) G.Royale.check(G.Coop.players(),time,result=>{",
  "        G.Coop.over(Object.assign(summary(),{royale:result}));endRun(result.winner!==G.Social.uid);",
  "      });",
  "      else checkAllDown(dt);",
  "    }"].join('\n'));
patch('js/game.js','    if (!G.Judgment.cinematic) G.HUD.draw(ctx, w, h, pl, st);',
 '    if (!G.Judgment.cinematic) G.HUD.draw(ctx, w, h, pl, st);\n    if(G.Royale.active)G.Royale.draw(ctx,w,h,G.Coop.players());');
patch('js/ui/run-ui.js',"    $('over-title').textContent = r.dead ? 'Has caído…' : 'Run terminada';",
 "    $('over-title').textContent = r.royale ? (r.royale.winner===G.Social.uid?'🏆 Người sống sót cuối cùng':'🏆 Kết quả Sinh tồn') : (r.dead ? 'Has caído…' : 'Run terminada');");
patch('js/ui/run-ui.js',"    const ask = $('over-ask');",
 "    if(r.royale)$('over-stats').insertAdjacentHTML('afterbegin',G.Royale.html(r.royale));\n    const ask = $('over-ask');");
fs.appendFileSync(path.join(base,'css/style.css'),"\n#lobby-members{grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}\n#lobby-members .lob-card{min-width:0;min-height:124px;padding:7px 3px}\n#lobby-members .lob-card b{font-size:clamp(11px,1.3vw,15px);max-width:100%;overflow-wrap:anywhere}\n#lobby-members .lob-card canvas{max-width:100%;height:auto}\n#pkmsvv-create-modes .btn{flex:1;min-height:45px}\n@media(max-width:670px){#lobby-members{grid-template-columns:repeat(2,minmax(0,1fr))}#lobby-members .lob-card{min-height:98px}}\n",'utf8');
console.log('PKMSVV WEB: co-op 4 and Survival beta 10 modes patched, no public rankings.');
