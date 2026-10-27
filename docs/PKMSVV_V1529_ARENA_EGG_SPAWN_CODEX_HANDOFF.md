# PKMSVV v1.5.29 — Đề xuất cân bằng Sống Còn / Tranh Trứng, bàn giao Codex

> **Trạng thái:** APPROVED FOR IMPLEMENTATION SPEC, **chưa triển khai**. Người dùng chấp thuận xây dựng đề xuất và bàn giao, **không yêu cầu build trong bước bàn giao này**.  
> **Repo:** `votrivalley/PKMSVV` · nhánh `feature/lan-local-beta` · baseline khi khảo sát `f9f7ccf` (27/10/2026).  
> **Mục tiêu:** 10 người Sống Còn chơi sôi động từ đầu nhưng không làm Host/Android quá tải; trứng hỗ trợ được phân phối công bằng; tránh người chơi tách quá xa. **Không tự mở 20 người ngay.**

## 0. Những điều đã xác nhận từ source (không coi số đề xuất là số đang chạy)

- **Giới hạn phòng đang chạy:** Co-op Sống Sót 2–4; Sống Còn 2–10; Tranh Trứng 4. Xem `src/shared/coop-unified.js`, `scripts/patch-web-multiplayer.cjs`, `scripts/patch-lan.cjs`.
- `src/web/pkmsvv-royale.js`: người chơi Sống Còn spawn trên vòng tròn tâm (0,0), `radius=Math.max(600,members.length*100)`; hệ số mật độ Royale `intensity(t).density` bắt đầu **0.50** và tăng theo thời gian.
- `src/web/pkmsvv-egg-rush.js` phục vụ **hai cơ chế khác nhau**: `active` = Tranh Trứng tính điểm 12 phút; `supportMode` = trứng hỗ trợ ở Sống Còn và Co-op. Hiện `SPAWN_EVERY=60`, lần đầu t=60s, cứ 60s thêm tối đa 1 tổ, **không có active-nest cap/TTL riêng**. Sống Còn tối đa 2 pet/người, tách khỏi giới hạn trứng chưa nhặt. Vị trí trứng hiện yêu cầu ở ngoài đường chéo camera + 80 so với mọi người (trừ Co-op), không đặt trên vật cản/nước.
- `config/gameplay.json`: `enemies.maxAlive=60`, `density=0.24`; `scripts/prepare-game.cjs` áp dụng giảm spawn còn 2/3 ba phút đầu cho toàn bộ game. `scripts/patch-layout-midgame.cjs` nâng cap dần từ 60 đến 80 sau phút 10. `scripts/patch-web-multiplayer.cjs` còn nhân hệ số Royale ở rate, và `scaleRate(n)=1+0.2*(n-1)`. **Không đổi solo/Co-op**.
- `js/world/world.js` gốc (vendor pinned upstream): bản đồ procedural, chunk 512 world units; dữ liệu chunk có giới hạn 400, ảnh chunk tối đa 48. Phân tán người **không tự kéo dãn canvas/camera**, nhưng có thể tăng CPU cập nhật AI/pathfinding, spawn, mạng và các khu vực hoạt động.
- `src/lan/lan-ai.js` tính đường đi A* có giới hạn 700 lần mở rộng, chạy vòng xử lý AI trên Host. Quái và đồng bộ enemy state cũng do Host gánh.
- Luật thưởng v1.5.28: vé nhặt và Shiny hạ trong Royale/Egg Rush thuộc từng trainer; tuyệt đối không đổi cơ chế sở hữu/phát thưởng hay ghi save khi làm v1.5.29.

## 1. Quyết định phạm vi

