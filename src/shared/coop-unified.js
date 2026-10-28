'use strict';
/* The exact same Co-op entry for PC, Android and Cloudflare HTML5. */
(()=>{
 window.PKMSVV_UNIFIED_COOP_ENABLED=true;
 const modes=[['coop','Sống Sót','2–4 người',25,'Pikachu','Cùng đồng đội đánh quái, cứu nhau khi gặp nguy hiểm và cố gắng sống sót lâu nhất có thể!'],
  ['royale','Sống Còn','2–10 người',6,'Charizard','Chiến đấu với quái vật trong vòng an toàn ngày càng thu nhỏ. Người sống sót cuối cùng sẽ chiến thắng!'],
  ['eggrush','Tranh Trứng','4 người',175,'Togepi','Tranh nhau thu thập 10 quả trứng! Cuối trận trứng mới nở để tính điểm. Ai nhiều điểm nhất sẽ thắng!']];
 let mode='coop',view=null,detail=null,busy=false,previousFocus=null;
 const lan=()=>window.PKMSVV_LOCAL_UI_MODE==='lan'&&!!window.G?.LanBus;
 function close(){view?.remove();view=detail=null;previousFocus?.focus?.();}
 function info(x){if(detail)detail.textContent=x;}
 function repaint(){
  view?.querySelectorAll('[data-mode]').forEach(e=>{
   const on=e.dataset.mode===mode;e.classList.toggle('selected',on);e.setAttribute('aria-pressed',String(on));
  });detail?.replaceChildren();
 }
 function open(){
  if(view)return;
  previousFocus=document.activeElement;
  view=document.createElement('div');view.id='pkmsvv-unified-coop';
  view.innerHTML='<section class="pkmsvv-coop-panel" role="dialog" aria-modal="true" aria-label="Co-op">'+
    '<header><h2>🤝 Co-op</h2><button type="button" id="pkmsvv-coop-close">✕</button></header>'+
    '<b>Chọn chế độ</b><div id="pkmsvv-coop-modes"></div>'+
    '<b>Chọn cách chơi</b><div id="pkmsvv-coop-actions">'+
    '<button data-role="host">🏠 Tạo phòng</button><button data-role="join">🤝 Tham gia</button>'+
    '<button data-role="ai">🤖 Chơi với AI</button></div>'+
    '<div id="pkmsvv-coop-detail" role="status"></div></section>';
  document.body.append(view);detail=view.querySelector('#pkmsvv-coop-detail');
  if(lan()&&!window.PKMSVV_STANDALONE_AI&&!window.PKMSVV_WIFI){
   const help=document.createElement('details');help.className='pkmsvv-coop-help';
   const summary=document.createElement('summary');summary.textContent='Địa chỉ Host & mã QR mời bạn';
   const host=document.createElement('p');host.textContent=location.origin+'/game/';
   const qr=document.createElement('img');qr.src='/lan/qr.png';qr.alt='Mã QR vào Host qua Wi-Fi';qr.loading='lazy';
   help.append(summary,host,qr);detail.before(help);
   fetch('/lan/info',{cache:'no-store'}).then(r=>r.json()).then(data=>{
    if(data.addresses?.length)host.textContent=data.addresses.map(ip=>'http://'+ip+':'+data.port+'/game/').join(' · ');
   }).catch(()=>{});
  }
  for(const [id,title,capacity,dex,name,description] of modes){
   const b=document.createElement('button');b.type='button';b.dataset.mode=id;b.className='pkmsvv-mode-card '+id;
   b.innerHTML='<span class="pkmsvv-mode-art"><canvas width="144" height="144" aria-hidden="true"></canvas></span>'+
    '<span class="pkmsvv-mode-copy"><strong>'+title+'</strong><small class="pkmsvv-mode-cap">'+capacity+'</small>'+
    '<small class="pkmsvv-coop-pokemon" translate="no">'+name+'</small><small class="pkmsvv-mode-description">'+description+'</small></span>';
   b.onclick=()=>{mode=id;repaint();};view.querySelector('#pkmsvv-coop-modes').append(b);
   G.UI?.sprite?.(b.querySelector('canvas'),dex,{lively:true,scale:2,hero:true});
  }
  view.querySelector('#pkmsvv-coop-close').onclick=close;
  view.addEventListener('click',e=>{if(e.target===view)close();});
  for(const b of view.querySelectorAll('[data-role]'))b.onclick=()=>action(b.dataset.role);
  view.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
   if(e.key!=='Tab')return;
   const items=[...view.querySelectorAll('button,input,a[href]')].filter(x=>!x.disabled);
   const first=items[0],last=items.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
  repaint();
  view.querySelector('[data-mode="'+mode+'"]').focus();
 }
 function addressEntry(role,target=detail){
  const p=document.createElement('p');p.textContent=lan()?
   'Nếu bạn bè tạo phòng trên một máy Host khác, dán link mời hoặc địa chỉ LAN ở đây:':
   'Dán link mời được Host gửi cho bạn (máy cùng Wi-Fi).';
  const input=document.createElement('input');input.type='text';input.placeholder='Link mời hoặc IP nội bộ';
  input.setAttribute('aria-label','IP:cổng hoặc liên kết máy Host');input.autocomplete='off';
  try{input.value=localStorage.getItem('pkmsvv.lan.host.ip')||'';}catch(_){}
  const go=document.createElement('button');go.type='button';go.textContent='Kết nối';
  const status=document.createElement('span');status.setAttribute('role','status');
  go.onclick=async()=>{
   if(go.disabled)return;
   go.disabled=true;input.disabled=true;status.textContent='Đang kiểm tra Host…';
   let timer;
   try{
    const address=input.value.trim();
    if(window.PKMSVVLANDesktop?.connect){
     const result=await window.PKMSVVLANDesktop.connect({address,role,mode});
     if(!result.ok)throw Error(result.error);
     return;
    }
    let u;try{u=new URL(/^http:\/\//i.test(address)?address:'http://'+address);}catch(_){throw Error('IP hoặc liên kết không hợp lệ.');}
    const octets=u.hostname.split('.').map(Number);
    const privateIP=octets.length===4&&octets.every(n=>Number.isInteger(n)&&n>=0&&n<=255)&&
     (octets[0]===10||(octets[0]===192&&octets[1]===168)||(octets[0]===172&&octets[1]>=16&&octets[1]<=31));
    if(u.protocol!=='http:'||u.username||u.password||!privateIP||(u.port&&(+u.port<1024||+u.port>65535)))
     throw Error('Nhập IPv4 nội bộ hợp lệ và cổng 1024–65535.');
    if(!u.port)u.port='37816';
    // A copied invitation already contains the room code; never discard it.
    const invitedCode=u.searchParams.get('pkmsvvCode');
    const invitedMode=u.searchParams.get('pkmsvvMode');
    u.pathname='/game/';u.search='';u.hash='';
    u.searchParams.set('pkmsvvRole',invitedCode?'join':role);
    u.searchParams.set('pkmsvvMode',invitedCode&&modes.some(m=>m[0]===invitedMode)?invitedMode:mode);
    if(invitedCode){
     if(!/^[A-Za-z0-9_-]{12,45}$/.test(invitedCode))throw Error('Mã phòng trong lời mời không hợp lệ.');
     u.searchParams.set('pkmsvvCode',invitedCode);
    }
    // HTTPS browsers cannot probe HTTP LAN hosts; top-level navigation is allowed.
    if(location.protocol==='http:'){
     const abort=new AbortController();timer=setTimeout(()=>abort.abort(),4000);
     const response=await fetch(new URL('/lan/health',u),{signal:abort.signal,cache:'no-store'});
     if(!response.ok||(await response.json()).service!=='pkmsvv-lan-v1')throw Error('Địa chỉ này không phải Host Pokémon.');
    }
    try{localStorage.setItem('pkmsvv.lan.host.ip',u.host);}catch(_){}
    window.location.assign(u.href);
   }catch(e){status.textContent=e.name==='AbortError'?'Host không phản hồi. Kiểm tra IP:cổng, Wi-Fi và tường lửa.':(e.message||'Không kết nối được Host.');}
   finally{clearTimeout(timer);go.disabled=false;input.disabled=false;}
  };
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();go.click();}});
  target.append(p,input,go,status);
 }
 async function joinRooms(){
  info('Đang tìm phòng cùng Wi-Fi…');
  try{
   const list=(await G.Social.listPublicRooms()).filter(r=>r.mode===mode);
   detail.replaceChildren();
   const help=document.createElement('p');help.textContent='Chọn phòng đang mở hoặc dán mã phòng được bạn gửi:';
   detail.append(help);
   if(!list.length)detail.append('Chưa có phòng công khai đang chờ. ');
   for(const r of list){
    const b=document.createElement('button');b.textContent=(r.name||'Host')+' · '+r.size+' người · Tham gia';
    b.onclick=async()=>{
     const result=await G.Social.joinRoom(r.id);
     if(result.ok){close();G.LobbyUI.open();}else info(result.error);
    };detail.append(b);
   }
   const input=document.createElement('input');input.placeholder='Mã phòng (không phải địa chỉ IP)';
   input.setAttribute('aria-label','Mã phòng trên Host hiện tại');
   const go=document.createElement('button');go.textContent='Vào bằng mã';
   go.onclick=async()=>{
    if(!/^[A-Za-z0-9_-]{12,45}$/.test(input.value.trim())){info('Mã phòng không hợp lệ');return;}
    const result=await G.Social.joinRoom(input.value.trim());
    if(result.ok){close();G.LobbyUI.open();}else info(result.error);
   };detail.append(input,go);
   const advanced=document.createElement('details');advanced.className='pkmsvv-coop-advanced';
   const summary=document.createElement('summary');summary.textContent='Đổi sang máy Host khác (nâng cao)';
   advanced.append(summary);addressEntry('join',advanced);detail.append(advanced);
  }catch(e){info('Không thể tìm phòng: '+e.message);}
 }
 async function action(role){
  if(busy)return;
  if(role!=='ai'&&(lan()||window.PKMSVV_STANDALONE_AI_AVAILABLE)&&!window.PKMSVV_WIFI&&!new URLSearchParams(location.search).get('pkmsvvCode')){
   const target=lan()&&!window.PKMSVV_STANDALONE_AI?'/game/':'/ai/game/';
   const q=new URLSearchParams({pkmsvvWifi:'1',pkmsvvRole:role,pkmsvvMode:mode});
   window.location.assign(target+'?'+q);return;
  }
  if(role==='ai'&&window.PKMSVV_WIFI){
   window.location.assign(location.pathname+'?pkmsvvRole=ai&pkmsvvMode='+encodeURIComponent(mode));return;
  }
  if(role==='join'&&window.PKMSVV_WIFI){close();window.PKMSVVWifiUI.join();return;}
  if(lan()){
   if(window.PKMSVV_STANDALONE_AI&&role!=='ai'){
    info('Đây là phòng AI ngoại tuyến trên thiết bị này. Chọn “Chơi với AI” để bắt đầu; chơi cùng bạn bè cần Host LAN.');return;
   }
   if(role==='join'){
    const inviteCode=new URLSearchParams(location.search).get('pkmsvvCode');
    if(inviteCode){
     try{
      if(!/^[A-Za-z0-9_-]{12,45}$/.test(inviteCode))throw Error('Mã phòng không hợp lệ');
      if(!G.Social.room){
       const joined=await G.Social.joinRoom(inviteCode);
       if(!joined.ok)throw Error(joined.error||'Không thể tham gia phòng');
      }
      history.replaceState(null,'',location.pathname);
      close();G.LobbyUI.open();return;
     }catch(e){info('Lời mời không thể mở: '+e.message);return;}
    }
    return joinRooms();
   }
   busy=true;
   try{
    // A fresh local Web save can exist before the starter has been chosen.
    // Set a safe first-run Pokémon only for the standalone AI sandbox.
    // Preserve every valid player-selected Pokémon and all existing saves.
    if(window.PKMSVV_STANDALONE_AI&&G.DB?.save&&!G.DEX_BY?.[Number(G.DB.save.partner)]){
     G.DB.save.partner=25;G.DB.save.partnerShiny=false;G.DB.commit?.();
    }
    if(G.Social.playing){close();G.LobbyUI.open();return;}
    if(G.Social.room&&G.Social.room.mode!==mode){
     await G.Social.leaveRoom();
    }
    if(!G.Social.room)await G.Social.createRoom(mode,role==='ai'?'private':'public');
    if(role==='ai'&&G.Social.room?.isHost){
     const opponents=mode==='coop'?1:3;
     const missing=Math.max(0,opponents+1-G.Social.room.members.length);
     for(let i=0;i<missing;i++)await G.LanBus.request('addBot',{});
    }
    close();G.LobbyUI.open();
   }catch(e){info('Không tạo được phòng: '+e.message);}
   finally{busy=false;}
   return;
  }
  window.PKMSVV_COOP_PENDING={role,mode};
  if(role==='ai'&&window.PKMSVV_STANDALONE_AI_AVAILABLE){
   window.location.assign('/ai/?mode='+encodeURIComponent(mode));return;
  }
  if(window.PKMSVV_LOCAL_UI_MODE==='android-full-lan'){
   const api=window.Capacitor?.Plugins?.PKMSVVLAN;
   if(!api?.open){info('Không thể kết nối LAN trên Android');return;}
   info(role==='host'?'Chọn PC Host cùng Wi-Fi để tạo phòng cho bạn bè.':'Đang tìm Host cùng Wi-Fi…');
   Promise.resolve(api.open({role,mode})).catch(e=>info(e.message||'Không tìm thấy Host'));
   return;
  }
  detail.replaceChildren();
  if(role==='ai'){
   const hint=document.createElement('p');
   hint.textContent='Bản HTML5 Cloudflare đang chơi offline và không chạy máy chủ LAN. Để chơi với AI ở bản này, hãy mở link lời mời từ PC Host đang chạy. Chọn “Chơi với AI” trên Host để tạo bot; website độc lập chưa có AI offline.';
   detail.append(hint);
   const link=document.createElement('button');link.type='button';link.textContent='Dán lời mời từ PC Host';
   link.onclick=()=>{detail.replaceChildren();addressEntry('join');};
   detail.append(link);return;
  }
  if(role==='host'){
   const help=document.createElement('p');
   help.textContent='Tạo phòng trên PC Host cùng Wi-Fi. Website chưa tự làm máy chủ LAN; Chơi với AI chạy ngay trên thiết bị này.';
   detail.append(help);
  }
  addressEntry(role);
 }
 function intercept(e){
  if(!e.target?.closest?.('#scr-menu [data-go="multiplayer"],#scr-menu [data-go="online"],#pkmsvv-coop-lan-entry,#pkmsvv-full-lan-entry'))return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();open();
 }
 function install(){
  // Offline Android may omit MultiplayerUI; the shared dialog only needs G.
  if(!window.G)return;
  if(G.MultiplayerUI){G.MultiplayerUI.open=open;G.MultiplayerUI.__pkmsvvUnified=true;}
  document.addEventListener('click',intercept,true);
  const args=new URLSearchParams(location.search);
  if(modes.some(x=>x[0]===args.get('pkmsvvMode')))mode=args.get('pkmsvvMode');
  const role=args.get('pkmsvvRole');
  if(lan()&&['host','join','ai'].includes(role)){
   let attempts=0;const timer=setInterval(()=>{
    if(++attempts>90){clearInterval(timer);return;}
    if(G.DB?.save&&G.Social){clearInterval(timer);open();void action(role);}
   },200);
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 window.PKMSVVCoop={open,get mode(){return mode;}};
})();
