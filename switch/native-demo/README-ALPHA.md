# Pokémon Chuyển Sinh – Nintendo Switch Native Alpha v0.1.0

**BẢN ALPHA TEST TỔNG HỢP, KHÔNG PHẢI BẢN GAME PC/ANDROID PORT ĐẦY ĐỦ.**
Đây là gameplay adapter mới bằng nx.js (không Brewser/WebApplet). Dữ liệu vùng Kanto, 6 Orb, 10 công thức Fusion, thông số Mega và quy tắc tiến hóa được sinh từ chính mã PKMSVV khi build.

## Chép vào thẻ
Chép `PKMSVV-Switch-Alpha-v0100.nro` vào `sd:/switch/` và mở trong hbmenu. File `kanto-config.json` bên cạnh chỉ dùng đối chiếu, NRO đã nhúng toàn bộ dữ liệu.

## Tay cầm
- Stick trái / D-pad: di chuyển; auto attack.
- **L**: bật/tắt sprite; mặc định tắt để bảo toàn đường khởi động ổn định.
- **+**: mở menu Native Alpha; trong menu dùng **L/R** chuyển TEAM, BOX, POKÉDEX, ORB, FUSION, INFO.
- Menu TEAM: **Y** chọn bản thử Pokémon tiếp theo, **A** bắt đầu lại trận với Pokémon đó, **B** quay lại.
- Trong trận: **Y** dùng Orb đầu hàng (FIFO, CD 5s); **R+X / R+Y / R+B** chọn một trong ba thẻ nâng cấp; **B** tạm dừng.
- **ZR** kích hoạt Mega ở chế độ preview QA *chỉ khi* đáp ứng điều kiện mô phỏng (Charizard, cấp >=36, đủ 100 năng lượng, đã chủ động bật QA). Không cấp Mega Stone hay sở hữu Mega vào save.
- **ZL+R** bật/tắt đồng hồ QA **x12** để thử nhanh boss 15 và 30 phút. QA cũng giảm 99% sát thương người chơi nhận và tăng 6 lần sát thương gây lên boss để thử đủ trận trong một lượt; huy hiệu thắng boss trong QA **không lưu**. Đây là chế độ TEST, không phản ánh cân bằng game chính thức.

## Những gì chạy được
- Địa hình và mốc đợt quái Kanto từ `src/pkmsvv-quick-region.js`, quái Gen1 có các cấp độ thử nghiệm.
- Auto attack, phát sinh sát thương, lên cấp, tối đa 8 ô kỹ năng thử nghiệm, thêm các hiệu ứng đánh diện rộng.
- Dữ liệu 6 Orb từ `src/v14/orbs.js`: hàng đợi 10, CD 5s; hiệu ứng chính đơn giản (ngủ/chậm/đẩy/tăng tốc). Focus/Luminous hiện là dữ liệu thử nghiệm, **chưa tái tạo camera/chí mạng chuẩn game**.
- 10 công thức Fusion từ `src/pkmsvv-bond-fusion.js`; yêu cầu **hai kỹ năng MAX**, chỉ 1 Fusion/trận. Hiệu ứng chiến đấu của Fusion là bản native đơn giản, không phải 10 hiệu ứng Web đầy đủ.
- Boss thử nghiệm Kanto Dex #150 tại phút 15 và 30. Thắng boss 15 đánh dấu badge nội bộ Alpha; thắng boss 30 đánh dấu hoàn thành trận thử nghiệm. HP và AI boss **không giống boss production**.
- Pokédex: chỉ đánh dấu species đã hạ; PokéBox không tự thêm Pokémon chỉ nhờ hạ hoặc chọn thử.
- Avatar lựa chọn QA Pikachu/Charmander/Bulbasaur/Squirtle. Đây là **trial**, không phải hệ thống gacha/unlock game thật.
- Lưu tiến trình Alpha riêng bằng **hai file có checksum** ở `sdmc:/switch/pkmsvv-native-alpha/`, chỉ lưu khám phá / badge / lựa chọn thử. Không ghi đè save Web/PC/Android.

## Chưa có trong bản này
Engine 103 kỹ năng gốc và hiệu ứng Fusion hoàn chỉnh, hình sprite đa hướng, 10 chương truyện, 10 bản đồ đầy đủ, Mega unlock thật, PokéBox/gacha/rank thật, hỗ trợ/đồng hành, Co-op/LAN, Arena, Tranh Trứng, Berry Rescue, nhạc và cấu trúc save production. Browser engine phụ thuộc DOM/Web APIs và nguồn upstream gốc chưa thể chạy nguyên xi trong nx.js. Không nên thay thế game PC/Android bằng Alpha này.

## Một lượt test tổng hợp
1. Khởi động và đi lại 2 phút, kiểm tra FPS và crash; nhấn **L** để bật nhiều sprite và tiếp tục 5 phút.
2. Thử **Y** dùng Orb, nhặt XP và chọn skill bằng **R + X/Y/B**.
3. Nhấn **+**, duyệt cả 6 tab bằng L/R; chọn starter khác bằng Y/A; kiểm tra Pokédex không tự thêm vào Box.
4. Nhấn **ZL+R** chuyển đồng hồ QA x12; đánh boss 15/30 phút. Muốn test toàn bộ, đợi đến boss 30 phút theo đồng hồ QA (khoảng 2 phút 30 giây thực kể từ mốc 0).
5. Thoát/mở lại NRO, xem Pokédex/Badge còn lưu hay không; nếu báo SAVE FAILED, giữ tệp để điều tra.

Không dùng save gốc cho bản Alpha. Gửi kết quả **mượt / khựng / crash / không thấy sprite / save lỗi** kèm mốc thời gian và đang làm gì.
