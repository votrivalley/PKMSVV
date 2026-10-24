'use strict';
/* Web Online-only counter, no Firestore heartbeat or heavy value-subscription.
 * Social/Co-op share the RTDB socket: Spark allows only 100 connections. */
const fs=require('node:fs'),path=require('node:path');
const game=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(p,before,after){
 const target=path.join(game,p),source=fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n');
 if(source.split(before).length!==2)throw Error('Online counter source anchor changed '+p+': '+before.slice(0,90));
 fs.writeFileSync(target,source.replace(before,after),'utf8');
}
fs.copyFileSync(path.join(__dirname,'..','src','web','pkmsvv-online-counter.js'),
 path.join(game,'js','core','pkmsvv-online-counter.js'));
patch('dev.html',
 '<script defer src="js/core/pkmsvv-exclusive-session.js"></script>',
 '<script defer src="js/core/pkmsvv-online-counter.js"></script>\n<script defer src="js/core/pkmsvv-exclusive-session.js"></script>');
patch('dev.html',
 '<div class="pill" id="user-pill"></div>',
 '<div class="pill" id="user-pill"></div>\n' +
 '<div class="pill hidden" id="pkmsvv-online-count" title="Số tài khoản đang chơi Web Online" aria-live="polite" style="color:#9ce8bd;white-space:nowrap">● Đang online: —</div>');
patch('js/core/db.js',
 "    key = uid; user = save.name; guest = false;\n    write(K_CLOUD + uid, save);",
 "    key = uid; user = save.name; guest = false;\n    write(K_CLOUD + uid, save);\n    // Presence uses the active account token, not a client-controlled user count.\n    if (rtdb && G.PKMSVVOnline) G.PKMSVVOnline.start(rtdb,uid,G.PKMSVVSession.token);");
patch('js/core/pkmsvv-exclusive-session.js',
 " function stop(){\n   if(unsub)",
 " function stop(){\n   if(G.PKMSVVOnline)G.PKMSVVOnline.stop();\n   if(unsub)");
patch('js/core/pkmsvv-exclusive-session.js',
 "   drawKick();\n   try{if(G.Net",
 "   drawKick();\n   if(G.PKMSVVOnline)G.PKMSVVOnline.stop();\n   try{if(G.Net");
// Original social goes offline on the main menu, so keep the shared socket
// only for people who opted into the Web Online session.
patch('js/net/social.js',
 "    if (fb.rtdb) fb.rtdb.goOffline();         // se conecta sólo al entrar en una sala",
 "    if (fb.rtdb && !(G.PKMSVVOnline && G.PKMSVVOnline.active)) fb.rtdb.goOffline();");
patch('js/net/social.js',
 "  function rtOff() { if (fb && fb.rtdb && !room) fb.rtdb.goOffline(); }",
 "  function rtOff() { if (fb && fb.rtdb && !room && !(G.PKMSVVOnline && G.PKMSVVOnline.active)) fb.rtdb.goOffline(); }");
// There is no more global online count on Firestore; RTDB handles all presence.
console.log('PKMSVV Web: RTDB online accounts counter, auto-remove on disconnect, offline stays local.');