1. **P0 — v1.5.29:** vùng hoạt động lành mạnh 10 người Sống Còn + 4 người Tranh Trứng; lịch trứng **hỗ trợ Sống Còn** theo người thiếu hỗ trợ; quái đầu trận Sống Còn đông hơn; instrumentation + test 3 nền tảng.
2. **Không đổi luật Tranh Trứng:** vẫn là đua trứng tính điểm/giờ thắng hiện hành. Không áp lịch 5 trứng/30s lên điểm Tranh Trứng. Có thể thêm cơ chế vùng cố định/anti-runaway cho Tranh Trứng, nhưng lịch tính điểm giữ nguyên.
3. **Không đổi Co-op Sống Sót:** không có vòng bo ép cả nhóm; trứng hỗ trợ, spawn quái và revive như hiện hành trừ khi test tìm ra hồi quy.
4. **P1 — thử nghiệm sau:** 20 người Sống Còn/40 support **chỉ là stress-test và hướng mở rộng**. Chưa đổi roomLimit, UI `2–10`, bảng xếp hạng hoặc release notes thành 20; chỉ mở sau benchmark Android/Host/network.

## 2. Vùng hoạt động (Host authoritative, không cố định kích thước map toàn game)

### Sống Còn 2–10 người — vòng an toàn nhẹ

- Tâm vùng ban đầu từ match seed/lobby, mặc định (0,0) tương thích `startPosition()` hiện tại; bán kính **1.650 world units** từ 0–4 phút.
- Co về **1.200** từ phút 4–8 (tuyến tính), co về **900** từ phút 8–12; sau đó giữ 900, không tự kết thúc trận theo giờ nếu còn nhiều người (luật người cuối sống vẫn giữ).
- Khi còn cách rìa 150 units: chỉ dẫn hướng về tâm, vạch giới hạn chỉ vẽ khi ở gần; khi đi quá rìa: **10 giây ân hạn**, sau đó mất **1% HP tối đa mỗi giây** cho tới khi quay lại, giảm spam FX. Không teleport, không giết ngay khi vô tình ra ngoài. Host xác nhận sát thương, client chỉ hiển thị.
- Spawn Pokémon đầu trận vẫn ở trong vòng. Mục tiêu AI, enemy anchor, Shiny và trứng đều phải chọn tọa độ hợp lệ trong vùng; không tạo spawn ngay trước camera. Nếu không có điểm hợp lệ, retry lần sau, không ép spawn lộ liễu.
- Phải xét các ngoại lệ: người chết, hồi sinh, đẩy lùi/dash, hỗ trợ, host đổi vai, thoát LAN, pause và boss/event arena. Không áp vòng bo vào Rift/Boss arena; không khiến player kẹt trong đá, nước.

### Tranh Trứng 4 người — vùng cố định

- Bán kính đề xuất **1.600 world units**, tâm trận cố định, không co dần; xuất hiện cảnh báo hướng về tâm khi gần rìa.
- Ngăn chạy xa vô tận bằng **soft boundary**: không dịch chuyển giật hình; cản di chuyển **ra ngoài** ở ngưỡng rìa nhưng cho tự do di chuyển **vào trong**. Đồng bộ Host/client để không rubber-band vì lệch tọa độ; tuyệt đối không gây damage bên ngoài.
- Bắt buộc bảo đảm hàm `randomNest()` vẫn tìm được trứng ngoài tầm nhìn của cả 4 người. Nếu vùng quá hẹp, ưu tiên điều chỉnh search hợp lệ / adaptive attempts hơn là đặt trứng ngay trước mặt; có test kịch bản 4 góc map cùng lúc.

### Co-op Sống Sót

- Giữ thế giới tự do. Có thể chỉ hiển thị thông báo khi xa đồng đội quá mức; KHÔNG block, damage hoặc teleport.
- AI Co-op đã có logic quanh Host riêng; không làm tăng tần suất A*.

## 3. Trứng hỗ trợ riêng trong Sống Còn (KHÔNG thay trứng tính điểm của Tranh Trứng)

### Nhịp đề xuất cho 10 người (active humans + AI), quyết định bởi Host

