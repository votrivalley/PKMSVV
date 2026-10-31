# TƯƠNG LAI — CHƯƠNG CUỐI: POKÉMON HẮC HÓA

> **Concept đã lưu, chưa triển khai.** Không chốt số chương; không thay đổi Chương 1–7 và không tự chiếm Chương 8–9 (hiện vẫn được để dành). Toàn bộ nội dung này chỉ kích hoạt khi người thiết kế xác nhận cốt truyện.

## Ý tưởng cốt lõi

Khi người chơi đã vượt qua Champion vùng, khai mở Mega và hoàn thành các tuyến sau đó, một nguồn năng lượng bóng tối làm Pokémon dần **Hắc Hóa (Shadow)**. Đây là **mục tiêu late game / chương kết thúc**, không phải event ngắn hoặc skin quay Gacha tràn lan.

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
