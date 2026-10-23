# QA sửa lỗi mở hai rương cùng lúc — Pokémon Sống Sót

Người chơi báo bản phát hành **22/10/2026** bị đứng khi nhặt hai rương/vật phẩm gần nhau ở khoảng phút 25 và lo mất 40.000 xu chưa kết toán.

## Phạm vi sửa
- Gốc lỗi có thể xác định từ logic gốc: `offerItem` vẫn mở một lựa chọn mới khi `openItem` cũ chưa được xử lý, dẫn tới callback cũ bị ghi đè và trạng thái `choice` không trở lại trận.
- Đã thêm hàng đợi các vật phẩm khi có cửa sổ chọn đồ, khi lên cấp hoặc đang chọn liên kết kỹ năng; không ghi đè màn cũ.
- Chặn xác nhận cùng vật phẩm hai lần và xóa hàng đợi khi bắt đầu trận mới.
- Không thay phần thưởng, tỉ lệ nhận rương, PokéCoins, tính toán tiền thưởng hay save.

## Kiểm thử cần thực hiện trên máy thật
1. Có sẵn một item rồi nhận hai item khác trong cùng một khung hình; chọn cả hai, tiếp tục chơi.
2. Nhặt item đồng thời với lên cấp và liên kết chiêu; chọn hết, xác nhận trở lại gameplay.
3. Chơi sau phút 20 trên Web, PC, Android; kiểm tra kết thúc trận và PokéCoins được cộng.
4. Thử một trận mới không có popup từ trận cũ.

**Không khôi phục tự động được xu của trận cũ nếu chưa từng ghi vào save.** Build/test xanh chỉ xác minh mã và kiểm tra tự động; tình huống báo cáo cần test thực tế trước khi phát hành rộng.
