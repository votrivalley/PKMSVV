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
  // Guides in order: Mystery Orb first, then permanent skill awakening.
  let panel=$('pkmsvv-skill-guide');
  if(!panel){
   panel=document.createElement('section');panel.id='pkmsvv-skill-guide';
   $('pkmsvv-upgrade-hint').insertAdjacentElement('afterend',panel);
  }
  panel.className='pkmsvv-skill-guide pkmsvv-orb-guides';
  panel.replaceChildren();
  const section=(title,build)=>{
   const details=document.createElement('details');details.className='pkmsvv-guide-accordion';
   const summary=document.createElement('summary');summary.textContent=title;
   const content=document.createElement('div');content.className='pkmsvv-guide-inner';
   build(content);details.append(summary,content);panel.append(details);
  };
  section(t('Hướng dẫn Mystery Orb','Mystery Orb Guide'),body=>{
   const info=document.createElement('p');
   const orbKey=String(G.Input?.bound?.('orb')||'digit4').replace(/^(digit|key|numpad)/,'').toUpperCase();
   info.textContent=t('Nhặt Mystery Orb ngay từ đầu trận, xếp hàng và sử dụng bằng phím '+orbKey+'; tối đa 10 Orb trong trận, hồi chiêu 5 giây.',
     'Collect Orbs from the beginning of each match in FIFO order and use key '+orbKey+'; up to 10 Orbs per run with a 5-second cooldown.');
   body.append(info);
   (G.Orbs?.LIST||[]).forEach(orb=>{
    const row=document.createElement('div');row.className='pkmsvv-orb-guide-row';
    row.style.borderLeftColor=orb.col;
    const name=document.createElement('strong');name.textContent=orb.name[en()?1:0];
    const detail=document.createElement('small');detail.textContent=orb.desc[en()?1:0];
    row.append(name,detail);body.append(row);
   });
  });
  // Completed accounts do not need the unlock walkthrough any more.
  const awakening=G.PKMSVVSkillTrack?.guide?.(G.DB.save,en()?'en':'vi');
  if(!awakening||awakening.count<8){
   section(t('Hướng dẫn Thức tỉnh kỹ năng','Skill Awakening Guide'),body=>{
    if(!awakening)return;
    const name=document.createElement('strong');name.textContent=awakening.headline;
    const desc=document.createElement('p');desc.textContent=awakening.note;
    body.append(name,desc);
    for(const line of awakening.lines||[]){
     const row=document.createElement('div');row.className='pkmsvv-skill-milestone';
     row.textContent=line;body.append(row);
    }
   });
  }
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
