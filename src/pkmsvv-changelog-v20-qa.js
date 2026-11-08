/* Approved release notes: Pokémon Chuyển Sinh 2.0.
 * Bilingual, single entry; older 1.0 history is preserved.
 * QA packaging only until the build is promoted to production.
 */
(function(){
 'use strict';
 const entry={
  d:'2026-11-09',
  title:['Pokémon Chuyển Sinh 2.0','Pokémon Chuyển Sinh 2.0'],
  subtitle:['Khám phá theo thế hệ, nâng Rank, Fusion và Pokédex tiến hóa.',
            'Explore by generation, Rank upgrades, Fusion and evolution discoveries.'],
  new:[
   ['Chế độ Chơi ngay đổi thành Khám phá theo từng thế hệ.', 'Play Now becomes Explore by generation.'],
   ['Thêm tính năng nâng Rank cho Pokémon: Pokémon Chiêu mộ trùng trở thành nguyên liệu.',
    'Added Pokémon Rank upgrades: duplicate pulls become upgrade materials.'],
   ['Chuẩn hóa menu Pokémon: PokéBox, Pokédex và Nâng cấp.',
    'Unified the Pokémon menu: PokéBox, Pokédex and Upgrades.'],
   ['Biên tập lại giao diện Menu.', 'Redesigned the main Menu interface.'],
   ['Bổ sung gán nút cho thao tác mới và hướng dẫn rõ ràng trong phần gán controller.',
    'Added new button bindings and clearer controller mapping instructions.'],
   ['Chỉ Pokémon đã mở Pokédex mới có thể Chiêu mộ. Mở khóa bằng cách hạ gục trong Khám phá hoặc tiến hóa thành Pokémon đó.',
    'Only discovered Pokédex Pokémon can be recruited. Unlock by defeating them in Explore or evolving into that Pokémon.'],
   ['Fusion kết hợp 2 kỹ năng thành 1 kỹ năng mới.', 'Fusion combines two skills into one new skill.'],
   ['Thêm bộ lọc Đã phát hiện trong Pokédex để xem các Pokémon có thể Chiêu mộ.',
    'Added a Discovered filter to show recruitable Pokémon.']
  ],
  chg:[
   ['Bạc hà nay đổi Tính cách ngẫu nhiên, không chọn trực tiếp nữa.',
    'Nature Mints now reroll a random Nature instead of direct selection.'],
   ['Viên nang Đặc tính nay đổi Đặc tính ngẫu nhiên, không chọn trực tiếp nữa.',
    'Ability Capsules now reroll a random Ability instead of direct selection.'],
   ['Viên nang Đặc tính Ẩn bị gỡ khỏi Shop; Đặc tính Ẩn hiếm và có giá trị cao hơn.',
    'Hidden Ability Capsules were removed from the shop; Hidden Abilities are rarer and more valuable.'],
   ['Thêm khả năng bán vật phẩm trong Túi đồ với giá bằng 1/2 giá mua.',
    'Items can be sold from the Bag for half their purchase price.'],
   ['Quái có thể rơi Bạc hà, Viên nang Đặc tính và Lăng kính tái khắc. Pokémon càng hiếm thì tỷ lệ rơi càng cao.',
    'Enemies may drop Mints, Ability Capsules and Reforge Prisms, with better odds for rarer Pokémon.'],
   ['Arena cạnh tranh hơn: đối thủ mạnh, gây áp lực ổn định; tiến hóa / chọn kỹ năng thời gian thực ở chế độ phù hợp; cân bằng AI và hỗ trợ Champion.',
    'Arena balancing: more demanding opponents, live evolution / skill selection where supported and improved Champion AI / support.'],
   ['Bổ sung tốc độ trận ×1,5 ở các chế độ cho phép; giữ tốc độ khi ra vào Khe Nứt.',
    'Added ×1.5 speed in eligible modes; preserve it across Rift transitions.'],
   ['Đồng bộ tốt hơn giữa bàn phím và controller.', 'Improved keyboard / controller consistency.'],
   ['Điều chỉnh và cân bằng Pokémon hỗ trợ.', 'Rebalanced Support Pokémon.']
  ],
  fix:[
   ['Sửa lỗi tiếng Anh – Việt lẫn nhau.', 'Fixed mixed Vietnamese and English text.'],
   ['Sửa nhiều lỗi giao diện không đồng bộ kích thước giữa các tab, ưu tiên diện tích danh sách Pokémon.',
    'Fixed inconsistent tab sizes, prioritizing Pokémon lists.'],
   ['Sửa các vấn đề khiến menu cuộn bị tự kéo ngược lên.', 'Fixed menus auto-scrolling back to the top.'],
   ['Sửa popup nâng kỹ năng, thao tác nhanh và một số logic vật phẩm / hỗ trợ.',
    'Fixed level-up popups, shortcuts and several item / support issues.']
  ],
  credit:['Votri Valley — Dự án Việt hóa và mở rộng phi thương mại dựa trên PokéSurvivor của JPTER78.',
          'Votri Valley — Noncommercial localization and expansion based on JPTER78’s PokéSurvivor.']
 };
 const install=()=>{
  if(!Array.isArray(G.CHANGELOG))return false;
  G.CHANGELOG=G.CHANGELOG.filter(x=>!String(x.title?.[0]||'').includes('Chuyển Sinh 2.0'));
  G.CHANGELOG.unshift(entry);return true;
 };
 if(!install()&&typeof document!=='undefined'){
  document.addEventListener('DOMContentLoaded',install,{once:true});
 }
 G.PKMSVVChangelog20={entry,install};
})();
