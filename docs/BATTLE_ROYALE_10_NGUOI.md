# Chế độ Battle Royale – 10 người (đặc tả đề xuất)

> **Trạng thái: đặc tả thiết kế, chưa triển khai gameplay.** Không sửa Co-op 4 người và bản offline đang phát hành. Việc bật Firebase/đăng nhập riêng chưa thay thế cho việc xây dựng chế độ này.

## Mục tiêu

- Giữ **Co-op** hiện có, tối đa **4 người**, luật cùng đánh boss/cùng thắng riêng.
- Thêm mục **Battle Royale: Sinh tồn cuối cùng**, phòng tối đa **10 người thật**.
- Giao diện phòng có sẵn **10 vị trí**, nhưng **không tự tạo 10 tài khoản người chơi** và **không tự thêm bot**. Người tạo phòng có thể bắt đầu khi có **2–10 người sẵn sàng**; tùy chọn yêu cầu đủ 10 người có thể bổ sung sau.
- Người chơi không trực tiếp đánh nhau trong đợt đầu: mọi người cạnh tranh **ai sống lâu hơn trước quái**. PvP gây sát thương giữa người chơi là tính năng khác, cần cân bằng và kiểm thử riêng.

## Luật đấu

1. Mỗi người chọn Pokémon và vào cùng một bản đồ, xuất phát tại các điểm cách nhau vừa đủ để tránh vây quái ngay lập tức.
2. Quái xuất hiện và tăng sức ép theo thời gian (mật độ/đợt/loại quái/boss), **không tăng đơn thuần gấp 10 lần** theo số người: phải có giới hạn tổng số quái và lượng dữ liệu mạng.
3. Mỗi người tự giữ HP, kỹ năng, buff và tiến trình nâng cấp trong trận; cần xác định rõ nguồn XP/đồ nhặt để không đồng bộ lỗi với Co-op hiện có.
4. **HP về 0 = bị loại ngay**: không hồi sinh đồng đội như Co-op. Người bị loại chuyển sang theo dõi trận (spectator) và thấy bảng xếp hạng tạm thời.
5. Khi còn **duy nhất một người sống**, Host xác nhận kết quả: người đó thắng, những người còn lại có thứ hạng theo thời điểm bị loại.
6. Nếu cùng chết trong một lượt xử lý máy chủ, áp dụng quy tắc hòa được xác định rõ. Nếu tất cả mất kết nối, không công nhận kết quả để tránh thắng oan.
7. Nếu Host bị quái hạ, **Host vẫn phải mô phỏng trận trong chế độ khán giả**; Host thoát game/mất mạng cần có quy tắc hủy trận hoặc chuyển Host an toàn trước khi phát hành chính thức.
8. Người đã bị loại không thể quay lại giữa trận. Người mới vào chỉ được tham gia lúc còn ở phòng chờ.

## Giao diện dự kiến

- Menu chính: **Chơi một mình / Co-op (2–4) / Battle Royale (2–10)**.
- Sảnh Royale: 10 ô người chơi; mời bạn, chọn Pokémon, nút **Sẵn sàng**, Host bấm **Bắt đầu**.
- HUD: số người còn sống, đồng hồ sinh tồn, độ khó hiện tại, thông báo người bị loại.
- Kết thúc: **#1 Người sống sót cuối cùng**, thứ hạng #2–#10, thời gian sống, quái hạ, nút chơi lại.
- Mặc định giữ Việt/Anh theo ngôn ngữ chọn trong game.

## Ảnh hưởng mã nguồn đã kiểm tra

- Upstream `js/net/social.js` cố định `MAX_PLAYERS = 4`, cơ chế phòng cần lưu `mode` và dùng giới hạn **4/10** theo mode.
- `js/net/coop.js` chỉ có **4 màu** và thuật toán hồi sinh/cộng tác XP; cần mô-đun trận Royale riêng, không tăng `MAX_PLAYERS` rồi tái sử dụng luật Co-op nguyên xi.
- `js/net/net.js` dùng WebRTC **hình sao qua một Host**, chỉ STUN trực tiếp; không có TURN relay. Trận 10 người đòi hỏi đo băng thông máy Host, tối ưu snapshot và xử lý kết nối thất bại.
- `js/game.js` và `js/systems/spawner.js`: tách cách mô phỏng trận Royale, giới hạn quái theo hiệu năng và tăng theo thời gian.
- Co-op gốc gửi trạng thái khoảng 15 lần/giây cho kết nối trực tiếp; 10 người không được mặc định cùng chất lượng đường truyền hoặc FPS.
- Firebase Realtime Database dùng để tạo phòng và gửi signaling, **không phải máy chủ mô phỏng trận**. Cloud Firestore để tài khoản/save, không dùng lưu frame chiến đấu liên tục.
- Hệ thống 6–8 chiêu tự động, tiến hóa, Kecleon, Nature, Ability, TM của PKMSVV phải kiểm thử trong chế độ 10 người.

## Lộ trình kiểm thử trước phát hành

1. Hoàn tất bản Web Online + Firebase riêng; kiểm thử 2 người Co-op thực tế.
2. Tạo mode Royale + state machine **lobby → countdown → playing → eliminated/spectating → results**; thử 2 người rồi 4.
3. Nâng 6 → 8 → 10 người; đo FPS, lưu lượng, độ trễ, giới hạn quái và tình trạng mất gói.
4. Kiểm thử Host chết nhưng trận vẫn chạy, Host mất kết nối, tất cả chết cùng lúc, tải lại trang, người chơi bỏ trận, danh sách thứ hạng.
5. Chỉ cân nhắc mở rộng công khai sau khi giải quyết quyền nội dung/trademark và các vấn đề bảo mật.

Không thay đổi mục tiêu lưu song song: lựa chọn **local save** hoặc **Google cloud** ngay khi mở game. Chế độ trực tuyến có thể yêu cầu đăng nhập Google ở giai đoạn đầu.
