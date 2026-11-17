# Pokémon Chuyển Sinh — Phòng thí nghiệm, sửa mỹ thuật v2 (QA)

> Ngày 17/11/2026 · Không ảnh hưởng Web production, không thay số xu, tỷ lệ hay save.

## Vì sao bản v0.1 xấu hơn concept

- Concept là **một cảnh pixel-art hoàn chỉnh** có nhiều lớp tường, đèn, gỗ, kim loại, vật mẫu và ánh sáng. Sprite gốc v0.1 lại là hình thô 320×224 với vài hình khối đơn giản.
- Trước đây CSS phóng lớn cảnh 320×224 bằng `image-rendering:pixelated` nên các hình khối càng thô. Đây là **chất lượng tài nguyên v0.1**, không phải thiết bị hoặc trình duyệt người chơi.
- V0.1 còn đặt riêng máy, Kabuto và máy tính lên nền ít chi tiết khiến thiếu cảm giác cùng một phòng.

## Sửa trong v2

- Tạo **tranh concept chi tiết mới**, làm nguồn cảnh QA tại `assets/coop-lab/room_art_qa_v2.webp`: chính xác **960×672**, WebP nén **205.820 bytes**. Được dựng mới theo phối cảnh concept, không lấy ảnh Internet.
- Khi mở PC → Hồi sinh hóa thạch, hiển thị **toàn cảnh đã phối sáng** thay vì ghép ba sprite thô. CSS bỏ lớp phủ 3 sprite và bỏ pixelating 3× nền cũ.
- Căn lại 8 vùng chọn theo đúng các đồ vật trong cảnh mới; vẫn chỉ được **xem** nội thất, không được mua hoặc dùng làm màn hoàn thành nhiệm vụ.
- Giữ `room_base.png` và ba PNG cũ trong repo **chỉ để so sánh/kiểm tra hồi quy**; chúng không còn là lớp hiển thị trên cảnh v2.
- `src/pkmsvv-fossil-system.js` giữ nguyên: chưa vượt Co-op lần đầu thì phục nguyên vẫn khóa.

## Ranh giới prototype / sản xuất

**Cảnh WebP hiện là một minh họa toàn cảnh, chứa sẵn máy, kệ, cây, vật mẫu, bàn và bệ trưng bày.** Các vật thể được **vẽ sẵn vào cùng một ảnh**, không phải đồ người chơi sở hữu. Không sử dụng cảnh này làm hệ thống trang trí tương tác có thể mua! Trước khi phát hành gameplay trang trí, phải tách cảnh thành:
1. Background sạch: tường, sàn, đèn, các bàn/kệ cố định và bệ trống
2. 11 sprite PNG/WebP alpha riêng có đúng silhouette và bảng màu
3. Layer đặt trên 8 slot đã duyệt, có nút trang bị, lựa chọn món đã sở hữu và save

Có thể cho người chơi duyệt thẩm mỹ cảnh v2 **ngay**, nhưng không mô tả 8 slot là đã có trang trí mua được. Sau khi có sprite tách lớp thì mới dùng logic Xu Đồng Đội.

## QA

- Kiểm chữ ký RIFF + VP8, kích thước và SHA-256 nguồn ảnh không đổi
- Kiểm cảnh được đóng gói **offline** trên cả Web, Android và PC LAN
- Kiểm Kanto 150+45 giây và 6 bài Grieta để phát hiện crash ngoài gameplay
- Kiểm PC vẫn hiện rõ trạng thái máy khóa sau khi đào hóa thạch và save không bị sửa bởi art preview
