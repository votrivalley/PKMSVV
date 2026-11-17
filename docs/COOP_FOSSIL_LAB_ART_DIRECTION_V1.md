# ART DIRECTION — Phòng Thí Nghiệm Thất Lạc (Pokémon Chuyển Sinh)

> **Bản chuẩn v1 · 17/11/2026 · Dùng cho đội vẽ sprite và lập trình.**  
> Trạng thái: **đã chốt phong cách và mô tả đủ 11 món; chưa có sprite trang trí chính thức, phòng render 2D hay minigame Co-op để chơi**.  
> Catalog kinh tế/slot duy nhất: [`data/pkmsvv-coop-lab-catalog.json`](../data/pkmsvv-coop-lab-catalog.json). Bản tọa độ và kích cỡ để lập trình: [`data/pkmsvv-coop-lab-art-direction.json`](../data/pkmsvv-coop-lab-art-direction.json).

## 1. Mục tiêu và hình ảnh nhận diện

**Từ khóa:** *Pokémon Mystery Dungeon tinh thần RPG pixel-art + khảo cổ ấm áp + thiết bị phục nguyên cũ mới đan xen + Pippi thích giành công*. Cần trông như cùng một thế giới với game đang chạy, **không phải collage sprite của nhiều game**.

- Sàn đá xanh teal mờ, tường xanh đậm với viền đồng cũ và giấy khảo cổ màu kem; gỗ ấm dùng cho kệ.
- Trục nhìn chính là **máy phục nguyên tại trung tâm**, hai kệ cân đối, 2 tranh trên tường, cây và bàn phụ ở phía trước; tượng hiếm nằm trên bệ riêng phía trước, không che máy.
- Hồng Pippi chỉ làm **điểm nhấn 5–10% diện tích phòng**, trên bảng tên, nhãn và tượng. Tránh phủ hồng phòng.
- **Không** dùng vector mịn, tranh HD, vật thể 3D photorealistic, hiệu ứng neon nhiều lớp, outline lẫn lộn hoặc bóng sáng/phủ kính lấn sprite.
- Đây là **palette đề xuất** xây trên những sắc teal/mint/amber đã thấy ở CSS PC, **không khẳng định là bảng màu nội bộ chính thức của engine**. Các sprite chưa được QA cạnh Pokémon thật.

## 2. Bảng màu giới hạn — 16 swatches

| Vai trò | Màu | Hex |
|---|---|---|
| outline | Vật liệu / bóng | `#0E1D29` |
| darkShadow | Vật liệu / bóng | `#112D3C` |
| deepTeal | Xanh teal | `#1B4354` |
| machineryTeal | Xanh teal | `#235E69` |
| mutedTeal | Xanh teal | `#2D5F63` |
| mintRim | Vật liệu / bóng | `#8ADBC8` |
| glass | Vật liệu / bóng | `#A9DCD7` |
| amberLight | Ánh hổ phách | `#FFE08C` |
| fossilBone | Vật liệu / bóng | `#E8D9AF` |
| agedBrass | Vật liệu / bóng | `#B78B53` |
| warmWood | Vật liệu / bóng | `#805B45` |
| woodHighlight | Vật liệu / bóng | `#AE8668` |
| pippiRose | Hồng Pippi | `#D889AE` |
| pippiLight | Hồng Pippi | `#F3B5CE` |
| fernGreen | Vật liệu / bóng | `#6B9D68` |
| paperLight | Vật liệu / bóng | `#F2F7E7` |

**Quy tắc:** Một món dùng 3 giá trị đổ bóng chính (sáng / cơ bản / tối), viền ngoài **1 pixel** màu `outline` hoặc `darkShadow`, thêm tối đa một highlight kính/kim loại. Dùng hồng của Pippi có kiểm soát, vàng hổ phách để dẫn mắt. Vàng của tượng hiếm lấy cùng `amberLight`, `agedBrass`, `fossilBone`, không dùng vàng chói mới.

## 3. Quy tắc pixel và góc nhìn

- Khung logic phòng **320 × 224 pixel** (lưới 16 px); đây là **bản thiết kế scene mới**, chưa phải kích thước native gameplay đã đo xác thực. Vẽ pixel 1:1, không lọc ảnh, không blur/anti-alias.
- Góc nhìn **top-down 3/4 RPG cố định**: thấy mặt trước và một phần mặt trên máy, bàn, kệ; hai vật thể giống nhau phải dùng cùng một hệ trục, không món isometric 45° và món nhìn thẳng.
- Sáng giả định **trên trái**; cạnh trên-trái sáng hơn; bóng đổ xuống **dưới phải** và không dài quá 2 pixel native với đồ nhỏ.
- Các phiên bản: 320×224 (1×), 640×448 (2×), mobile 360 px: giữ nét bằng nearest-neighbor, letterbox nếu cần. Không kéo căng riêng từng món; nút điều khiển nằm ngoài scene.
- Vật liệu: kính `glass` + 1–2 vệt phản sáng; kim loại `machineryTeal` + `agedBrass`; xương/giấy `fossilBone`; gỗ `warmWood`.
- Vật thể có thể vươn lên khỏi hitbox, nhưng **hotspot đặt cố định**, không cho kéo-thả/tự xoay. UI tập trung bằng bàn phím/controller phải có viền chọn đủ tương phản.

