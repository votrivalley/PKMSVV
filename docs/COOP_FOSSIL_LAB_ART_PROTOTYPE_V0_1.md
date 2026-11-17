# Pokémon Chuyển Sinh — Phòng Thí Nghiệm Thất Lạc · Art Prototype v0.1

**Đây là tài nguyên PNG thật đầu tiên, chưa phải nội thất đã phát hành hay minigame Co-op chơi được.** Mọi ảnh thuộc nhánh QA và chưa đưa vào production. Xem quy chuẩn [Art Direction v1](COOP_FOSSIL_LAB_ART_DIRECTION_V1.md).

### Các tài nguyên đã tạo
- [Nền phòng gốc 320×224](../assets/coop-lab/room_base.png): tường đá teal, sàn lát 16px, bệ máy phục nguyên giữa phòng, hai kệ, hai khung tường, chân bệ danh dự và bàn/góc cây.
- [Máy phục nguyên nguyên mẫu 80×80](../assets/coop-lab/decor/machine_old.png): kính vòm, đế đồng, họa tiết hóa thạch; phối được cả trạng thái khóa.
- [Bộ xương Kabuto 48×48](../assets/coop-lab/decor/kabuto_skeleton.png): vật mẫu xương ngà đặt trên bệ gỗ.
- [Máy tính khảo cổ 56×40](../assets/coop-lab/decor/research_terminal.png): thiết bị CRT và mô hình quét hóa thạch.

Các sprite được vẽ mới, có viền và đổ bóng cùng hệ. 8 slot vẫn được bảo toàn theo catalog; bản prototype chỉ hiển thị 3 món mẫu, **không tự sở hữu các món khác**. Hình ảnh đạt kích thước và CRC bằng CI, nhưng chưa được đánh giá trực tiếp với camera/render game native trên điện thoại.

### Cách kiểm tra
- Mở PNG trong Aseprite/LibreSprite và xem ở 100%/200% nearest-neighbor.
- Kiểm tra hình trong phòng nền: máy chính giữa, Kabuto tại kệ trái, máy tính tại bàn phải.
- Bản demo HTML tách riêng chỉ phục vụ thiết kế, không giao dịch Xu Đồng Đội hoặc thay save.
- Giữ nguyên cơ chế mở khóa máy **sau nhiệm vụ Co-op đầu tiên**; chưa có nhiệm vụ thật ở bản art prototype.

### Chưa có
Sprite cho 8 món còn lại, animation/overlay máy đóng-mở, UI trang trí tương tác trong game, Co-op quest, và chế độ xem phòng bạn bè. Không được đưa prefab/sticker không cùng palette vào thay thế chỉ để cho đủ số lượng.
