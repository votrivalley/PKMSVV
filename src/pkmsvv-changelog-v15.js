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

G.CHANGELOG.unshift({
 d:'2026-10-26',
 title:['Pokemon Chuyển sinh – Votri Valley v1.5.3','Pokemon Chuyển sinh – Votri Valley v1.5.3'],
 subtitle:['Boss cũng có đội Pokémon hộ vệ.','Bosses can also have Pokémon bodyguards.'],
 new:[
  ['Mỗi boss có từ 1 đến 3 Pokémon hỗ trợ, mỗi bé có lượng HP đúng bằng 30% HP tối đa của boss và có thể bị đánh hạ riêng.','Every boss may have 1–3 support Pokémon, each with exactly 30% of the boss’s maximum HP and separately defeatable.'],
  ['Hộ vệ đi theo boss, có thanh máu riêng và kỹ năng hỗ trợ tấn công, làm chậm, hồi phục hoặc khiên.','Bodyguards follow their boss, show their own HP and provide attack, slow, healing or shielding abilities.']
 ],
 chg:[['Hồi phục và khiên cho boss được giới hạn theo sát thương người chơi đang gây ra để tránh boss bất tử; hộ vệ biến mất khi boss bị hạ.','Boss healing and shielding are capped by recent incoming player damage to prevent immortality; followers disappear when the boss falls.']],
 fix:[],
 credit:['Votri Valley — Bản mod và Việt hóa phi thương mại dựa trên PokéSurvivor của JPTER78.','Votri Valley — A noncommercial mod and localization based on PokéSurvivor by JPTER78.']
});

G.CHANGELOG.unshift({
 d:'2026-10-26',
 title:['Pokemon Chuyển sinh – Votri Valley v1.5.4','Pokemon Chuyển sinh – Votri Valley v1.5.4'],
 subtitle:['Canh menu và cập nhật cẩm nang Pokémon hỗ trợ.','Menu alignment and a new support Pokémon handbook.'],
 new:[
  ['Trong Chọn kiểu nâng cấp, ô hướng dẫn nay mở danh sách Pokémon hỗ trợ cùng vai trò, hồi chiêu, quy tắc ấp trứng, Shiny và hộ vệ boss.','The upgrade chooser now expands to a support roster with each role, cooldown, egg hatch rules, Shiny odds and boss guardians.']
 ],
 chg:[
  ['Canh cạnh dưới menu bên phải thẳng với phần Sự kiện và Có gì mới bên trái ở màn hình PC rộng; không hạ xuống quá mức khi màn hình nhỏ.','The right menu bottom aligns with the Events and What’s New cards on wide PC screens without overflowing smaller screens.']
 ],
 fix:[
  ['Bỏ nút Hướng dẫn Mystery Orb khỏi Ký Ức, giữ đầy đủ các chương truyện và cơ chế Orb trong trận.','Removed the Mystery Orb Guide button from Memories while preserving story chapters and in-run Orb mechanics.']
 ],
 credit:['Votri Valley — Bản mod và Việt hóa phi thương mại dựa trên PokéSurvivor của JPTER78.',
         'Votri Valley — A noncommercial mod and localization based on PokéSurvivor by JPTER78.']
});

G.CHANGELOG.unshift({
 d:'2026-10-26',
 title:['Pokemon Chuyển sinh – Votri Valley v1.5.5','Pokemon Chuyển sinh – Votri Valley v1.5.5'],
 subtitle:['Thanh thời gian trứng tinh gọn và nút trở lại toàn màn hình PC.','Minimal egg progress lines and a PC fullscreen restore button.'],
 new:[
  ['Chỉ trên PC: cửa sổ Tạm dừng và phần Đồ họa trong Cài đặt có thể khôi phục chế độ toàn màn hình khi game bị thoát ra cửa sổ.','PC only: restore fullscreen from Pause or the Graphics settings if the game switches to windowed mode.']
 ],
 chg:[
  ['Thanh thời gian lấy và ấp trứng chỉ còn một đường trắng mảnh 2 px, rút ngắn từ phải sang trái, không hộp đen hay chữ nổi.','Egg collection and incubation use only a 2 px white line shrinking right-to-left, without a dark frame or overlaid text.']
 ],
 fix:[],
 credit:['Votri Valley — Bản mod và Việt hóa phi thương mại dựa trên PokéSurvivor của JPTER78.',
         'Votri Valley — A noncommercial mod and localization based on PokéSurvivor by JPTER78.']
});
