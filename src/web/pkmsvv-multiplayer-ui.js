/* PKMSVV Web: dedicated online hub, public rooms and one-tap matchmaking. */
G.MultiplayerUI=(()=>{
 const $=G.UI.$;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const msg=(s,bad=false)=>{const el=$('pkmsvv-mp-message');el.textContent=s;el.style.color=bad?'#ffc4cb':'#d2e8ff';};
 const vi=()=>!G.I18n||G.I18n.lang==='vi';
 const label=mode=>mode==='eggrush'?(vi()?'Tranh Trứng · 4 người':'Egg Rush · 4 players'):mode==='royale'?(vi()?'🏆 Sống Còn · 2–10':'🏆 Survival · 2–10'):(vi()?'🤝 Sống Sót · 2–4':'🤝 Co-op · 2–4');
 const busy=()=>{if(!G.Social.room)return false;G.LobbyUI.open();return true;};

 // Check the immutable compiled-script hash against the server before matchmaking.
 // A tab left open during a Firebase Hosting update still runs the previous JS.
 let versionCheck=null, checkedAt=0, versionOkay=true;
 function loadedVersion(){
  const el=document.querySelector('script[src*="app.min.js"]');
  if(!el)return '';
  try{return new URL(el.getAttribute('src'),location.href).searchParams.get('v')||'';}
  catch(e){return '';}
 }
 function showUpdate(latest){
  const status=$('pkmsvv-mp-message');if(!status)return;
  msg(vi()?'Có bản Web mới trên máy chủ. Hãy cập nhật trang trước khi vào phòng nhiều người chơi.':
    'A newer Web build is available. Reload before joining multiplayer.',true);
  let btn=$('pkmsvv-update-web');
  if(!btn){
   btn=document.createElement('button');
   btn.id='pkmsvv-update-web';btn.type='button';btn.className='btn gold';
   status.insertAdjacentElement('afterend',btn);
  }
  btn.textContent=vi()?'↻ Tải bản Web mới':'↻ Reload latest Web build';
  btn.onclick=()=>location.replace('/game/?update='+encodeURIComponent(latest)+'&t='+Date.now());
  btn.classList.remove('hidden');
 }
 async function checkVersion(){
  // Avoid duplicate checks while opening the lobby or rapidly clicking a room.
  if(versionCheck)return versionCheck;
  if(Date.now()-checkedAt<20000)return versionOkay;
  versionCheck=(async()=>{
   try{
    const res=await fetch('/game/version.json?t='+Date.now(),{cache:'no-store'});
    if(!res.ok)return versionOkay;
    const remote=await res.json(),local=loadedVersion();
    if(!local||!remote||!/^[a-f0-9]{10}$/.test(remote.v))return versionOkay;
    checkedAt=Date.now();versionOkay=(local===remote.v);
    const btn=$('pkmsvv-update-web');
    if(versionOkay){if(btn)btn.classList.add('hidden');}
    else showUpdate(remote.v);
   }catch(e){
    // A temporary network failure is not proof that the client is outdated.
    // Keep the real network error handling in the matchmaking flow.
   }
   return versionOkay;
  })();
  try{return await versionCheck;}finally{versionCheck=null;}
 }

 async function create(mode,visibility){
  if(!(await checkVersion()))return;
  if(busy())return;
  msg('Đang tạo phòng…');
  try{await G.Social.createRoom(mode,visibility);G.LobbyUI.open();}
  catch(e){msg('Không tạo được phòng: '+(e.message||e),true);}
 }
 async function join(id){
  if(!(await checkVersion()))return;
  if(!/^[a-zA-Z0-9_-]{12,45}$/.test(String(id||''))){msg('Mã phòng không hợp lệ.',true);return;}
  if(G.Social.room){G.LobbyUI.open();return;}
  msg('Đang vào phòng…');
  try{const r=await G.Social.joinRoom(id);if(!r.ok){msg(r.error||'Không thể vào phòng.',true);return;}G.LobbyUI.open();}
  catch(e){msg('Lỗi kết nối phòng: '+(e.message||e),true);}
 }
 async function rooms(){
  const box=$('pkmsvv-public-list');
  box.textContent='Đang tải danh sách phòng…';
  try{
   const list=await G.Social.listPublicRooms();
   box.innerHTML='';
   if(!list.length){box.textContent='Chưa có phòng công khai. Bạn có thể tạo phòng hoặc chọn Chơi nhanh.';return list;}
   for(const r of list){
    const row=document.createElement('div');row.className='pkmsvv-public-room';
    const info=document.createElement('span');
    info.textContent=label(r.mode)+' · '+String(r.size||1)+'/'+G.Social.roomLimit(r)+' · '+String(r.name||'Người chơi').slice(0,24);
    const go=document.createElement('button');go.type='button';go.className='btn small gold';go.textContent='Tham gia';
    go.onclick=()=>join(r.id);row.append(info,go);box.appendChild(row);
   }
   return list;
  }catch(e){box.textContent='Không tải được phòng công khai. Kiểm tra quyền Realtime Database.';msg(e.message||String(e),true);return [];}
 }
 async function quick(mode){
  if(!(await checkVersion()))return;
  if(busy())return;
  msg('Đang tìm phòng phù hợp…');
  const list=await rooms();
  const open=list.find(r=>r.mode===mode&&(r.size||0)<G.Social.roomLimit(r));
  if(open)await join(open.id);
  else await create(mode,'public');
 }
 function init(){
  const map={
   'pkmsvv-coop-private':()=>create('coop','private'),
   'pkmsvv-royale-private':()=>create('royale','private'),
   'pkmsvv-coop-public':()=>create('coop','public'),
   'pkmsvv-royale-public':()=>create('royale','public'),
   'pkmsvv-quick-coop':()=>quick('coop'),
   'pkmsvv-quick-royale':()=>quick('royale'),
   'pkmsvv-quick-eggrush':()=>quick('eggrush'),
   'pkmsvv-eggrush-public':()=>create('eggrush','public'),
   'pkmsvv-eggrush-private':()=>create('eggrush','private'),
   'pkmsvv-public-refresh':()=>rooms(),
   'pkmsvv-join-code':()=>join(($('pkmsvv-room-code').value||'').trim()),
   'pkmsvv-existing-lobby':()=>G.LobbyUI.open(),
   'pkmsvv-mp-back':()=>G.MenuUI.open()
  };
  for(const [id,fn] of Object.entries(map))$(id).onclick=fn;
  G.Social.on(()=>{if(G.UI.isOpen('scr-multiplayer'))refresh();});
 }
 function refresh(){
  const captions=vi()?{
   'pkmsvv-quick-coop':'🤝 Ghép Sống Sót','pkmsvv-quick-royale':'🏆 Ghép Sống Còn',
   'pkmsvv-coop-public':'Sống Sót · Công khai','pkmsvv-royale-public':'Sống Còn · Công khai',
   'pkmsvv-coop-private':'Sống Sót · Riêng tư','pkmsvv-royale-private':'Sống Còn · Riêng tư',
   'pkmsvv-eggrush-public':'Tranh Trứng · Công khai','pkmsvv-eggrush-private':'Tranh Trứng · Riêng tư'
  }:{
   'pkmsvv-quick-coop':'🤝 Quick Co-op','pkmsvv-quick-royale':'🏆 Quick Survival',
   'pkmsvv-coop-public':'Co-op · Public','pkmsvv-royale-public':'Survival · Public',
   'pkmsvv-coop-private':'Co-op · Private','pkmsvv-royale-private':'Survival · Private',
   'pkmsvv-eggrush-public':'Egg Rush · Public','pkmsvv-eggrush-private':'Egg Rush · Private'
  };
  for(const [id,title] of Object.entries(captions)) {
   if(id==='pkmsvv-quick-coop'||id==='pkmsvv-quick-royale'||id==='pkmsvv-quick-eggrush')continue;
   $(id).textContent=title;
  }
  for(const [id,coop] of [['pkmsvv-quick-coop',true],['pkmsvv-quick-royale',false]]){
   const b=$(id);if(!b)return;
   b.querySelector('.pkmsvv-mode-title').textContent=coop?(vi()?'Sống Sót':'Co-op'):(vi()?'Sống Còn':'Survival');
   b.querySelector('.pkmsvv-mode-cap').textContent=coop?(vi()?'2–4 người':'2–4 players'):(vi()?'2–10 người · Beta':'2–10 players · Beta');
   b.querySelector('.pkmsvv-mode-description').textContent=coop?
    (vi()?'Hợp tác chống quái, cứu đồng đội, cùng nhau vượt qua các đợt tấn công.':'Fight waves together, save teammates and survive as a group.'):
    (vi()?'Đấu loại. Bị hạ sẽ rời trận; người trụ lại cuối cùng chiến thắng.':'Elimination battle. No revival; the last survivor wins.');
   b.querySelector('.pkmsvv-mode-action').textContent=vi()?'▶ Chơi nhanh':'▶ Quick match';
  }
  const egg=$('pkmsvv-quick-eggrush');
  if(egg){egg.querySelector('.pkmsvv-mode-title').textContent=vi()?'Tranh Trứng':'Egg Rush';egg.querySelector('.pkmsvv-mode-cap').textContent=vi()?'4 người':'4 players';egg.querySelector('.pkmsvv-mode-description').textContent=vi()?'Mỗi phút 1 trứng · hồi sinh sau 8 giây · không PvP':'1 egg/minute · respawn in 8 seconds · no PvP';egg.querySelector('.pkmsvv-mode-action').textContent=vi()?'▶ Chơi nhanh':'▶ Quick match';}
  const r=G.Social.room;
  $('pkmsvv-existing-lobby').classList.toggle('hidden',!r);
  $('pkmsvv-mp-current').textContent=r?(vi()?'Bạn đang trong phòng ':'You are in a ')+(r.mode==='eggrush'?(vi()?'Tranh Trứng':'Egg Rush'):r.mode==='royale'?(vi()?'Sống Còn':'Survival'):(vi()?'Sống Sót':'Co-op'))+(vi()?'.':' room.') : '';
 }
 function open(){
  G.SocialUI.withNick(()=>{
   G.UI.show('scr-multiplayer',true);msg('');refresh();
   // Reuse native pixel sprites from the game, not generated/third-party artwork.
   if(G.UI&&G.UI.sprite){
    for(const [canvasId,dex] of [['pkmsvv-mode-sprite-coop',25],['pkmsvv-mode-sprite-royale',6],['pkmsvv-mode-sprite-eggrush',175]]){
     const cv=$(canvasId);if(cv)G.UI.sprite(cv,dex,{lively:true,scale:2,hero:true});
    }
   }
   rooms();
   checkVersion(); // show update prompt before the player tries matchmaking
  });
 }
 return {init,open,rooms,quick,join,create};
})();
