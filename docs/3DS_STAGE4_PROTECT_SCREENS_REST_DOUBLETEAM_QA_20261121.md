# PKMSVV Web/Android/PC — Đợt 4: 5 skill phòng thủ/hỗ trợ từ 3DS

**Ngày:** 21/11/2026. **Nhánh QA:** `feature/web-3ds-skill-effects-passives-qa-20261121`, Draft PR #42. **Chưa merge, chưa deploy Web, chưa build APK/EXE.**

## Mục tiêu

Mang năm chiêu **Protect, Reflect, Light Screen, Rest, Double Team** từ nguồn `juanluismm521/pokesurvivor3ds` tag `v1.0.0` vào source JavaScript dùng chung cho Web/Android/Windows. Đã đối chiếu chính xác bảng C++ được sinh trong `src/gen/gamedata.cpp` qua [GitHub Actions #44927036392](https://github.com/votrivalley/PKMSVV/actions/runs/44927036392).

| Skill | Hệ | Phần tác dụng ở cấp 1 | 4 mốc nâng cấp 3DS |
|---|---|---|---|
| Protect | Normal | Miễn đòn thường 1,5s; hồi 7s, tối thiểu **5s** bất kể giảm cooldown | +25% thời gian, -15% CD, +25% thời gian, -20% CD và +20% thời gian |
| Reflect | Psychic | Giảm 35% sát thương **vật lý**, 8s; hồi 10s | +30% thời gian, +15% sức chắn, -15% CD, +30% thời gian |
| Light Screen | Psychic | Giảm 35% sát thương **đặc biệt**, 8s; hồi 10s | Cùng cây nâng cấp `screen` |
| Rest | Psychic | Hồi **60% HP tối đa**, ngủ 2s, hồi 18s | +15% hồi HP, -15% thời gian ngủ, -15% CD, +20% hồi và -15% thời gian ngủ |
| Double Team | Normal | Tạo 1 phân thân sau lưng, dụ quái thường trong 260px, tồn tại 4s; hồi 8s | +30% thời gian, +1 phân thân, -15% CD, +30% tầm dụ quái |

## Tương tác chiến đấu được triển khai

- **Protect** chỉ chặn sát thương thông thường trong thời gian hiệu lực. Sát thương `pure` (ví dụ đòn phán quyết của Arceus) không bị vô hiệu hóa. Giới hạn hồi chiêu tối thiểu 5s được áp dụng trước khi Pokémon tung chiêu.
- **Reflect** và **Light Screen** sử dụng hai bộ đếm và hệ số giảm sát thương độc lập. Luồng sát thương dựa trên `Player.hurt`, giữ nguyên khả năng né, giáp, Focus Sash, hiệu ứng Pippi và cách nhận sát thương cũ. Enemy projectile ở nguồn Web được gắn loại `special`; đòn tiếp xúc mặc định `physical`. **Cần QA thêm các đòn boss/địa hình khác** trước khi xem là tương đương 100% với bản 3DS.
- **Rest** chỉ dùng khi HP dưới 98%; nếu gần đầy sẽ kiểm tra lại sau 1s, không tiêu hết chu kỳ 18s. Khi ngủ, Pokémon tạm dừng các skill đang AUTO, không đi lại, nhưng quái, giao diện và thời gian trận tiếp tục hoạt động; nhãn “Z” hiển thị định kỳ.
- **Double Team** dùng sprite PMD thực của Pokémon ở vị trí phân thân, hút hành vi truy đuổi của quái thường trong phạm vi, không đơn thuần là hiệu ứng thị giác. Quái boss, Judge và Arceus không mắc bẫy. Thực thể mồi không có HP và không làm mất HP người chơi. Tối đa 6 bản sao đang sống; hết hiệu lực tự mất.
- **Điểm sửa thêm cho đợt 3:** vùng Punch/Cross/Storm giờ được nhận diện trong vòng update/draw field của nguồn chính, để không bị đứng yên trong trận mặc dù test hàm riêng từng PASS.
- Cập nhật hoạt ảnh thành `Charge` và âm thanh buff cho skill trạng thái 3DS. Vẫn giữ 103 skill gốc, ID và Save Guardian; không thay đổi schema lưu trữ.

## Tệp

- `src/pkmsvv-3ds-stage4-moves.js`: 5 định nghĩa/20 nâng cấp
- `src/pkmsvv-3ds-support-stage4.js`: gameplay Protect/Reflect/Light Screen/Rest/Double Team
- `scripts/patch-3ds-support-families.cjs`: cầu nối đúng source `player.js`, `enemy.js`, `combat.js`, `dev.html`
- `tests/3ds-stage4-support.test.cjs`: kiểm tra các cơ chế, giới hạn, dữ liệu native, độ tương thích skill cũ, cấu trúc patch
- `scripts/prepare-game.cjs`: gọi patch sau các đợt 1–3 để giữ chung engine Web/Android/PC

## Tiến độ và rào cản phát hành

Tổng 176 skill theo bảng 3DS và 103 trong PKMSVV trước thay đổi. Có 73 skill thiếu ban đầu; Stage 2 đã đưa 2, Stage 3 đưa 9, Stage 4 đưa 5, tổng **16/73 skill đang nằm ở Draft**, **57 skill còn lại** chưa chuyển. Đã triển khai 9/14 nhóm cơ chế thiếu từ 3DS, còn các nhóm Scissor, Blitz, Leap, Boom, Weather.

Cần build **game PKMSVV đầy đủ trên nguồn Web chính xác** rồi kiểm thử vật lý/đặc biệt theo boss, khả năng hồi Rest khi AUTO, màn hình nhỏ Android, Pippi, FPS trong trận dài, đồng bộ Co-op/Arena và khả năng nạp save. Các skill mới vẫn bị ẩn trong Co-op đang hoạt động. Không dùng artifact mirror QA thay bản Web/Android/PC chính.

**Blocker:** `prepare-game.cjs` ghim `JPTER78/pokesurvivor` ở `11fe868c640b62ac37beacc222e056bc4d9ec892`, hiện runner không có quyền tải đúng revision. Public mirror chỉ phục vụ kỹ thuật riêng, bản build đó không thể xác thực game chính hay save.
