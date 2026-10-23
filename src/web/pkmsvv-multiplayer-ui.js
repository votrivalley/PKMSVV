/* PKMSVV Web: dedicated online hub, public rooms and one-tap matchmaking. */
G.MultiplayerUI=(()=>{
 const $=G.UI.$;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const msg=(s,bad=false)=>{const el=$('pkmsvv-mp-message');el.textContent=s;el.style.color=bad?'#ffc4cb':'#d2e8ff';};
 const vi=()=>!G.I18n||G.I18n.lang==='vi';
 const label=mode=>mode==='royale'?(vi()?'🏆 Sống Còn · 2–10':'🏆 Survival · 2–10'):(vi()?'🤝 Sống Sót · 2–4':'🤝 Co-op · 2–4');
 const busy=()=>{if(!G.Social.room)return false;G.LobbyUI.open();return true;};
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
  const captions=vi()?{
   'pkmsvv-quick-coop':'🤝 Ghép Sống Sót','pkmsvv-quick-royale':'🏆 Ghép Sống Còn',
   'pkmsvv-coop-public':'Sống Sót · Công khai','pkmsvv-royale-public':'Sống Còn · Công khai',
   'pkmsvv-coop-private':'Sống Sót · Riêng tư','pkmsvv-royale-private':'Sống Còn · Riêng tư'
  }:{
   'pkmsvv-quick-coop':'🤝 Quick Co-op','pkmsvv-quick-royale':'🏆 Quick Survival',
   'pkmsvv-coop-public':'Co-op · Public','pkmsvv-royale-public':'Survival · Public',
   'pkmsvv-coop-private':'Co-op · Private','pkmsvv-royale-private':'Survival · Private'
  };
  for(const [id,title] of Object.entries(captions)) {
   if(id==='pkmsvv-quick-coop'||id==='pkmsvv-quick-royale')continue;
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
  const r=G.Social.room;
  $('pkmsvv-existing-lobby').classList.toggle('hidden',!r);
  $('pkmsvv-mp-current').textContent=r?(vi()?'Bạn đang trong phòng ':'You are in a ')+(r.mode==='royale'?(vi()?'Sống Còn':'Survival'):(vi()?'Sống Sót':'Co-op'))+(vi()?'.':' room.') : '';
 }
 function open(){
  G.SocialUI.withNick(()=>{
   G.UI.show('scr-multiplayer',true);msg('');refresh();
   // Reuse native pixel sprites from the game, not generated/third-party artwork.
   if(G.UI&&G.UI.sprite){
    for(const [canvasId,dex] of [['pkmsvv-mode-sprite-coop',25],['pkmsvv-mode-sprite-royale',6]]){
     const cv=$(canvasId);if(cv)G.UI.sprite(cv,dex,{lively:true,scale:2,hero:true});
    }
   }
   rooms();
  });
 }
 return {init,open,rooms,quick,join,create};
})();