## 4. Bố cục 8 vị trí cố định (tọa độ logic 320×224)

```text
┌────────────────────────────────────────────┐
│ [TƯỜNG TRÁI]               [TƯỜNG PHẢI]    │
│                                            │
│              [MÁY PHỤC NGUYÊN]             │
│   [KỆ TRÁI]                 [KỆ PHẢI]       │
│                                            │
│ [CÂY CẢNH]             [TƯỢNG] [BÀN PHỤ]  │
└────────────────────────────────────────────┘
```

| Slot ID | Vị trí | Hotspot x,y,w,h | Vai trò |
|---|---|---|---|
| `wall_left` | Tường bên trái | `34,23,79,41` | Khung tranh/bằng chứng nhận trên tường phía trái |
| `wall_right` | Tường bên phải | `208,23,79,41` | Khung treo tường phía phải |
| `center` | Bệ trung tâm | `111,78,98,98` | Máy phục nguyên là hero object; tránh che bảng HUD |
| `shelf_left` | Kệ trưng bày trái | `18,106,85,63` | Kệ mẫu bên trái, tương đương kệ bên phải |
| `shelf_right` | Kệ trưng bày phải | `218,106,85,63` | Kệ mẫu bên phải, trưng bày cùng hệ kích cỡ |
| `garden` | Góc cây cảnh | `14,178,73,40` | Cây/hồ tinh thể nền ở góc trước trái |
| `desk` | Bàn nghiên cứu | `239,176,76,42` | Đồ để bàn góc trước phải |
| `trophy` | Bệ danh dự | `173,181,59,37` | Bệ spotlight đồ siêu hiếm, không che máy chính |

- `wall_left`, `wall_right` nằm trên tường; máy chính giữa sàn. Các hotspot **không giao nhau**.
- `trophy` là bệ riêng: nền nên cho thấy một ô spotlight màu brass khi chưa sở hữu tượng nhưng **không gợi ý tỷ lệ rơi**.
- Render theo `layers` trong JSON; trong cùng lớp, đối tượng có chân/anchor phía dưới nằm lên trước. Không đặt chức năng chiến đấu trong phòng decor.

## 5. Bộ sprite bắt buộc — 10 món cơ bản + 1 danh dự

> Số đo là **kích thước khung sprite PNG native** dùng để vẽ, không phải kích thước CSS. Trang trí nhỏ có thể vươn lên ngoài hotspot, chân sprite neo đúng `anchor` của slot. File PNG trong suốt; thumbnail tạo từ nguồn, **không vẽ lại tùy hứng**.

| Mã / món | Khung PNG | Slot | Nhận bằng |
|---|---|---|---|
| `machine_old` — **Máy phục nguyên nguyên mẫu** | 80×80 | `center` | Có sẵn |
| `machine_future` — **Máy phục nguyên tối tân** | 88×88 | `center` | 1300 Xu Đồng Đội |
| `kabuto_skeleton` — **Bộ xương Kabuto** | 48×48 | `shelf_left`, `shelf_right` | 320 Xu Đồng Đội |
| `amber_aerodactyl` — **Hổ phách Aerodactyl** | 48×48 | `shelf_left`, `shelf_right` | 750 Xu Đồng Đội |
| `omanyte_model` — **Mô hình Omanyte** | 40×40 | `shelf_left`, `shelf_right` | 280 Xu Đồng Đội |
| `archaeology_certificate` — **Chứng nhận khảo cổ** | 56×36 | `wall_left`, `wall_right` | 200 Xu Đồng Đội |
| `prehistoric_poster` — **Bản đồ sinh vật cổ** | 64×40 | `wall_left`, `wall_right` | 420 Xu Đồng Đội |
| `prehistoric_fern` — **Chậu dương xỉ tiền sử** | 40×50 | `garden` | 360 Xu Đồng Đội |
| `research_terminal` — **Máy tính khảo cổ** | 56×40 | `desk` | 540 Xu Đồng Đội |
| `glowing_sample_tube` — **Ống mẫu phát sáng** | 40×48 | `desk` | 700 Xu Đồng Đội |
| `gold_pippi_statue` — **Tượng Vàng Giáo sư Pippi** | 52×56 | `trophy` | Rương cuối hiếm |

### 1. Máy phục nguyên nguyên mẫu (`machine_old`)

