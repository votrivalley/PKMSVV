/* Individual save.pupg and global save.globalUpgrades remain independent. */
G.PKMSVVUpgradeChooser=(()=>{
 const $=id=>document.getElementById(id);
 const en=()=>G.I18n&&G.I18n.lang==='en';
 const t=(vi,eng)=>en()?eng:vi;
 function open(){
  $('pkmsvv-upgrade-title').textContent=t('Chọn kiểu nâng cấp','Choose upgrade type');
  $('pkmsvv-upgrade-intro').textContent=t('Hai nhóm nâng cấp khác nhau sử dụng cùng PokéCoins.','Two upgrade tracks using the same PokéCoins.');
  $('pkmsvv-upgrade-single-title').textContent=t('Nâng lẻ Pokémon','Individual Pokémon');
  $('pkmsvv-upgrade-single-desc').textContent=t('CHỈ áp dụng cho một Pokémon được chọn. Pokémon khác không nhận chỉ số này.','Applies ONLY to your selected Pokémon. Other Pokémon get no bonus.');
  $('pkmsvv-upgrade-all-title').textContent=t('Nâng toàn đội','Team upgrades');
  $('pkmsvv-upgrade-all-desc').textContent=t('Tăng sức mạnh vĩnh viễn cho TẤT CẢ Pokémon.','Permanent bonuses for ALL Pokémon.');
  $('pkmsvv-upgrade-hint').textContent=t('Nâng cấp riêng và toàn đội được lưu độc lập; giữ nguyên các khoản đã mua.','Individual and team upgrades are stored separately; existing purchases are preserved.');
  // This expandable slot is now the definitive support-Pokémon handbook.
  // Keep role data synced with the exact roster used by the egg system.
  let panel=$('pkmsvv-skill-guide');
  if(!panel){
   panel=document.createElement('section');panel.id='pkmsvv-skill-guide';
   panel.className='pkmsvv-skill-guide pkmsvv-support-guide';
   $('pkmsvv-upgrade-hint').insertAdjacentElement('afterend',panel);
  }
  panel.classList.add('pkmsvv-support-guide');
  panel.replaceChildren();
  const toggle=document.createElement('button');
  toggle.type='button';toggle.id='pkmsvv-upgrade-guide-toggle';
  toggle.className='btn pkmsvv-upgrade-guide-toggle';
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-controls','pkmsvv-upgrade-guide-details');
  const symbol=document.createElement('span');symbol.className='pkmsvv-guide-symbol';
  const title=document.createElement('span');title.className='pkmsvv-guide-title';
  title.textContent=t('Thông tin Pokémon hỗ trợ','Support Pokémon Guide');
  const body=document.createElement('div');
  body.id='pkmsvv-upgrade-guide-details';body.className='pkmsvv-upgrade-guide-details';
  body.hidden=true;
  const renderSymbol=()=>{symbol.textContent=body.hidden?'+':'−';toggle.setAttribute('aria-expanded',String(!body.hidden));};
  toggle.onclick=()=>{body.hidden=!body.hidden;renderSymbol();};
  toggle.append(symbol,title);
  const intro=document.createElement('p');
  intro.textContent=t(
   'Mở khóa ở Chương 3. Đứng cạnh ổ trứng 4 giây để lấy; mỗi đòn mất máu khi ấp cộng 3 giây. Không có ổ trứng trong Khe Nứt.',
   'Unlocked in Chapter 3. Collect an egg in 4 seconds; HP damage adds 3 seconds to incubation. Nests never spawn in rifts.');
  body.append(intro);
  const rules=document.createElement('div');rules.className='pkmsvv-support-rule-grid';
  for(const [vi,eng] of [
   ['Thông thường: 50–80% chỉ số Pokémon chính','Regular: 50–80% of your lead Pokémon stats'],
   ['Shiny: 3% khi nở · 100% chỉ số · chỉ tồn tại trong trận','Shiny: 3% per hatch · 100% stats · run only'],
   ['Ban đầu 1 ô, mở tối đa 2 ô sau thử thách cuối Chương 3. Trứng đang ấp cũng chiếm ô.','Start with 1 slot; finish the Chapter 3 egg challenge to unlock a second. Incubating eggs also occupy a slot.'],
   ['Hỗ trợ có HP riêng và có thể bị hạ; hạ gục sẽ giải phóng ô.','Supports have HP and can faint, releasing their slot.']
  ]){
   const row=document.createElement('div');row.textContent=t(vi,eng);rules.append(row);
  }
  body.append(rules);
  const roles={attack:[t('Tấn công','Attack'),t('Gây sát thương lên quái trong tầm.','Damages enemies in range.')],
   heal:[t('Hồi phục','Healing'),t('Hồi máu cho người chơi hoặc đồng hành bị thương.','Heals the player or an injured companion.')],
   shield:[t('Khiên','Shield'),t('Tạo lớp bảo vệ hấp thụ sát thương.','Grants a damage-absorbing shield.')],
   magnet:[t('Hút vật phẩm','Magnet'),t('Kéo vật phẩm nhặt được về gần.','Draws nearby pickups.')],
   slow:[t('Làm chậm','Slow'),t('Làm chậm quái và hiện hiệu ứng CHẬM.','Slows enemies with visible SLOWED feedback.')]};
  const sub=document.createElement('h3');sub.textContent=t('Các Pokémon có thể nở','Pokémon that can hatch');
  body.append(sub);
  const list=document.createElement('div');list.className='pkmsvv-support-roster';
  const species=G.PKMSVVEggs?.SPECIES||[];
  for(const mon of species){
   const row=document.createElement('div');row.className='pkmsvv-support-entry';
   const head=document.createElement('strong');
   head.textContent=(G.DEX_BY?.[mon.dex]?.name||'Pokémon #'+mon.dex)+' · #'+mon.dex;
   const role=document.createElement('span');role.className='pkmsvv-support-role';
   role.textContent=(roles[mon.role]?.[0]||mon.role)+' · '+t('Hồi chiêu','Cooldown')+' '+mon.period+'s';
   const desc=document.createElement('small');desc.textContent=roles[mon.role]?.[1]||'';
   row.append(head,role,desc);list.append(row);
  }
  if(!species.length){
   const empty=document.createElement('p');
   empty.textContent=t('Danh sách hỗ trợ sẽ xuất hiện khi dữ liệu trò chơi sẵn sàng.','Support roster will appear once game data is ready.');
   list.append(empty);
  }
  body.append(list);
  const boss=document.createElement('p');boss.className='pkmsvv-support-boss-note';
  boss.textContent=t(
   'Boss (sau khi mở Chương 3) có thể có 1–3 Pokémon hộ vệ với 30–50% HP của boss. Hộ vệ biến mất khi boss bị hạ.',
   'After Chapter 3, bosses may have 1–3 guards with 30–50% boss HP. Guards disappear when their boss falls.');
  body.append(boss);
  panel.append(toggle,body);renderSymbol();
  $('pkmsvv-upgrade-back').textContent=t('Trở về','Back');
  $('pkmsvv-upgrade-single').onclick=()=>{
   G.MenuUI.openUpgrades();
   const note=$('pkmsvv-single-note');
   if(note)note.textContent=t('CHỈ ÁP DỤNG CHO 1 POKÉMON ĐƯỢC CHỌN — không ảnh hưởng Pokémon khác.','ONLY APPLIES TO THE SELECTED POKÉMON — other Pokémon are unaffected.');
  };
  $('pkmsvv-upgrade-all').onclick=()=>G.GlobalPowerUI.open();
  $('pkmsvv-upgrade-back').onclick=()=>G.MenuUI.open();
  G.UI.show('scr-upgrade-select',true);
 }
 return {open};
})();
