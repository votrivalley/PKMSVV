# PKMSVV native 3DS — Alpha 04: Huy hiệu Kanto / boss 15–30 phút

**Căn cứ:** `src/pkmsvv-quick-region.js` của nhánh PKMSVV Web `feature/research-modular-sprites-qa-20261120`.

## Đúng theo Web

- **Kanto dùng biome 0 (đồng cỏ mở đầu) của bản Survival gốc**, theo `targetBiome(0)`. Không có một bộ tile Kanto mới trong mã Web của nhánh đã đối chiếu. Vì vậy đợt này *không tuyên bố port bản đồ độc lập*.
- Vùng Kanto là Gen 1, National Dex và các dạng bản địa theo chính bộ sprite native đã kiểm tra ở Alpha 02–03.
- **Phút 15:** boss có 15% khả năng là Legendary mascot (Mewtwo), 85% là Pokémon rarity=4 (Epic) hợp lệ cùng Gen. Máu cơ bản 28.000, sát thương 24 theo `spawnRegionBoss` trên Web, dùng AI native 3DS hiện có.
- **Huy hiệu Vùng Kanto:** chỉ sau khi nhân vật boss 15 phút thật sự bị đánh bại; không dùng tổng số boss đã giết hoặc chỉ dựa trên việc tới phút thứ 15.
- **Phút 30:** Mewtwo với 62.000 HP / 43 DMG, chỉ xuất hiện nếu đã nhận Huy hiệu và không còn boss 15 phút sống. Hạ Mewtwo mới kết thúc trận.
- **Mở Johto:** Huy hiệu Kanto đủ điều kiện mở Johto trong tiến trình, nhưng bản native hiện chưa port map/logic Johto, nên vẫn khóa nút chơi với thông báo rõ thay vì âm thầm đưa về game gốc.

## Save trên SD

Bản native lưu dấu `KANTO=1` vào **hai file riêng biệt** trong `sd:/3ds/pkmsvv-kanto01/`:
`region-progress-v1.dat` và `region-progress-v1.bak`. Mỗi lượt ghi dùng file tạm, so khớp marker `PKMSVV_REGION_V1` khi tải; đọc bản sao còn nguyên nếu bản kia hỏng. Đây mới là ledger riêng cho Huy hiệu Kanto, **chưa phải** Save Guardian đầy đủ, chưa tương thích save JSON Web/Android.

## QA / giới hạn

- Source patch fail-closed phải áp dụng qua `port_slice04_badge_timeline.py`, rồi native C++ build ra CIA + 3DSX và kiểm tra ID riêng.
- Kiểm thử runtime 12 giây: danh sách và quái thực tế không lọt ngoài Gen 1; lịch boss 900/1800, 15m boss ngẫu nhiên hợp lệ.
- Thử nghiệm giờ tiến nhanh (warp 1800s): nếu chưa hạ boss 15 phút thì boss cuối **không** được spawn.
- **Chưa nghiệm thu phần cứng New 3DS, chưa nghiệm thu đánh trọn 30 phút, chưa đảm bảo ghi SD trên từng thiết bị.**
- Chưa port map 9 vùng sau, Pippi, Phòng nghiên cứu, SaveGuardian JSON, Fusion, Mega và toàn bộ cốt truyện.

Nhánh: `feature/3ds-region-badge-boss-alpha04-20261121`. Chỉ build QA, PR Draft, chưa merge hoặc phát hành công khai.
