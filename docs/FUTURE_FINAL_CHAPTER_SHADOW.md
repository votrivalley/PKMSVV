# TƯƠNG LAI — CHƯƠNG CUỐI: POKÉMON HẮC HÓA

> **Bonus Shadow — cập nhật sau Chương 10.** Đã chốt Chương 8 giới thiệu Champion, Chương 9 hoàn thành khi mở Mega đầu tiên, Chương 10 đánh Rayquaza sau 10 Champion. Tài liệu này mô tả **phụ bản và hệ thống Shadow tương lai** chứ không tự phát hành các sprite hoặc phần thưởng. Xem [roadmap 1–10](./CHAPTERS_1_10_SHADOW_BONUS_ROADMAP.md).

## Ý tưởng cốt lõi

Sau khi người chơi hạ Rayquaza ở Chương 10 và chứng kiến Mega Rayquaza hắc hóa bay đi, năng lượng bóng tối bắt đầu làm Pokémon **Hắc Hóa (Shadow)** trên nhiều vùng đất. Đây là **mục tiêu late game / chương kết thúc**, không phải event ngắn hoặc skin quay Gacha tràn lan.

Người chơi phải tìm ra nguyên nhân, cứu Pokémon bị ảnh hưởng và đối đầu với những huyền thoại mang năng lượng Dark. Quan hệ giữa Shadow và Mega là nhánh thử thách cấp cao: có thể xuất hiện **Mega Shadow boss** nhưng vẫn giữ tách biệt khỏi Mega và Shiny thường.

## Đề xuất tiến trình (còn mở cho brainstorm)

1. **Dấu hiệu hắc hóa** — vài Pokémon khác thường xuất hiện tại map quen, chuyển màu môi trường và hành vi. Người chơi thu thập manh mối thay vì mở ngay toàn bộ Shadow.
2. **Nhiễm lan khắp vùng** — thêm trận bảo vệ/giải cứu Pokémon, mục tiêu thanh tẩy và các vùng tối. Map cũ thay đổi có chủ đích, không thay game chính toàn bộ.
3. **Thủ lĩnh Hắc Hóa** — các boss Shadow thường, rồi Mega Shadow để kiểm tra đội hình, Orb, Mega và Pokémon hỗ trợ mà người chơi đã đầu tư lâu dài.
4. **Huyền thoại Dark** — ứng viên boss theo chủ đề: **Darkrai** (hệ Dark; Pokémon thần thoại), **Yveltal** (Dark/Flying; huyền thoại); **Hoopa Unbound** (Psychic/Dark; thần thoại) là lựa chọn phụ nếu cốt truyện phù hợp. **Chưa chốt boss cuối và thứ tự**.
5. **Kết thúc / thanh tẩy** — lựa chọn giải cứu và phá nguồn hắc hóa thay vì chỉ đánh bại toàn bộ Pokémon. Kết quả hoàn thành có thể mở ngoại trang, ký ức, map hoặc thành tựu hậu truyện; chưa chốt phần thưởng.

## Giới hạn thiết kế phải giữ

- Shadow **không thay thế** Pokémon cơ bản, Shiny, Mega thường hoặc save hiện có; sử dụng ID/form tách biệt.
- Không mặc định Shadow = Shiny đổi palette hay biến Mega thường thành Mega Shadow tự động.
- Nội dung tương lai phải tương thích **Co-op / AI**, PC, Web, Android và save offline, nhưng chưa có code triển khai.
- Tránh tăng sức mạnh vô hạn: Shadow có nguy cơ/đánh đổi hoặc điều kiện khống chế; không tạo lợi thế trả tiền.
- Các bộ `Shadow Mewtwo Y`, `Shadow Rayquaza`, `Shadow Tyranitar` mới là **tài nguyên nghiên cứu**, chưa được duyệt phát hành, và không phải Pokémon Dark-type chỉ vì có màu đen.
- Halloween có thể là **đầu mối / lời tiên tri trước chương cuối**, nhưng vẫn nên là event riêng, không làm mất tính chất cuối game.

## Asset & QA

Tham khảo `docs/ASSET_VAULT_SHADOW_HALLOWEEN_2026_10_31.md`. Có 146 PNG Shadow (22 form folders), 38 PNG sự kiện khác (6 folders). Một form `10902` có 6 ảnh không khớp dữ liệu frame và thiếu Faint — **không sử dụng** cho gameplay cho tới khi xác minh.

## Mốc thực hiện sau này

- Viết xong timeline cốt truyện, thứ tự chương và bộ boss trước khi triển khai.
- Kiểm tra/được phép tái sử dụng sprite; chỉ nhập các animation đủ chuẩn.
- Đề xuất hệ thống thanh tẩy, Shadow AI, cân bằng boss và phần thưởng, thử ở nhánh thử nghiệm không đụng save.
- QA song song PC/Web/Android, save tương thích, AI không mắc kẹt, Shadow form không đè sprite hiện hành.
- Chỉ phát hành khi người thiết kế duyệt, không tự triển khai từ tài liệu này.

## Bonus: phụ bản và Điểm Hắc Hóa (đã chốt ý tưởng, chưa code)

Sau đoạn kết Chương 10, người chơi sẽ có phụ bản mới để **farm Điểm Hắc Hóa** từ mục tiêu bảo vệ/thanh tẩy, sau đó dùng điểm **đổi Pokémon Hắc Hóa**. Đây là currency và danh sách Pokémon tách biệt hoàn toàn khỏi Mega Stone, Điểm Arena và Shiny thông thường. Darkrai/Yveltal là ứng viên trùm phụ bản theo chủ đề huyền thoại hệ Dark. Chưa nhập dữ liệu sprite Doofcraft vào build do điều kiện bản quyền và QA animation.
