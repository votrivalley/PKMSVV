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
