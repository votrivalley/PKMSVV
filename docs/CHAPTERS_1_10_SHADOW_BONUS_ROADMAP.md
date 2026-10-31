# PKMSVV — Story roadmap 1–10 + Shadow Bonus

Approved design, updated 2026-10-31. User-facing chapter numbers are authoritative.
Internal keys are **intentionally not renumbered**; old save fields must remain readable.

| Chương | Nội dung | Điều kiện hoàn thành / mở tiếp |
| --- | --- | --- |
| 1–4 | Thức Tỉnh, ký ức, Orb, Pokémon đồng hành | Giữ logic đã có |
| 5 | Đồng Hành | Hoàn thành 3 chế độ Co-op/Sống Còn/Tranh Trứng |
| **6** | **Bí Mật Berry** | Dùng đủ 5 loại Berry khác nhau |
| **7** | **Arena** | Mở hành trình đấu trường |
| **8** | **Bí Mật Champion** | Xem câu chuyện giới thiệu 10 Champion khi bước vào Crown Journey |
| **9** | **Sức Mạnh Mega** | **Thắng Champion đầu tiên → mở Máy quay Mega. Sở hữu/mở khóa được 1 Mega thật dùng được → hoàn thành Ch9** |
| **10** | **Bầu Trời Hắc Hóa** | Có 10 Crown Seal từ 10 Champion → mở trận **Rayquaza thật** → thắng → cảnh **Mega Rayquaza bị hắc hóa rồi bay đi** → Ch10 hoàn thành |
| **Bonus (cập nhật sau)** | **Đại Dịch Pokémon Hắc Hóa** | Shadow Pokémon tràn vào các map; phụ bản PvE mới để farm **Điểm Hắc Hóa** và đổi Pokémon Shadow; boss Darkrai/Yveltal (còn chờ chốt) |

## Mốc Chương 9: Mega sau Champion đầu tiên

- Gacha Mega mở ngay khi sở hữu **một Crown Seal thực sự**, không yêu cầu đủ 10.
- Quay Mega Stone KHÔNG tự coi là mở khóa Mega: người chơi còn phải có Pokémon đúng và đủ điều kiện riêng, cùng sprite phù hợp trong build.
- Chỉ khi có Mega thật dùng được, Ch9 mới nhận một lần vé tím ×10 và hiển thị ký ức Chương 9.
- Giữ nguyên các tỷ lệ Gacha, 100 Điểm Arena/lượt, trùng Mega hoàn 50/200 điểm, không miễn điều kiện huyền thoại.
- **Save cũ**: `pkmsvvChapter7Seen` vẫn là quyền truy cập Mega đã có. Không thu hồi Mega Stone, forms, tickets, achievements. Những ô ledger vé tím cũ không đổi ID.

## Mốc Chương 10: Rayquaza

- 10 vùng phải có mười Crown Seal hợp lệ, không đủ nếu chỉ có cúp.
- Sau mốc 10, trong Arena hiện nút **Sky / Thách đấu Rayquaza**.
- Rayquaza là một enemy actor có HP và sát thương thật, cần giết thực sự. Thua thì giữ toàn bộ Ấn Chứng và được thử lại.
- Khi thắng, save lưu `pkmsvvRayquazaDefeated`; cảnh Ch10 phát, sau đó lưu `pkmsvvChapter10Done`, thanh toán một lần vé tím.
- Cinematic: dùng sprite **Mega Rayquaza thật đã đóng gói**, có hiệu ứng nhiễm bóng tối/vút đi; không tự chép hoặc làm giả sprite Mega Shadow từ Doofcraft.
- Chưa phát hành: Shadow bonus dungeon, Shadow trading shop, Shadow Pokemon rewards, Dark legendary boss chapter. Ch10 chỉ là **teaser**.

## Đề xuất hệ thống Bonus Shadow (CHƯA TRIỂN KHAI)

- Sau Ch10, cổng phụ bản **Vực Hắc Hóa** xuất hiện. PvE/AI Co-op thử thách chống nhiễm độc, cứu Pokémon.
- Mỗi trận nhận **Điểm Hắc Hóa** theo mục tiêu hoàn thành. Điểm là currency riêng, không nhập với Điểm Arena, PokéCoins hay vé tím.
- Shop Shadow cho **đổi** Pokémon Shadow với giá và giới hạn cân bằng, không biến mọi Pokémon thành Shadow bằng palette filter, không thay ID Pokémon thường.
- Shadow Pokémon có hoạt ảnh riêng và ưu/nhược điểm chiến thuật, không mặc nhiên mạnh hơn tất cả Pokémon thường.
- Boss Darkrai, Yveltal và các Shadow legendary còn là ứng viên cốt truyện, chưa chốt và chưa có bản chơi.
- Chỉ nhập sprite Shadow/Halloween có quyền sử dụng và animation hợp lệ. 10902 vẫn ở trạng thái quarantine.

## QA bắt buộc

- 1 Champion mở Gacha, 10 Champion không cần cho Mega.
- Có stone nhưng thiếu Pokémon hoặc sprite không hoàn thành Ch9.
- Mở một Mega hợp lệ hoàn thành Ch9 và chỉ cộng 1 vé tím.
- Có 9 seal không được vào Rayquaza; đủ 10 seal mới được.
- Bỏ cuộc/thua Rayquaza không được nhận thưởng Ch10; hạ boss thật mới hoàn thành.
- Không mất save Android khi cài đè, không đổi package/ký; PC/Web/Android cùng logic.
