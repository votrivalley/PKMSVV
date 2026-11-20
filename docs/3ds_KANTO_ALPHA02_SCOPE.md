# PKMSVV 3DS Kanto Alpha 02 — giới hạn và QA

Bản 3DS của PR #28 (Alpha 01) **không phải game PKMSVV đầy đủ**. Nó chỉ đổi nhãn và lọc phần danh sách quái random đầu trận; các đường sự kiện còn lấy Pokémon từ Gen khác. Các màn chính, map và phần lớn text là bản gốc.

## Những gì Alpha 02 thực sự sửa
- Kanto Normal Solo: chặn **trực tiếp tại hàm `enemy_spawn`** mọi quái ngoài Gen 1 (kể cả triệu hồi và sự kiện).
- NPC/Pokémon đi lạc: chọn Gen 1, không dựa vào `enemy_spawn`.
- Meowth sự kiện thay cho Gholdengo (ngoài Gen1).
- Tắt riêng trong Kanto các chuỗi scripted rift / Eternatus / Arceus chưa được port.
- Thử nghiệm mốc boss Dragonite ở 15 phút, Mewtwo ở 30 phút. Không có trận boss cốt truyện/AI riêng PKMSVV; chỉ dùng native boss AI có sẵn.
- Màn Kanto dùng một biome nền hiện có, không nhảy giữa các biome của game gốc; **bản đồ Kanto PKMSVV chính thức chưa port**.
- Việt hóa pass đầu các nhãn menu, chọn Pokémon, chọn chế độ, chỉ số và thông báo quái. **Nhiều màn/phần mô tả khác vẫn còn tiếng Tây Ban Nha**.
- Title ID giữ `000400000F5B1400`, save tách riêng `sd:/3ds/pkmsvv-kanto01/`, không dùng save gốc.

## Điều KHÔNG được nhận là xong
- 10 chương và hệ thống chọn map theo Gen của PKMSVV.
- Map Kanto, Tháp Thiên Không/Rayquaza, Phòng nghiên cứu, Pippi, Rotom/fossil, Berry.
- Mega, Fusion, Arena, Co-op theo luật PKMSVV, PokéBox/Pokédex/Gacha theo unlock PKMSVV.
- Save Guardian hoặc đọc save Web/Android.
- Việt hóa toàn bộ, QA gameplay 30 phút hoặc New 3DS thật.

## Điều kiện kỹ thuật
1. Patch C++ và build CIA/3DSX phải PASS.
2. `PKMSVV_KANTO_CAST_PASS` (bộ chọn ban đầu), **cũng phải có** `PKMSVV_KANTO_LIVE_PASS` (quái thực sự còn sống), `PKMSVV_KANTO_BOSS_CFG_PASS` (mốc Dragonite/Mewtwo).
3. Chạy Azahar 12 giây và ưu tiên thêm QA tăng tốc thời gian trận 15/30 phút.
4. Thử trên New 3DS, quay màn hình/UI thực tế và xác minh save không ảnh hưởng bản gốc.

**Không merge / không tuyên bố game đầy đủ** khi các mục này chưa hoàn thành. Tiếp tục chuyển đúng code PKMSVV Web sang C++ thay vì chỉ thay tên gốc.
