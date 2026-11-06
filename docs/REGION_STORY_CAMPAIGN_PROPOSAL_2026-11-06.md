# Đề xuất Region Story — Pokémon Chuyển Sinh (2026-11-06)
**Trạng thái:** BẢN THIẾT KẾ / CHƯA CÀI ĐẶT. Chưa được coi là tính năng đã phát hành. Giữ nguyên save, chapter flag và vùng thi đấu hiện hành.

## Mục tiêu
Học từ bố cục màn hình chọn Region của PokéLit (9 vùng chính + 1 vùng cuối), nhưng không sao chép artwork hoặc mã. Trải nghiệm từng vùng phải khác nhau về môi trường, cách chiến đấu, Champion, phần thưởng. **Đi hết vùng** mới mở Chương 10; không buộc chơi hết 9 trận sinh tồn 30 phút.

## Tương thích với cốt truyện hiện tại
- Giữ nguyên Chương 1–6: Thức Tỉnh, Mảnh Ký Ức, Orb, Trứng, Đồng Hành, Berry.
- Chương 7 mở Arena/Region; Chương 8 dẫn nhập Champions, Chương 9 mở Mega sau Champion đầu tiên.
- Chương 10 Bầu Trời Hắc Hóa: giữ **10 Crown Seals + Rayquaza defeated** như điều kiện hiện hành. Không đổi tên/chuyển nghĩa dữ liệu save `pkmsvvChapter10*`.
- Region Journey nằm trong cốt truyện sau Chương 7, không phải thứ thay thế chương trước đó. Chương 9 vẫn có thể mở trong khi chinh phục các Region.

## Lộ trình bắt buộc (10 Ấn Chứng, một lần hoàn thành/mỗi vùng)
| # | Region | Môi trường | Đặc trưng gameplay (đề xuất) | Đối thủ chính dựa trên roster hiện tại |
|---|---|---|---|---|
| 1 | Kanto (Gen I) | Đồng cỏ, núi lửa | Vùng học luật, đợt lửa nhỏ, mini-boss đầu tiên | Charizard |
| 2 | Johto (Gen II) | Rừng cổ, đền | Kháng đòn, cơ chế giáp; tập quản lý cooldown | Scizor |
| 3 | Hoenn (Gen III) | Biển, mưa, đảo | Vùng nước làm chậm Pokémon trên đất; vị trí quan trọng | Swampert |
| 4 | Sinnoh (Gen IV) | Núi tuyết, đền | Đất đá cản đường, cận chiến có rủi ro | Garchomp |
| 5 | Unova (Gen V) | Đô thị, mỏ | Quái có giáp, cần phá tuyến mục tiêu | Excadrill |
| 6 | Kalos (Gen VI) | Thành cổ, sân vườn | Ánh sáng/bóng tối, mở cơ hội combo và Mega | Greninja |
| 7 | Alola (Gen VII) | Nhiệt đới, bãi biển | Di chuyển nhanh, bảo vệ điểm ngắn | Golisopod |
| 8 | Galar (Gen VIII) | Sân vận động | Sóng địch có nhịp, ưu tiên kiểm soát vòng đấu | Falinks |
| 9 | Paldea (Gen IX) | Hẻm núi, băng | Vùng nguy hiểm đổi pha; xây bộ kỹ năng bền | Baxcalibur |
| 10 | Tháp Thiên Không / Sky Pillar (final region) | Đảo nổi, rồng | Phối hợp các quy tắc đã học; Champion cuối nâng Mega mạnh | Dragonite |
- Các modifier phải được kiểm thử về cân bằng; không bê hệ số độ khó ×3/×9 của game tham khảo.
- Trận Champion hiện là 16 suất, nhưng người chơi chỉ có khoảng bốn lượt đấu trực tiếp. Tránh thêm một chuỗi grind bắt buộc bên ngoài; **một chiến thắng thật sự trước Champion = một Crown Seal**.
- Mega tại mốc 50% HP trong trận Champion; chuyển pha có thời gian nhìn thấy, không hồi máu vô hạn; thiếu sprite riêng thì dùng hiệu ứng pha 2 thay vì ảnh sai.
- Mỗi vùng chỉ khóa theo việc đạt Ấn Chứng vùng liền trước. Sau khi mở, người chơi có thể vào lại bất kỳ vùng đã mở.

