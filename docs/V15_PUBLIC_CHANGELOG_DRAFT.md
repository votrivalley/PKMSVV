# Pokémon Sống Sót — Bản cập nhật 1.5 (BẢN NHÁP DUYỆT PUBLIC)
**Không phát hành, không deploy Firebase nếu chưa được duyệt và QA 4 người xong.**

## Chương 3 — Mầm Sống Bị Lãng Quên
Sau khi hoàn thành Chương 2 và sử dụng đủ sáu loại Mystery Orb (tích lũy nhiều trận), khám phá câu chuyện tiếp nối bí ẩn của ký ức và bóng trắng. Có thể xem lại qua Ký Ức. Không thêm giáo sư hoặc bối cảnh con người.

## Trứng và Pokémon đồng hành (chế độ thường)
- Trứng xuất hiện tại các ổ rải rác trên bản đồ. Nhặt xong trứng đi theo người chơi.
- Trứng cần khoảng 45 giây để nở; chiến đấu và tăng cấp giúp ấp nhanh hơn (tối thiểu khoảng 20 giây).
- Theo danh sách **thực tế trong code**: 8 support thường Pichu #172 (tê liệt), Riolu #447 (tấn công), Cleffa #173 và Clefairy #035 (hồi máu), Wynaut #360 và Bonsly #438 (khiên), Togepi #175 (hút vật phẩm), Igglybuff #174 (làm chậm); 2 loài đặc biệt Ditto #132 và Mew #151. Pokémon chưa mở khóa trong ảnh hiển thị `???` nên không thể xác định bằng bóng đen. Klefki #707 **không** nằm trong support code hiện hành; không được tự ý thay số Pokédex hay nhầm Cleffa/Clefairy/Klefki.
- Buff hồi máu và khiên áp dụng cho **người chơi + các đồng hành thuộc người đó**, KHÔNG tính đồng đội người chơi khác trong Sống Sót hay đối thủ trong Tranh Trứng. Pichu gây stun quái thật, không phải giảm tốc.
- Mặc định cùng lúc 2 support có hiệu ứng. Nếu đầy chỗ, người chơi chọn thay một bé.
- Nhiệm vụ **Nhà Ấp Trứng**: nở tổng cộng 20 trứng và từng sống sót đủ 15 phút trong một lượt. Hoàn thành để mở slot thứ 3 vĩnh viễn.
- Trứng/support tạm thời theo lượt, không thay đổi Gacha/Shiny hoặc Pokémon sở hữu.

## Online — Tranh Trứng / Egg Rush (4 người, BETA)
- 4 người xuất phát ngẫu nhiên ở bốn khu vực cách nhau. Có đúng 10 trứng xuất hiện trong 5 đợt × 2.
- Nhặt được 1 trứng là +1 điểm, không cần chờ nở. Người đầu tiên đạt 6 trứng sẽ thắng ngay. Nếu hết trứng hoặc hết 12 phút, người nhặt nhiều trứng nhất thắng; hòa xét người đạt điểm sớm hơn.
- Các trứng theo đuôi rồi nở thành Pokémon con; nhìn thấy toàn đoàn nhưng tối đa 3 bé hoạt động kỹ năng hỗ trợ cùng lúc.
- Có đối kháng qua chiêu và Orb (sát thương PvP giảm, làm chậm ngắn và có chống khóa). Bị hạ không rơi trứng, có hồi sinh giới hạn.
- Bảng xếp hạng realtime góc trái, cực gọn: thứ hạng, sprite Pokémon, tên, số trứng; hiệu ứng đổi hạng. Host xử lý trứng và điểm.
- Tranh Trứng là chế độ riêng: Sống Sót Co-op và Sống Còn giữ nguyên luật.

## Giao diện và điều khiển
- Sảnh một khối, thẻ Pokémon bên trái, giao diện bo tròn teal của Votri Valley.
- Đổi nhãn **Online**, **Xếp hạng**, **Kecleon shop**; bỏ tiêu đề dài Nature/Ability/TM nhưng giữ chi tiết bên trong.
- Nút Discord: https://discord.gg/z36Hb9775K. Có gì mới chuyển xuống dưới, dành vị trí cho sự kiện; Sao lưu Save nằm trong Tùy chọn. Giữ nút Lưu Cloud và Toàn màn hình.
- Điều khiển gọn với hai tab Bàn phím / Tay cầm, lưu và mặc định riêng. Orb trên PC mặc định phím 5; Y / △ trên tay cầm là dùng Orb, không phải chuyển Orb.

## Trước khi public phải xác nhận
- QA 4 người WebRTC, cạnh tranh nhặt cùng trứng, hồi sinh, PvP, mất kết nối, Host rời và kết quả.
- QA ấp trứng và support thực tế trên Windows, Android, Switch, Web; kiểm thử tải lại save cũ, thử full đội.
- Cập nhật text song ngữ, phiên bản app và Có gì mới SAU khi nội dung được duyệt.
- Firebase Hosting + Database Rules được triển khai theo đúng thứ tự và backup dữ liệu.
