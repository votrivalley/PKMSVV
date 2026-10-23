/* PKMSVV Web: dedicated online hub, public rooms and one-tap matchmaking. */
G.MultiplayerUI=(()=>{
 const $=G.UI.$;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const msg=(s,bad=false)=>{const el=$('pkmsvv-mp-message');el.textContent=s;el.style.color=bad?'#ffc4cb':'#d2e8ff';};
 const label=mode=>mode==='royale'?'🏆 Sinh tồn · 2–10':'🤝 Co-op · 2–4';
 const busy=()=>G.Social.room&&G.LobbyUI.open();
 async function create(mode,visibility){
  if(busy())return;
  msg('Đang tạo phòng…');
  try{await G.Social.createRoom(mode,visibility);G.LobbyUI.open();}
  catch(e){msg('Không tạo được phòng: '+(e.message||e),true);}
 }
 async function join(id){
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
   'pkmsvv-public-refresh':()=>rooms(),
   'pkmsvv-join-code':()=>join(($('pkmsvv-room-code').value||'').trim()),
   'pkmsvv-existing-lobby':()=>G.LobbyUI.open(),
   'pkmsvv-mp-back':()=>G.MenuUI.open()
  };
  for(const [id,fn] of Object.entries(map))$(id).onclick=fn;
  G.Social.on(()=>{if(G.UI.isOpen('scr-multiplayer'))refresh();});
 }
 function refresh(){
  const r=G.Social.room;
  $('pkmsvv-existing-lobby').classList.toggle('hidden',!r);
  $('pkmsvv-mp-current').textContent=r?'Bạn đang trong phòng '+(r.mode==='royale'?'Sinh tồn':'Co-op')+'.':'';
 }
 function open(){
  G.SocialUI.withNick(()=>{
   G.UI.show('scr-multiplayer',true);msg('');refresh();rooms();
  });
 }
 return {init,open,rooms,quick,join,create};
})();