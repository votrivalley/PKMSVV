'use strict';
/* Exclusive Online session, automatic save after every run.
 * Must execute after patch-web-cloud-safe and patch-web-cloud-multidevice.
 * Keep Windows/Android and the Web Offline profile unchanged.
 */
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(rel,oldText,newText){
 const file=path.join(base,rel),s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 if(s.split(oldText).length!==2)throw Error('Session/save source anchor changed: '+rel+' '+oldText.slice(0,90));
 fs.writeFileSync(file,s.replace(oldText,newText),'utf8');
}
const sessionFile=path.join(base,'js','core','pkmsvv-exclusive-session.js');
fs.copyFileSync(path.join(__dirname,'..','src','web','pkmsvv-exclusive-session.js'),sessionFile);
patch('dev.html',
 '<script defer src="js/core/db.js"></script>',
 '<script defer src="js/core/pkmsvv-exclusive-session.js"></script>\n<script defer src="js/core/db.js"></script>');
// Each cloud account owns exactly one active Web game session; the most recent
// authenticated login replaces the old token. This is a server write.
patch('js/core/db.js',
 '    uid = u.uid;\n    const cached = read(K_CLOUD + uid);',
 '    uid = u.uid;\n    await G.PKMSVVSession.claim(fs,uid,auth);\n    const cached = read(K_CLOUD + uid);');
// Do not let a displaced browser upload even when logout/updater calls flush().
patch('js/core/db.js',
 "    if (mode !== 'cloud' || guest || !save || !uid) return Promise.resolve();\n    if(cloudMissing",
 "    if (mode !== 'cloud' || guest || !save || !uid) return Promise.resolve();\n    if (!G.PKMSVVSession.active()) { pending=true;setSync('offline');return Promise.resolve(); }\n    if(cloudMissing");
patch('js/core/db.js',
 "    if (mode !== 'cloud') return { ok: true, why: 'local' };\n    if(cloudMissing",
 "    if (mode !== 'cloud') return { ok: true, why: 'local' };\n    if (!G.PKMSVVSession.active()) return {ok:false,why:'session'};\n    if(cloudMissing");
// In a Firestore transaction read the session first, then the save, then write
// only if the online browser still holds the active session token.
patch('js/core/db.js',
 "    const owner = uid, snapshot = plain(fold(save));",
 "    const owner = uid, snapshot = plain(fold(save));\n    snapshot._webSession=G.PKMSVVSession.token;");
patch('js/core/db.js',
 "      const ref = fs.collection('saves').doc(owner);\n      const current = await tx.get(ref);",
 "      const session=await tx.get(fs.collection('sessions').doc(owner));\n      if (!G.PKMSVVSession.active() || !session.exists || session.data().token!==snapshot._webSession)\n        throw {code:'session-replaced'};\n      const ref = fs.collection('saves').doc(owner);\n      const current = await tx.get(ref);");
patch('js/core/db.js',
 "      const merged = plain(fold(merge(snapshot, remote)));\n      tx.set(ref,",
 "      const merged = plain(fold(merge(snapshot, remote)));\n      merged._webSession=snapshot._webSession;\n      tx.set(ref,");
patch('js/core/db.js',
 "      console.warn('[DB] no se pudo sincronizar:', e.code || e.message);",
 "      if(e && e.code==='session-replaced')return;\n      console.warn('[DB] no se pudo sincronizar:', e.code || e.message);");
// No arbitrary 65s delay: each finished game immediately requests Cloud write.
// A 3s cooldown protects against fast double-clicks while Firestore rules allow
// a 2s minimum between writes. Queued saves retry automatically.
patch('js/core/db.js',
 "  const K_OK = 'ps.cloudok.', MIN_GAP = 65000;",
 "  const K_OK = 'ps.cloudok.', MIN_GAP = 3000;");
// While showing the results screen, a run is finished; merging its Cloud
// confirmation is safe and must not re-mark it pending.
patch('js/core/db.js',
 "      if (G.Game && G.Game.state && G.Game.state !== 'ui') { pending = true; }",
 "      if (G.Game && G.Game.state && G.Game.state !== 'ui' && G.Game.state !== 'over') { pending = true; }");
// User-initiated first-run consent, before gameplay, prevents an unexpected
// browser confirm at run end. Existing developed accounts do not prompt.
patch('js/core/db.js',
 "  /** Firebase pide email: el nombre se codifica en uno interno, único y válido. */",
 "  function readyForCloudRun(){\n    if(mode!=='cloud' || guest)return true;\n    if(!G.PKMSVVSession.active())return false;\n    if(!cloudMissing || uploadConfirmed)return true;\n    const message=G.I18n&&G.I18n.lang==='vi'?\n      'Cloud chưa có save nào. Nếu đã chơi trên máy khác, hãy nhấn Lưu ở máy cũ trước. Chỉ nhấn OK nếu muốn tạo save Cloud đầu tiên từ thiết bị này.':\n      'No Cloud save exists. If you played on another device, save there first. Press OK only to create your first Cloud save on this device.';\n    if(!confirm(message))return false;\n    uploadConfirmed=true;return true;\n  }\n  /** Firebase pide email: el nombre se codifica en uno interno, único y válido. */");
patch('js/core/db.js',
 "    ready, register, login, loginWithGoogle, playAsGuest, logout, commit, deleteAccount, flush: pushNow, saveNow,",
 "    ready, register, login, loginWithGoogle, playAsGuest, logout, commit, deleteAccount, flush: pushNow, saveNow, readyForCloudRun,");
// Sign out only after final cloud write; stop listening before changing auth.
patch('js/core/db.js',
 "      stopListening();\n      try { await auth.signOut(); }",
 "      stopListening();\n      G.PKMSVVSession.stop();\n      try { await auth.signOut(); }");
patch('js/game.js',
 "  function startRun(coop = null) {\n    G.Royale.begin(coop);",
 "  function startRun(coop = null) {\n    if(G.DB.mode==='cloud' && !G.DB.readyForCloudRun()){\n      G.UI.toast('Phiên Cloud chưa sẵn sàng. Kiểm tra tài khoản hoặc save trên máy khác.',5000);return;\n    }\n    G.Royale.begin(coop);");
// EndRun has already banked tickets, rewards, upgrades and stats before commit.
// Request Cloud upload after this, with explicit failure/pending UI.
patch('js/game.js',
 "    G.DB.commit('run');\n    if (G.Social.me) G.Social.publishProfile();",
 "    G.DB.commit('run');\n    if(G.DB.mode==='cloud' && !G.DB.guest){\n      G.DB.saveNow().then(r=>{\n        if(!r.ok || r.why==='wait')G.UI.toast(r.why==='wait'?\n          'Đã lưu trên máy. Cloud sẽ tự đồng bộ khi hết thời gian chờ.':\n          'Đã lưu trên máy, chưa đồng bộ Cloud. Hãy kiểm tra mạng và trạng thái Lưu trước khi đổi máy.',5500);\n        else G.UI.toast('Lượt chơi đã được lưu trên Cloud.',3000);\n      }).catch(e=>G.UI.toast('Đã lưu trên máy. Lỗi Cloud: thử lại bằng nút Lưu.',5000));\n    }\n    if (G.Social.me) G.Social.publishProfile();");
// If an account is deleted, no old session listener should survive.
patch('js/core/db.js',
 "      remove(K_CLOUD + uid);\n      await auth.currentUser.delete();",
 "      remove(K_CLOUD + uid);\n      G.PKMSVVSession.stop();\n      await auth.currentUser.delete();");
console.log('PKMSVV Web: exclusive online sessions and Cloud auto-save after every completed run.');
