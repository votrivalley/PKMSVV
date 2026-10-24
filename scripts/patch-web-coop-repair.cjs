'use strict';
/* Web-only fixes after RTC, lobby and online counter patches. */
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(rel,a,b){const file=path.join(game,rel),s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');if(s.split(a).length!==2)throw Error('Co-op repair source drift '+rel+': '+a.slice(0,90));fs.writeFileSync(file,s.replace(a,b),'utf8');}
// Start a fresh WebRTC handshake on explicit user request, never fake success.
// Host automatic retry (15s) remains; this button avoids waiting for it.
patch('js/net/net.js',
 "    onPeer(fn) { peerHandlers.add(fn); },",
 "    onPeer(fn) { peerHandlers.add(fn); },\n"+
 "    retry(u){\n"+
 "      if(!isHost||!roomId||u===uid||!u)return false;\n"+
 "      if(peers.has(u))drop(u,true);\n"+
 "      pendingIce.delete(u);\n"+
 "      connect(u);return true;\n"+
 "    },");
patch('js/ui/social-ui.js',
 "      return '';\n    }\n\n    function render() {",
 "      return f.status==='ok'?(G.PKMSVVOnline&&G.PKMSVVOnline.isOnline(f.uid)?'Đang online':'Ngoại tuyến'):'';\n    }\n\n    function render() {");
patch('js/ui/social-ui.js',
 "        const dot = f.status !== 'ok' ? 'pend' : 'on';",
 "        const dot = f.status !== 'ok' ? 'pend' : (G.PKMSVVOnline&&G.PKMSVVOnline.isOnline(f.uid)?'on':'off');");
patch('js/ui/social-ui.js',
 "          el.innerHTML = `<i class=\"dot on\"></i><b translate=\"no\">${esc(f.name)}</b><span class=\"grow\"></span>`;",
 "          el.innerHTML = `<i class=\"dot ${G.PKMSVVOnline&&G.PKMSVVOnline.isOnline(f.uid)?'on':'off'}\"></i><b translate=\"no\">${esc(f.name)}</b><span class=\"grow\"></span>`;");
fs.copyFileSync(path.join(root,'src','web','pkmsvv-coop-repair.js'),path.join(game,'js','ui','pkmsvv-coop-repair.js'));
patch('dev.html',
 '<script defer src="js/ui/pkmsvv-multiplayer-ui.js"></script>',
 '<script defer src="js/ui/pkmsvv-multiplayer-ui.js"></script>\n<script defer src="js/ui/pkmsvv-coop-repair.js"></script>');
const css="\n.fr-row .dot.off{background:#7d8797!important;box-shadow:none!important}\n#pkmsvv-coop-retry{min-height:39px;padding:8px 13px;white-space:normal;margin-top:10px}\n#pkmsvv-coop-retry.pad-focus{outline:3px solid #ffe27a!important;outline-offset:3px!important}\n#lobby-note{line-height:1.5;max-width:100%;overflow-wrap:break-word}\n";
fs.appendFileSync(path.join(game,'css','style.css'),css,'utf8');
console.log('SVV Web Co-op: accurate online dots, manual peer reconnect, clear failure reasons.');
