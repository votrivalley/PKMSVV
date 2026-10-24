/* Web-only; repairs friend presence labels and Co-op recovery UX.
 * Reuses existing authenticated RTDB presenceLive, no extra Firestore writes.
 */
G.PKMSVVCoopRepair=(()=>{
 const $=id=>document.getElementById(id);
 const vi=()=>!G.I18n||G.I18n.lang==='vi';
 const t=(vn,en)=>vi()?vn:en;
 function updateLobby(){
  if(!G.UI||!G.UI.isOpen('scr-lobby'))return;
  const room=G.Social.room;if(!room)return;
  const missing=room.isHost?room.members.filter(m=>m.uid!==room.host&&G.Net.mode(m.uid)!=='direct'):[];
  const failed=missing.filter(m=>G.Net.mode(m.uid)==='failed');
  // Do not misreport Firebase room membership as an established WebRTC data channel.
  const hostMessage=!room.isHost&&G.Net.mode(room.host)==='failed';
  const note=$('lobby-note');
  if(note&&failed.length)note.textContent=t('Không thể kết nối trực tiếp với '+failed.length+' người. Chủ phòng có thể nhấn Thử kết nối lại. Nếu vẫn thất bại, hãy thử Wi-Fi khác; một số mạng cần máy chủ TURN.','Direct connection failed with '+failed.length+' player(s). Host may retry. Some networks need a TURN server.');
  else if(note&&hostMessage)note.textContent=t('Không kết nối được tới chủ phòng. Hãy thử rời phòng và vào lại, hoặc đổi mạng.','Cannot reach the host. Rejoin or try another network.');
  for(const el of document.querySelectorAll('#lobby-members .conn[data-u]')){
   const uid=el.dataset.u,mode=G.Net.mode(uid),isHost=uid===room.host;
   if(room.isHost&&!isHost){
    el.textContent=mode==='direct'?t('Đã kết nối','Connected'):mode==='failed'?t('Không thể kết nối','Connection failed'):t('Đang kết nối…','Connecting…');
    el.classList.toggle('wait',mode==='connecting');
   }else if(!room.isHost&&isHost){
    el.textContent=mode==='direct'?t('Chủ phòng · Đã kết nối','Host · Connected'):mode==='failed'?t('Chủ phòng · Mất kết nối','Host · Disconnected'):t('Chủ phòng · Đang kết nối','Host · Connecting');
    el.classList.toggle('wait',mode==='connecting');
   }
  }
  let btn=$('pkmsvv-coop-retry');
  if(!btn&&note){
   btn=document.createElement('button');btn.id='pkmsvv-coop-retry';btn.type='button';
   btn.className='btn small gold';btn.style.marginTop='10px';
   note.insertAdjacentElement('afterend',btn);
   btn.onclick=()=>{
    const r=G.Social.room;if(!r||!r.isHost)return;
    for(const m of r.members){
     if(m.uid!==r.host&&G.Net.mode(m.uid)!=='direct')G.Net.retry(m.uid);
    }
    if($('lobby-note'))$('lobby-note').textContent=t('Đang thử kết nối lại…','Retrying connection…');
    updateLobby();
   };
  }
  if(btn){btn.classList.toggle('hidden',!(room.isHost&&failed.length));btn.textContent=t('↻ Thử kết nối lại','↻ Retry connection');}
 }
 function redraw(){
  if(G.UI&&G.UI.isOpen('scr-friends'))G.FriendsUI.render();
  if(G.UI&&G.UI.isOpen('scr-lobby')){G.LobbyUI.render();updateLobby();}
 }
 window.addEventListener('pkmsvv-presence-change',redraw);
 G.Social.on(()=>{if(G.UI&&G.UI.isOpen('scr-lobby'))updateLobby();});
 G.Net.onPeer(()=>{if(G.UI&&G.UI.isOpen('scr-lobby'))updateLobby();});
 return {redraw,updateLobby};
})();