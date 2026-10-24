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
  const guide=G.PKMSVVSkillTrack.guide(G.DB.save,en()?'en':'vi');
  let panel=$('pkmsvv-skill-guide');
  if(!panel){
   panel=document.createElement('section');panel.id='pkmsvv-skill-guide';
   panel.className='pkmsvv-skill-guide';
   $('pkmsvv-upgrade-hint').insertAdjacentElement('afterend',panel);
  }
  panel.replaceChildren();
  // Keep this short by default. The player can expand it with A / touch
  // and collapse it with the same button; no separate inaccessible close icon.
  const full=guide.count>=8;
  const toggle=document.createElement('button');
  toggle.type='button';toggle.id='pkmsvv-upgrade-guide-toggle';
  toggle.className='btn pkmsvv-upgrade-guide-toggle';
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-controls','pkmsvv-upgrade-guide-details');
  const symbol=document.createElement('span');symbol.className='pkmsvv-guide-symbol';
  const title=document.createElement('span');title.className='pkmsvv-guide-title';
  title.textContent=full?t('Hướng dẫn Mystery Orb','Mystery Orb Guide'):guide.headline;
  const body=document.createElement('div');body.className='pkmsvv-upgrade-guide-details';
  body.id='pkmsvv-upgrade-guide-details';body.hidden=true;
  const renderSymbol=()=>{symbol.textContent=body.hidden?'+':'−';toggle.setAttribute('aria-expanded',String(!body.hidden));};
  toggle.onclick=()=>{body.hidden=!body.hidden;renderSymbol();};
  toggle.append(symbol,title);
  if(full){
   const explanation=document.createElement('p');
   explanation.textContent=t(
    'Trong một trận, học đủ cả 8 kỹ năng thì mới có thể nhặt Mystery Orb. Nhặt trước dùng trước (FIFO). Tối đa 10 Orb rơi mỗi trận, mỗi lần chỉ dùng một quả, thời gian hồi 5 giây. Orb không giữ lại sau trận.',
    'Learn all eight moves in a run to collect Mystery Orbs. First collected, first used (FIFO). At most 10 drops per run, one use at a time, 5-second cooldown. Orbs expire after each run.'
   );
   const controls=document.createElement('p');
   controls.textContent=t('PC: phím 5 · Tay cầm: Y mặc định · Cảm ứng: nút Orb cạnh kỹ năng chủ động.',
    'PC: key 5 · Controller: Y by default · Touch: Orb button next to the active skill.');
   body.append(explanation,controls);
   for(const orb of G.Orbs.LIST){
    const row=document.createElement('p');row.className='pkmsvv-orb-guide-row';
    const name=document.createElement('strong');name.textContent=orb.name[en()?1:0]+': ';
    name.style.color=orb.col;row.append(name,document.createTextNode(orb.desc[en()?1:0]));body.append(row);
   }
  }else{
   const note=document.createElement('p');note.textContent=guide.note;
   const list=document.createElement('div');list.className='pkmsvv-skill-guide-grid';
   for(const line of guide.lines){const item=document.createElement('div');item.textContent=line;list.append(item);}
   body.append(note,list);
  }
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
