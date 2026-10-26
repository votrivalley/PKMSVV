'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
const read=p=>fs.readFileSync(path.join(game,p),'utf8').replace(/\r\n/g,'\n');
const write=(p,s)=>fs.writeFileSync(path.join(game,p),s,'utf8');
function once(p,a,b){const s=read(p),n=s.split(a).length-1;if(n!==1)throw Error('LAN anchor drift: '+p+' ('+n+')');write(p,s.replace(a,b));}
const readLan=p=>fs.readFileSync(path.join(root,'src','lan',p),'utf8');
once('dev.html','<script defer src="js/net/social.js"></script>',
 '<script defer src="js/net/lan-bus.js"></script>\n<script defer src="js/net/social.js"></script>');
write('js/net/lan-bus.js',readLan('lan-bus.js'));
write('js/net/social.js',readLan('social-lan.js'));
write('js/net/net.js',readLan('net-lan.js'));

once('js/game.js',
 "if (restored || G.DB.mode === 'local') this.afterLogin(); else this.tapToStart(() => this.toLogin());",
 "if (restored && G.DB.save) this.afterLogin(); else this.tapToStart(() => this.toLogin());");
once('js/ui/login.js',
 "setTimeout(() => $('pkmsvv-login-google').focus(), 50);",
 "setTimeout(() => $('f-user').focus(), 50);");
let ui=read('js/ui/social-ui.js');
const start=ui.indexOf('  function needOnline() {'),end=ui.indexOf('  // ======================= APODO =======================',start);
if(start<0||end<0)throw Error('LAN social online gate drift');
ui=ui.slice(0,start)+'  function needOnline() { return !!G.DB.save; }\n\n'+ui.slice(end);
once('dev.html',
 'Ghép trận với người lạ, tìm phòng công khai hoặc tạo phòng riêng để mời bạn bè.',
 'Chọn chế độ để tạo phòng LAN hoặc tìm phòng công khai trên cùng máy Host. Chia sẻ địa chỉ IP và mã phòng để tham gia.');
const marker='      // Las tarjetas sólo se rehacen si cambian los miembros';
if(!ui.includes(marker))throw Error('LAN lobby room marker drift');
ui=ui.replace(marker,
 "      $('lobby-sub').textContent += '  ·  Mã phòng: '+room.id+(room.isHost?'  ·  Địa chỉ LAN: '+location.origin:'');\n"+
 "      $('lobby-inv-title').classList.add('hidden');\n"+
 "      $('lobby-invite').classList.add('hidden');\n"+marker);
write('js/ui/social-ui.js',ui);
const css=[
'/* LAN: no Firebase friends/rank, Google login or unavailable HTTP voice */',
'#scr-menu [data-go="friends"],#scr-menu [data-go="rank"],',
'#scr-friends,#scr-rank,#pkmsvv-menu-google,#btn-google,#pkmsvv-login-google,',
'#pkmsvv-online-counter,#lobby-inv-title,#lobby-invite,',
'[id*="pkmsvv-voice"],#pkmsvv-voice-panel {display:none!important}',
'#scr-login .tabs{display:flex!important}',
'#scr-login #login-form{display:block!important}',
'#scr-login #btn-guest,#scr-login .pkmsvv-entry-buttons{display:none!important}',
'#scr-multiplayer .pkmsvv-mp-box:before{',
'content:"LAN · Cùng Wi-Fi, không cần Google. Host chia sẻ IP và mã phòng. Save LAN tách khỏi Offline và Cloud.";',
'display:block;color:#ffe3a4;margin:12px 0;line-height:1.5}'
].join('\n');
fs.appendFileSync(path.join(game,'css','style.css'),'\n'+css+'\n','utf8');
console.log('PKMSVV LAN: local signalling and frame relay installed.');
