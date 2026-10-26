'use strict';
/* The exact same Co-op entry for PC, Android and Cloudflare HTML5. */
(()=>{
 window.PKMSVV_UNIFIED_COOP_ENABLED=true;
 const modes=[['coop','⚔️ Sống Sót','2–4 người'],['royale','🏆 Sống Còn','2–10 người'],['eggrush','🥚 Tranh Trứng','4 người']];
 let mode='coop',view=null,detail=null;
 const lan=()=>window.PKMSVV_LOCAL_UI_MODE==='lan'&&!!window.G?.LanBus;
 function close(){view?.remove();view=detail=null;}
 function info(x){if(detail)detail.textContent=x;}
 function repaint(){
  view?.querySelectorAll('[data-mode]').forEach(e=>{
   const on=e.dataset.mode===mode;e.classList.toggle('selected',on);e.setAttribute('aria-pressed',String(on));
  });detail?.replaceChildren();
 }
 function open(){
  if(view)return;
  view=document.createElement('div');view.id='pkmsvv-unified-coop';
  view.innerHTML='<section class="pkmsvv-coop-panel" role="dialog" aria-modal="true" aria-label="Co-op">'+
    '<header><h2>🤝 Co-op</h2><button type="button" id="pkmsvv-coop-close">✕</button></header>'+
    '<b>Chọn chế độ</b><div id="pkmsvv-coop-modes"></div>'+
    '<b>Chọn cách chơi</b><div id="pkmsvv-coop-actions">'+
    '<button data-role="host">🏠 Tạo phòng</button><button data-role="join">🤝 Tham gia</button>'+
    '<button data-role="ai">🤖 Chơi với AI</button></div>'+
    '<div id="pkmsvv-coop-detail" role="status"></div></section>';
  document.body.append(view);detail=view.querySelector('#pkmsvv-coop-detail');
  for(const [id,title,capacity] of modes){
   const b=document.createElement('button');b.dataset.mode=id;b.innerHTML='<strong>'+title+'</strong><small>'+capacity+'</small>';
   b.onclick=()=>{mode=id;repaint();};view.querySelector('#pkmsvv-coop-modes').append(b);
  }
  view.querySelector('#pkmsvv-coop-close').onclick=close;
  view.addEventListener('click',e=>{if(e.target===view)close();});
  for(const b of view.querySelectorAll('[data-role]'))b.onclick=()=>action(b.dataset.role);
  repaint();
 }
 async function joinRooms(){
  info('Đang tìm phòng cùng Wi-Fi…');
  try{
   const list=(await G.Social.listPublicRooms()).filter(r=>r.mode===mode);
   detail.replaceChildren();
   if(!list.length)detail.append('Chưa có phòng công khai. ');
   for(const r of list){
    const b=document.createElement('button');b.textContent=(r.name||'Host')+' · '+r.size+' người · Tham gia';
    b.onclick=async()=>{
     const result=await G.Social.joinRoom(r.id);
     if(result.ok){close();G.LobbyUI.open();}else info(result.error);
    };detail.append(b);
   }
   const input=document.createElement('input');input.placeholder='Mã phòng bạn bè chia sẻ';
   const go=document.createElement('button');go.textContent='Vào bằng mã';
   go.onclick=async()=>{
    if(!/^[A-Za-z0-9_-]{12,45}$/.test(input.value.trim())){info('Mã phòng không hợp lệ');return;}
    const result=await G.Social.joinRoom(input.value.trim());
    if(result.ok){close();G.LobbyUI.open();}else info(result.error);
   };detail.append(input,go);
  }catch(e){info('Không thể tìm phòng: '+e.message);}
 }
 async function action(role){
  if(lan()){
   if(role==='join')return joinRooms();
   if(role==='ai'&&mode!=='coop'){info('AI đối thủ của chế độ này chưa hoàn thiện, chưa thể chơi với AI.');return;}
   try{
    if(!G.Social.room)await G.Social.createRoom(mode,role==='ai'?'private':'public');
    if(role==='ai'&&G.Social.room?.isHost)await G.LanBus.request('addBot',{});
    close();G.LobbyUI.open();
   }catch(e){info('Không tạo được phòng: '+e.message);}
   return;
  }
  window.PKMSVV_COOP_PENDING={role,mode};
  if(window.PKMSVV_LOCAL_UI_MODE==='android-full-lan'){
   const api=window.Capacitor?.Plugins?.PKMSVVLAN;
   if(!api?.open){info('Không thể kết nối LAN trên Android');return;}
   info('Đang tìm Host cùng Wi-Fi…');
   Promise.resolve(api.open({role,mode})).catch(e=>info(e.message||'Không tìm thấy Host'));
   return;
  }
  detail.replaceChildren();
  const p=document.createElement('p');p.textContent='Mở liên kết mời hoặc quét QR từ máy LAN. Giao diện Co-op trên Host vẫn y hệt.';
  const input=document.createElement('input');input.placeholder='Dán liên kết mời từ Host';
  const go=document.createElement('button');go.textContent='Kết nối';
  go.onclick=()=>{
   let u;try{u=new URL(input.value.trim());}catch(_){info('Liên kết không hợp lệ');return;}
   if(u.protocol!=='http:'||!/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname)||!/^\/game\/?/.test(u.pathname)){
    info('Chỉ cho phép liên kết game trong Wi-Fi nội bộ');return;
   }
   u.searchParams.set('pkmsvvRole',role);u.searchParams.set('pkmsvvMode',mode);
   window.location.assign(u.href);
  };
  const alt=document.createElement('button');alt.textContent='Nhập IP (dự phòng)';
  alt.onclick=()=>window.location.assign('/lan-connect.html');
  detail.append(p,input,go,alt);
 }
 function intercept(e){
  if(!e.target?.closest?.('#scr-menu [data-go="multiplayer"],#scr-menu [data-go="online"],#pkmsvv-coop-lan-entry,#pkmsvv-full-lan-entry'))return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();open();
 }
 function install(){
  if(!window.G?.MultiplayerUI)return;
  G.MultiplayerUI.open=open;G.MultiplayerUI.__pkmsvvUnified=true;
  document.addEventListener('click',intercept,true);
  const args=new URLSearchParams(location.search);
  if(modes.some(x=>x[0]===args.get('pkmsvvMode')))mode=args.get('pkmsvvMode');
  const role=args.get('pkmsvvRole');
  if(lan()&&['host','join','ai'].includes(role)){
   let attempts=0;const timer=setInterval(()=>{
    if(++attempts>90){clearInterval(timer);return;}
    if(G.DB?.save&&G.Social){clearInterval(timer);void action(role);}
   },200);
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 window.PKMSVVCoop={open,get mode(){return mode;}};
})();
