'use strict';
/* Online-only multiplayer hub; separate friends list, public rooms and matchmaking. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),base=path.join(root,'vendor','pokesurvivor');
function patch(p,from,to){
 const file=path.join(base,p),s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),parts=s.split(from);
 if(parts.length!==2)throw Error('Hub source anchor changed: '+p+' '+from.slice(0,90));
 fs.writeFileSync(file,parts.join(to),'utf8');
}
const markup=[
'<section id="scr-multiplayer" class="scr dim hidden">',
' <div class="box wide pkmsvv-mp-box">',
'  <div class="row between"><h2>🌐 Nhiều người chơi</h2><button class="btn small ghost" id="pkmsvv-mp-back">Quay lại</button></div>',
'  <p class="sub">Ghép trận với người lạ, tìm phòng công khai hoặc tạo phòng riêng để mời bạn bè.</p>',
'  <div id="pkmsvv-mp-current" class="note"></div><button class="btn small gold hidden" id="pkmsvv-existing-lobby">Đến phòng đang tham gia</button>',
'  <h3>⚡ Chơi nhanh</h3><div class="row wrap pkmsvv-mp-actions">',
'   <button class="btn gold" id="pkmsvv-quick-coop">🤝 Ghép Co-op</button>',
'   <button class="btn gold" id="pkmsvv-quick-royale">🏆 Ghép Sinh tồn</button>',
'  </div>',
'  <h3>🗂 Phòng công khai</h3><p class="sub">Không cần kết bạn; bạn có thể chọn phòng đang chờ.</p>',
'  <div id="pkmsvv-public-list" class="pkmsvv-public-list"></div>',
'  <button class="btn small" id="pkmsvv-public-refresh">↻ Tải lại phòng</button>',
'  <h3>➕ Tạo phòng</h3><div class="row wrap pkmsvv-mp-actions">',
'   <button class="btn" id="pkmsvv-coop-public">Co-op · Công khai</button>',
'   <button class="btn" id="pkmsvv-royale-public">Sinh tồn · Công khai</button>',
'   <button class="btn" id="pkmsvv-coop-private">Co-op · Riêng tư</button>',
'   <button class="btn" id="pkmsvv-royale-private">Sinh tồn · Riêng tư</button>',
'  </div>',
'  <h3>🔒 Vào bằng mã phòng</h3><div class="row wrap"><input id="pkmsvv-room-code" class="field grow" placeholder="Dán mã phòng" maxlength="45" autocomplete="off">',
'   <button class="btn gold" id="pkmsvv-join-code">Vào phòng</button></div>',
'  <p class="note" role="status" id="pkmsvv-mp-message"></p>',
' </div>',
'</section>'].join('\n');
patch('dev.html','<!-- ====== Sala (partida en grupo) ====== -->',markup+'\n<!-- ====== Sala (partida en grupo) ====== -->');
patch('dev.html','<script defer src="js/ui/social-ui.js"></script>',
 '<script defer src="js/ui/social-ui.js"></script>\n<script defer src="js/ui/pkmsvv-multiplayer-ui.js"></script>');
fs.copyFileSync(path.join(root,'src/web/pkmsvv-multiplayer-ui.js'),path.join(base,'js/ui/pkmsvv-multiplayer-ui.js'));
patch('dev.html','<button class="menu-item" data-go="friends">',
 '<button class="menu-item" data-go="multiplayer">Nhiều người chơi<small>Chơi nhanh · Phòng công khai · Riêng tư</small></button>\n        <button class="menu-item" data-go="friends">');
patch('js/ui/menu.js',
 "friends: 'friends', rank: 'trophy'",
 "friends: 'friends', multiplayer: 'friends', rank: 'trophy'");
patch('js/ui/menu.js',
 "else if (go === 'friends') G.FriendsUI.open();",
 "else if (go === 'friends') G.FriendsUI.open();\n        else if (go === 'multiplayer') G.MultiplayerUI.open();");
patch('js/ui/menu.js',
 "'Juega en grupo, hasta 4';",
 "'Danh sách bạn bè';");
// Only Friends should contain friends, not create/join mode controls.
fs.appendFileSync(path.join(base,'css/style.css'),
 '\n#scr-friends #pkmsvv-create-modes,#scr-friends #fr-room{display:none!important}\n'+
 '.pkmsvv-mp-box{max-height:min(83vh,750px);overflow-y:auto;overscroll-behavior:contain}\n'+
 '.pkmsvv-mp-actions{gap:8px}.pkmsvv-mp-actions .btn{flex:1 1 44%;white-space:normal;min-width:170px}\n'+
 '.pkmsvv-public-list{min-height:55px;border:1px solid #54719d;border-radius:10px;padding:10px;margin:8px 0 12px}\n'+
 '.pkmsvv-public-room{display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #516b91;padding:8px 0}\n'+
 '.pkmsvv-public-room:last-child{border:0}.pkmsvv-public-room span{flex:1;overflow-wrap:anywhere}\n'+
 '@media(max-width:560px){.pkmsvv-mp-actions .btn{min-width:100%}.pkmsvv-mp-box{max-height:86vh}}\n','utf8');
patch('js/ui/ui.js',
 "'scr-nick', 'scr-friends', 'scr-lobby', 'scr-rank'",
 "'scr-nick', 'scr-friends', 'scr-multiplayer', 'scr-lobby', 'scr-rank'");
patch('js/game.js',
 "'scr-friends', 'scr-rank', 'scr-goals'",
 "'scr-friends', 'scr-multiplayer', 'scr-rank', 'scr-goals'");
patch('js/game.js',
 "G.SocialUI.init(); G.RankingUI.init();",
 "G.SocialUI.init(); G.MultiplayerUI.init(); G.RankingUI.init();");
// Add public visibility to existing host-based room architecture.
patch('js/net/social.js',
 "  async function createRoom(mode = 'coop') {",
 "  async function createRoom(mode = 'coop', visibility = 'private') {\n    visibility = visibility === 'public' ? 'public' : 'private';");
patch('js/net/social.js',
 "await fb.rtdb.ref('rooms/' + id).set({ host: uid, mode, open: true, at: ts(), m: { [uid]: memberInfo() } });",
 "await fb.rtdb.ref('rooms/' + id).set({ host: uid, mode, open: true, at: ts(), m: { [uid]: memberInfo() } });\n"+
 "    if (visibility === 'public') {\n"+
 "      try {\n"+
 "        await fb.rtdb.ref('publicRooms/' + id).set({ host: uid, name: me.name, mode, open: true, size: 1, at: ts() });\n"+
 "        fb.rtdb.ref('publicRooms/' + id).onDisconnect().remove();\n"+
 "      } catch (err) {\n"+
 "        await fb.rtdb.ref('rooms/' + id).remove().catch(()=>{});\n"+
 "        throw Error('Cần triển khai Realtime Database Rules cho phòng công khai ('+(err.code||err.message)+')');\n"+
 "      }\n"+
 "    }");
patch('js/net/social.js',
 "    enterRoom(id, uid, mode);\n    return room;",
 "    enterRoom(id, uid, mode);\n    room.visibility=visibility;\n    return room;");
patch('js/net/social.js',
 "      emit('room');\n    }, () => closedRoom());",
 "      if (room.isHost && room.visibility === 'public') fb.rtdb.ref('publicRooms/' + id).update({size:room.members.length}).catch(()=>{});\n"+
 "      emit('room');\n    }, () => closedRoom());");
patch('js/net/social.js',
 "    await ref.remove().catch(() => {});\n    retractInvites();",
 "    await ref.remove().catch(() => {});\n"+
 "    if(r.isHost && r.visibility==='public') fb.rtdb.ref('publicRooms/'+r.id).remove().catch(()=>{});\n"+
 "    retractInvites();");
patch('js/net/social.js',
 "if (room && room.isHost) fb.rtdb.ref('rooms/' + room.id + '/open').set(!!open).catch(() => {});",
 "if (room && room.isHost){fb.rtdb.ref('rooms/' + room.id + '/open').set(!!open).catch(()=>{});\n"+
 "      if(room.visibility==='public')fb.rtdb.ref('publicRooms/'+room.id).update({open:!!open}).catch(()=>{});}");
patch('js/net/social.js',
 "  function refreshMember() {",
 "  async function listPublicRooms(){\n"+
 "    if (!me || !fb || !uid) return [];\n"+
 "    rtOn();\n"+
 "    try {\n"+
 "      const snap=await fb.rtdb.ref('publicRooms').orderByChild('at').limitToLast(40).get();\n"+
 "      return Object.entries(snap.val()||{}).map(([id,v])=>Object.assign({id},v)).filter(r=>r.open===true&&\n"+
 "        ['coop','royale'].includes(r.mode)&&typeof r.host==='string'&&r.host!==uid&&\n"+
 "        r.size>=1&&r.size<(r.mode==='royale'?10:4)&&Number(r.at)>now()-1800000).reverse();\n"+
 "    }finally{rtOff();}\n"+
 "  }\n"+
 "  function refreshMember() {");
patch('js/net/social.js',
 "    createRoom, joinRoom, leaveRoom, setOpen, refreshMember,",
 "    createRoom, joinRoom, listPublicRooms, leaveRoom, setOpen, refreshMember,");
// The current lobby title advertises the current mode, not friends only.
patch('dev.html','<h2>Sala</h2>', '<h2>Phòng nhiều người chơi</h2>');
console.log('PKMSVV Web: standalone multiplayer hub and authenticated public room index.');
