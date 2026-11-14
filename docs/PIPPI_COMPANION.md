# Pippi — bạn đồng hành AI trong Khám phá (QA 2.0.1)

## Phạm vi
- Tự động đi theo người chơi **chỉ** trong Khám phá (vùng Kanto → Votri Valley).
- Không chiếm ô Pokémon của đội hình, không được sử dụng trong Co-op, Arena, Sống Còn, Tranh Trứng.
- Đây là AI hỗ trợ; không có hitbox, không được tính là địch/đồng đội PvP.
- Hình Pippi trên bản đồ sử dụng sheet Clefairy #035 từ PMDCollab với 8 hướng đi/đứng/ngủ.
- Portrait: 16 biểu cảm PMDCollab; phong cách hài sẽ được biên tập theo từng trigger.
- Mega Clefable là dạng chính thức từ *Legends: Z-A*. Bản hiện tại dùng portrait Inspired + hiệu ứng phát sáng cho ultimate; **chưa có sprite Mega full 8 hướng**.

## Bond 1–10
XP Bond được ghi trong `save.pkmsvvPippi.xp`, cấp được suy từ XP với các mốc:
`0, 2, 5, 9, 14, 20, 27, 35, 44, 54`.

| Bond | Quyền lợi |
|---|---|
| 1 | Moon Heal; Pippi theo sát và nhắc nhiệm vụ |
| 2 | Fairy Cheer: +10–17% sát thương trong 8 giây, hồi 40 giây |
| 3 | Cute Stare: làm chậm tối đa 6 quái xung quanh trong khoảng 2–4 giây |
| 4–5 | Heal/khống chế cải thiện theo Bond |
| 6 | Các lời thoại hỗ trợ và hồi máu mạnh hơn |
| 7–9 | Emergency Hug: 1,8 giây miễn thương khi máu dưới 22%, hồi 90 giây |
| 10 | Moon Miracle: tự hồi sinh một lần/trận 40% HP, 3 giây miễn thương, Pippi ngủ 75 giây |

XP Bond được thưởng 1 lần/mốc thời gian **mỗi trận Khám phá** (2, 5, 15, 30 phút); mốc 15 và 30 phút được thưởng thêm. Khi đổi trận, hồi chiêu kỹ năng và quyền cứu sinh reset, Bond thì giữ nguyên.

## Hoàn tiền Hồi Sinh Huyền Thoại cũ
- Nâng cấp `globalUpgrades.revive` (giá 50.000 PokéCoins) **ngừng bán** trên toàn hệ thống; không còn tăng `extraRevives`.
- Nếu có bản ghi đã sở hữu, Pippi hoàn 50.000 PokéCoins (ưu tiên ledger `globalSpent.revive` hợp lệ); chỉ một lần với cờ `save.pkmsvvPippi.refundReviveV1`.
- Xóa đúng `revive` khỏi `globalUpgrades` và `globalSpent`; giữ nguyên tất cả upgrade khác.
- Nếu chưa từng mua, không cộng tiền. Nếu không lưu được migration, hoàn lại trạng thái cũ để chạy lại an toàn.
- **Backup JSON trước khi cài bản thử nghiệm.** Chưa xác nhận việc cài/hiển thị trên thiết bị Android thật.

## Nguồn sprite và điều kiện sử dụng
- [PMDCollab/SpriteCollab](https://github.com/PMDCollab/SpriteCollab), commit `aab3eb6c7167b247a45f5c12c85515341d0c9895`.
- Sheet sprites Clefairy #035: tác giả gốc **CHUNSOFT** theo `sprite/0035/credits.txt`.
- Portrait Clefairy #035: **CHUNSOFT, ESTELSTARLIGHT** theo `portrait/0035/credits.txt`.
- Chính sách của PMDCollab: fangame/ROM hack **phi thương mại và ghi công** (CC BY-NC 4.0 cho đóng góp có thẩm quyền). Quyền với nhân vật và hình ảnh Pokémon gốc vẫn thuộc chủ sở hữu.
- Build tải ảnh theo commit cố định, kiểm tra blob SHA1 và đóng gói **offline**; không gửi request tới PMDCollab khi chơi.
- Link fanmade Mega Clefable trên DeviantArt chỉ dùng làm **tham chiếu tạo hình**; chưa copy asset, chưa xác minh phép tái sử dụng từ tác giả.

## QA đề xuất
1. Backup save; tải bản QA ở GitHub Actions; cài đè **không gỡ APK cũ**.
2. Mở Kanto: thấy Pippi di chuyển gần nhân vật, sprite đổi theo tám hướng; không xuất hiện ngoài Khám phá.
3. Mất máu: thấy hồi HP và portrait kèm thoại; buff không cộng dồn mãi; địch trở lại tốc độ cũ khi hết làm chậm.
4. Mở Toàn Đội: không còn mua được Hồi Sinh Huyền Thoại.
5. Nếu save đã mua quyền hồi sinh cũ, kiểm tra PokéCoins +50.000 **chỉ một lần**, giữ các nâng cấp khác.
6. Tài khoản test Bond 10: để HP về 0; Moon Miracle cứu 40% HP đúng một lần; Pippi ngủ 75 giây.
7. Co-op, Arena, Tranh Trứng, Sống Còn: không xuất hiện Pippi hoặc tự cứu người chơi.
