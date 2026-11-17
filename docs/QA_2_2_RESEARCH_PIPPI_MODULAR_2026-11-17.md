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

## 2. Phòng nghiên cứu 8 slot

- Background rỗng `assets/coop-lab/room_empty_modular.svg` — tường, sàn, đèn, không còn các đồ mua sẵn in chìm trong ảnh.
- Nội thất tách lớp độc lập theo `data/pkmsvv-coop-lab-catalog.json` → `roomArt.slots` (kích thước chuẩn 320 × 224 nhưng render 960 × 672).
- Vị trí: center (máy), shelf_left/right, wall_left/right, garden, desk, trophy.
- Đã có tài nguyên độc lập: `decor/machine_old_modular.svg`, `decor/kabuto_skeleton.png`, `decor/research_terminal.png`, `decor/gold_pippi_statue.svg`.
- Những món còn lại trong catalog chưa có sprite thật **không bán, không trừ xu**, chỉ xem giá và vị trí. Không mua đồ vô hình.
- Mua/trang bị món đã có sprite bằng giao dịch atomic `PKMSVVCoopEconomy.buy/equip`; yêu cầu mở khóa máy sau **một lượt nhiệm vụ Co-op thực sự hợp lệ**.
- **Tượng Vàng Giáo sư Pippi**: 9.999 **Xu Đồng Đội**, slot `trophy` riêng, không buff chỉ số, không còn tỷ lệ rơi ngẫu nhiên.
- Nút “Xem phối cảnh cũ” giữ ảnh phòng trau chuốt `room_art_qa_v2.webp` chỉ để tham khảo, không được coi như vật phẩm đã mua.
- Các máy bấm trực tiếp trên cảnh; dùng sprite sheet icon pixel-art `research-station-icons.png` thay cho SVG placeholder thô; nhãn gọn, có quay lại Lab từ Mega và Hỗ trợ.

## 3. Hóa thạch và Nhà khảo cổ vĩ đại

- **15 công thức** hồi sinh (trong đó 4 Pokémon Galar yêu cầu 2 nguyên liệu) → **25 Pokémon hóa thạch** tính cả 10 dạng tiến hóa.
- Khám phá: phá đá mới có xác suất; Gen 1/3/4/5/6/8 theo danh mục; 2%, 4%, 6% tùy hệ; Dome Fossil bảo đảm trên viên đá đầu tiên sau 15 phút chỉ một lần.
- Khi chưa phát hiện: chỉ hiển thị bóng đen của **viên hóa thạch**, không lộ loài Pokémon. Khi đã tìm thấy hiển thị đá có màu, khi đã hồi sinh mới hiển thị Pokémon.
- **Nhà khảo cổ vĩ đại**: tiến độ thu thập 25/25 Pokémon và 15/15 công thức. 10 dạng tiến hóa không bị nhầm là 10 công thức đá mới.
- Tài nguyên đã đào được ghi trong `pkmsvvFossils.discovered` và không trở lại bóng đen sau khi tiêu hết.

## 4. Xu Đồng Đội và Co-op

- Đồng Xu Co-op dùng chung trong `pkmsvvCoopLab.coopCoins`, không tạo ví riêng cho nhiệm vụ hóa thạch.
- Quy đổi thử nghiệm: 100 Xu Đồng Đội → 250 PokéCoins, tối đa 2.000 PokéCoins/tuần (timezone Asia/Ho_Chi_Minh), rollback nếu save lỗi.
- Kho Hậu Cần Pippi chia 3 nhóm: dụng cụ nhiệm vụ; ngoại hình bạn đồng hành; nội thất phòng nghiên cứu.
- Đã thêm thẻ **Khai quật hóa thạch** vào lựa chọn Co-op (nhóm “Nhiệm vụ hợp tác” cùng Giải cứu Berry), có mô tả 1–4 người / solo AI dự kiến / 6–8 phút và khóa chơi đúng sự thật.
- **CHƯA CÓ** bộ điều phối trận Co-op 6–8 phút chơi thật, hệ thống mục tiêu và xác minh kết quả trên native host/AI. **Không** được cấp tiền, Kabuto, mở máy hay bán vật phẩm tiêu hao qua thẻ chỉ xem trước.
- Trong core đã có `settle` với receipt hợp lệ để về sau hỗ trợ phần thưởng lần đầu: mở máy vĩnh viễn, phục nguyên Kabuto không mất Dome Fossil; nhưng hàm `settle` **không xuất ra browser** để ngăn cấp thưởng khi chưa có nhiệm vụ.

## 5. Kiểm thử, triển khai và việc còn lại

- Unit tests: `tests/pippi-guide.test.cjs`, `tests/fossil-system.test.cjs`, `tests/coop-lab-core.test.cjs`, `tests/coop-lab-art-assets.test.cjs`, `tests/coop-lab-art-direction.test.cjs`.
- Chromium smoke `tests/pippi-web-browser.cjs` khi `PKMSVV_PIPPI_UI_ONLY=1`: kiểm tra nội thất, intro Pippi trong Lab, hệ thống Co-op mode thẻ mới, không đụng save.
- Workflow `.github/workflows/preview-research-ui-qa.yml` chỉ triển khai branch **research-ui-qa** của Cloudflare Pages sau kiểm thử và so sánh build-info exact SHA.
- URL: https://research-ui-qa.pkmsvv-web.pages.dev/ai/game/ . Không được tuyên bố QA mới đã phát hành cho đến khi CI có kết quả **Success** và verify đúng commit.
- Việc tiếp theo: tạo art riêng chất lượng đồng nhất cho các furniture khác; tích hợp thử nhiệm vụ native Co-op/AI và receipt validator; QA controller và mobile; sau đó mới cân nhắc lên production.
