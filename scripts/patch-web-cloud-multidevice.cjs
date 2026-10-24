'use strict';
/* Web-only: consistent Cloud Save on multiple browsers, with no accidental
 * first upload of a fabricated empty profile. Native remains offline. */
const fs=require('node:fs'),path=require('node:path');
const game=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(rel,from,to){
 const file=path.join(game,rel),s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 if(s.split(from).length!==2)throw Error('Cloud sync anchor changed: '+rel+' '+from.slice(0,90));
 fs.writeFileSync(file,s.replace(from,to),'utf8');
}
// Server-side read: do not mistake the browser's empty Firestore cache for a
// missing Cloud save. Offline falls back ONLY if there is a local copy.
patch('js/core/db.js',
 "      const snap = await docRef().get();\n      remote = snap.exists ? snap.data().save : null;",
 "      const snap = await docRef().get({ source: 'server' });\n      remote = snap.exists && snap.data() ? snap.data().save : null;");
patch('js/core/db.js',
 "  let syncState = 'local';",
 "  let cloudOrigin = 'unknown', cloudMissing = false, uploadConfirmed = false;\n  let syncState = 'local';");
patch('js/core/db.js',
 "    const cached = read(K_CLOUD + uid);\n    let remote = null, online = true;",
 "    const cached = read(K_CLOUD + uid);\n    cloudOrigin = 'unknown'; cloudMissing = false; uploadConfirmed = false;\n    let remote = null, online = true;");
patch('js/core/db.js',
 "    let s = merge(cached && fold(migrate(cached)), remote && migrate(remote));",
 "    cloudOrigin = !online ? 'local-offline' : remote ? 'cloud' : cached ? 'local-unuploaded' : 'new';\n    cloudMissing = online && !remote;\n    if(cached)write('pkmsvv.cloudbackup.beforeLogin.'+uid,cached);\n    let s = merge(cached && fold(migrate(cached)), remote && migrate(remote));");
// Recent timestamp alone does NOT mean both devices have the same gains.
// Preserve a pending local delta until an actual server-side transaction.
patch('js/core/db.js',
 "    const same = remote && !opts.legacy && (!cached || (cached.updated || 0) <= (remote.updated || 0));",
 "    const same = !!remote && !opts.legacy && JSON.stringify(plain(save)) === JSON.stringify(plain(migrate(plain(remote))));");
// Logout, updater and manual save all funnel through pushNow. Block implicit
// creation from an unsynced new device. User may approve manual first upload.
patch('js/core/db.js',
 "    // Si ya hay una subida en marcha, se hace otra justo después (para lo que haya cambiado mientras).\n    if (pushing)",
 "    if(cloudMissing && !uploadConfirmed){pending=true;setSync('pending');return Promise.resolve();}\n    // Si ya hay una subida en marcha, se hace otra justo después (para lo que haya cambiado mientras).\n    if (pushing)");
patch('js/core/db.js',
 "    if (mode !== 'cloud') return { ok: true, why: 'local' };\n    if (!pending",
 "    if (mode !== 'cloud') return { ok: true, why: 'local' };\n    if(cloudMissing && !uploadConfirmed){\n      const vi=G.I18n&&G.I18n.lang==='vi';\n      const ok=confirm(vi?\n        'Chưa có save trên Cloud. Nếu bạn có tiến trình ở máy cũ, hãy nhấn Lưu trên máy cũ rồi tải lại game tại máy này. Nhấn OK CHỈ khi bạn muốn tạo save Cloud mới từ máy này.':\n        'No Cloud save was found. If you played on an old device, save there first and reload here. Press OK ONLY to create a new Cloud save from this device.');\n      if(!ok)return {ok:false,why:'unverified'};\n      uploadConfirmed=true;\n    }\n    if (!pending");
patch('js/core/db.js',
 "      if (uid !== owner || !save) return;\n      // Do not mutate gameplay state during an active run.",
 "      if (uid !== owner || !save) return;\n      cloudMissing=false;cloudOrigin='cloud';\n      // Do not mutate gameplay state during an active run.");
patch('js/core/db.js',
 "    get syncState() { return syncState; },",
 "    get syncState() { return syncState; },\n    get cloudOrigin() { return cloudOrigin; },");
// Show why a new device has no progress, without changing game state.
patch('js/game.js',
 "  afterLogin() {\n    G.Audio.music('village');",
 "  afterLogin() {\n    G.Audio.music('village');\n    if(G.DB.mode==='cloud' && G.DB.cloudOrigin!=='cloud')setTimeout(()=>{\n      if(G.UI && G.UI.toast)G.UI.toast(G.I18n&&G.I18n.lang==='vi'?\n        'Chưa thấy save đã đồng bộ trên Cloud. Nhấn Lưu ở máy cũ, đợi xác nhận rồi tải lại trang trên máy mới.':\n        'No uploaded Cloud save found. Save on the old device, wait for confirmation, then reload here.',7500);\n    },550);");
patch('js/ui/ui.js',
 "      toast(r.why === 'wait' ? ",
 "      if(r.why==='unverified'){toast(G.I18n&&G.I18n.lang==='vi'?'Đã hủy tải save mới lên Cloud để bảo vệ tiến trình máy cũ.':'Upload canceled to protect progress on another device.',5000);return;}\n      toast(r.why === 'wait' ? ");
console.log('PKMSVV Web: server-only startup load, no silent empty save upload, account-state warning.');
