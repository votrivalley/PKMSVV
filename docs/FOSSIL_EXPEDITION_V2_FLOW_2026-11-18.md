# Pokémon Chuyển Sinh — Khai quật hóa thạch v2 (18/11/2026)

## Luật chơi chốt theo yêu cầu

- Phòng **Co-op 2–4 thành viên**; một người chơi thật + 1–3 đồng đội máy vẫn hợp lệ. Web Beta chỉ hỗ trợ AI ngoại tuyến, chưa có ghép người thật WAN.
- Mốc **0:00–4:00**: tìm 3 bãi đào **xa nhau**, mỗi bãi cần đúng **3 lần khai quật**, tổng 9 mảnh. Mỗi bãi có artwork khác nhau và trạng thái nguyên vẹn / nứt vỡ / cạn kiệt. Cấm gom cả ba đá tại máy.
- Đủ 9 mảnh mở nhiệm vụ cứu **Rotom**. Rotom bị **Golurk (boss đề xuất thử nghiệm, chưa chốt chính thức)** khống chế. Boss dùng native Pokémon Enemy/Combat và đòi hỏi người chơi/AI hạ gục; Rotom chống trả yếu và HP suy giảm liên tục trong thời hạn. **Chưa cứu thành công trước 4:00 = thất bại tức thì**.
- Cứu xong phải hộ tống Rotom **đi thực sự trên map** về máy phục nguyên hư hỏng (không dịch chuyển tức thời). Rotom nhập máy; sprite thay thành máy-phục-nguyên-hợp-thể-Rotom.
- **Sau khi Rotom nhập máy**: kẻ địch tới phá máy theo đợt giới hạn + quái tự nhiên, AI chuyển sang bảo vệ phòng thủ; hỏng máy là thua. **Sống tới 8:00 tự động thắng**, không còn nút rút lui từ phút thứ 6.
- Pippi giới thiệu ngắn vui vẻ kiểu Gen Z **lần đầu trước khi vào mỗi chế độ**; lưu trạng thái riêng cho Sống Sót, Sống Còn, Tranh Trứng, Berry, Fossil, Arena Solo/Champion, Khám phá. Không dừng trận Co-op để bật hội thoại.
- Thưởng dự định: thắng đầu mở máy phục nguyên vĩnh viễn + Kabuto; replay Xu Đồng Đội, shop Pippi vàng 9.999 xu. **Thưởng đang tắt trên Beta** cho tới khi kiểm tra full 8 phút, Host/guest và save chống lặp.

## Mã nguồn và artwork

- Bộ luật thuần túy: `src/pkmsvv-fossil-expedition-core.cjs`.
- Adapter Game Co-op: `src/pkmsvv-fossil-expedition-native.js`. Chỉ được ghép khi `PKMSVV_FOSSIL_NATIVE_QA=1`.
- Đường đi AI: `src/lan/lan-ai.js`, hành động `botGoal` / `botInteract` qua native Host.
- Sprite sheet 3×3: `assets/coop-lab/fossil-excavation-atlas.svg`.
- Sprite sheet máy gỉ / máy hợp thể Rotom 2×1: `assets/coop-lab/rotom-restorer-atlas.svg`; local fallback Rotom `assets/coop-lab/rotom-orb.svg`.
- Pippi: `src/pkmsvv-pippi-guide.js`, nối `src/shared/coop-unified.js` và `src/pkmsvv-quick-region.js`.
- Dữ liệu vật phẩm: `data/pkmsvv-coop-lab-catalog.json`, tiêu chuẩn thắng mới 480 giây.
- QA: `tests/fossil-expedition-core.test.cjs`, `tests/lan-ai-modes.test.cjs`, `tests/pippi-guide.test.cjs`, `tests/fossil-expedition-native-browser.cjs`, `tests/fossil-expedition-soak-browser.cjs`.

## Đích phát hành

- Production giữ nguyên: https://pkmsvv-web.pages.dev/
- Chỉ một Beta cố định: https://beta.pkmsvv-web.pages.dev/game/
- Ngăn mọi triển khai Beta nếu CI unit + Chromium smoke + 115-giây soak + remote Cloudflare smoke không PASS.

## Kết quả Web Beta QA 2.5.0

- Workflow: https://github.com/votrivalley/PKMSVV/actions/runs/44158188184 — **Success**.
- Đã deploy và xác minh trực tiếp: https://beta.pkmsvv-web.pages.dev/game/ ; source commit `5fd82251e1bb42be22c0c15020b4b4b289b544cd`.
- Node unit tests 52/52 PASS; bao gồm lần đầu Pippi nói về từng mode, 9 mảnh, Rotom deadline 4 phút, hộ tống, bảo vệ máy và auto thắng phút 8.
- Chromium trên code build và URL Cloudflare PASS: Co-op tạo phòng, ít nhất 1 bot, AI di chuyển thực tế ~439 px trong 11 giây, mine một đá, cả hai atlas load và `spriteReady=true`.
- Soak 115 giây PASS: đồng hồ game tiến ~111,23 giây, maxStalls=0, AI chuyển động, errors=0, consoleErrors=0.
- **Giới hạn:** chưa chạy kiểm thử end-to-end 8 phút thật; các phép thử unit có mô phỏng đồng hồ từng giây nhưng không thay thế chơi trọn trận. Đồng bộ 2+ người thật và thưởng thật vẫn chưa được chứng nhận. Beta giữ phần thưởng tắt. Không triển khai production.
