/* Pokemon Chuyển sinh – Votri Valley v1.5.1 (25/10/2026).
 * Solo egg companions and Web Egg Rush. Earlier bilingual notes remain intact.
 */
G.CHANGELOG.unshift({
 d:'2026-10-25',
 title:['Pokemon Chuyển sinh – Votri Valley v1.5.1','Pokemon Chuyển sinh – Votri Valley v1.5.1'],
 subtitle:['Trứng đồng hành, Tranh Trứng Online và cải thiện trải nghiệm.','Companion eggs, online Egg Rush and experience improvements.'],
 new:[
  ['Sau khi mở Chương 3, tìm các ổ trứng trong trận đơn. Trứng đi theo và có thể nở thành Pokémon hỗ trợ với khả năng tấn công, hồi máu, tạo khiên hoặc hỗ trợ khác.','After unlocking Chapter 3, find nests in solo runs. Eggs follow you and hatch into supportive Pokémon with attacking, healing, shielding or other abilities.'],
  ['Mỗi trận có 2 vị trí trứng đồng hành, có thể mở vị trí thứ 3 qua tiến trình.','Each run supports two egg companions, with a third slot unlockable through progression.'],
  ['Tranh Trứng trên Web Online: chế độ 4 người với ổ trứng và tính điểm riêng; không thay đổi tiến trình Offline.','Web Online Egg Rush: a four-player mode with egg nests and separate scoring, without changing offline progress.']
 ],
 chg:[
  ['Tên hiển thị mới: Pokemon Chuyển sinh; cập nhật lại menu chính, phần Thông tin và phiên bản 1.5.1 trên gói cài đặt.','New display name: Pokemon Chuyển sinh; refreshed the main menu, About screen and installer version 1.5.1.']
 ],
 fix:[
  ['Trứng: ổ mới có mũi tên chỉ đường; đứng trong vùng đủ 8 giây để lấy, có thanh đếm ngược lấy và ấp. Trúng sát thương máu khi ấp cộng 3 giây, kể cả khi đã tăng tốc bằng chiến đấu.','Eggs: new nests have wayfinding arrows, require an eight-second channel, and show collecting/hatching countdown bars. HP damage extends incubation by three seconds even with combat speedups.'],
  ['Pokémon hỗ trợ đi theo bằng hoạt ảnh Walk/Idle và có khoảng cách tự nhiên; kỹ năng tấn công, hồi máu, khiên, hút vật phẩm và làm chậm đều có hiệu ứng rõ. Igglybuff hiển thị CHẬM trên quái bị ảnh hưởng.','Support Pokémon now follow with grounded Walk/Idle movement and natural spacing; attacks, heals, shields, magnets and slows have clear visual effects. Igglybuff displays SLOWED on affected enemies.'],
  ['Canh đáy menu bên phải theo cụm nội dung bên trái trên màn hình PC rộng; giữ bố cục mobile độc lập.','Align the right-hand menu bottom with the left content on wide PC displays, leaving mobile layout separate.'],
  ['Sao lưu và Khôi phục được mở trong cửa sổ riêng từ Tùy chọn; giữ nguyên định dạng tệp save và hồ sơ người chơi.','Backup and Restore now open in a separate dialog from Options; existing save format and player profiles are preserved.'],
  ['Tối ưu vị trí menu, thu gọn dòng ghi công và chỉ hiển thị một khung Có gì mới.','Menu alignment, subtle single-line credit and one What’s New panel.']
 ],
 credit:['Votri Valley — Bản mod và Việt hóa phi thương mại dựa trên PokéSurvivor của JPTER78.',
         'Votri Valley — A noncommercial mod and localization based on PokéSurvivor by JPTER78.']
});

G.CHANGELOG.unshift({
 d:'2026-10-25',
 title:['Pokemon Chuyển sinh – Votri Valley v1.5.2','Pokemon Chuyển sinh – Votri Valley v1.5.2'],
 subtitle:['Pokémon hỗ trợ có máu riêng và Shiny 3% trong trận.','Support Pokémon now have independent HP and a 3% in-run Shiny chance.'],
 new:[
  ['Pokémon hỗ trợ thường có 50–80% chỉ số của Pokémon chính khi nở. Shiny có tỷ lệ nở chính xác 3%, nhận 100% chỉ số và chỉ tồn tại trong trận, không thêm vào Pokédex vĩnh viễn.','Regular support Pokémon hatch with 50–80% of the lead Pokémon’s stats. Shiny odds are 3%, Shiny has 100% stats, and exists for the run only without permanently unlocking Pokédex entries.'],
  ['Mỗi bé có thanh máu riêng, có thể chịu va chạm với quái, được hồi máu và được bảo vệ bằng khiên. Bị hạ sẽ rời đội.','Each follower has its own HP bar, can take enemy contact damage, be healed and shielded, and leaves the team when fainted.']
 ],
 chg:[
  ['Đội đủ slot thì không xuất hiện ổ trứng mới, kể cả khi đang mang trứng chưa nở. Khi support bị hạ, ổ trứng có thể xuất hiện lại. Bỏ hộp thoại thay thế support cũ.','A full team suppresses new nests, counting eggs still incubating. Nests can resume after a teammate faints. The old team-replacement dialog is removed.']
 ],
 fix:[
  ['Tăng độ an toàn cho support trước biển quái: sát thương va chạm có giới hạn và thời gian miễn nhiễm giữa hai đòn.','Added bounded collision damage and brief hit immunity for support Pokémon in dense enemy waves.']
 ],
 credit:['Votri Valley — Bản mod và Việt hóa phi thương mại dựa trên PokéSurvivor của JPTER78.',
         'Votri Valley — A noncommercial mod and localization based on PokéSurvivor by JPTER78.']
});
