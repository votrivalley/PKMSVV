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
write('js/net/lan-ai.js',readLan('lan-ai.js'));
write('js/ui/lan-compact-ui.js',readLan('lan-compact-ui.js'));
write('js/ui/pkmsvv-local-shell.js',fs.readFileSync(path.join(root,'src/shared/local-shell.js'),'utf8'));
write('js/ui/pkmsvv-coop-unified.js',fs.readFileSync(path.join(root,'src/shared/coop-unified.js'),'utf8'));
once('dev.html','<script defer src="js/net/lan-bus.js"></script>', '<script defer src="js/net/lan-bus.js"></script>\n<script defer src="js/net/lan-ai.js"></script>');

// LOCAL mode already creates/restores the saved player in prepare-game.
// Never reintroduce the Google/username start screen in LAN builds.
once('js/ui/login.js',
 "setTimeout(() => $('pkmsvv-login-google').focus(), 50);",
 "setTimeout(() => $('f-user').focus(), 50);");
let ui=read('js/ui/social-ui.js');
const start=ui.indexOf('  function needOnline() {'),end=ui.indexOf('  // ======================= APODO =======================',start);
if(start<0||end<0)throw Error('LAN social online gate drift');
ui=ui.slice(0,start)+'  function needOnline() { return !!G.DB.save; }\n\n'+ui.slice(end);
once('dev.html',
 'Ghép trận với người lạ, tìm phòng công khai hoặc tạo phòng riêng để mời bạn bè.',
 'Chọn chế độ, tạo phòng hoặc nhập mã bạn bè chia sẻ. Cùng Wi-Fi với PC Host.');
// Show host-only AI controls in the existing lobby, not a second lobby screen.
const conn='    function connText(m, room) {';
if(!ui.includes(conn))throw Error('LAN AI connText marker drift');
ui=ui.replace(conn,conn+" if(m.bot)return 'AI · Máy';");
const marker='      // Las tarjetas sólo se rehacen si cambian los miembros';
if(!ui.includes(marker))throw Error('LAN lobby room marker drift');
ui=ui.replace(marker,
 `      let aiBar=document.getElementById('pkmsvv-lan-ai-bar');
      if(!aiBar){
       aiBar=document.createElement('div');aiBar.id='pkmsvv-lan-ai-bar';
       aiBar.className='row wrap';aiBar.style.cssText='gap:8px;margin:8px 0';
       $('lobby-note').insertAdjacentElement('afterend',aiBar);
       const add=document.createElement('button');add.id='pkmsvv-lan-ai-add';add.type='button';add.className='btn small gold';add.textContent='➕ Thêm AI (thử nghiệm)';
       const remove=document.createElement('button');remove.id='pkmsvv-lan-ai-remove';remove.type='button';remove.className='btn small ghost';remove.textContent='➖ Bớt AI';
       aiBar.append(add,remove);
       add.onclick=()=>G.LanBus.request('addBot',{}).catch(e=>G.UI.toast(e.message,3500));
       remove.onclick=()=>{
        const bot=G.Social.room?.members?.findLast?.(m=>m.bot);
        if(bot)G.LanBus.request('removeBot',{uid:bot.uid}).catch(e=>G.UI.toast(e.message,3500));
       };
      }
      aiBar.classList.toggle('hidden',!room.isHost||room.mode!=='coop'||!room.open);
      const botCount=room.members.filter(m=>m.bot).length;
      $('pkmsvv-lan-ai-add').disabled=room.members.length>=4;
      $('pkmsvv-lan-ai-remove').disabled=!botCount;
      `+
 "      $('lobby-sub').textContent += '  ·  Mã phòng: '+room.id+(room.isHost?'  ·  Địa chỉ LAN: '+location.origin:'');\n"+
 "      $('lobby-inv-title').classList.add('hidden');\n"+
 "      $('lobby-invite').classList.add('hidden');\n"+marker);
write('js/ui/social-ui.js',ui);
once('dev.html','<script defer src="js/ui/pkmsvv-multiplayer-ui.js"></script>',
 '<script defer src="js/ui/pkmsvv-multiplayer-ui.js"></script>\n<script defer src="js/ui/lan-compact-ui.js"></script>');
once('dev.html','<script defer src="js/ui/lan-compact-ui.js"></script>',
 '<script defer src="js/ui/lan-compact-ui.js"></script>\n<script>window.PKMSVV_LOCAL_UI_MODE="lan"</script>\n<script defer src="js/ui/pkmsvv-local-shell.js"></script>\n<script defer src="js/ui/pkmsvv-coop-unified.js"></script>');
// Change labels without assuming the exact Web markup after prior patches.
let html=read('dev.html');
const linkPattern=/(<button\b[^>]*\bdata-go="multiplayer"[^>]*>)[^<]*/;
if(!linkPattern.test(html))throw Error('LAN: Co-op menu button missing');
html=html.replace(linkPattern,'$1🤝 Co-op');
const headerPattern=/(<section\b[^>]*id="scr-multiplayer"[\s\S]*?<h2[^>]*>)[^<]*/;
if(!headerPattern.test(html))throw Error('LAN: Co-op room heading missing');
html=html.replace(headerPattern,'$1🤝 Co-op · LAN');
write('dev.html',html);
const css=[
'/* LAN: no Firebase friends/rank, Google login or unavailable HTTP voice */',
'#scr-menu [data-go="friends"],#scr-menu [data-go="rank"],',
'#scr-friends,#scr-rank,#pkmsvv-menu-google,#btn-google,#pkmsvv-login-google,',
'#pkmsvv-online-counter,#lobby-inv-title,#lobby-invite,#pkmsvv-v15-backup,',
'[id*="pkmsvv-voice"],#pkmsvv-voice-panel {display:none!important}',
'#scr-login #btn-guest,#scr-login .pkmsvv-entry-buttons{display:none!important}',
'#scr-multiplayer .pkmsvv-mp-box:before{',
'content:"";',
'display:block;color:#ffe3a4;margin:12px 0;line-height:1.5}'
].join('\n');
fs.appendFileSync(path.join(game,'css','style.css'),'\n'+css+'\n'+readLan('lan-compact-ui.css')+'\n'+fs.readFileSync(path.join(root,'src/shared/local-shell.css'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/shared/coop-unified.css'),'utf8')+'\n','utf8');
console.log('PKMSVV LAN: local signalling and frame relay installed.');
