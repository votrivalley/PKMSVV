/* Approved release notes: Pokémon Chuyển Sinh 2.0.
 * Bilingual, single entry; older 1.0 history is preserved.
 * QA packaging only until the build is promoted to production.
 */
(function(){
 'use strict';
 const entry={
  d:'2026-11-09',
  title:['Pokémon Chuyển Sinh 2.0','Pokémon Chuyển Sinh 2.0'],
  subtitle:['Khám phá theo thế hệ, nâng cấp trải nghiệm và cân bằng chiến đấu.',
            'Explore by generation, streamlined interfaces and combat balancing.'],
  new:[
   ['Chế độ Chơi ngay đổi thành Khám phá theo từng thế hệ.',
    'Play Now is replaced by generation-based Explore.'],
   ['Chuẩn hóa bố cục menu Pokémon: PokéBox, Pokédex và Nâng cấp.',
    'Unified the Pokémon menu layout: PokéBox, Pokédex and Upgrades.'],
   ['Biên tập lại giao diện Menu.',
    'Refined the Menu interface.'],
   ['Bổ sung gán nút cho thao tác mới và hướng dẫn trong phần gán controller.',
    'Added remappable new actions with instructions in controller settings.'],
   ['Chỉ Pokémon đã xuất hiện trong Pokédex mới được Chiêu mộ. Hạ gục Pokémon trong chế độ Khám phá để mở khóa Pokédex.',
    'Only Pokémon registered in the Pokédex can be recruited. Defeat Pokémon in Explore to unlock Pokédex entries.'],
   ['Thêm khả năng bán vật phẩm trong Túi đồ với giá bằng một nửa giá mua.',
    'Items in the Bag can now be sold for half their purchase price.'],
   ['Quái có thể rơi Bạc hà, Viên nang Đặc tính và Lăng Kính Tái Khắc. Pokémon càng hiếm, tỷ lệ rơi càng cao.',
    'Enemies may drop Nature Mints, Ability Capsules and Reforge Prisms. Rarer enemies have higher drop rates.'],
   ['Bổ sung tốc độ trận ×1,5 ở các chế độ cho phép.',
    'Added ×1.5 match speed in eligible game modes.']
  ],
  chg:[
   ['Bạc hà nay đổi Tính cách ngẫu nhiên, không chọn trực tiếp nữa.',
    'Nature Mints now reroll a random Nature rather than allowing direct selection.'],
   ['Viên nang Đặc tính nay đổi Đặc tính ngẫu nhiên, không chọn trực tiếp nữa.',
    'Ability Capsules now reroll a random Ability rather than allowing direct selection.'],
   ['Gỡ Viên nang Đặc tính Ẩn khỏi shop. Đặc tính Ẩn hiếm và có giá trị cao hơn.',
    'Hidden Ability Capsules are no longer sold in the shop; Hidden Abilities are rarer and more valuable.'],
   ['Arena được điều chỉnh để cạnh tranh hơn: đối thủ gây áp lực mạnh hơn, chọn kỹ năng/tiến hóa thời gian thực ở các chế độ phù hợp, cân bằng AI và Support Champion.',
    'Arena is more competitive with stronger opponents, live move/evolution choices in supported modes, and balanced Champion AI and Support.'],
   ['Đồng bộ tốt hơn giữa bàn phím và controller.',
    'Improved keyboard and controller consistency.'],
   ['Cân bằng lại Pokémon hỗ trợ.',
    'Rebalanced companion Support Pokémon.']
  ],
  fix:[
   ['Sửa lỗi giao diện không đồng bộ kích thước giữa các tab.',
    'Fixed inconsistent sizes across menu tabs.'],
   ['Sửa menu cuộn tự kéo ngược lên.',
    'Fixed menus automatically scrolling back to the top.'],
   ['Sửa các lỗi popup nâng kỹ năng, thao tác nhanh và một số logic vật phẩm / hỗ trợ.',
    'Fixed skill-up popups, shortcuts and several item/Support issues.'],
   ['Ngăn dùng Viên nang khi Pokémon chỉ có một Đặc tính, không tiêu hao vật phẩm; đồng bộ Đặc tính với dạng Shiny.',
    'Prevent Capsule use on single-Ability Pokémon without consuming stock; synchronize Shiny Ability changes.'],
   ['Sửa ghi chú Chiêu mộ bị trôi khỏi khung khi mở trên màn hình lớn hoặc mobile.',
    'Fixed the Recruitment unlock notice appearing outside the dialog on desktop and mobile.'],
   ['Hiển thị hệ trong Pokédex bằng màu riêng đồng bộ với PokéBox.',
    'Pokédex now uses the same type-specific color labels as PokéBox.'],
   ['Sát thương hiển thị hệ số chính xác như ×1.52 thay vì làm tròn thành số nguyên.',
    'Damage now shows the actual multiplier, such as ×1.52, instead of rounding to a whole number.']
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
