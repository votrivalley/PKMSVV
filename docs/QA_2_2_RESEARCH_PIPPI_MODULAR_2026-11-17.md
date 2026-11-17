# Pokémon Chuyển Sinh QA 2.2 — Phòng nghiên cứu modular, hóa thạch, Pippi và Co-op

Ngày 17/11/2026. Nhánh **fix/pippi-follow-menu-qa-20261115**. Không chạm Web production.

## 1. Pippi trong Khám phá

- Hội thoại dài có portrait và nút **Tiếp theo / Xong rồi** (Explore, chest, item đầu tiên, fossil) chỉ mở khi game **đã thực sự pause** qua state native `pause`.
- Nếu không pause được, không phủ modal lên gameplay đang đánh nhau.
- Timer, spawn, di chuyển, đòn đánh do engine tự ngừng khi game state pause; không thay hitbox hay chỉ số.
- Trả trạng thái `playing` chỉ khi vẫn cùng Pokémon, cùng vùng Khám phá và state vẫn do thoại đang giữ; không tự unpause trận online/Arena/BR hay state pause khác.
- Thoại ngắn / emote cà khịa không mở modal, không pause.
- Rương, item, hóa thạch được xếp hàng **sau** popup chọn vật phẩm, không đè UI.
- Khung giới thiệu 4 trang **Phòng nghiên cứu Hoàng gia Pippi** xuất hiện ngay lúc vào phòng lần đầu. Save cờ hoàn tất chỉ khi bấm Next ở trang cuối.

## 2. Phòng nghiên cứu — bản khôi phục mỹ thuật gốc QA 2.2.1

- **Bối cảnh chính luôn là ảnh WebP gốc 960×672** `assets/coop-lab/room_art_qa_v2.webp`: giữ lại màu teal, đèn, sàn, máy, tủ và chi tiết pixel-art như bản đẹp mà người dùng đã duyệt.
- `room_empty_modular.svg` chỉ là nguyên mẫu hình học thô và **không còn là nền hiển thị mặc định**, kể cả trong màn Xây dựng. Đã ẩn nút đưa người chơi về cảnh nháp xấu.
- Tranh gốc là một lớp đã gộp vật thể. `scripts/extract-research-layers.cjs` bắt đầu tạo **9 PNG alpha từ pixel thật của WebP gốc** (máy trung tâm, kệ trái, bàn phải, vườn Berry, bệ bạn đồng hành, khay hóa thạch, màn hình phụ và hai bảng treo). Các file này nằm tại `images/coop-lab/source-cutouts-qa/` khi build. **Chưa được coi là nội thất đã tách hoàn chỉnh** vì còn phải tái tạo tường/sàn sau vật thể và QA cạnh alpha.
- Giữ tám slot theo `data/pkmsvv-coop-lab-catalog.json`; bệ tượng vàng căn lại đúng vị trí bệ đá cuối bên phải, ở `x=250,y=124,w=29,h=47` trên hệ tọa độ 320×224.
- **Chỉ món có asset riêng và `sceneSwapReady=true` mới được mua/trang bị thật.** Ngoài máy mặc định, hiện chỉ có Tượng Vàng Pippi phù hợp kiểu thêm lên bệ trống. Các món dính trong bối cảnh gốc như kệ Kabuto, bàn máy tính bị chặn trừ xu cho tới khi lớp nền hoàn chỉnh.
- Tượng Vàng Giáo sư Pippi: giá **9.999 Xu Đồng Đội**, chỉ là trang trí, không buff, không có tỷ lệ rơi ngẫu nhiên, chưa thể mua trên QA vì nhiệm vụ Co-op chưa mở.
- Hệ thống mua/trang bị vẫn có rollback save và các bài test giao dịch; không tự cộng xu hay mở khóa qua nút xem trước.
- Bấm trực tiếp vào các khu máy gốc để vào Hỗ trợ / Mega / Berry / Bạn đồng hành / Phục nguyên. Icon pixel-art chỉ là điểm nhấn nhỏ, nhãn chữ gọn.

## 3. Hóa thạch và Nhà khảo cổ vĩ đại

