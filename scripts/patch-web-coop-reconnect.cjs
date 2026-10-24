'use strict';
/* Web-only 45s recovery window; no expensive Firebase combat relay. */
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(p,from,to){
 const file=path.join(game,p),src=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 if(src.split(from).length!==2)throw Error('Co-op reconnect source changed: '+p+': '+from.slice(0,75));
 fs.writeFileSync(file,src.replace(from,to),'utf8');
}
fs.copyFileSync(path.join(root,'src','web','pkmsvv-reconnect-grace.js'),path.join(game,'js','net','pkmsvv-reconnect-grace.js'));
patch('dev.html',
 '<script defer src="js/net/coop.js"></script>',
 '<script defer src="js/net/pkmsvv-reconnect-grace.js"></script>\n<script defer src="js/net/coop.js"></script>');
patch('js/net/coop.js',
 '  function end() {\n    active = false; host = false; local = null;',
 '  function end() {\n    G.PKMSVVGrace.clear();\n    active = false; host = false; local = null;');
patch('js/net/coop.js',"  G.Net.onPeer((u, mode) => {\n    if (!active || (mode !== 'closed' && mode !== 'failed')) return;\n    if (host) mateGone(u);\n    else if (u === hostUid) { const cb = api.lost; end(); if (cb) cb('Se ha perdido la conexión con el anfitrión.'); }\n  });","  G.Net.onPeer((u, mode) => {\n    if (!active) return;\n    if (mode === 'direct') {\n      const wasWaiting = G.PKMSVVGrace.restored(u);\n      if (!host && u === hostUid) { stalled = false; lastHostAt = performance.now(); updateAway(); }\n      if (wasWaiting && G.UI && G.UI.toast)\n        G.UI.toast(G.I18n.lang === 'vi' ? 'Đã kết nối lại trận đấu.' : 'Reconnected to the match.', 2600);\n      return;\n    }\n    if (mode !== 'closed' && mode !== 'failed') return;\n    if (host) {\n      const m = mates.get(u);\n      if (!m || !m.connected) return;\n      if (G.PKMSVVGrace.lost(u, () => { if(active && host) mateGone(u); }) && G.UI && G.UI.toast)\n        G.UI.toast(G.I18n.lang === 'vi' ? 'Đồng đội mất kết nối. Đang chờ tối đa 45 giây…' : 'Teammate disconnected. Waiting up to 45 seconds…', 3000);\n    } else if (u === hostUid) {\n      stalled = true; updateAway();\n      G.PKMSVVGrace.lost(u, () => {\n        if (!active) return;\n        const cb = api.lost; end();\n        if (cb) cb('Mất kết nối với chủ phòng quá 45 giây.');\n      });\n    }\n  });");
console.log('PKMSVV Web: 45-second recoverable Co-op disconnect window');
