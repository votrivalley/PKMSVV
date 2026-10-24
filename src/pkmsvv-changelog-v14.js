/* Pokémon Sống Sót – Votri Valley v1.4 | 24/10/2026.
 * Bilingual release notes, appended only after gameplay patch succeeds.
 * Keep v1.1–v1.3 history unchanged.
 */
G.CHANGELOG.unshift({
 d:'2026-10-24',
 title:['Pokémon Sống Sót – Votri Valley v1.4','Pokémon Sống Sót – Votri Valley v1.4'],
 subtitle:['Phán Xét Arceus mới, thử thách cột mốc và những công cụ sinh tồn thú vị!','A renewed Arceus Judgment, milestone trials and new survival tools!'],
 new:[
  ['Thử thách phút 10/20/30: Boss tinh anh ở 10 phút, thử thách huyền thoại ở 20 phút và Phán Xét Arceus ở 30 phút.','10/20/30-minute milestones: An elite boss at minute 10, a legendary trial at minute 20, and Arceus Judgment at minute 30.'],
  ['Phán Xét Arceus 2.0: Arceus vẫn bất tử nhưng giờ nhận sát thương để ghi thành tích; mỗi trận mang một Plate hệ ngẫu nhiên.','Arceus Judgment 2.0: Arceus remains invincible, but attacks now contribute to a damage record; its Plate type is randomized each run.'],
  ['Mystery Dungeon Orbs: 6 loại cầu cứu nguy, chỉ nhặt khi đã học đủ 8 kỹ năng trong trận. Nhặt trước dùng trước (FIFO), không cần chọn Orb; dùng phím 5 hoặc nút Orb trên màn hình.','Mystery Dungeon Orbs: Six one-use survival tools, collectible only after learning all eight skills in a run. First in, first out (FIFO), no manual selection; press 5 or tap the Orb button.'],
  ['Shiny Charm theo từng Gen: Sưu tập đủ Pokémon một Gen, kể cả huyền thoại, để tăng gấp đôi tỉ lệ Shiny trong banner tương ứng.','Regional Shiny Charms: Own every Pokémon in a generation, including legendaries, to double Shiny odds in its corresponding banner.'],
  ['Gacha ×100: Quay một lúc 100 lần bằng 100 vé thường hoặc 10 vé ×10; giữ đảm bảo ít nhất một Pokémon 4★ trở lên trong mỗi nhóm 10 lượt.','Gacha ×100: Draw 100 at once using 100 normal tickets or ten ×10 tickets, with each group of ten retaining its guaranteed 4★+ pull.']
 ],
 chg:[
  ['Cốt truyện: mở Chương 1 sau trận đầu; Chương 2 – Tiếng Vọng Thứ Tám sau lần đầu học đủ 8 kỹ năng. Xem lại tại Ký Ức; sắp xếp lại tiêu đề và ghi công cho dễ đọc.','Story: Chapter 1 after the first run; Chapter 2 – The Eighth Echo after first learning all eight skills. Replay via Memories; improved title and credit readability.'],
  ['Cân bằng Mystery Dungeon Orbs: Quái thường có 3% cơ hội rơi Orb sau khi học đủ 8 kỹ năng; boss vẫn 45%. Giới hạn 10 Orb/trận, hồi sử dụng 5 giây; không thể khống chế Arceus.','Mystery Dungeon Orb balance: Normal enemies now have a 3% Orb drop chance after learning 8 skills; boss drops stay at 45%. At most 10 Orbs per run, with a 5-second use cooldown; Arceus is immune to Orb control.'],
  ['Kỹ năng tự động ưu tiên boss sống và mục tiêu gần, không bị quái nhỏ che boss; Judgment vẫn ưu tiên huyền thoại trước Arceus.','Auto-casting prioritizes live bosses and nearby threats; during Judgment, legendary enemies take priority over Arceus.'],
  ['Huyền thoại trong Judgment tăng máu theo hệ số ×1,25 và sát thương ×1,15 mỗi đợt, thay vì gấp đôi vô hạn ngay từ đầu.','Judgment legends now scale HP ×1.25 and damage ×1.15 per wave rather than doubling both every wave.'],
  ['Từ phút 35, Arceus cảnh báo và phá vật phẩm được trang bị trong trận; không xóa vật phẩm lưu trong túi đồ vĩnh viễn.','At minute 35, Arceus warns before shattering the equipped run item; permanent inventory items are not deleted.'],
  ['Meteor Mash giảm sát thương cơ bản 34 → 24, phạm vi 54 → 48 và lực đẩy 80 → 70.','Meteor Mash base damage reduced 34 → 24, radius 54 → 48 and knockback 80 → 70.']
 ],
 fix:[
  ['Mystery Orb: thay dấu sao tạm bằng 6 sprite màu riêng. Khi vừa học đủ 8 kỹ năng trong trận, bảo đảm một Orb đầu tiên xuất hiện gần nhân vật; quả này tính vào giới hạn 10 Orb/trận.','Mystery Orbs: replaced placeholder stars with six distinct colored sprites. After learning all eight skills in a run, one first Orb is guaranteed near the character and counts toward the 10-Orb limit.'],
  ['Tinh gọn tay cầm: Y dùng Orb đầu hàng chờ, X dùng kỹ năng chủ động; bỏ nút chuyển Orb. Có thể gán lại hai nút trong Cài đặt → Điều khiển.','Simplified controller mapping: Y uses the first queued Orb and X triggers the active skill; removed Orb switching. Remap both under Settings → Controls.'],
  ['Orb chỉ tồn tại trong trận, UI tối đa 3 ô xem trước trên PC hoặc 1 nút cạnh kỹ năng chủ động trên điện thoại; người chưa đủ 8 kỹ năng không thể nhặt Orb trong Co-op.','Orbs are run-only: three compact desktop queue indicators or one mobile button beside the active skill; in Co-op only players with eight learned skills can collect them.'],
  ['Giữ riêng tiến trình Offline trên PC/Android và Cloud Save một tài khoản/một phiên trên Web Online.','Offline PC/Android progress stays separate from the single-session Web Online Cloud Save.']
 ],
 credit:[
  'Votri Valley — Bản Việt hóa và mod phi thương mại dựa trên PokéSurvivor của JPTER78.',
  'Votri Valley — A free noncommercial localization and modification based on PokéSurvivor by JPTER78.'
 ]
});