## Thiết kế giao diện
- Mục Cốt truyện/Region Journey: 10 thẻ hình theo bố cục 5×2 desktop, 2×N mobile; mỗi thẻ gồm nền pixel riêng có bản quyền hợp lệ, Pokémon đại diện, số Gen/vùng, tên, icon điều kiện/hoàn thành, điểm cao nhất, ấn chứng và thử thách phụ.
- Thẻ hiện tại sáng, thẻ khóa chuyển tối nhưng đọc được tên và điều kiện cụ thể (không nhét văn bản hướng dẫn dài).
- Hoàn thành toàn bộ 9 vùng chính → mở vùng 10 Sky Pillar. Hoàn thành Sky Pillar → hiện nhiệm vụ Rayquaza; đánh bại Rayquaza → xem Chương 10 và teaser hắc hóa.
- Ký Ức chỉ xem lại chương và điều kiện; không được tự trao Ấn Chứng khi đọc lại.
- Hall of Origin không thay thế Sky Pillar: giữ làm **nội dung hậu truyện tùy chọn** sau Chương 10 (chưa triển khai).

## Chống lặp và động lực chơi lại
- Bắt buộc: mỗi vùng một lần vô địch Champion để lấy Ấn Chứng. Không bắt buộc 30 phút mỗi vùng hoặc 3 nhiệm vụ hoàn hảo.
- Tùy chọn: mỗi vùng hai mục tiêu phụ (ví dụ thắng không chết, không dùng Berry, thắng bằng Pokémon thuộc Gen tương ứng), hoàn thành lần đầu được thưởng tiền/vé/mảnh Rank mức cân bằng. Không dùng thưởng có thể farm vô hạn từ chạy đi chạy lại.
- Replay khó hơn theo luật môi trường và AI, không tăng HP/sát thương thô quá lớn; chọn Pokemon không khóa chỉ theo Gen, Gen gợi ý cho thành tựu phụ.
- Thể hiện thưởng một lần, best clear, Crown Seal ✓ và 3 mốc thành tựu cụ thể. Không làm mất tiến độ vì thoát trận hoặc thiết bị đóng.

## Bảo vệ save, migration, QA
- Nguồn tiến độ chuẩn: `save.arenas.pkmChampion.seals` cho đúng 10 keys **Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos, Alola, Galar, Paldea, Votri Valley**. Giá trị `Votri Valley` chỉ hiện tên 'Tháp Thiên Không', không đổi key.
- UI có thể lấy tiến độ từ 10 key này; save cũ đạt 8/10 hoặc 10/10 được phản ánh nguyên vẹn, không chạy lại.
- Nếu thêm secondary objectives, dùng namespace versioned riêng và merge tăng dần, không đụng `owned`, `pkmsvvBox`, Mega, Berry, `pkmsvvChapter*` hoặc `arenas`.
- Phải thử QA trên Web/PC/Android: cũ 0/10, 1/10, 9/10, 10/10; unlock theo thứ tự; Champion win/loss/rematch; crash/reconnect; save export/reimport; Chapter 10 Rayquaza; no double reward.
- Nhánh QA trước, không deploy/bản chính cho đến khi thực sự chơi được.

## Phân kỳ thực hiện
1. Region cards 5×2 với artwork/biome đại diện, phân biệt mở/khóa/đã thắng, tiến độ 0/10, nút chơi trực tiếp, vào lại.
2. Sửa storytelling/Map độc đáo và nhiệm vụ phụ cho từng vùng, UI thưởng một lần; giữ luật 16 đấu và 10 Crown Seals.
3. QA save và final Sky Pillar → Rayquaza → Chương 10, rồi mới triển khai hậu truyện Hall of Origin.


## Quy tắc môi trường — chốt hướng thiết kế 2026-11-06

**Mong muốn:** Các Region = từng map độc lập và cố định trong cả một lượt; Chương 10 = chế độ bản đồ chuyển cảnh theo pha. Giữ Survival tự do như cũ. Đây là thiết kế, không phải thay đổi đã cài đặt.

