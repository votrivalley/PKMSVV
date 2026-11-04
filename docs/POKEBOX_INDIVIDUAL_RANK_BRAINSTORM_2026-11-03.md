# PKMSVV — Tạm lưu brainstorm Pokédex / PokéBox / cá thể / Rank
Ngày ghi: 2026-11-03 (Asia/Ho_Chi_Minh)
Trạng thái: **ĐANG BRAINSTORM — CHỐT HƯỚNG A+C CHO NGUYÊN LIỆU RANK (ĐÍNH CHÍNH TỪ A+B); CHƯA TRIỂN KHAI**
Cập nhật quyết định: 2026-11-04
Nguồn tham khảo ý tưởng giao diện: ảnh người dùng gửi từ PokéLit (https://pokelit.0d4y.cc/). KHÔNG sao chép asset/mã nguồn PokéLit khi chưa xác minh quyền sử dụng.

> Mục đích của tài liệu: giữ nguyên ý tưởng và những quyết định đang cân nhắc để sửa lỗi khác trước, tiếp tục brainstorm sau. Không thay gameplay, data save, version, APK hay Web production chỉ vì tài liệu này.

## 1. Ý tưởng chính đã trao đổi

- Đổi tên mục **Pokémon** hiện tại thành **Pokédex**: bách khoa tất cả loài, sưu tầm theo Gen, loại, thường/Shiny, hiếm/sử thi/huyền thoại, Mega, dấu ấn, nhiệm vụ khám phá; xem được loài từng có ngay cả khi không còn cá thể trong kho.
- Thêm **PokéBox** để quản lý **những cá thể đang thực sự sở hữu**. Di chuyển phần chọn Pokémon ra trận và nâng cấp Pokémon cá nhân hiện tại sang PokéBox; **nâng cấp toàn tài khoản** vẫn ở phạm vi hiện hành, không tùy tiện chuyển nghĩa.
- Mỗi lần quay **Gacha Pokémon** thành công nhận **một cá thể (instance)** riêng, kể cả khi trúng lại cùng loài. Mỗi cá thể có ID bất biến, Nature, Ability, trạng thái Shiny, Rank, khóa bảo vệ/yêu thích và các nâng cấp riêng nếu được chuyển.
- Tách biệt: **độ hiếm loài/Gacha (1–5 sao)** != **Rank cá thể (0–5)** != **Shiny** != **Mega** != **thân thiết Support**.
- Pokémon cùng loài không bị tự động gom thành một. Cá thể được chọn được đưa vào gameplay; tiến hóa/Mega giữ ID và cá tính cá thể.
- **Chưa code/build** cho đến khi người dùng chốt quy tắc cần xử lý.

## 2. Hệ Rank bằng bản sao (cơ chế người dùng đề xuất)

Cá thể mới mặc định Rank 0. **Người dùng đã đính chính lựa chọn: A + C, KHÔNG PHẢI A + B.** Hai cách nâng Rank cùng tồn tại:

- **A — Bản sao đúng cùng loài (cùng Pokédex dex):** dùng trực tiếp Pokémon trùng làm nguyên liệu nâng Rank cho cá thể chính. Ví dụ Charizard Rank 3 chỉ dùng các Charizard khác, không dùng Charmander hoặc Charmeleon.
- **C — Chuyển Pokémon trùng thành nguyên liệu Rank theo loài:** người chơi có thể chủ động chuyển bản sao Charizard thành điểm/mảnh Rank **Charizard** để trữ gọn kho rồi dùng nâng Charizard sau. Không chuyển Pokémon khác loài hoặc Pokémon trong cùng chuỗi tiến hóa thành nguyên liệu Charizard.
- **B — Cùng chuỗi tiến hóa:** KHÔNG được chọn; đề xuất A+B ở commit trước đã bị hủy. Giữ nguyên quy tắc đúng cùng loài cho cả nguyên liệu trực tiếp và nguyên liệu đã quy đổi.

| Thăng Rank | Bản sao đúng loài **hoặc** đơn vị nguyên liệu loài cần | Tổng đã tiêu thụ |
|---|---:|---:|
| 0 → 1 | 1 | 1 |
| 1 → 2 | 2 | 3 |
| 2 → 3 | 3 | 6 |
| 3 → 4 | 4 | 10 |
| 4 → 5 | 5 | 15 |

**Minh họa đề xuất, chưa chốt tỷ lệ quy đổi:** 1 Charizard dư → 1 mảnh Rank Charizard. Để nâng Charizard Rank 3 → 4 có thể dùng 2 Charizard dư + 2 mảnh Rank Charizard. Vẫn tương đương 15 bản sao + 1 cá thể chính cho Rank 5 nếu tỷ lệ 1:1 được duyệt.

**Nguyên tắc an toàn của A + C:**
- Chuyển thành mảnh/điểm chỉ khi người chơi chủ động chọn và xác nhận; không mặc định tự chuyển khi Gacha hoặc lúc đầy Box.
- Không tự dùng Pokémon đang chọn, được khóa, đánh dấu yêu thích, Shiny, Legendary, đã tăng Rank hoặc đã đầu tư nâng cấp. Nếu muốn đổi luật trường hợp đặc biệt thì cần duyệt riêng.
- Chuyển thành nguyên liệu loài là một giao dịch một chiều nếu không có cơ chế hoàn tác được chốt; cần hiển thị trước số cá thể mất, số mảnh nhận, số mảnh còn và Rank sẽ tăng.
- Pokédex vẫn ghi nhận loài đã từng sở hữu, nhưng PokéBox không còn chứa cá thể đã chuyển; Nature/Ability của cá thể ấy cũng không chuyển theo mảnh.
- Pokémon chính giữ nguyên ID, Nature, Ability, Shiny, nâng cấp và Rank khi tiến hóa; **sau tiến hóa, nguyên liệu để nâng tiếp phải đúng loài hiện tại**. Nếu người chơi còn mảnh của dạng trước tiến hóa thì không tự quy đổi liên loài; cần cảnh báo trước khi tiến hóa.
- Mega chỉ là dạng biến hình, không tạo loài nguyên liệu Rank mới.
- Không đổi tỷ lệ Gacha, pity, vé hay quyền sở hữu Shiny chỉ vì cơ chế này.
- Chi phí/mảnh theo loài, hiển thị, xử lý vật liệu dở dang khi tiến hóa, Legendary, mức buff và PvP **vẫn cần brainstorm trước khi code**.

### Đề xuất cân bằng để tiếp tục bàn, KHÔNG phải luật đã chốt
- Có thể đặt Rank 1–5 tăng vừa phải, tránh Rank 5 phá Arena; kiểm thử ở PvE lẫn Champion.
- Trong Solo PvP, chế độ cạnh tranh có cân bằng chỉ số theo luật riêng; không áp dụng Rank raw để pay-to-win/farm-to-win.
- Legendary khó có 15 bản sao: cân nhắc vật liệu Champion thay một phần, không tự thêm vào gameplay khi chưa duyệt.
- Có thể cho Shiny dùng **bản thường cùng loài** làm nguyên liệu, nhưng không tự hủy Shiny.
- Rank SS nếu có: hậu truyện chương 10, có tính danh dự/hiển thị trước khi bàn đến tăng stat.

## 3. PokéBox và chống đầy túi

- Giao diện các ô Pokémon kiểu PC Box, **30 ô/trang**, có tìm kiếm, lọc (Gen, Shiny, Rank, Nature, Ability, đang chọn, yêu thích, có thể nâng Rank), sắp xếp.
- **Không khóa cứng tổng dung lượng ngay**. Khi trang hết chỗ, tự thêm trang theo nhu cầu trong phạm vi giới hạn lưu trữ thực tế; không cho mất Pokémon khi đầy.
- Bản sao dư có thể quản lý theo nhóm/cùng loài; thao tác đa chọn, gợi ý nguyên liệu hợp lệ hoặc **chủ động chuyển bản sao đúng loài thành mảnh Rank của loài đó** để giảm số ô kho; giữ lại cá thể chính và thú quý.
- Không auto-delete, auto-release hay auto-convert Pokémon không có sự đồng ý. Khi storage gần giới hạn, thông báo và không trừ vé nếu không thể đảm bảo ghi cá thể.
- Tránh tải/re-render toàn bộ hàng nghìn sprite cùng lúc: phân trang/virtualization, lazy sprites, giới hạn phần tử DOM và lưu vị trí cuộn.
- Pokédex vẫn phải gọn như v1.5.92: tìm tên, yêu thích và nút Sắp xếp duy nhất; các bộ lọc trong nút Sắp xếp.

## 4. Nature/Ability theo từng cá thể — hiện trạng đã thấy tại repo

- `src/kecleon/upstream/data/natures.js` có 25 nature; nature thường tăng một stat 10% và giảm một stat 10% (5 trung tính).
- `src/kecleon/upstream/systems/mons.js` hiện chọn Nature/Ability xác định theo **save.created + dex + salt** (theo loài trong tài khoản), lưu thay đổi Mint/Capsule trong `save.pnat[dex]` và `save.pabil[dex]`.
- Muốn mỗi bản Gacha có Nature/Ability riêng thì phải thay tra cứu và sửa Mint/Capsule/TM sang ID **cá thể được chọn**, không đổi hàng loạt những Pokémon cùng loài. Cần xác định rõ TM có thuộc về cá thể hay loài ở lần triển khai.
- Save `owned[dex]`, `shiny[dex]`, `partner` hiện phản ánh sở hữu loài / lựa chọn loài; `save.pupg` và các dữ liệu khác đang có tương thích ngược. **Không phá các cờ unlock hiện có** chỉ để tạo kho.
- Dự kiến dữ liệu tối thiểu instance có `id,dex,natureId,abilitySlot,shiny,rank,locked,favorite`; cân nhắc chỉ lưu khác biệt và hạn chế timestamp lớn. Sử dụng ID cá thể ổn định và không tái sử dụng, kể cả sau tiêu thụ.

### Ví dụ *cấu trúc thảo luận*, không phải schema chính thức
```json
{
  "pkmsvvBoxSchema": 1,
  "pkmsvvBox": [
    {"id": "m1", "dex": 4, "nature": "adamant", "abilitySlot": 0, "shiny": false, "rank": 1, "locked": true},
    {"id": "m2", "dex": 4, "nature": "jolly", "abilitySlot": 1, "shiny": false, "rank": 0}
  ],
  "pkmsvvSelectedInstanceId": "m1"
}
```
Không lấy các giá trị ví dụ làm định mức triển khai.

## 5. Di trú save: tuyệt đối không mất tiến trình

- Bản cũ chỉ ghi sở hữu **theo loài**, không có lịch sử mọi lần quay trùng. Di trú **tạo 1 cá thể đại diện cho mỗi loài đã có**, và giữ quyền sở hữu Shiny đang mở; không tự suy số bản sao trước đây.
- Quyết định cần duyệt: nếu loài đã có Shiny thì tạo thêm một cá thể Shiny riêng hay để cá thể đại diện mang Shiny; yêu cầu không làm mất quyền chọn bản thường/Shiny trước đây.
- Giữ nguyên tiền, vé, pity, dấu ấn, chương, Mega Stone, Berry, Held Items, Arena và nâng cấp cũ; các quá trình chuyển đổi phải **idempotent** (chạy lại không nhân bản).
- Dữ liệu `owned`, `shiny`, `pupg`, `partner` legacy phải tương thích với game core đến khi mọi điểm đọc được chuyển; không xóa trường legacy vội.
- Chỉ thực hiện sau khi tạo JSON backup ngoài ứng dụng và có kiểm thử restore/upgrade cả trên PC, Web, Android.
- Repo có `src/cloudflare/save-guardian.js` chặn nhiều dạng giảm tiến trình và giữ snapshot của `ps.save.*`; cần mở rộng phù hợp để không hiểu **tiêu thụ hợp lệ các bản sao** là rollback, đồng thời vẫn ngăn mất kho vô ý.
- `src/pkmsvv-save-ui.js` giới hạn JSON import 10MB, còn Save Guardian kiểm tra snapshot dưới 8MB; kiểm tra quota localStorage/bản sao snapshot trên từng nền tảng, ưu tiên dung lượng nhỏ, cân nhắc IndexedDB nếu cần. Không tự ý đổi format mà phá restore hiện tại.
- Mọi Gacha x1/x10/x100 phải atomic theo logic game: chỉ tiêu vé nếu cá thể và save đã ghi thành công, xử lý được lỗi quota, mất điện/đóng app khi đang quay, không cho double-spend/duplication.

## 6. Tác động gameplay và UI

- Chọn nhân vật / đổi Pokémon trước trận dùng `pkmsvvSelectedInstanceId` nhưng vẫn tương thích `partner` theo loài khi game engine cần.
- Tiến hóa: chuyển đổi hình thái của đúng cá thể, Rank/Nature/Ability giữ theo quy tắc đã duyệt; xem xét điều kiện nguyên liệu khi loài gốc đổi dạng.
- Mega: là biến hình tạm của cá thể đủ điều kiện, không tạo instance mới; giữ luật mở khóa chương, item, cooldown, AI Mega, champion half-HP đã có.
- Phần 'Nâng cấp Pokémon' cá nhân hiện tại chuyển vào PokéBox; phải thống nhất theo loài hay cá thể trước khi thay `pupg`.
- Support Pokémon tiếp tục có hệ **Thân thiết** riêng. Không vô tình biến tất cả Support thành cá thể trong PokéBox trừ khi người dùng chọn mở rộng.
- Không đổi nhãn 'Pokémon Chuyển Sinh' khi chuyển VI/EN; Pokédex/PokéBox và toàn bộ lời giải thích phải có nhãn song ngữ, không lẫn tiếng Anh vào UI tiếng Việt.
- Cần bố cục PC và Android dọc/ngang, hỗ trợ chuột, cảm ứng và controller; tránh cuộn đôi, cắt card, chặn nút lọc như các lỗi mới sửa.

## 7. Trạng thái các ý tưởng PokéLit khác

- **EV Training**: ý tưởng tương lai; CHƯA duyệt cách tính hay code.
- **Demon Form**: ý tưởng hậu truyện sau Mega Rayquaza hắc hóa, không tự thêm sprite/đổi cốt truyện ở giai đoạn này.
- Chưa tìm được repo nguồn PokéLit được xác nhận. Không sao chép mã hoặc asset từ website khi chưa kiểm tra điều khoản/pháp lý.

## 8. Các quyết định còn mở để brainstorm

1. **Đã đính chính chốt A+C (không B):** dùng bản sao **đúng loài** trực tiếp hoặc chuyển thành nguyên liệu Rank **đúng loài** để cất gọn. **Cần chốt tiếp:** tỷ lệ bản sao → mảnh, dùng hỗn hợp cá thể + mảnh, cơ chế cảnh báo mảnh của dạng trước tiến hóa, có hay không hoàn tác chuyển mảnh.
2. Có cơ chế vật liệu thay thế cho Legendary? Tỷ lệ/cách kiếm?
3. Trường hợp Shiny nên tách cá thể ngay cả khi save cũ chỉ ghi cờ Shiny như thế nào?
4. Nature / Ability / TM / nâng cấp cá nhân (pupg) đi theo *cá thể* hay có phần đi theo *loài*?
5. Rank 1–5 buff chính xác bao nhiêu và cân bằng trong Arena / Co-op / Champion?
6. Khi cá thể bị dùng để nâng Rank, giữ lại dấu vết gì (nhật ký giao dịch, sao lưu, hoàn tác)?
7. Max cá thể theo quota thực tế; cần IndexedDB ngay hay có thể giữ JSON trong localStorage?
8. Gacha mới nhận full instance; khi kho storage không ghi được, UI và hoàn vé thế nào?

## 9. Hướng triển khai sau khi duyệt (chưa thực thi)

- Giai đoạn A — chỉ UI menu, tách Pokédex/PokéBox bằng dữ liệu giả lập hoặc bản đọc save; không mutate save.
- Giai đoạn B — schema instance + migrate legacy có sao lưu, test rollback và idempotency.
- Giai đoạn C — Gacha instance + Nature/Ability từng cá thể; kiểm thử x1/x10/x100 và kho lớn.
- Giai đoạn D — Rank qua duplicate, chống tiêu hủy nhầm, hành vi evolution/Mega và PvP fairness.
- Giai đoạn E — QA trên PC/Android/Web cùng commit, CI và thiết bị thật. **Không publish/merge production trước phê duyệt**.

### Hàng rào an toàn
- Không sửa `main`, `feature/lan-local-beta`, khóa ký, package `com.votrivalley.pkmsvv.fulllan`, versionCode, save người chơi hoặc Cloudflare ở bước ghi chú này.
- Branch này chỉ để giữ các quyết định brainstorm và làm mốc so sánh. Các bugfix gameplay khác nên nằm ở nhánh hotfix riêng theo quy trình bình thường.