- **15 loài Pokémon gốc** hồi sinh trực tiếp từ hóa thạch (4 loài Galar cần kết hợp 2 nguyên liệu) + **10 loài tiến hóa** = **25 Pokémon** cần sưu tầm. Thuật ngữ "15 công thức" bị bỏ khỏi giao diện vì gây hiểu nhầm là còn thiếu loài.
- Khám phá: phá đá mới có xác suất; Gen 1/3/4/5/6/8 theo danh mục; 2%, 4%, 6% tùy hệ; Dome Fossil bảo đảm trên viên đá đầu tiên sau 15 phút chỉ một lần.
- Khi chưa phát hiện: chỉ hiển thị bóng đen của **viên hóa thạch**, không lộ loài Pokémon. Khi đã tìm thấy hiển thị đá có màu, khi đã hồi sinh mới hiển thị Pokémon.
- **Nhà khảo cổ vĩ đại**: bảng vàng chỉ hiển thị số Pokémon đã sưu tầm trên tổng 25; dòng phụ nói rõ 15 loài gốc và 10 dạng tiến hóa. Logic thành tựu vẫn yêu cầu đủ 15 lần phục nguyên các loài gốc và sở hữu 25 loài.
- Tài nguyên đã đào được ghi trong `pkmsvvFossils.discovered` và không trở lại bóng đen sau khi tiêu hết.

## 4. Xu Đồng Đội và Co-op

- Đồng Xu Co-op dùng chung trong `pkmsvvCoopLab.coopCoins`, không tạo ví riêng cho nhiệm vụ hóa thạch.
- Quy đổi thử nghiệm: 100 Xu Đồng Đội → 250 PokéCoins, tối đa 2.000 PokéCoins/tuần (timezone Asia/Ho_Chi_Minh), rollback nếu save lỗi.
- Kho Hậu Cần Pippi chia 3 nhóm: dụng cụ nhiệm vụ; ngoại hình bạn đồng hành; nội thất phòng nghiên cứu.
- Đã thêm thẻ **Khai quật hóa thạch** vào lựa chọn Co-op (nhóm “Nhiệm vụ hợp tác” cùng Giải cứu Berry), có mô tả 1–4 người / solo AI dự kiến / 6–8 phút và khóa chơi đúng sự thật.
- **CHƯA CÓ** bộ điều phối trận Co-op 6–8 phút chơi thật, hệ thống mục tiêu và xác minh kết quả trên native host/AI. **Không** được cấp tiền, Kabuto, mở máy hay bán vật phẩm tiêu hao qua thẻ chỉ xem trước.
- Trong core đã có `settle` với receipt hợp lệ để về sau hỗ trợ phần thưởng lần đầu: mở máy vĩnh viễn, phục nguyên Kabuto không mất Dome Fossil; nhưng hàm `settle` **không xuất ra browser** để ngăn cấp thưởng khi chưa có nhiệm vụ.

## 5. Kiểm thử, triển khai và việc còn lại

- Unit tests: `tests/pippi-guide.test.cjs`, `tests/fossil-system.test.cjs`, `tests/coop-lab-core.test.cjs`, `tests/coop-lab-art-assets.test.cjs`, `tests/coop-lab-art-direction.test.cjs`, `tests/research-source-extraction.test.cjs`.
- Chromium smoke `tests/pippi-web-browser.cjs` khi `PKMSVV_PIPPI_UI_ONLY=1`: kiểm tra nội thất, intro Pippi trong Lab, hệ thống Co-op mode thẻ mới, không đụng save.
- Workflow `.github/workflows/preview-research-ui-qa.yml` chỉ triển khai branch **research-ui-qa** của Cloudflare Pages sau kiểm thử và so sánh build-info exact SHA.
- URL: https://research-ui-qa.pkmsvv-web.pages.dev/ai/game/ . Không được tuyên bố QA mới đã phát hành cho đến khi CI có kết quả **Success** và verify đúng commit.
- Việc tiếp theo: phục dựng các pixel tường/sàn bị che trong tranh gốc, kiểm thử rìa alpha và đóng gói cutout có thể tháo lắp; tạo art đồng nhất cho furniture khác; tích hợp thử nhiệm vụ native Co-op/AI và receipt validator; QA controller và mobile; sau đó mới cân nhắc lên production.
