# SUPPORT_CANONICAL_RULES — Pokémon Chuyển sinh v1.5.16

## Nguồn sự thật, không được suy đoán
- Căn cứ code: `src/v15/eggs.js::SPECIES`, `src/web/pkmsvv-egg-rush.js::EGG_SPECIES` và `src/pkmsvv-support-catalog.js`.
- Ảnh catalog do người chơi cung cấp ngày 26/10/2026: đang hiện màu **Riolu, Cleffa, Wynaut, Igglybuff**. Các ô `???` là chưa khám phá; KHÔNG xác định tên bằng silhouette.
- **Danh sách hỗ trợ v1.5.38 (9 loài)**: Pichu #172 (paralyze), Riolu #447 (attack), Cleffa #173 (heal), Wynaut #360 (shield), Bonsly #438 (shield), Togepi #175 (magnet), Igglybuff #174 (slow), Ditto #132 (transform), Mew #151 (AOE). Không chứa Clefairy #035.
- **Clefairy #035 đã bị loại theo yêu cầu chủ dự án (28/10/2026)**; không nở từ trứng và không hiện trong catalog hỗ trợ. Klefki #707 cũng không thuộc roster; không tự thêm loài thay thế. Không ảnh hưởng đến Pokémon chính.
- Mọi thay đổi roster phải xác minh ID Pokédex và cập nhật đồng bộ Solo, Egg Rush, catalog, tests, art/preload, ghi chú bản phát hành; KHÔNG thay species khác nếu người chơi chưa yêu cầu rõ.

## Luật vai trò Pichu (đã chốt ngày 26/10/2026)
- Pichu #172 **khống chế tê liệt**, không gây sát thương trực tiếp bằng đòn support cũ.
- Dùng `Enemy.applyStun` có sẵn: quái ngừng di chuyển và tấn công thật, không dùng `applySlow` giả tê liệt.
- Tầm tìm mục tiêu 240 đơn vị tính từ Pichu; tâm vùng tại quái hợp lệ gần nhất. Bán kính 95 đơn vị; tối đa 4 địch; hiệu lực 1,1 giây, boss/judge/guardian 0,35 giây; hồi chiêu 10 giây; một địch có miễn nhiễm cùng loại 7 giây để chống khóa liên tục.
- Trong Egg Rush, support Pichu chỉ stun AI địch; **không** được áp hiệu ứng tê liệt trực tiếp lên client PvP khác khi chưa có sự kiện kiểm duyệt từ host. Giữ đúng bảo đảm host-authoritative.

## Luật buff theo đội và cân bằng
- Đội nhận buff trong Sống Sót chỉ là **Pokémon chính của người chơi + support nở từ trứng thuộc chính người đó** (tối đa 2 support theo runtime hiện tại); **không** gồm quái, boss, người chơi Co-op khác, đối thủ Tranh Trứng.
- Hồi máu hoặc khiên cast đồng thời trên từng thành viên còn sống, theo % HP tối đa riêng của mỗi người; không buff mục tiêu chết, không vượt HP tối đa.
- Khiên cộng dồn nhưng **trần 25% HP tối đa từng mục tiêu**; khi toàn nhóm đầy/capped không phát hiệu ứng buff hoặc tiêu thụ cooldown dài.
- Tần suất và hiệu ứng cơ bản trước nhân chỉ số hỗ trợ/thân thiết: Cleffa #173 hồi 3,5% mỗi 12s; Wynaut #360 khiên 9% mỗi 19s; Bonsly #438 khiên 5% mỗi 15s.
- Đây là hiệu ứng **trong trận**, không sửa save đội hình hoặc chỉ số vĩnh viễn. Trong Egg Rush, pet chưa có HP thật: buff chỉ có tác dụng trên người sở hữu (và pet khi nào đã có HP thật), không được mô tả là support nhận HP/khiên chưa tồn tại.

## Kiểm thử bắt buộc
- Đối chiếu ID/role trong cả Solo và Egg Rush, quyền mở khóa/ẩn `???` và tùy chọn Shiny.
- Kiểm chứng Pichu ngừng quái thật, tối đa 4 mục tiêu, chống stun-lock, boss bị giảm thời gian khống chế.
- Kiểm chứng hồi máu/khiên theo từng HP riêng, không buff người lạ hoặc đối thủ, không vượt cap, và cooldown 12–19 giây.
- Kiểm tra thực tế Win/Android/Web trước công bố; không tự deploy Firebase hoặc tuyên bố QA PvP 4 trình duyệt nếu chưa thực sự thử.

## Sửa lỗi đội hỗ trợ (26/10/2026)
- Tối đa **2 hỗ trợ ngay từ trận đầu**, không cần xem hay hoàn thành Chương 3, không phụ thuộc flag `pkmsvvEggSlot2`/`pkmsvvEggSlot3`.
- Ổ trứng đầu vẫn xuất hiện theo thời điểm đầu trận; đủ 2 con/2 trứng đang ấp thì không sinh thêm; bạn đồng hành gục mới có ổ thay sau khoảng chờ hiện tại.
- Chương 3 vẫn giữ cốt truyện nhưng không khóa số slot hỗ trợ; save cũ không bị xóa.
