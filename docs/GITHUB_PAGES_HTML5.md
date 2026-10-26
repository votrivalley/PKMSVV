# GitHub Pages — Pokémon Chuyển Sinh HTML5 Offline

Sau khi Pages bật và deployment thành công: https://votrivalley.github.io/PKMSVV/

Trang mở thẳng game (không có nút Vào game, không đăng nhập Google). Save local trên từng trình duyệt/thiết bị. Cần sao lưu game ra JSON trước khi xóa dữ liệu Safari.

## Bật Pages một lần
1. Chủ repo mở https://github.com/votrivalley/PKMSVV/settings/pages
2. Trong Build and deployment → Source chọn GitHub Actions (tài khoản GITHUB_TOKEN thông thường không tự bật tính năng này).
3. Mở lượt build đã tạo sẵn: https://github.com/votrivalley/PKMSVV/actions/runs/40275334214
4. Nhấn **Re-run jobs → Re-run all jobs** sau khi bật Pages. Workflow nằm trên nhánh feature/lan-local-beta nên tùy GitHub có thể chưa xuất hiện nút Run workflow ở tab mặc định.
5. Khi deployment Success, mở website ở trên. Cho tới khi thấy Success, URL dự kiến có thể trả 404.

## Thêm vào màn hình chính iPhone/iPad
Safari → truy cập website HTTPS → Chia sẻ → Thêm vào Màn hình chính → Mở dưới dạng ứng dụng web → Thêm.

PWA chỉ cache tài nguyên đã tải dần. Chưa đảm bảo toàn bộ hàng chục nghìn tài nguyên sẽ chơi được khi ngắt mạng ngay từ lần đầu. Save trong HTTPS Github Pages và HTTP LAN là hai bộ nhớ riêng biệt, không đồng bộ. Co-op LAN phải dùng PC Host chung Wi-Fi, GitHub Pages không chạy server LAN.
