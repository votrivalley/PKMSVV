# PKM SVV v1.5 — Mầm Sống Bị Lãng Quên & Tranh Trứng
**Trạng thái:** Đặc tả được người dùng duyệt cho phát triển, KHÔNG tự gắn nhãn đã phát hành.
**Bản chính:** Pokémon Sống Sót; truyện hiện có trong `src/pkmsvv-story.js` là canon, không viết lại Chương 0–2.

## Trình tự cốt truyện
- Chương 0 — Thức Tỉnh: linh hồn mất ký ức, giọng nói bí ẩn, tự chọn tên và hình hài Pokémon.
- Chương 1 — Những Mảnh Ký Ức: các trận sinh tồn lặp lại, tích lũy ký ức, mục tiêu tám kỹ năng.
- Chương 2 — Tiếng Vọng Thứ Tám: học đủ tám kỹ năng, mở Mystery Orb FIFO; bóng trắng nghi Arceus; những kẻ canh giữ ký ức.
- Chương 3 — Mầm Sống Bị Lãng Quên: sau khi ĐÃ XEM Chương 2 và dùng đủ **sáu loại Orb** qua nhiều trận, nghe tiếng nhịp tim dưới đất; các ổ trứng bị bỏ lại giữa quái và vùng đất vỡ vụn; bảo vệ mầm sống là con đường giải phóng ký ức. **Không có giáo sư, phòng thí nghiệm hay nhân vật người mới.** Giữ giọng “Tôi” và “Giọng nói bí ẩn”, bóng trắng là manh mối chưa giải thích.

## Cơ chế trứng (mọi chế độ được hỗ trợ)
- Tạo ổ trứng trên bản đồ, người chơi tiếp cận và nhặt. Trứng đi phía sau, không cần ô trang bị.
- **Từ v1.5.14:** ổ trứng mới cách từng người chơi tối thiểu một đường chéo camera, cộng 80 đơn vị đệm. Solo và host Tranh Trứng kiểm tra khung nhìn/mặt đất; nếu không có chỗ hợp lệ thì hoãn và thử lại, không sinh trứng sát mặt người chơi.
- Ấp khoảng 45 giây thời gian thực; đánh quái/nhặt EXP giúp rút ngắn, không ít hơn 20 giây.
- Sau khi nở, Pokémon con tiếp tục nối đuôi kiểu rắn săn mồi; không cản đường, không che hitbox và cần nội suy vị trí. Trứng chưa nở vẫn đi theo với hình trứng.
- Hệ Pokémon support trong trận tách hoàn toàn Gacha, Shiny, Pokédex, tiến hóa, save sở hữu. Không tự unlock Pokémon vĩnh viễn.
- 8 species đầu: Pichu (#172), Riolu (#447) [công]; Cleffa (#173), Clefairy (#035) [hồi máu — người dùng nói Cleffy/Cleffa, KHÔNG tự thay bằng Klefki nếu chưa được duyệt]; Wynaut (#360), Bonsly (#438) [thủ/khiên]; Togepi (#175), Igglybuff (#174) [hỗ trợ/khống chế].
- Hồi máu, khiên, sát thương và khống chế thật, có cooldown; ko chỉ hiển thị mô tả.
- Solo thường: tối đa 2 support active; sau nhiệm vụ Chương 3 mới tối đa 3. Khi đủ slot, chọn bạn đồng hành để thay (không tự xóa vô cớ).
- Nhiệm vụ **Nhà Ấp Trứng**: sau Chương 3, ấp nở tổng cộng 20 trứng (cộng dồn) VÀ từng có một lượt sống sót từ 15 phút. Hai điều kiện không bắt buộc cùng trận. Hoàn thành mở slot thứ 3 vĩnh viễn cho solo. Trạng thái lưu độc lập, merge Cloud-safe, không phải mua tiền.

## Tranh Trứng / Egg Rush — ONLINE, KHÔNG được bỏ khỏi v1.5
- Chế độ **thứ ba** trong Online bên cạnh Sống Sót Co-op 2–4 và Sống Còn 2–10.
- 4 người; random bốn điểm xuất phát với khoảng cách đến mục tiêu tương đương.
- Chính xác **10 trứng / trận**, theo 5 đợt × 2 ổ; không ra tất cả lúc bắt đầu; tổng trận tối đa 12 phút.
- Nhặt trứng +1 điểm **ngay lúc nhặt**, nở không cộng điểm. Đủ 6 điểm thắng ngay. Hết 10 trứng hoặc 12 phút: ai nhiều điểm nhất thắng, hòa thì người đạt điểm đó trước xếp trước.
- Trứng theo sau rồi nở thành follower. Có thể nhìn thấy cả 10 follower, nhưng tối đa 3 support gây hiệu ứng chiến đấu rõ rệt; con còn lại chỉ hiệu ứng phụ nhẹ/hiển thị, tránh snowball.
- PvP **có đối kháng**: kỹ năng tự động, chủ động và Orb ảnh hưởng đối thủ. Sát thương PvP gợi ý 40% so với đánh quái; làm chậm/khống chế giảm 50%, có miễn nhiễm ngắn chống liên tục. Không rơi trứng và không trừ điểm sau khi bị hạ. Có hồi sinh giới hạn để tiếp tục tranh. Chỉ áp dụng Egg Rush, không phá Co-op/Sống Còn.
- HUD realtime **nhỏ gọn góc trái**: mỗi dòng chỉ `hạng | icon Pokémon | tên | số trứng` (4 dòng), ở trên có `7/10`; dòng đổi hạng trượt nhẹ, nổi bật người chơi hiện tại, **không vẽ một panel lớn che map**.
- Host quyết định spawn trứng, giao quyền nhặt, điểm, kết quả, thời gian, sự kiện PvP; client không tự cộng điểm hay tự tuyên bố thắng. Kiểm tra trứng trùng UID, nhặt cùng lúc, mất kết nối, host rời, hồi sinh và khách tham gia muộn.
- Chỉ Web Online, không tuyên bố đã có WebRTC/đã được QA nếu chưa xác nhận; Windows/Android offline nhận tính năng trứng solo nhưng không quảng cáo Egg Rush Online ở các bản không hỗ trợ.

## UI v1.5 đã duyệt
- Menu chính một khối, phong cách teal/bo góc, Pokémon bên trái, bên phải một dải menu.
- Nhãn `Online`, `Xếp hạng`, `Kecleon shop`.
- Bỏ tiêu đề phụ thừa `Tính cách, Đặc tính & TM` nhưng giữ nội dung.
- Discord `https://discord.gg/z36Hb9775K`; Có gì mới phía dưới khung Pokémon, chừa ô sự kiện cho khi có event.
- Sao lưu Save vào Tùy chọn; **giữ** Lưu Cloud và Toàn màn hình.
- Điều khiển một mục Gán nút hai tab Bàn phím / Tay cầm, lưu riêng và reset riêng; PC/Web có phím Orb, Y tay cầm là sử dụng Orb, không phải chuyển Orb.

## Điều kiện release / trước khi gửi public
- Có code thật + kiểm thử các chức năng trên Windows, Android, Web; Egg Rush online phải test tối thiểu 4 trình duyệt WebRTC thực tế, khớp thứ hạng và end state.
- Kiểm tra save cũ không mất tiến độ Orb/Chapter/achievement; cập nhật changelog song ngữ VI/EN khớp với tính năng thực sự có.
- Đưa log v1.5 cho người dùng duyệt trước khi triển khai Firebase hoặc phát hành công khai.