**Silhouette:** Bình kính vòm ngọc nhạt, thân máy teal, đế hợp kim cũ, khóa cơ khí và một khe đặt hóa thạch.

**Điểm nhấn:** Máy hỏng: đèn tắt/niêm phong; máy mở: hai điểm amber sáng. Giữ cùng silhouette ở cả hai trạng thái.

**Tránh:** Không dùng plasma quá sáng; không vẽ nhiều nút nhỏ khó nhận.

**Tài nguyên dự kiến:** `assets/coop-lab/decor/machine_old.png` (chưa vẽ).

### 2. Máy phục nguyên tối tân (`machine_future`)

**Silhouette:** Buồng kính đa giác bo cạnh, hai vòng đồng dẫn năng lượng, ống dẫn đá cổ, đèn amber ấm.

**Điểm nhấn:** Mạnh về hình khối nhưng không cao quá che bảng tường; sáng hơn bản cũ vừa đủ.

**Tránh:** Không dùng khung sci-fi trắng hoặc tia laser neon.

**Tài nguyên dự kiến:** `assets/coop-lab/decor/machine_future.png` (chưa vẽ).

### 3. Bộ xương Kabuto (`kabuto_skeleton`)

**Silhouette:** Mảnh vỏ và chi tiết chân Kabuto ghép trên giá đỡ gỗ sẫm và brass.

**Điểm nhấn:** Silhouette giống mẫu hóa thạch, nhìn rõ lớp vỏ bằng xương ngà.

**Tránh:** Không vẽ nguyên một Kabuto sống.

**Tài nguyên dự kiến:** `assets/coop-lab/decor/kabuto_skeleton.png` (chưa vẽ).

### 4. Hổ phách Aerodactyl (`amber_aerodactyl`)

**Silhouette:** Khối hổ phách vàng sậm chứa bóng Aerodactyl tối giản, kẹp kim loại ở hai bên.

**Điểm nhấn:** Một highlight góc trên trái, tối đa ba vệt sáng trên kính.

**Tránh:** Không vẽ Aerodactyl chi tiết quá nhỏ bên trong.

**Tài nguyên dự kiến:** `assets/coop-lab/decor/amber_aerodactyl.png` (chưa vẽ).

### 5. Mô hình Omanyte (`omanyte_model`)

**Silhouette:** Mô hình xoắn vỏ Omanyte màu xương sáng trên bệ trưng bày gỗ.

**Điểm nhấn:** Đường xoắn vỏ 2–3 tầng rõ ràng, không lẫn đồ chơi nhựa.

**Tránh:** Không dùng viền hồng quá nhiều.

**Tài nguyên dự kiến:** `assets/coop-lab/decor/omanyte_model.png` (chưa vẽ).

### 6. Chứng nhận khảo cổ (`archaeology_certificate`)

**Silhouette:** Khung gỗ ngang, giấy kem, huy hiệu nhỏ hình hóa thạch, niêm phong brass.

**Điểm nhấn:** Dễ nhận là chứng nhận khi xem ở 1x; chữ chỉ là các nét giả pixel.

**Tránh:** Không đưa chữ nhỏ thật vào sprite.

**Tài nguyên dự kiến:** `assets/coop-lab/decor/archaeology_certificate.png` (chưa vẽ).

### 7. Bản đồ sinh vật cổ (`prehistoric_poster`)

**Silhouette:** Poster bản đồ các kỷ địa chất dạng 3 mảng và biểu tượng dấu chân.

**Điểm nhấn:** Màu giấy vàng kem, viền gỗ teak, teal làm đường nét minh họa.

**Tránh:** Không dùng bản đồ Trái Đất chi tiết hoặc ảnh raster.

**Tài nguyên dự kiến:** `assets/coop-lab/decor/prehistoric_poster.png` (chưa vẽ).

### 8. Chậu dương xỉ tiền sử (`prehistoric_fern`)

**Silhouette:** Chậu gốm nâu, 3–5 tàu dương xỉ cổ lá lớn, ngọn nghiêng sáng phía trái.

**Điểm nhấn:** Màu lá xanh olive kết hợp dark teal, gốc chậu có shadow 1–2px.

**Tránh:** Không thêm quá nhiều lá gây răng cưa ở 1x.

**Tài nguyên dự kiến:** `assets/coop-lab/decor/prehistoric_fern.png` (chưa vẽ).

### 9. Máy tính khảo cổ (`research_terminal`)

**Silhouette:** Máy tính khảo cổ màn hình CRT nhỏ, bàn phím hai tông teal và brass.

**Điểm nhấn:** Màn hình hiển thị quét hóa thạch bằng ba khối pixel.

**Tránh:** Không dùng giao diện máy tính hiện đại dạng HD.