| Thời điểm/điều kiện | Số tổ mới tối đa | Quy tắc |
|---|---:|---|
| 00:30 | 5 | Mở đầu, rải ở các vùng có trainer còn slot support |
| Cứ 45 giây tiếp theo | 2 | Từ 01:15, 02:00... chỉ bù khi còn nhu cầu |
| Trên map chưa nhặt | 6 | **Hard cap active untaken nests**, không tính tổ đã nhặt |
| TTL tổ chưa nhặt | 180 giây | Thu hồi/dọn sạch bằng sự kiện từ Host |
| Slot support | 2 / trainer | **Giữ nguyên**; mỗi trứng nhặt chỉ ghi cho đúng owner |

- `need = sum(max(0,2 - activeOrOwnedPetsByTrainer))` cho mọi trainer trong phòng; đã max support thì không tính nhu cầu, không được nhặt tiếp.
- Mỗi tick `allowNew = min(batchSize, activeNestCap - untakenNests, need - outstandingUntaken)` (không âm); bảo đảm không xuất hiện thêm 5 tổ khi chỉ còn 1 slot.
- Phân vùng ưu tiên trainer thiếu support, nhưng vẫn yêu cầu không xuất hiện trước camera **bất kỳ** trainer nào; round-robin theo deficit để Host, guest và AI có cơ hội như nhau. Không sinh tổ ngay dưới chân hoặc ngoài vòng an toàn.
- `nests` hiện chứa cả tổ đã lấy: cần dọn hoặc bỏ qua `taken` khi đếm cap; giữ ID tăng đơn điệu, chống nhặt đôi và tái dùng ID gây nhân đôi pet. TTL chỉ xóa **chưa nhặt**, không xóa pet đã sở hữu/hatch.
- Khi mọi trainer đã có đủ 2 support, không spawn thêm tổ. Nếu có một người rời/được thay thế, nhu cầu được tính lại mà không tự xóa các pet hợp lệ.
- Kéo lại logic objective/mũi tên để không trỏ về trứng hết hạn hoặc ngoài vùng.
- Không dùng cơ chế ấp 45s / support HP / spawn shiny / vé / Shiny reward làm biến số trong lần thay đổi này.

### Nền tảng mở rộng 20 người — chỉ thử tải P1

- Khi sau này thật sự mở cap: mở màn 10 tổ ở giây 30, sau đó 4 tổ/45s, active untaken cap 10; max 2 support/người (40 support lý thuyết).
- Vùng phải đủ chứa `startPosition` 20 người: vòng spawn hiện có bán kính 2.000 world units khi 20 người; cần thiết kế lại bán kính vùng thử nghiệm (ví dụ 2.600) trước khi bật. KHÔNG lén áp bán kính 1.650 của 10 người lên 20 người.
- Chưa cam kết FPS/mạng của bản 20 người; **không tự bật** trong PR v1.5.29.

## 4. Quái đầu trận Sống Còn (chỉ Royale)

**Lý do:** hệ số 2/3 ba phút đầu * density=0.24 * Royale.intensity(0).density=0.5 * scaleRate(10)=2.8 khiến đầu trận thưa. Đầu 10 người lý thuyết ~0.36 quái/s cho cả phòng, trước giới hạn và các lần spawn fail.

