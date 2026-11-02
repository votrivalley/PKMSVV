/* Pokémon Chuyển Sinh: consolidated bilingual development history.
 * Replaces ONLY in-game news entries; historical source notes are preserved.
 * Entries are explicitly [Vietnamese, English], never machine-translated.
 * Version 1.0 is the project's narrative/rebranding baseline, not a
 * claim that all ten chapters or late-game mechanics shipped on day one.
 */
G.CHANGELOG = [
 {
  d:'2026-11-03',
  title:['Pokémon Chuyển Sinh · v1.5.80','Pokémon Reincarnation · v1.5.80'],
  subtitle:['Có gì mới — hành trình khác biệt so với PokéSurvivor gốc.',
            'What’s New — how this edition differs from the original PokéSurvivor.'],
  new:[
   ['Nhật ký phiên bản được viết lại theo các mốc 1.0–hiện tại, nhấn mạnh tính năng do SVV phát triển.',
    'Rebuilt version history from 1.0 to today, highlighting features added by SVV.'],
   ['Có gì mới và các giao diện mở rộng có nội dung tiếng Việt/English riêng; tiếng Việt không bị dịch lại.',
    'What’s New and expanded interfaces have dedicated Vietnamese and English copy; Vietnamese remains unchanged.']
  ],
  chg:[
   ['Giữ nguyên Pokémon, tiến độ lưu, điều kiện mở khóa và gameplay hiện có.',
    'Pokémon, saved progress, unlock requirements and existing gameplay are unchanged.']
  ]
 },
 {
  d:'2026-11-02',
  title:['Pokémon Chuyển Sinh · v1.5.79','Pokémon Reincarnation · v1.5.79'],
  subtitle:['Mega, Arena và chơi cùng bạn bè.','Mega Evolution, Arena and multiplayer battles.'],
  new:[
   ['Mega Evolution: máy quay Mega Stone riêng, Pokédex Mega, điều kiện mở theo cốt truyện và biến hình trong trận.',
    'Mega Evolution: a dedicated Mega Stone gacha, Mega encyclopedia, story unlocks and in-battle transformations.'],
   ['Arena: Solo đối đầu AI hoặc người thật qua Host/Join; giải Champion 16 đối thủ và các nhà vô địch theo vùng.',
    'Arena: Solo against AI or real players via Host/Join; a 16-entrant Champion bracket and regional champions.'],
   ['Berry: túi đồ, cửa hàng Berry và Giải Cứu Berry 4 người bảo vệ 3 cây trong 8 phút.',
    'Berries: inventory, Berry Shop and 4-player Berry Rescue defending three trees for eight minutes.'],
   ['Fusion: gợi ý 10 cặp kỹ năng có icon, ghép tự do và một lượt Fusion miễn phí mỗi trận.',
    'Fusion: 10 suggested move pairings with icons, unrestricted linking and one free Fusion per match.']
  ],
  chg:[
   ['Champion chuyển Mega ở 50% HP, dừng trận 1 giây để thể hiện tiến hóa rồi hồi đầy HP pha hai.',
    'Champions transform at 50% HP, pause combat for a one-second reveal, then return with full phase-two HP.'],
   ['Đếm ngược 3–2–1 trước trận Arena; đồng bộ Co-op trên PC, Android và Web.',
    '3–2–1 Arena battle countdown; shared Co-op behavior across PC, Android and Web.']
  ],
  fix:[
   ['Sửa nút Mega/Fusion, trạng thái Arena còn chạy sau khi thoát và cân bằng EXP Giải Cứu Berry về ×1.',
    'Fixed Mega/Fusion controls and lingering Arena sessions; Berry Rescue now awards standard ×1 EXP.']
  ]
 },
 {
  d:'2026-10-26',
  title:['Pokémon Chuyển Sinh · v1.5','Pokémon Reincarnation · v1.5'],
  subtitle:['Pokémon đồng hành, trứng và hành trình Ký Ức.',
            'Companions, eggs and the Memory journey.'],
  new:[
   ['Ấp trứng và nuôi Pokémon hỗ trợ: tối đa hai đồng hành cùng lúc; Mew, Ditto và Shiny có cơ chế riêng.',
    'Hatch eggs and recruit up to two support Pokémon; Mew, Ditto and Shiny companions gain distinct mechanics.'],
   ['Tranh Trứng: bốn người tranh mười quả trứng, tính điểm và xếp hạng cuối trận.',
    'Egg Rush: four players compete to collect ten eggs, with scoring and final standings.'],
   ['Ký Ức và hệ thống chương: kể tiếp hành trình chuyển sinh qua tranh truyện, thử thách và điều kiện mở khóa.',
    'Memories and chapters: continue the reincarnation story through illustrated scenes, challenges and unlock conditions.']
  ],
  chg:[
   ['Điều chỉnh AI, tiến độ trận, kỹ năng hỗ trợ và bố cục cho nhiều thiết bị.',
    'Rebalanced AI, match pacing, support skills and layouts across devices.']
  ]
 },
 {
  d:'2026-10-24',
  title:['Pokémon Chuyển Sinh · v1.4','Pokémon Reincarnation · v1.4'],
  subtitle:['Thử thách sinh tồn và sức mạnh mới.','Survival milestones and new powers.'],
  new:[
   ['Mystery Dungeon Orbs: sáu loại Orb sử dụng một lần, có hiệu ứng đẩy lùi, khống chế hoặc hỗ trợ.',
    'Mystery Dungeon Orbs: six single-use Orbs for knockback, crowd control and survival effects.'],
   ['Các mốc boss phút 10/20/30 cùng Phán Xét Arceus; bổ sung thành tựu và Shiny Charm từng thế hệ.',
    'Boss milestones at minutes 10/20/30 and Arceus Judgment; new achievements and generation-specific Shiny Charms.'],
   ['Gacha ×100 và cơ chế bảo hiểm 5★ được điều chỉnh.',
    '100-pull Gacha and adjusted 5★ pity protection.']
  ],
  chg:[
   ['Chiêu lao tới chủ động theo hướng di chuyển; AI ưu tiên boss và mục tiêu nguy hiểm.',
    'Manual dashes follow movement direction; auto-targeting prioritizes bosses and major threats.']
  ]
 },
 {
  d:'2026-10-23',
  title:['Pokémon Chuyển Sinh · v1.3','Pokémon Reincarnation · v1.3'],
  subtitle:['Mở rộng từ chơi đơn sang kết nối nhiều người.',
            'From solo survival to connected multiplayer.'],
  new:[
   ['Chế độ Co-op Sống Sót, Sống Còn và hệ thống phòng chơi Host/Join; sau đó bổ sung kết nối trực tiếp LAN/Wi-Fi.',
    'Co-op Survival, Survival Royale and Host/Join rooms; later expanded with direct LAN/Wi-Fi connections.'],
   ['Bảng thứ hạng, kết quả trận và hỗ trợ AI khi chơi không đủ người.',
    'Rankings, match results and AI teammates when not enough people join.']
  ],
  chg:[
   ['Mỗi chế độ có luật thắng thua, hồi sinh và nhịp độ riêng.',
    'Each mode has its own victory, elimination, revival and pacing rules.']
  ]
 },
 {
  d:'2026-10-22',
  title:['Pokémon Chuyển Sinh · v1.2','Pokémon Reincarnation · v1.2'],
  subtitle:['Phát triển Pokémon và mua sắm trong thế giới mới.',
            'Customize Pokémon and shop in the new world.'],
  new:[
   ['Cửa hàng Kecleon và Túi đồ: mua vật phẩm, Mint, Capsule, TM và quản lý đồ đã sở hữu.',
    'Kecleon Shop and Bag: purchase items, Mints, Capsules and TMs, and manage your inventory.'],
   ['Nature, Ability và Hidden Ability: mở rộng hướng xây dựng chỉ số và bộ kỹ năng từng Pokémon.',
    'Natures, Abilities and Hidden Abilities add deeper Pokémon customization.']
  ],
  chg:[
   ['Điều chỉnh nhịp xuất hiện quái và boss trong giai đoạn đầu, mở đầu dễ tiếp cận hơn.',
    'Smoothed early enemy and boss pacing for a more approachable opening.']
  ]
 },
 {
  d:'2026-10-22',
  title:['Pokémon Chuyển Sinh · v1.1','Pokémon Reincarnation · v1.1'],
  subtitle:['Những cải tiến đầu tiên so với bản gốc.','Early upgrades beyond the original game.'],
  new:[
   ['Nâng cấp Toàn Đội vĩnh viễn, mở rộng phạm vi và thời lượng kỹ năng.',
    'Permanent Team Powerups, increased move area and effect duration.'],
   ['Sao lưu/khôi phục file JSON nhanh; nhiều tiện ích giao diện, điều khiển và Pokédex.',
    'Quick JSON save backup/restore; improved UI, controls and Pokédex.']
  ],
  chg:[
   ['Cân bằng hồi chiêu, kỹ năng và cơ chế chiến đấu để phù hợp phong cách SVV.',
    'Rebalanced move cooldowns and combat behavior for the SVV experience.']
  ]
 },
 {
  d:'2026-10-22',
  title:['Pokémon Chuyển Sinh · v1.0','Pokémon Reincarnation · v1.0'],
  subtitle:['Từ Pokémon Sống Sót trở thành Pokémon Chuyển Sinh.',
            'From Pokémon Survival to Pokémon Reincarnation.'],
  new:[
   ['Đổi tên dự án Pokémon Sống Sót thành Pokémon Chuyển Sinh — bản mở rộng Việt hóa do Votri Valley phát triển từ PokéSurvivor gốc của JPTER78.',
    'Renamed Pokémon Survival to Pokémon Reincarnation — Votri Valley’s expanded localization and modification of JPTER78’s original PokéSurvivor.'],
   ['Đặt nền móng cho cốt truyện 10 chương: tỉnh dậy trong hình hài Pokémon, khôi phục Ký Ức và từng bước đối mặt các Champion, Mega và bầu trời hắc hóa.',
    'Established a ten-chapter story: awaken as a Pokémon, recover lost Memories, then face Champions, Mega Evolution and a darkening sky.'],
   ['Xây dựng giao diện tiếng Việt, bản sắc hình ảnh SVV và các tuyến mở khóa chương theo tiến độ người chơi.',
    'Introduced Vietnamese localization, SVV visual identity and story-driven progression.']
  ],
  credit:[
   'Votri Valley — Bản mod và Việt hóa phi thương mại dựa trên PokéSurvivor của JPTER78. Pokémon thuộc về các chủ sở hữu tương ứng.',
   'Votri Valley — A noncommercial mod and localization based on JPTER78’s PokéSurvivor. Pokémon belongs to its respective rights holders.'
  ]
 }
];
// Do not run G.T() on the bilingual news copy: both columns are editorial text.