**Tài nguyên dự kiến:** `assets/coop-lab/decor/research_terminal.png` (chưa vẽ).

### 10. Ống mẫu phát sáng (`glowing_sample_tube`)

**Silhouette:** Ống thủy tinh đứng trên chân kim loại, mẫu cổ màu vàng nhạt phát sáng rất nhẹ.

**Điểm nhấn:** Tạo 1 highlight amber và phản chiếu ngọc nhạt, không bloom toàn cảnh.

**Tránh:** Không biến thành neon rave.

**Tài nguyên dự kiến:** `assets/coop-lab/decor/glowing_sample_tube.png` (chưa vẽ).

### 11. Tượng Vàng Giáo sư Pippi (`gold_pippi_statue`)

**Silhouette:** Tượng Pippi vàng đứng trên bục brass chạm hoa văn hóa thạch, một tay chống nạnh, mặt tự mãn.

**Điểm nhấn:** Nhận diện mạnh ở 1x, điểm sáng 1–2px; không buff stat, không phá màu phòng.

**Tránh:** Không nhồi hiệu ứng lấp lánh liên tục hoặc tạo tượng vàng bóng 3D.

**Tài nguyên dự kiến:** `assets/coop-lab/decor/gold_pippi_statue.png` (chưa vẽ).

## 6. 3 món để khóa style trước khi sản xuất hàng loạt

1. **`machine_old`**: chuẩn kích cỡ, vật liệu máy và kính; vẽ trạng thái khóa và trạng thái chạy bằng overlay nhẹ, giữ nguyên hình khối.
2. **`kabuto_skeleton`**: chuẩn kệ, xương, outline và đồ nhỏ; nhìn rõ ở 1x.
3. **`research_terminal`**: chuẩn kim loại, gỗ, cạnh và màn hình pixel; không lạc thành máy tính hiện đại.

Chỉ khi ba món được nhìn trực tiếp trên nền phòng thử và màn hình điện thoại thì mới vẽ 8 món còn lại. Không chọn ảnh từ web làm asset mặc định; có thể tham khảo nhưng sprite bàn giao phải tự làm hoặc có nguồn cấp phép rõ ràng.

## 7. Món danh dự Tượng Vàng Pippi

- Cần silhouette Pippi tự mãn, **tay chống nạnh, mặt hếch**; đáy tượng là bệ đồng nhỏ, ánh vàng cùng palette. Ưu tiên cảm giác **khoe** thay vì bùng nổ VFX.
- Tên hiển thị: **Tượng Vàng Giáo sư Pippi – Khảo Cổ Hoàng Gia**. Nội bộ `gold_pippi_statue`; khác biệt sprite thường bằng 1–2 sparkle chậm nếu FPS cho phép; khi reduced-motion bật, tượng đứng yên.
- **Không bán, không giao dịch, không cộng chỉ số**. Tỷ lệ dự kiến 0,1% mỗi rương cuối lượt *chơi lại thắng đủ hai mục tiêu phụ* là dữ liệu cân bằng trước đó, chưa có Co-op mission live.
- Khi rớt, Pippi khoe khoang. Chỉ gửi văn bản thành tích/ảnh phòng do người chơi chủ động chia sẻ, **không tự công khai save hay tạo tương tác mạng**.

## 8. QA art & định dạng bàn giao

**Tên file:** `assets/coop-lab/room_base.png`, `assets/coop-lab/decor/<id>.png`, `assets/coop-lab/thumbs/<id>.png`; không trùng tệp sprite game gốc. Alpha thật, PNG lossless, hình không chứa text thật nhỏ. Lưu một sheet nguồn tổng nếu muốn chỉnh sửa hàng loạt và metadata các góc.

**Cổng QA:** chụp ba kích cỡ trên, đặt 11 món thử cạnh sprite Pokémon hiện tại, kiểm viền và bóng, kiểm nút Xác nhận/Hủy bằng controller, vị trí 8 hotspot, màn Android 360 px, và trạng thái máy khóa/mở.

**Không đạt nếu:** một món lạc phong cách, nét mịn trộn pixel, sprite che HUD, vật phẩm chạm sai hotspot, màu thay đổi ngẫu nhiên hoặc trên điện thoại không phân biệt được vật liệu/đồ vật.

## 9. Phạm vi của bản này

- **Đã có:** blueprint mỹ thuật, palette, vị trí và kích thước, mô tả 11 item đồng nhất với economy catalog, dữ liệu có thể validate.
- **Chưa có:** PNG cuối cùng, thumbnail, UI xem/đặt đồ hoạt động, bản đồ/lab 2D render, nhiệm vụ Co-op chơi được và hình chụp kiểm tra trong engine.
- **Không tự thay đổi:** luật sưu tầm hóa thạch, giá Xu Đồng Đội, save, tỷ lệ Tượng Vàng Pippi, Web production.