- Chỉ mode `royale`: nhân thêm `openingRoyaleBoost(t)` tuyến tính từ **2.3 tại t=0 xuống 1.0 tại t=180s**; các mode còn lại hoàn toàn không đổi.
- Thêm **tối đa 2 quái mở màn / trainer sống**, **phân bổ quanh từng người** vào những thời điểm đầu (rải 3–12 giây, không spawn chung một frame), tuân thủ `freePoint()`, kiểm tra ngoài tầm nhìn, tránh trứng và vùng bo. Nếu không đặt hợp lệ thì hoãn, không ép.
- Spawn liên tục + đợt surge vẫn tuân cap chung đang có **60 đầu game**, lên đến 80 ở late-game. **Không** nhân trần CAP theo số người khi chưa benchmark; đừng thay boss, XP, damage, Shiny roll hoặc thả vé.
- Vùng spawn quanh player theo **round-robin / ít-quái-lân-cận được ưu tiên**; tránh toàn bộ quái spawn quanh một anchor ngẫu nhiên trong lúc người khác không có quái. Không cho quái spawn trùng vị trí/nằm trong camera.
- Đề xuất dừng boost đúng phút 3 để không có spike; có test sampled t=0,30,60,120,180,181 đảm bảo liên tục (ngoài batch đầu trận), monotonically safe.

## 5. Hiệu năng, multiplayer và kỹ thuật thực thi

- **Không mở rộng hoặc render toàn bộ map**: giữ chunk procedural, giới hạn cache; camera của từng người vẫn là camera riêng. Chỉ mô phỏng các vùng cần thiết và cull draw/network theo khoảng cách.
- **Host authoritative** cho tất cả: vòng an toàn/damage, spawn quái, spawn/despawn tổ, claim support. Guest chỉ gửi yêu cầu / nhận sự kiện; replay/double claim không phát thưởng hai lần; AI không lưu phần thưởng vào save người thật.
- Tránh O(players × eggs × tiles × sprites) vô hạn: giới hạn số lần thử tọa độ, cache các tập con gần player, tránh scan toàn danh sách 20x mỗi frame; TTL cleanup; A* bot không bắt đầu route mới vô tội vạ.
- Vị trí vùng/chỉ thị không che bảng Sống Còn trái (sprite 10 hàng), bảng Tranh Trứng, HP, skill, touch overlay Android; không render nét bo dày lên mọi camera.
- Phải log metrics trong QA: room players/AI, active nests, total pets, active enemies, camera chunks, AI route operations, frame time/FPS, host output bytes/s, dropped frames. Không gọi số 20 người là hỗ trợ chính thức khi chưa đo.
- Định hướng thử tải: 2/4/10 người (host PC, host Android, Web + AI), 10 phút liên tục. Mục tiêu gợi ý **Android host >=30 FPS bền vững**, PC >= 50–60 FPS nếu phần cứng đủ; báo số thật và worst-case, không đánh dấu đạt chỉ dựa test unit.
- Không làm đổi package ID Android `com.votrivalley.pkmsvv.fulllan`, giữ khóa ký phát hành ổn định + versionCode tăng, không dùng DEBUG-TEST-ONLY làm SIGNED-UPDATE. Không xóa/cache bust save; Web PWA không được auto reload khi đang chơi.

## 6. Vị trí mã Codex cần đọc / chỉnh

| File | Công việc |
|---|---|
| `src/web/pkmsvv-royale.js` | Zone state, center/radius/shrink, warnings, authoritative zone penalty; expose helpers validate world point |
| `src/web/pkmsvv-egg-rush.js` | Tách support nest schedule theo Royale khỏi competitive Egg Rush; active cap, TTL, fair allocation, host despawn events; test objective |
| `scripts/patch-web-multiplayer.cjs` | Patch rate/scale riêng Royale và chèn spawn boost/fair anchoring đúng vào vendor runtime |
| `src/lan/lan-ai.js` | AI tôn trọng giới hạn zone, không chạy ra ngoài để đuổi objective và không tăng pathfinding load |
| `src/shared/coop-unified.js` | Giữ nhãn `2–10`, `4 người`, `2–4 người`; chỉ cập nhật mô tả nếu cơ chế zone thể hiện |
| `scripts/patch-v15-egg-rush-web.cjs` và `scripts/patch-lan.cjs` | Đảm bảo patch áp dụng đồng nhất Web, PC, Android và trên cả host/client |
| `tests/lan-ai-modes.test.cjs`, `tests/lan-mode-rules.test.cjs`, `tests/opening-spawns.test.cjs`, `tests/v15-eggs.test.cjs` | Mở rộng kiểm thử, **không sửa test cũ cho xanh bằng cách xóa bảo vệ** |

