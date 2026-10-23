# Pokémon Survivor — icon riêng tại Switch HOME

Đây là cách tạo **NSP Forwarder** dẫn tới `sd:/switch/PKMSVV.nro`, tiếp tục mở Brewser và game HTML5 offline. Nó **không** chuyển trò chơi thành native Switch, **không** tích hợp game/engine vào NSP.

1. Dùng bản Switch v0.7.2 từ workflow `.github/workflows/build-switch.yml`, giải nén nguyên `switch/` vào gốc microSD.
2. Chạy thử `PKMSVV.nro` bằng Homebrew Menu. Nếu NRO chưa mở được, forwarder không tự sửa lỗi này.
3. Tạo ảnh `pokemon-survivor-home.jpg` dạng JPEG hình vuông từ artwork bạn có quyền sử dụng; để cạnh `TAO_NSP_HOME_MENU.ps1` (gói thiết lập trong cuộc trò chuyện chứa sẵn icon từ ảnh do người dùng cung cấp).
4. Trên Windows tải [NTON](https://github.com/rlaphoenix/nton/releases); NTON yêu cầu `prod.keys` từ chính máy. **Không tải khóa lên GitHub, vào artifact CI hay chia sẻ qua chat.**
5. Gắn thẻ microSD vào PC, ví dụ ổ E:, trong PowerShell tại thư mục script chạy: `powershell -ExecutionPolicy Bypass -File .\TAO_NSP_HOME_MENU.ps1 -SwitchSdRoot E:\`
6. NSP tạo ra sẽ có tên **Pokémon Survivor** và icon tùy chỉnh. Chỉ cài trong môi trường Atmosphère/emuMMC đã cấu hình hợp lệ. File `brewser-forwarder.nsp` có sẵn trong gói cũ chỉ mở **Brewser**; không cần cài nếu dùng forwarder mới.

**Rủi ro:** NSP chưa ký Nintendo; cài trên sysMMC hoặc kết nối máy với dịch vụ Nintendo có nguy cơ bị hạn chế tài khoản/thiết bị. Đây là bản thử nghiệm chưa xác nhận trên Switch Lite thật.

Game gốc: [JPTER78/pokesurvivor](https://github.com/JPTER78/pokesurvivor); Brewser: [natureglass/Brewser](https://github.com/natureglass/Brewser).
