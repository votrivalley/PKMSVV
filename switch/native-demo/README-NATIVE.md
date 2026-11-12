# Pokémon Chuyển Sinh — Switch Native Kanto v0.2.5

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
- **v0.2.3 – Kanto Results:** boss 15 phút phải được hạ trước khi boss 30 phút xuất hiện; khi thắng boss cuối, trận thực sự dừng và hiện tổng kết. Hết HP hiện màn thua thay vì tự hồi sinh vô hạn. **A** chơi lại từ đầu, **+** vào menu. Kanto clears và thời gian tốt nhất của bản native được ghi vào hai bản save dự phòng.
- **QA an toàn:** nếu bật đồng hồ QA x12 dù chỉ một lần trong trận, toàn bộ trận đó là TEST; không cộng huy hiệu, Pokédex, số lần clear hoặc thành tích chính thức, kể cả sau khi tắt x12. Bắt đầu trận mới để trở lại chế độ thường.
- **v0.2.4 – Chiêu mộ + PokéBox native:** mở tab RECRUIT bên cạnh Pokédex. **A** chiêu mộ 1 lượt, **Y** chiêu mộ 10 lượt. Chỉ Pokémon đã đánh bại trong Kanto thường (mở Pokédex) mới nằm trong nguồn chiêu mộ, kể cả huyền thoại. Tỉ lệ 1–5 sao và pity 100 lượt lấy từ bản PKMSVV đã biên dịch; khi một cấp sao không có Pokémon được mở, chỉ các cấp sao đủ điều kiện mới được quay (tỉ lệ có điều kiện). 10 lượt bảo đảm ít nhất một Pokémon 4 sao trở lên nếu đã có Pokémon loại đó trong Pokédex.
- **Vé thử nghiệm Switch:** nhận 1 vé mỗi 30 KO trận thường; hạ boss 15 phút được thêm 2, boss 30 phút thêm 3. Chế độ QA x12 không tạo vé. Đây là **nền kinh tế thử nghiệm của bản native**, không phải số vé/tài sản của bản Web/Android. Bản trùng được giữ làm bản sao trong PokéBox (x2, x3...) để nâng Rank có chủ đích, không tự nâng khi vừa chiêu mộ. Pokémon đã chiêu mộ có thể được chọn ở TEAM hoặc BOX bằng Y (chọn dòng) và A (sử dụng). Các chiêu đầu của Pokémon ngoài starter tạm chọn theo hệ từ 103 chiêu thực, **chưa phải bộ chiêu riêng chuẩn của từng loài**.

- **v0.2.5 – Nâng Rank native:** thêm tab **RANK** ngay sau PokéBox. **Y** chọn Pokémon, **A** nâng Rank ngay nếu đủ bản trùng cùng loài, không mở hộp xác nhận. Chi phí từ bản gốc: Rank 0→1 cần thêm 1 bản, 1→2 cần 2 bản,... 4→5 cần 5 bản. Giữ lại một Pokémon gốc; Shiny không được tính là vật liệu; Pokémon huyền thoại chưa hỗ trợ làm nguyên liệu Rank. Mỗi Rank tăng 6% HP và sát thương PvE, từ Rank 4 giảm 5% hồi chiêu một lần (không cộng dồn). Rank 3 nhánh đặc tính và Rank 5 hybrid vẫn chưa triển khai trọn vẹn.
- **Save v0.2.5:** tự chuyển dữ liệu v0.2.4 sang hai tệp `progress-v025-1/2.json`; bản v0.2.4 và v0.2.3 cũ giữ nguyên cho rollback. Nâng Rank chỉ trừ bản trùng khi ghi và kiểm tra save thành công; nếu thẻ nhớ lỗi thì hoàn nguyên Rank lẫn bản sao.

**Quan trọng:** Chỉ *dữ liệu gốc* và một phần vòng chơi gốc được chuyển ở bước này. **Toàn bộ logic và hình ảnh của 103 hiệu ứng kỹ năng, Rank 3/5 đặc tính, Co-op, Arena, 10 chương và game mode chưa được port 1:1.** NRO không chạy mã HTML/DOM của game gốc. Những loại chiêu chưa có bộ mô phỏng native chuyên biệt vẫn dùng xử lý thuộc nhóm tương đương. Không quảng bá bản này là FULL.

## Cài đặt
1. Trong GitHub Actions tải artifact `PKMSVV-Switch-Native-RankBox-v025`.
2. Giải nén, chép `PKMSVV-Switch-Native-RankBox-v025.nro` vào `sd:/switch/`.
3. Mở HBMenu **full RAM** (giữ R khi mở game hợp lệ) và chạy NRO. Không cần cài Brewser.
4. Giữ bản NRO v0.1.2 trước đó làm phương án ổn định. Hai tệp không cần ghi đè nhau.