**Lưu ý:** Upstream vendor thường được clone/patch trong CI. Chỉnh nguồn trong `src/` và `scripts/`, **không chỉ sửa artifact/compiled `vendor/`**. Nếu tên hàm/mốc patch đã đổi so với audit này, đối chiếu code thực và sửa anchor có test drift.

## 7. Tiêu chí chấp nhận (Definition of Done)

- [ ] Sống Còn 10 người bắt đầu trong vùng hợp lệ; vùng thu hẹp theo thời gian; ra ngoài có 10s grace và damage từ Host; Tranh Trứng vùng **không co**; Co-op không bị giới hạn.
- [ ] 10 người Sống Còn thấy 5 tổ từ ~00:30 (khi có chỗ), +2 mỗi 45s theo thiếu support, untaken ≤6, TTL 180s, không spawn vào tầm nhìn, không trỏ mũi tên tới tổ quá hạn.
- [ ] 2/4/10 người và AI nhận đúng trứng hỗ trợ, max 2 pet/người, không nhân đôi tổ khi cùng nhặt; khi tất cả đủ slot thì ngừng sinh.
- [ ] Tranh Trứng **không đổi** 12 phút/score/nhịp trứng tính điểm hay anti-PvP hiện hành, ngoài zone cố định đã nói.
- [ ] Sống Còn đầu trận có quái phân bố đều cho trainer, có boost 2.3→1 trong 180s; cap 60→80 vẫn giữ, solo và Co-op unaffected.
- [ ] Host + guest nhất quán cùng world zone/nests/HP; save, vé, Shiny v1.5.28 giữ nguyên luật từng cá nhân.
- [ ] CI source/build/runtime QA thành công cả Web HTML5, Windows PC và Android. Mỗi artifact same commit + version. Test visual Android HUD đủ không tràn.
- [ ] Stress-test có log và kết luận trung thực; 20 người chỉ trong test riêng; không công bố được hỗ trợ cho đến khi đo đủ.
- [ ] Không ép người dùng Android gỡ bản cũ khi phát hành, ký APK bằng khóa cố định. Sao lưu JSON trước mọi migration bất khả tránh.

## 8. Hướng dẫn Codex thực hiện

**Nhiệm vụ:** Triển khai **P0 v1.5.29** theo tài liệu này tại nhánh `feature/lan-local-beta`. Không thay đổi cấu hình 20 người; không sửa CTF, solo, Co-op. Làm theo thứ tự:

1. Đọc logic hiện tại, xác nhận các anchor patch và báo nếu phát hiện giả định sai.
2. Tách config/logic giữa Royale support eggs và Egg Rush competitive eggs.
3. Triển khai vùng hoạt động; logic Host xác thực trước rồi mới thêm HUD.
4. Triển khai lịch trứng có cap/TTL/fairness; triển khai phân phối quái và boost riêng Royale.
5. Thêm deterministic unit tests và browser/runtime tests cho 2,4,10 người + AI, mobile layouts, late game, reconnect/replay double claim.
6. Kiểm tra performance trên host PC/Android/Web; build cả 3 **từ một commit** sau khi test pass; giữ APK signing rules.
7. Trả về PR hoặc commit, khác biệt gameplay, kết quả kiểm thử, link 3 workflow/artifact, tình trạng SIGNED-UPDATE và mọi hạn chế còn lại.

Không tự ý sửa số liệu/bỏ test để build xanh; nếu spec khiến trứng không thể tìm điểm hợp lệ với 10 camera, giải quyết cơ chế hợp lệ (ví dụ bias sang vành vùng có không gian) trước, ghi rõ trade-off. Đừng quảng cáo 20 người khi chưa có QA.
