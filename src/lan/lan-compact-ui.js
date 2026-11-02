'use strict';
/* LAN-only compact room selector; leaves original matchmaking functions intact. */
(()=>{
 const $=id=>document.getElementById(id);
 const L=(vi,en)=>window.G?.I18n?.lang==='en'?en:vi;
 const modes=[['coop','pkmsvv-quick-coop'],['royale','pkmsvv-quick-royale'],['eggrush','pkmsvv-quick-eggrush']];
 let chosen='coop',installed=false;
 const vi=()=>window.G?.I18n?.lang!=='en';
 const title=mode=>(vi()?{coop:'Sống Sót',royale:'Sống Còn',eggrush:'Tranh Trứng'}:
  {coop:'Co-op',royale:'Survival',eggrush:'Egg Rush'})[mode];
 function sync(){
  if(!installed)return;
  for(const [mode,id] of modes){
   const card=$(id);if(!card)continue;
   const selected=mode===chosen;
   card.classList.toggle('pkmsvv-lan-selected',selected);
   card.setAttribute('aria-pressed',String(selected));
   card.title=(vi()?'Chọn chế độ ':'Select mode ')+title(mode);
  }
  const label=title(chosen);
  const create=$('pkmsvv-lan-create-title');
  if(create)create.textContent=(vi()?'Tạo phòng · ':'Create room · ')+label;
  const publicButton=$('pkmsvv-lan-create-public');
  const privateButton=$('pkmsvv-lan-create-private');
  const quickButton=$('pkmsvv-lan-quick');
  if(publicButton)publicButton.textContent=vi()?'Tạo phòng công khai':'Create public room';
  if(privateButton)privateButton.textContent=vi()?'Tạo phòng riêng':'Create private room';
  if(quickButton)quickButton.textContent=vi()?'⚡ Chơi nhanh':'⚡ Quick match';
  const summary=$('pkmsvv-lan-rooms-summary');
  if(summary)summary.textContent=vi()?'Phòng công khai · Xem danh sách':'Public rooms · Browse';
  const nav=$('pkmsvv-lan-join-title');
  if(nav)nav.textContent=vi()?'Vào phòng bằng mã':'Join with room code';
 }
 function install(){
  if(installed)return;
  const screen=$('scr-multiplayer'),box=screen?.querySelector('.pkmsvv-mp-box');
  const grid=box?.querySelector('.pkmsvv-mode-grid');
  const oldCreate=$('pkmsvv-coop-public')?.parentElement;
  const joinInput=$('pkmsvv-room-code');
  const roomList=$('pkmsvv-public-list');
  const refresh=$('pkmsvv-public-refresh');
  if(!box||!grid||!oldCreate||!joinInput||!roomList||!refresh)return;
  const createTitle=oldCreate.previousElementSibling,joinRow=joinInput.parentElement;
  const joinTitle=joinRow.previousElementSibling,roomsDesc=roomList.previousElementSibling;
  const roomsTitle=roomsDesc?.previousElementSibling;
  if(!createTitle||!joinTitle||!roomsTitle)return;
  installed=true;screen.classList.add('pkmsvv-lan-compact');
  // Show connection instructions only in Co-op, not at startup.
  const help=document.createElement('details');help.id='pkmsvv-lan-help';
  const helpHeading=document.createElement('summary');
  helpHeading.textContent=L('ⓘ Hướng dẫn kết nối Co-op LAN','ⓘ Co-op LAN connection guide');
  const helpBody=document.createElement('div');helpBody.className='pkmsvv-lan-help-body';
  const qr=document.createElement('img');
  qr.id='pkmsvv-lan-qr';qr.src='/lan/qr.png';
  qr.alt=L('Mã QR mở game Co-op trên PC Host','QR code for PC Host Co-op game');qr.loading='lazy';
  const address=document.createElement('p');address.className='pkmsvv-lan-help-address';
  const hostCode=document.createElement('code');hostCode.id='pkmsvv-lan-host-ips';
  hostCode.textContent=location.origin;address.append(L('📡 Địa chỉ PC Host: ','📡 PC Host address: '),hostCode);
  const guideSteps=document.createElement('ol');
  for(const line of [
   L('PC mở Windows LAN Host, giữ game chạy và cho phép Windows Firewall ở mạng Private.','Open Windows LAN Host, keep the game running and allow it through Windows Firewall on Private networks.'),
   L('Điện thoại và PC cùng Wi-Fi. iPhone/iPad mở Safari; Android mở Chrome; nhập địa chỉ IP:cổng mà PC Host hiển thị (thường là 37816; có thể 37817 nếu cổng cũ bận).','Keep the phone and PC on the same Wi-Fi. Use Safari on iPhone/iPad or Chrome on Android, then enter the Host IP:port (usually 37816 or 37817).'),
   L('PC vào Co-op → Tạo phòng. Gửi mã phòng cho bạn bè; khách nhập mã hoặc chọn phòng công khai.','On PC, select Co-op → Host. Share your room code; guests enter it or join a public room.'),
   L('Host có thể Thêm AI trong phòng Sống Sót khi thiếu người rồi bắt đầu trận.','Hosts may add AI teammates in Survival rooms before starting a match.'),
   L('Nhớ sao lưu game thường xuyên bằng mục Sao lưu game ở menu chính.','Remember to back up progress from Back Up Game on the main menu.')
  ]){const li=document.createElement('li');li.textContent=line;guideSteps.append(li);}
  const guideNote=document.createElement('p');
  guideNote.textContent=L('LAN không cần Google/Firebase. Không mở cổng LAN ra Internet.','LAN does not require Google or Firebase. Do not expose LAN ports to the Internet.');
  const camera=document.createElement('p');
  camera.textContent=L('📱 iPhone/iPad: mở Camera quét mã QR để vào game LAN; không cần nhập địa chỉ.','📱 iPhone/iPad: scan the QR code with Camera to join the LAN game; no address typing needed.');
  helpBody.append(camera,qr,address,guideSteps,guideNote);help.append(helpHeading,helpBody);
  const subtitle=box.querySelector('p.sub');
  if(subtitle)subtitle.insertAdjacentElement('afterend',help);else box.prepend(help);
  fetch('/lan/info',{cache:'no-store'}).then(res=>res.json()).then(info=>{
   if(Array.isArray(info.addresses)&&info.addresses.length)
    hostCode.textContent=info.addresses.map(ip=>'http://'+ip+':'+(info.port||37816)).join(' · ');
  }).catch(()=>{});

  const modeTitle=grid.previousElementSibling;
  if(modeTitle)modeTitle.textContent=L('🎮 Chọn chế độ','🎮 Choose mode');
  // Preserve hidden original actions and their existing click handlers.
  oldCreate.style.display='none';
  createTitle.id='pkmsvv-lan-create-title';
  joinTitle.id='pkmsvv-lan-join-title';
  const buttons=document.createElement('div');buttons.id='pkmsvv-lan-actions';
  buttons.className='pkmsvv-lan-actions';
  buttons.innerHTML='<button type="button" class="btn gold" id="pkmsvv-lan-quick"></button>'+
   '<button type="button" class="btn" id="pkmsvv-lan-create-public"></button>'+
   '<button type="button" class="btn ghost" id="pkmsvv-lan-create-private"></button>';
  const details=document.createElement('details');
  details.id='pkmsvv-lan-rooms';
  const summary=document.createElement('summary');
  summary.id='pkmsvv-lan-rooms-summary';
  details.append(summary,roomsDesc,roomList,refresh);
  roomsTitle.remove();
  grid.after(createTitle,buttons,joinTitle,joinRow,details);
  for(const [mode,id] of modes){
   const card=$(id);if(!card)continue;
   card.onclick=e=>{e.preventDefault();chosen=mode;sync();};
  }
  $('pkmsvv-lan-quick').onclick=()=>G.MultiplayerUI.quick(chosen);
  $('pkmsvv-lan-create-public').onclick=()=>G.MultiplayerUI.create(chosen,'public');
  $('pkmsvv-lan-create-private').onclick=()=>G.MultiplayerUI.create(chosen,'private');
  sync();
 }
 const originalInit=G.MultiplayerUI.init;
 G.MultiplayerUI.init=function(...args){
  const ret=originalInit.apply(this,args);install();sync();return ret;
 };
 const originalOpen=G.MultiplayerUI.open;
 G.MultiplayerUI.open=function(...args){
  const ret=originalOpen.apply(this,args);
  install();sync();
  const pane=$('scr-multiplayer')?.querySelector('.pkmsvv-mp-box');
  if(pane&&typeof requestAnimationFrame==='function')requestAnimationFrame(()=>{pane.scrollTop=0;});
  return ret;
 };
})();