# Pokémon Chuyển Sinh — Switch Native Kanto v0.2.2

**NRO nx.js thật; KHÔNG Brewser, KHÔNG WebView, KHÔNG tải game HTML.**
Nền đồ họa của Switch Alpha v0.1.2 được giữ lại. Đây là đợt tích hợp game thật vào native, **chưa phải bản port hoàn toàn**.

## Nguồn dữ liệu thực đã chuyển

- **103 kỹ năng gốc**: ID, tên, loại tấn công, sát thương cơ bản, cooldown, số đòn, bán kính và các cấp nâng được xuất từ `js/data/moves.js` của game PKMSVV đã biên dịch, không nhập tay bản demo.
- **151 Pokémon Kanto**: National Dex #1–151, hệ, chỉ số máu/tốc độ/công/độ hiếm lấy từ `js/data/pokedex.js` trong bản game thật.
- **151 PNG Pokémon** cho Kanto có sẵn offline. Sprite được tải theo nhu cầu và giữ cache có giới hạn; mặc định tắt cho đến khi nhấn L.
- Bảng Kanto, mốc wave/boss, Fusion, Orb, Mega và tiến hóa lấy từ mã PKMSVV tại repo.
- Hệ thống native dùng loại chiêu thật để xác định cơ chế đánh gần/tia/chùm/đạn/lan điện và các hiệu ứng đơn giản; áp dụng một phần nâng cấp gốc lên sát thương, hồi chiêu, diện tích và số mục tiêu.
- **v0.2.2 — cơ chế kỹ năng kéo dài theo thời gian:** mìn đặt trên đất chờ quái dẫm; thiên thạch có thời gian cảnh báo trước khi rơi; tháp bắn tự đánh nhiều nhịp; vùng hào quang/orbit/trail gây sát thương nhiều đợt; xoáy hút quái; stun trì hoãn rồi làm choáng; sóng địa chấn quét theo hướng; tia charge tích tụ rồi phát nổ. Có hiệu ứng vòng cảnh báo/trạng thái tương ứng.
- **Bảo vệ FPS:** giới hạn tối đa 12 vùng kỹ năng cùng lúc, tối đa 6 mục tiêu mỗi vùng mỗi lần kích hoạt, tự dọn khi hết hạn/đổi Pokémon; không tự giảm sát thương hoặc số hitbox thật ngoài các giới hạn minh bạch của bản native adapter.

**Quan trọng:** Chỉ *dữ liệu gốc* được chuyển đầy đủ ở bước này. **Toàn bộ logic và hình ảnh của 103 hiệu ứng kỹ năng, hệ thống nhân vật, co-op, gacha/rank, 10 chương và game mode chưa được port 1:1.** NRO không chạy mã HTML/DOM của game gốc. Những loại chiêu chưa có bộ mô phỏng native chuyên biệt vẫn dùng xử lý thuộc nhóm tương đương. Không quảng bá bản này là FULL.

## Cài đặt
1. Trong GitHub Actions tải artifact `PKMSVV-Switch-Native-SkillZones-v022`.
2. Giải nén, chép `PKMSVV-Switch-Native-SkillZones-v022.nro` vào `sd:/switch/`.
3. Mở HBMenu **full RAM** (giữ R khi mở game hợp lệ) và chạy NRO. Không cần cài Brewser.
4. Giữ bản NRO v0.1.2 trước đó làm phương án ổn định. Hai tệp không cần ghi đè nhau.

## Điều khiển 
- Left Stick/D-pad: di chuyển; các đòn đánh thường tự kích hoạt.
- **L:** bật/tắt sprite Pokémon (mặc định vector).
- **+**: menu TEAM/BOX/POKÉDEX/ORB/FUSION/**CONTROLLER**/INFO. **L/R** chuyển tab, **B** đóng. CONTROLLER hiển thị sơ đồ gán nút Switch mới.
- TEAM: **Y** chọn starter thử nghiệm, **A** vào lại trận. Việc chọn thử không cấp Pokémon thật vào PokéBox.
- **Khi lên cấp:** **X** chọn kỹ năng 1, **Y** chọn kỹ năng 2, **B** chọn kỹ năng 3 **ngay lập tức, không cần giữ R**. **A** sang trang kế tiếp (mỗi trang 3 kỹ năng, hiện có 2 trang). **Ưu tiên phím của popup**, không kích hoạt Orb/Pause khi chọn.
- **Khi chiến đấu bình thường:** **R+Y** dùng Orb; **R+B** tạm dừng/tiếp tục; X/Y/B nhấn đơn không gọi hành động cũ. Phần đổi này chỉ áp dụng cho **Switch Native**, không đổi gán nút PC/Web/Android.
- **ZL+R**: bật đồng hồ QA x12, giảm sát thương người chơi nhận để thử boss 15/30 phút. Huy hiệu QA không lưu.
- **ZR**: Mega preview trong chế độ QA nếu đủ điều kiện kỹ thuật; không phải quyền sở hữu Mega Stone thật.

## Save
Dữ liệu *Alpha native* lưu độc lập tại `sdmc:/switch/pkmsvv-native-alpha/`, hai tệp xoay vòng và checksum. Không tự nhập hoặc ghi đè save JSON PC/Web/Android. Hãy xuất bản sao save chính trước mọi thử nghiệm.

## Một lượt test
1. Khởi động và chơi **5–10 phút**: kiểm tra không văng, FPS ổn và có thể chọn nhiều chiêu mới từ pool thật. Nếu mở được chiêu mìn, thiên thạch, tháp bắn hoặc vùng xoáy, xem hiệu ứng có tồn tại sau khi thi triển, có gây sát thương đúng lúc và có tự biến mất.
2. Nhấn **L** bật sprite; xem quái Kanto nhiều loài xuất hiện sau mốc 120s, không lọt Pokémon Gen2+.
3. Vào màn **chọn kỹ năng**, kiểm tra **X/Y/B = 1/2/3**, **A = trang 2**, rồi chọn kỹ năng ở trang 2. Xác nhận **Y không dùng Orb** và **B không Pause** khi popup đang mở.
4. Quay lại chiến đấu: thử **Y đơn** và **B đơn** (không kích hoạt hành động), sau đó **R+Y** để dùng Orb và **R+B** để Pause/Resume. Vào **+ → CONTROLLER** xem hướng dẫn đúng mapping.
5. Chọn starter khác; kiểm tra kỹ năng, hiệu ứng, menu và Pokédex.
6. Dùng ZL+R tăng thời gian QA để kiểm tra boss 15/30 phút (nếu muốn).
7. Thoát hẳn, mở lại để thử khôi phục Dex. Nếu báo SAVE FAILED, giữ thẻ/tệp để chẩn đoán.

## Giới hạn kỹ thuật 
CI kiểm được NRO, các kỹ năng có thời gian tồn tại và mô phỏng trận dài trên Node, nhưng không xác nhận FPS hay độ ổn định trên phần cứng Switch thật. Nếu lỗi, báo số phút, hành động ngay trước lỗi và tình trạng bật/tắt sprite. 

Đây là fan-made phi thương mại, không được Nintendo/The Pokémon Company bảo trợ.
