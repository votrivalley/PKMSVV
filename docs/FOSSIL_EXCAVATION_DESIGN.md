# Pokémon Chuyển Sinh — thiết kế Khai quật & Phục nguyên hóa thạch

> **Trạng thái:** Chuẩn bị dữ liệu, **chưa kích hoạt gameplay** trên nhánh Pippi QA. Không triển khai lên Web chính, không sửa save hiện có.

## Căn cứ danh sách

- Nguồn đối chiếu: https://bulbapedia.bulbagarden.net/wiki/Template:Fossil và https://bulbapedia.bulbagarden.net/wiki/Fossil
- 25 loài (gồm tiến hóa), 15 công thức hồi sinh, 15 loại vật liệu, 6 Gen có hóa thạch.
- **Gen 1:** 5 (Omanyte/Omastar, Kabuto/Kabutops, Aerodactyl).
- **Gen 2:** 0.
- **Gen 3:** 4 (Lileep/Cradily, Anorith/Armaldo).
- **Gen 4:** 4 (Cranidos/Rampardos, Shieldon/Bastiodon).
- **Gen 5:** 4 (Tirtouga/Carracosta, Archen/Archeops).
- **Gen 6:** 4 (Tyrunt/Tyrantrum, Amaura/Aurorus).
- **Gen 7:** 0.
- **Gen 8:** 4 (Dracozolt, Arctozolt, Dracovish, Arctovish).
- **Gen 9:** 0. Tháp Thiên Không: không thả hóa thạch.
- Không tính Relicanth và Genesect là Pokémon hồi sinh từ vật phẩm Fossil.

## Luồng cần triển khai

1. Vào **Khám phá** đúng Gen; chỉ đá **có thể phá hủy** mới là nguồn nguyên liệu. Đá trang trí không tính.
2. Tảng đá bị phá hủy hoàn toàn -> **một lần** kiểm tra rơi: Pokémon thông thường 2%, Pokémon mang hệ Đá 4%, Pokémon hóa thạch 6%. **Ưu tiên hóa thạch > hệ Đá > thường**, không cộng dồn. Chỉ một vật liệu nếu trúng; không cần đánh đá nhiều lần để quay thêm lượt.
3. Ngoại lệ bắt buộc: **tảng đá đầu tiên đập vỡ sau phút 15** ở bất kỳ bản đồ Khám phá nào trao đúng **1 Hóa thạch Mái vòm (Dome Fossil)** để hồi sinh Kabuto (#140). Mỗi hồ sơ chỉ được thưởng một lần, kể cả chơi lại hoặc đổi thiết bị. Chỉ sau khi thưởng và lưu thành công, Pippi bắt đầu hướng dẫn về khai quật bằng thoại cà khịa; **không đọc ra các tỷ lệ 2% / 4% / 6%**.
4. Mẫu hóa thạch ngẫu nhiên phải thuộc đúng Gen của bản đồ: Kanto chỉ ra Helix/Dome/Amber; Gen không có hóa thạch không rơi. Chặn khai thác từ Co-op/Arena/Berry/Tranh Trứng/Sky.
5. Nhặt vật liệu vào Túi, lưu bền vững; cần chống nhận vật liệu lặp qua respawn, reconnect, thoát/vào lại khe nứt và các hook phá đá trùng nhau.
6. **PC -> Phục nguyên hóa thạch** (ô mới, tách khỏi Bạn đồng hành). Hiện vật liệu đang có, Pokémon nhận được, nguyên liệu yêu cầu, trạng thái **Có thể phục nguyên / Thiếu hóa thạch**.
7. Gen 1/3/4/5/6: một hóa thạch nguyên vẹn -> một loài ban đầu. Gen 8: dùng **hai mảnh** theo công thức Sword/Shield; không gộp ngẫu nhiên.
8. Chỉ trừ nguyên liệu/tài nguyên **sau khi lưu thành công**. Khôi phục Pokémon vào PokéBox, ghi Pokédex (đồng bộ hệ thống khám phá), giữ nguyên quy tắc Rank và tiến hóa; không nhận lặp khi bấm nhanh.
9. Sau khi kích hoạt, chặn **toàn bộ 25 loài** khỏi pool Pokémon hoang dã thông thường và Gacha/chiêu mộ mới. Tiến hóa từ Pokémon đã hồi sinh vẫn được phép. Save cũ đã sở hữu hóa thạch vẫn giữ nguyên.

## Điều kiện phục nguyên — gợi ý, chưa khóa cân bằng

**Phương án đề xuất:** 1 hóa thạch + 800 PokéCoins cho Gen 1/3/4/5/6; Gen 8 cần 2 mảnh + 1.200 PokéCoins. Xem đoạn phục nguyên ngắn (3–5 giây), **không buộc chờ thời gian thực**. Tỷ lệ Shiny khi phục nguyên tách biệt khỏi Shiny hoang dã; chưa chốt ở bản data.

Lý do: đào đá đã hiếm (3–5%), không nên tiếp tục bắt người chơi chờ 30 phút hay săn thêm vật phẩm hiếm mới được sở hữu. Số tiền còn cần kiểm thử kinh tế game và duyệt.

## Tình trạng mã nguồn kiểm tra ngày 17/11/2026

- Đã có bộ chọn Gen/biome ở `src/pkmsvv-quick-region.js`; có thể dùng `selectedRegion`/trạng thái Explore làm nguồn xác minh map.
- Có hệ thống Pokédex đánh bại -> chiêu mộ tại `src/pkmsvv-dex-defeats-qa.js`. Khi triển khai phải đặt điều kiện *fossil-only* phía trước điều kiện Pokédex để không lọt Gacha.
- Fork engine tương thích đang dùng `G.World.damageProp(p, amount)` và `rock` có HP; chỉ phát thưởng sau khi hàm gốc xác nhận phá đá (`p.hp<=0`, từ `hp>0`). Hook `breakAt` do Co-op nhận qua mạng phải **không phát thưởng**. Cần xác minh bản base pinned khi build qua stress thật.
- `data/evolution-rules.json` hiện có 9/10 quy tắc tiến hóa của các dòng hóa thạch hai dạng; còn thiếu **Tirtouga #564 -> Carracosta #565 (level 37)**. Nên bổ sung trước khi bật hồi sinh chính thức; không sửa trực tiếp tiến hóa trong giai đoạn chỉ chuẩn bị dữ liệu.
- Cần xác thực 25 sprite/Pokémon thực sự khả dụng trong bản engine đang chạy, không coi catalog Pokédex là bằng chứng đã có sprite.
- Cần giữ save v1/v2 tương thích; đề xuất thêm `save.pkmsvvFossils={schemaVersion:1,inventory:{},restored:{}}` chỉ khi feature bật.

## Không thuộc đợt chuẩn bị

- Chưa tạo ô PC chạy thật, chưa thêm đá hay phần thưởng, chưa khóa spawn/Gacha, chưa triển khai lên Cloudflare.
- Mọi mã gameplay sau này phải có regression Kanto/Grieta, Save Guardian, Android và PC theo quy trình QA hiện tại.