- Kanto → Paldea (9 Region) và Tháp Thiên Không (Region 10) có *biome identity* cố định trong toàn bộ một tournament: farm chuẩn bị, countdown, trận Champion, chuyển vòng. Có thể thay trời sáng/tối, gió/mưa, hiệu ứng theo sự kiện trong trận nhưng **không đổi sang địa hình Region khác**.
- Cần sửa mã `src/pkmsvv-champion-arena.js`: hiện `launch()` và `nextDuel()` gọi `G.World.setBiome(G.Tiles.arenaBiome(duelType), true)`, nhưng `beginPrep()` lại gọi `G.World.setArena(null); G.World.setBiome(0,true)`; đây là nguồn làm giai đoạn chuẩn bị quay về nền mặc định. Thiết kế mới cần khóa biome suốt cả vùng; khi thoát giải mới khôi phục thế giới tự do.
- Giữ thứ tự mở khóa bằng Crown Seals đã có (9 vùng + Sky Pillar): một lần đánh bại Champion vùng mới cấp một Ấn Chứng. 10/10 mới vào Rayquaza và Chương 10.
- **Chương 10 / Bầu Trời Hắc Hóa**: chế độ biến đổi đa biome có nhịp theo pha (ví dụ 0–25% rừng, 25–50% băng, 50–75% dung nham, 75–100% bầu trời tối). Các mốc là mục tiêu thiết kế, chưa phải timing cân bằng chính thức. Tránh chuyển địa hình dồn dập; cho cảnh báo trước 3–5 giây, hiệu ứng chuyển tiếp, không spawn tường/vực ngay dưới người chơi hay làm hỏng AI/pathfinding. Rayquaza vẫn là boss cuối sau đủ 10 Ấn Chứng.
- **Chế độ Sống Sót thường**: không thay nguồn World biome gốc, không đổi điều kiện tiến hóa địa hình, không áp đặt khu vực cố định từ Region. Co-op/Tranh Trứng/Berry giữ hành vi map hiện hành ngoài những cập nhật đã được duyệt.
- Đề xuất cho Chương 10 một mode story riêng/hook có phạm vi điều kiện rõ, chỉ kích hoạt khi thỏa Chapter 10; không globally patch `G.World.setBiome`, tránh làm hỏng Arena, Berry, Judgment, weather, save.
- Cần thử thách QA: mỗi Region đi qua prep → countdown → duel → prep → Champion với cùng theme; chơi lại/thoát khôi phục map bình thường; Chương 10 chuyển pha không teleport, không reset mob, không phá nhạc hay multiplayer; save cũ 0/10, 9/10, 10/10.


## Đợt thực thi Region — 06/11/2026 (nhánh QA cách ly)

**Đã đưa vào mã nguồn** `src/pkmsvv-champion-arena.js`:
- Wild mob trong giai đoạn chuẩn bị giải Champion lấy Dex từ **Gen của Region** (Kanto → Paldea, 9 Gen), thay vì bị trộn từ tất cả Gen. Sử dụng danh sách 12+ loài hợp lệ mỗi vùng; giữ chỉ số tier gốc, loot và AI chiến đấu. Hai prep boss dùng species cùng vùng, nhận hệ số khó của vùng.
- **Tháp Thiên Không**: ngoại lệ cuối game tập hợp 12 Pokémon có hệ Rồng từ nhiều Gen, không cho Rayquaza làm mob thường. Trận boss Rayquaza vẫn riêng sau 10 Ấn Chứng.
- Dùng một biome theo Region xuyên suốt các giai đoạn farm, countdown và duel, chặn vòng đổi biome toàn thế giới trong phiên Champion. Khi rời đấu trường, trả lại biome ban đầu.
- Mức tăng farm từ Kanto đến Sky Pillar: mật độ ×1,00→×1,225 *trên hệ số farm Arena ×2 sẵn có*, HP ×1,00→×1,405, sát thương ×1,00→×1,207, tốc độ ×1,00→×1,072. Arena Champion vẫn giữ riêng bảng `REGION_BALANCE` và luật Mega ở 50% HP. Không dùng kiểu ×3/×9 trong ảnh tham khảo.
- Postgame League khi người chơi chọn lại vùng cũng dùng đúng nhóm Gen, thay vì mặc định Kanto; chơi tự do không bắt buộc dùng Pokemon cùng Gen.
- Chặn các sự kiện môi trường tạo quái ngẫu nhiên ngoài Region **chỉ trong phiên Champion**. Survival/Co-op/Egg Rush/Berry không bị thay đổi nhạc, map hoặc danh sách mob.
- Giao diện Region hiển thị Gen và độ khó 1/5→5/5, Tháp Thiên Không ghi Rồng/Đa thế hệ. Có kiểm thử `tests/region-story-map.test.cjs` về danh sách Gen, spawn, cố định biome, phục hồi khi thoát, giới hạn tăng độ khó và save. Test đã nối vào `npm run test:web` và lệnh kiểm tra Champion.

**Chưa hoàn tất:** artwork riêng của 10 Region (hiện dùng engine biome gốc), QA trực tiếp trên game PC/Android/Web với save 558 cá thể, xác nhận tất cả nguồn quái như các sự kiện mở rộng, cân bằng cảm giác trận 10–15 phút, và triển khai Chương 10 biến đổi bản đồ. Chưa đưa vào nhánh phát hành hay sửa save cũ.