## Điều khiển 
- Left Stick/D-pad: di chuyển; các đòn đánh thường tự kích hoạt.
- **L:** bật/tắt sprite Pokémon (mặc định vector).
- **+**: menu TEAM/BOX/**RANK**/POKÉDEX/**RECRUIT**/ORB/FUSION/**CONTROLLER**/INFO. **L/R** chuyển tab, **B** đóng. CONTROLLER hiển thị sơ đồ gán nút Switch mới.
- TEAM: **Y** chọn Pokémon đội hình (starter thử nghiệm hoặc đã sở hữu), **A** vào lại trận. Việc chọn starter thử không cấp Pokémon thật vào PokéBox.
- **RANK:** **Y** chọn Pokémon trong PokéBox; **A** nâng Rank ngay nếu đủ bản sao (không có hộp xác nhận). Màu sáng báo có thể nâng.
- **Khi lên cấp:** **X** chọn kỹ năng 1, **Y** chọn kỹ năng 2, **B** chọn kỹ năng 3 **ngay lập tức, không cần giữ R**. **A** sang trang kế tiếp (mỗi trang 3 kỹ năng, hiện có 2 trang). **Ưu tiên phím của popup**, không kích hoạt Orb/Pause khi chọn.
- **Khi chiến đấu bình thường:** **R+Y** dùng Orb; **R+B** tạm dừng/tiếp tục; X/Y/B nhấn đơn không gọi hành động cũ. Phần đổi này chỉ áp dụng cho **Switch Native**, không đổi gán nút PC/Web/Android.
- **ZL+R**: bật đồng hồ QA x12, giảm sát thương người chơi nhận để thử boss 15/30 phút. Huy hiệu QA không lưu.
- **ZR**: Mega preview trong chế độ QA nếu đủ điều kiện kỹ thuật; không phải quyền sở hữu Mega Stone thật.

## Save
Dữ liệu *Alpha native* lưu độc lập tại `sdmc:/switch/pkmsvv-native-alpha/`, hai tệp xoay vòng và checksum. **v0.2.5** ưu tiên đọc `progress-v025-1/2.json`, nếu chưa có sẽ chuyển tiến trình từ `progress-v024-1/2.json` hoặc `progress-1/2.json`. Sau đó tạo **`progress-v025-1/2.json`**, giữ nguyên save cũ để rollback. Không tự đồng bộ ngược tiến trình đã chiêu mộ khi chạy bản cũ. Không tự nhập hoặc ghi đè save JSON PC/Web/Android. Hãy xuất bản sao save chính trước mọi thử nghiệm.

## Một lượt test
1. Khởi động và chơi **5–10 phút**: kiểm tra không văng, FPS ổn và có thể chọn nhiều chiêu mới từ pool thật. Nếu mở được chiêu mìn, thiên thạch, tháp bắn hoặc vùng xoáy, xem hiệu ứng có tồn tại sau khi thi triển, có gây sát thương đúng lúc và có tự biến mất.
2. Nhấn **L** bật sprite; xem quái Kanto nhiều loài xuất hiện sau mốc 120s, không lọt Pokémon Gen2+.
3. Vào màn **chọn kỹ năng**, kiểm tra **X/Y/B = 1/2/3**, **A = trang 2**, rồi chọn kỹ năng ở trang 2. Xác nhận **Y không dùng Orb** và **B không Pause** khi popup đang mở.
4. Trong menu **RECRUIT**, kiểm tra chỉ Pokémon đã mở Pokédex mới chiêu mộ được; **A** chiêu mộ 1, **Y** chiêu mộ 10 khi đủ vé. Vào BOX xem Pokémon mới và bản trùng, rồi chọn A để đưa ra trận. Quay lại chiến đấu: thử **Y đơn** và **B đơn** (không kích hoạt hành động), sau đó **R+Y** để dùng Orb và **R+B** để Pause/Resume. Vào **+ → CONTROLLER** xem hướng dẫn đúng mapping.
5. Vào **RANK**, thử với loài có ít nhất **2 bản thường**. Nhấn A nâng Rank 1, thấy x2 thành x1, Rank tăng và HP/sát thương tăng ở trận mới. Hãy kiểm tra không thể nâng nếu thiếu bản trùng; không dùng Pokémon loài khác hay Shiny thay thế. Thử Pokémon đã chiêu mộ, kiểm tra TEAM/BOX, hiệu ứng và Pokédex.
6. Nếu muốn test kết thúc Kanto, dùng ZL+R tăng thời gian QA tới boss 15/30 phút; **đánh boss 15 trước**, sau đó boss 30. Thắng boss 30 phải hiện tổng kết, trận dừng. Nhấn **A** để chơi lại. QA không được cộng thành tích thực.
7. Chơi trận thường (không bật QA) và thử mất hết HP để xem màn thua và nút chơi lại. Thoát hẳn, vào lại để thử khôi phục Dex, PokéBox, Rank, vé chiêu mộ, pity và kỷ lục Kanto của save native; nếu báo SAVE FAILED, giữ thẻ/tệp để chẩn đoán.

## Giới hạn kỹ thuật 
CI kiểm được NRO, các kỹ năng có thời gian tồn tại và mô phỏng trận dài trên Node, nhưng không xác nhận FPS hay độ ổn định trên phần cứng Switch thật. Nếu lỗi, báo số phút, hành động ngay trước lỗi và tình trạng bật/tắt sprite. 

Đây là fan-made phi thương mại, không được Nintendo/The Pokémon Company bảo trợ.
