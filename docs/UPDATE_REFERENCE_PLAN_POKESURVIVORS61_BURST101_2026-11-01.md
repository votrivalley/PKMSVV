# PKMSVV — Kế hoạch tích hợp ý tưởng từ PokéSurvivors 6.0–6.1 và Survivor Burst 10.0.1–10.1.0

> Soạn ngày 2026-11-01. **Trạng thái: thiết kế/chuẩn bị; chưa triển khai gameplay.**
> Nhánh mục tiêu: `feature/lan-local-beta`. Nền hiện tại: PKMSVV v1.5.61, HTML5/JS đồng nhất PC, Web và Android.
> Bản này **không thay engine**, không nhập nguyên source/sprite/nhạc của dự án tham khảo, không thay đổi quyền sở hữu Pokémon.

## 0. Nguồn đã xác minh và bài học

1. [JayElDragon / PokéSurvivors 6.0–6.1](https://github.com/JayElDragon/poke-survivor/releases): 6.0 tái thiết kế Kecleon, thêm bỏ qua item, item luân phiên, sau hai rương không có item thì rương kế bảo đảm; 6.1 có 12 item shop mới, nâng cấp HUD, bản đồ đánh dấu item/NPC, **Bond đúng hai move**, tối đa một Fusion/run và chọn thay/giữ món đồ mới; lựa chọn level-up/item không hiện giữa Z-Move.
2. [Clessio / Pokémon Survivor Burst 10.0.1](https://clessio.itch.io/pokmon-survivor-burst/devlog/1740728/update): Godot, bản đồ procedural >90 biến thể, HUD/hiệu ứng, thời tiết, khiên, sự kiện mùa Distortion/Halloween, combo điểm.
3. [Clessio / Pokémon Survivor Burst 10.1.0](https://clessio.itch.io/pokmon-survivor-burst/devlog/1741205/update): sửa giao diện Distortion Shop, input, âm thanh và hiển thị. **Không nhầm các tính năng Godot của 10.0.1 thành thay đổi riêng của 10.1.0.**

Phương châm: học cách tổ chức UX/hệ thống, không copy code/artwork khi chưa xác minh quyền sử dụng; KHÔNG tạo bản Godot/ghép source Unity/Godot vào HTML5.

## 1. Kiểm kê SVV hiện tại

| Thành phần | Đã tồn tại | Điểm tích hợp |
| --- | --- | --- |
| `src/kecleon/pkmsvv-kecleon-ui.js` | Shop/Bag/Berry, Mint, Capsule, TM | Thẻ mô tả hiệu ứng, chi tiết/trang bị, lọc/nhóm, sticky action |
| `src/pkmsvv-berry.js` | 10 Berry, kho trong `G.DB.save.pkmsvvBerry`, chọn tối đa 2, countdown 4s, các buff có thời hạn | Tooltip điều kiện kích hoạt, icon hoạt động, kiểm tra chọn/consume đúng một lần |
| `src/pkmsvv-berry-rescue.js` | 3 cây tam giác, 8 phút, boss mốc 4:00/8:00 | Icon mục tiêu, thời gian, tình trạng cây rõ hơn; giữ nguyên luật trận |
| `scripts/patch-double-items.cjs` | Queue item và chống callback nhận thưởng lặp | Mở rộng thành coordinator dùng chung, không xóa logic cũ |
| `scripts/patch-competitive-levelup.cjs` | Các chế độ tranh đấu không khóa mô phỏng chung | Không để Fusion/selection làm đứng đối thủ |
| `scripts/prepare-game.cjs` | Bond/items/upgrades nền PokéSurvivor và các patch SVV | Kiểm tra quyền sở hữu/Bond từng Pokémon trước khi gắn UI |
| `src/pkmsvv-skill-track.js` / `src/pkmsvv-forget-skill.js` | Số ô skill và quên skill có điều kiện | Lọc các slot hợp lệ và reset trạng thái khi quên |
| `docs/CHAPTERS_1_10_SHADOW_BONUS_ROADMAP.md` | Tiến trình Ch1–10 + Shadow Bonus chưa mở | Event mùa không được vượt cửa cốt truyện |

**Phần chưa xác minh trên thiết bị thật:** tương tác chồng overlay, gián đoạn WebView, nối lại LAN, RAM/FPS các thiết bị Android. Chưa kết luận các luồng này “không có lỗi”.

## 2. P0 — ổn định UI và lựa chọn (triển khai trước)

**P0.1 Berry tooltip và HUD**
- Thẻ Berry thể hiện: tên, độ hiếm, loại buff, trigger, tỷ lệ nếu có, thời lượng, giới hạn 1 lần/trận hoặc tác dụng liên tục, khác biệt PvE/PvP (đặc biệt Enigma 8%, 7s/3s).
- Trong trận: góc HUD nhỏ hiện tối đa hai Berry với ba trạng thái `chưa kích hoạt / đang tác dụng + giây còn lại / đã dùng`. Không che Mega, Orb, Joystick hay bảng xếp hạng.
- Popup 4 giây giữ nguyên; có xác nhận và bỏ qua; không tiêu hao khi chưa vào trận hay bị hủy phòng. Đồng hồ auto chọn ở mốc 0, callback tối đa một lần; xem lại trường hợp `choiceOpen` khi Host/Join chuyển màn.

**P0.2 Chống kẹt modal dùng chung**
- Giữ item queue hiện tại, bổ sung điều phối theo thứ tự xử lý khi chồng: kết thúc cinematic/transition an toàn -> nâng cấp cá nhân -> chọn item -> Bond/Fusion (sắp xếp thực tế theo luật game), mỗi loại có `id` duy nhất và `once` guard.
- Không mở mới trên overlay đang tương tác; đưa vào hàng đợi, flush khi overlay trước đóng. Reset queue trên new run/end/disconnect/rematch.
- Phân biệt: Sống Sót Co-op có barrier chung; Tranh Trứng, Sống Còn, Solo Arena, Champion KHÔNG khóa cả phòng. Nếu cá nhân cần chọn, chỉ che/điều khiển chính cá nhân đó; vẫn có cách thoát, không mất thưởng.
- Test nhấp nhanh 2 lần, input giữ gamepad, touch/chuột cùng lúc, nhận 2 rương đồng thời, level-up đang chạy hiệu ứng Mega và boss.

**P0.3 Responsive UI**
- PC landscape: khu item bên trái, các nâng cấp bên phải, ưu tiên góc quan trọng. Android landscape/portrait: chuyển sang panel gập hoặc tabs; CTA bám cuối trang và cuộn được.
- Áp dụng chữ tương phản, icon type, tooltip chạm, Esc/B/Back; không dùng lớp phủ trắng che gameplay; panel tránh safe-area và đảm bảo nút đóng luôn thấy.
- Đo UI ở ít nhất 360×740, 538×669, 844×390, 1280×720.

**Điều kiện hoàn tất P0:** Không mất lựa chọn/tiền/đồ, không duplicate consume; các mode không bị đứng; gamepad và touch chọn được mọi item.

## 3. P1 — trang bị/Kecleon và cân bằng (sau P0)

- **Không thêm túi thứ hai / slot thứ hai ngay**: giữ 1 held item của engine và tối đa 2 Berry pre-run, vì hai hệ thống độc lập.
- Hộp nhặt đồ mới hiện trang bị cũ/mới cạnh nhau, thông số có/không có điều kiện, `Giữ cũ`, `Đổi`, `Bỏ qua`; chọn một lần, kết quả được Host công nhận khi Co-op; đồ không phải Berry.
- Không dùng blacklist vĩnh viễn cho item bỏ trong run. Chỉ đưa `runDiscardedItemIds` vào trạng thái run (không ghi save), có reset ở newRun.
- Có thể lấy ý tưởng `2 rương không item -> rương kế có item` làm **option cân bằng chưa bật mặc định**; cần kiểm tra bản engine hiện tại để không tăng tỷ lệ/mất cân bằng.
- Kecleon: nâng chất lượng thẻ shop/Bag/Berry; bản đồ chỉ dùng marker nếu đã có NPC/trigger thực. Item rơi là khái niệm khác với Mint/Capsule/TM mua vĩnh viễn.
- Chưa chốt 12 món mới: cần bảng dữ liệu từng item (id/tier/description/proc/statStack/exclusions/price/source/translation), cân bằng với `G.GlobalPower`, Mega và buff Berry rồi mới mở bán.

**Save:** tiếp tục dùng `G.DB.save` hiện tại; migration phải additive (chỉ thêm field), không đổi Pokémon ID, không xóa Berry inventory, TM hay ví PokéCoins.

## 4. P2 — Bond/Fusion thử nghiệm (sau P1)

- Phiên bản đầu tiên dùng **đúng hai move một cặp**; một move chỉ thuộc một cặp; tối đa 1 Fusion mỗi Pokémon mỗi run hoặc chỉ 1 Fusion toàn run theo luật engine đã kiểm chứng (chốt một quy tắc sau khi test).
- Fusion chỉ kích hoạt khi cả hai move đã tiến hóa và đạt cấp yêu cầu; không tự fusion với một move thiếu sprite/VFX. Có thông báo khóa/hợp lệ và preview rõ ràng trong bảng skill.
- Pilot 3–5 công thức dùng effect hiện có, không tạo 50 công thức mù; không copy trực tiếp VFX/code từ fan game khác.
- Kiểm thử cả khi support shiny, Mega active, quên kỹ năng, mở thêm slot, reconnect; không cho Fusion vô tình buff teammate của người khác.
- Trước tiên bật solo PvE để QA; PvP/Champion/Co-op AI chỉ bật sau khi xác nhận Host-authoritative stats/cast và cân bằng.

**Gợi ý file mới:** `src/pkmsvv-bond-fusion.js`, `src/pkmsvv-bond-fusion.css`, `tests/bond-fusion-svv.test.cjs`; dùng patcher đăng ký qua `scripts/prepare-game.cjs`, không thay nội dung engine gốc trong repo.

## 5. P3 — sự kiện mùa và biến thể bản đồ (sau P0–P2)

- MVP **1 sự kiện mùa** có start/end UTC rõ, bật bằng config; không can thiệp tiến độ Ch1–10, save cũ hay Shadow Bonus. Phần thưởng thẩm mỹ hoặc đơn vị event riêng nếu được phê duyệt, không nhập vào Arena Points/vé tím.
- Dùng asset riêng được phép sử dụng; nếu có Pokémon skin thì cần animation đủ hướng phù hợp, Shiny không bị ghi đè, và kích thước đúng cơ thể gốc.
- Bản đồ giai đoạn 1: tối đa **3 biến thể cảnh quan** theo seed run, chỉ đổi background/props/hiệu ứng thời tiết; chưa đụng bản đồ collision/đường đi AI. 90 map procedural không phải phạm vi hợp lý cho SVV hiện tại.
- Host phát `seasonId`, `mapSeed`, `weatherState` và runtime event; mọi client PC/Web/Android tái dựng giống nhau; reconnect nhận snapshot, tránh mỗi client tự random.
- Tránh sửa vị trí tam giác 3 cây Berry, vòng đỏ Sống Còn, spawn cách màn hình, vùng chọn Arena và đường đi AI. Nếu event thay đổi gameplay, chỉ áp dụng vào mode được opt-in, không lén đổi stat Solo/Champion.
- 10.1.0 Burst có sửa input: bổ sung test focus/keyup trên mobile, controller B/Back, giữ nút khi menu đóng, resume app.

## 6. Thứ tự patch đề nghị (tách độc lập để rollback)

| Mốc | Phạm vi | File dự kiến | Exit gate |
| --- | --- | --- | --- |
| A | Berry UX + tooltip + HUD buff | `src/pkmsvv-berry.{js,css}`, `tests/berry-ux.test.cjs` | 4s/2 Berry, cancel/timeout, PvP/PvE và save không bị lệch |
| B | Modal queue + mobile/gamepad | `scripts/patch-double-items.cjs`, `scripts/patch-competitive-levelup.cjs`, test runtime | 2 item + levelup + Mega không kẹt hay pause người khác |
| C | Held item + Kecleon visual | `src/kecleon/*`, renderer item hiện có, test shop/gear | giữ/đổi/bỏ chính xác; shop không trừ tiền 2 lần |
| D | Bond/Fusion MVP | module riêng, hook engine, tests | điều kiện đúng, mỗi run đúng giới hạn, AI/co-op không desync |
| E | Event config + 3 map skins | `src/pkmsvv-season*.js`, dữ liệu map, test seeded events | Host/Join đồng nhất; tắt event = gameplay cũ |

## 7. QA và nguyên tắc phát hành

1. Snapshot save JSON cũ; sau migration, ghi/xuất/nhập vẫn nguyên Pokémon, Berry bag, coins, tickets, crown seals, Stone, Arena points và chapter flags. Không tạo currency sai nơi.
2. Trên PC/Web/Android chạy cùng test module; không chỉ dựa vào build xanh: cần browser runtime test, và cuối cùng smoke test Android thật.
3. Co-op phòng 4 người + AI, Sống Còn 10, Tranh Trứng kết thúc 10 quả, Berry 8 phút (boss 4:00/8:00), Champion và Mega; kiểm tra không kẹt khi cùng lúc nhặt item/nâng cấp.
4. Performance: ưu tiên không vượt ngân sách Cloudflare Pages 25MiB; cap FX + low quality; so sánh thời gian khởi động và FPS trước/sau, không sinh nhiều sprite không dùng.
5. APK Android luôn cùng `com.votrivalley.pkmsvv.fulllan`, cùng signing key, versionCode tăng; cài đè không mất save. Chưa có signed artifact đạt QA thì **không quảng bá là phát hành xong**.
6. Tất cả module có feature flag, mặc định tắt tính năng mới chưa QA; rollback không xóa dữ liệu cũ. Không tự đổi tỷ lệ Gacha, Orb, boss hoặc Berry reward nếu chưa chốt.

## 8. Việc cần làm đầu tiên

- [ ] Chạy baseline tests ở commit nhánh hiện tại (PC build đỏ là blocker, không suy ra gameplay đỏ).
- [ ] Phác thảo trạng thái 10 Berry (đang chờ, kích hoạt, hết tác dụng) và bộ tooltip VI/EN.
- [ ] Xác định toàn bộ đường gọi `offerItem`, `showLevelUp`, `scr-bond`, Z-Move/Mega animation và multiplayer hold/unhold.
- [ ] Bổ sung test coordinator chống 2 item cùng lúc và chế độ PvP không ngừng phòng.
- [ ] Xây dữ liệu 3–5 công thức Fusion, chưa bật combat.
- [ ] Chọn chủ đề, lịch UTC và nguồn asset hợp lệ cho sự kiện mùa đầu tiên.
- [ ] Xong P0 và QA mới xét P1→P3.

**Không được diễn giải kế hoạch này là code đã triển khai hoặc bản build đã phát hành.**
