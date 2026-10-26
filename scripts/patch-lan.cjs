'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
const read=p=>fs.readFileSync(path.join(game,p),'utf8').replace(/\r\n/g,'\n');
const write=(p,s)=>fs.writeFileSync(path.join(game,p),s,'utf8');
function once(p,a,b){const s=read(p),n=s.split(a).length-1;if(n!==1)throw Error('LAN anchor drift: '+p+' ('+n+')');write(p,s.replace(a,b));}
const readLan=p=>fs.readFileSync(path.join(root,'src','lan',p),'utf8');
once('dev.html','<script defer src="js/net/social.js"></script>',
 '<script defer src="js/net/lan-bus.js"></script>\n<script defer src="js/net/social.js"></script>');
// build.js bundles external scripts only and discards inline scripts between
// scripts:begin/end. Put the target marker INSIDE a compiled source file.
write('js/net/lan-bus.js',"window.PKMSVV_LOCAL_UI_MODE='lan';\n"+
 (process.env.PKMSVV_STANDALONE_AI==='1'?"window.PKMSVV_STANDALONE_AI=true;\n"+readLan('solo-ai-bus.js'):readLan('lan-bus.js')));
// Avoid redrawing the animated menu at 120/144/240 Hz on gaming displays.
// Keep gameplay/network ticking at up to 60 Hz; this changes no game rules.
once('js/game.js',
 '  function loop(ts) {\n    requestAnimationFrame(loop);',
 `  let lanFrameAt=0;
  function loop(ts) {
    requestAnimationFrame(loop);
    const interval=1000/(state==='ui'?30:60);
    if(ts-lanFrameAt<interval-0.5)return;
    lanFrameAt=ts-((ts-lanFrameAt)%interval);
    if(document.hidden&&state==='ui'){last=ts;return;}`);
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
       const add=document.createElement('button');add.id='pkmsvv-lan-ai-add';add.type='button';add.className='btn small gold';add.textContent='➕ Thêm AI';
       const remove=document.createElement('button');remove.id='pkmsvv-lan-ai-remove';remove.type='button';remove.className='btn small ghost';remove.textContent='➖ Bớt AI';
       const species=document.createElement('input');species.id='pkmsvv-lan-ai-species';species.className='field';
       species.placeholder='Ngẫu nhiên hoặc tìm tên Pokémon';species.setAttribute('aria-label','Chọn Pokémon AI');
       species.setAttribute('list','pkmsvv-lan-ai-options');
       const choices=document.createElement('datalist');choices.id='pkmsvv-lan-ai-options';
       for(const mon of G.DEX){const option=document.createElement('option');option.value=mon.name+' #'+mon.dex;choices.append(option);}
       aiBar.append(species,choices,add,remove);
       add.onclick=()=>{
        const value=species.value.trim();
        const mon=value?G.DEX.find(p=>(p.name+' #'+p.dex).toLowerCase()===value.toLowerCase()||p.name.toLowerCase()===value.toLowerCase()||String(p.dex)===value):null;
        if(value&&!mon){G.UI.toast('Chọn Pokémon trong danh sách hoặc để trống để random.');return;}
        G.LanBus.request('addBot',mon?{dex:mon.dex}:{}).catch(e=>G.UI.toast(e.message,3500));
       };
       remove.onclick=()=>{
        const bot=G.Social.room?.members?.findLast?.(m=>m.bot);
        if(bot)G.LanBus.request('removeBot',{uid:bot.uid}).catch(e=>G.UI.toast(e.message,3500));
       };
      }
      aiBar.classList.toggle('hidden',!room.isHost||!room.open);
      const botCount=room.members.filter(m=>m.bot).length;
      $('pkmsvv-lan-ai-add').disabled=room.members.length>=(room.mode==='royale'?10:4);
      $('pkmsvv-lan-ai-remove').disabled=!botCount;
      `+
 "      $('lobby-sub').textContent += '  ·  Mã phòng: '+room.id;\n"+
 `      let invite=document.getElementById('pkmsvv-lan-invite');
      if(!invite){
       invite=document.createElement('div');invite.id='pkmsvv-lan-invite';invite.className='row wrap';
       invite.style.cssText='margin:8px 0;gap:8px;align-items:center';
       const btn=document.createElement('button');btn.type='button';btn.className='btn small gold';
       btn.textContent='📋 Sao chép lời mời';btn.id='pkmsvv-lan-copy-invite';invite.append(btn);
       $('lobby-sub').insertAdjacentElement('afterend',invite);
       btn.onclick=async()=>{
        const r=G.Social.room;if(!r?.isHost)return;
        try{
         const response=await fetch('/lan/info',{cache:'no-store'});
         if(!response.ok)throw Error('Không xem được địa chỉ LAN');
         const data=await response.json();
         const ip=(data.addresses||[]).find(x=>/^192\\.168\\.|^10\\.|^172\\.(1[6-9]|2[0-9]|3[01])\\./.test(x));
         if(!ip)throw Error('Host không có IPv4 Wi-Fi/LAN để mời bạn');
         const u=new URL('http://'+ip+':'+data.port+'/game/');
         u.searchParams.set('pkmsvvRole','join');
         u.searchParams.set('pkmsvvMode',r.mode);
         u.searchParams.set('pkmsvvCode',r.id);
         const t=u.href;
         if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(t);
         else{const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.append(ta);ta.select();if(!document.execCommand('copy'))throw Error('Trình duyệt không cho sao chép');ta.remove();}
         G.UI.toast('Đã sao chép lời mời. Gửi link cho bạn cùng Wi-Fi!',3200);
        }catch(e){G.UI.toast(e.message||'Không sao chép được lời mời',3800);}
       };
      }
      invite.classList.toggle('hidden',!room.isHost||!room.open);
      `+
 "      $('lobby-inv-title').classList.add('hidden');\n"+
 "      $('lobby-invite').classList.add('hidden');\n"+marker);
// Host can remove a specific AI or human while the lobby is open.
const kickMarker='      // Invitar (sólo el anfitrión y si queda sitio).';
if(!ui.includes(kickMarker))throw Error('LAN kick lobby anchor drift');
ui=ui.replace(kickMarker,`
      for(const card of box.querySelectorAll('.lob-card')){
       const uid=card.querySelector('.conn[data-u]')?.dataset.u;
       const member=ms.find(m=>m.uid===uid);
       let kick=card.querySelector('.pkmsvv-kick');
       if(room.isHost&&room.open&&member&&uid!==room.host){
        if(!kick){kick=document.createElement('button');kick.type='button';kick.className='btn small ghost pkmsvv-kick';card.append(kick);}
        kick.textContent=member.bot?'✕ Bỏ AI':'✕ Kick';
        kick.setAttribute('aria-label','Kick '+member.name);
        kick.onclick=()=>G.LanBus.request('kick',{uid}).catch(e=>G.UI.toast(e.message));
       }else kick?.remove();
      }
`+kickMarker);
write('js/ui/social-ui.js',ui);
once('dev.html','<script defer src="js/ui/pkmsvv-multiplayer-ui.js"></script>',
 '<script defer src="js/ui/pkmsvv-multiplayer-ui.js"></script>\n<script defer src="js/ui/lan-compact-ui.js"></script>');
once('dev.html','<script defer src="js/ui/lan-compact-ui.js"></script>',
 '<script defer src="js/ui/lan-compact-ui.js"></script>\n<script defer src="js/ui/pkmsvv-local-shell.js"></script>\n<script defer src="js/ui/pkmsvv-coop-unified.js"></script>');
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
require('./patch-lan-ai.cjs');
console.log('PKMSVV LAN: local signalling and frame relay installed.');
