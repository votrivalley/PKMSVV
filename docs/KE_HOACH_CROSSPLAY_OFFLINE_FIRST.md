# Pokémon Sống Sót — 3 nền tảng, một thế giới, không đánh mất chế độ Offline

**Định hướng đã xác nhận, 23/10/2026.** Đích đến là một bản game Web/Windows/Android có cùng tài khoản Google, cùng Cloud Save và phòng Co-op/Sinh tồn; đồng thời Windows và Android vẫn tải sẵn toàn bộ tài nguyên, chơi Offline được nếu Firebase hoặc Hosting ngừng hoạt động. **Đây là bản thiết kế lộ trình — cross-play native và auto-update OTA chưa hoàn thành.**

## Những gì đã làm trong thay đổi hiện tại

- Tên hiển thị mới **Pokémon Sống Sót** ở launcher/icon SVG dùng chung, Windows title/productName, Android appName, tiêu đề màn hình đăng nhập, menu và màn hình khởi động, Web landing và PWA manifest.
- Giữ nguyên **appId** `com.ronvotri.pkmsvv`, package name nội bộ và `%APPDATA%\PKMSVV-Offline` để tránh tạo ứng dụng/hồ sơ mới khi cập nhật.
- Website và native sử dụng cùng bộ patch gameplay gốc; bản native **vẫn offline**; Web Online Beta mới kết nối Firebase.

## Kiến trúc cần xây tiếp để cross-play thật

1. **Một gameplay build dùng chung** cho Web, PC và APK. Giữ tài nguyên/pixel sprites trong gói cài sẵn. Bản native có lựa chọn **Chơi Offline** / **Đăng nhập Online** trước khi vào game, được thiết kế sao cho **mất mạng không chặn khởi động game**.
2. **Google Authentication theo nền tảng:** Web dùng Firebase Web SDK. Android không đăng nhập Google qua popup WebView bị hạn chế: dùng luồng native Google Sign-In / Credential Manager và token Firebase; PC dùng trình duyệt hệ thống (OAuth PKCE + callback an toàn), tránh nhúng đăng nhập Google trong Electron. Cả ba dùng **cùng Firebase Project `pkmsvv-b84d2` và cùng UID** sau khi xác thực.
3. **Phòng và trận:** Tất cả client tuân theo **cùng phiên bản giao thức mạng**, trường `room.mode` (coop/royale), payload vị trí/HP/kỹ năng, xử lý reconnect. Firebase Realtime Database cho room và presence, WebRTC cho combat; cân nhắc TURN/relay khi P2P bị chặn, thử tải 2→4→10 người trước khi công bố.
4. **Quy tắc save một chiều mà chủ dự án đã duyệt:** Online có thể xuất **bản sao sang Offline** và giữ cả hai; **không bao giờ** nhận dữ liệu Offline nhập ngược vào hồ sơ Online. Mất mạng trong trận Online: chỉ giữ bản tạm cục bộ và thông báo rõ ràng, không tự đẩy tiến trình Offline lên Cloud khi nối lại. Save Online cần báo trạng thái đã đồng bộ, có xử lý conflict.
5. **Offline fallback:** Không được tải giao diện/chế độ chơi từ website thay cho asset local. Chỉ phần Online mới cần mạng. Ngay cả khi Cloud không phản hồi, vẫn có thể mở game và chọn Offline (không hứa phục hồi Cloud Save nếu chưa từng sao chép về thiết bị).

## Cập nhật mà không tải lại nguyên game

| Nền tảng | Giải pháp | Giới hạn |
|---|---|---|
| Web | Firebase Hosting + version.json, tải mới khi thoát trận/về menu | Cần Hosting hoạt động; giữ cache cho lần chơi không mạng nếu sau này bật PWA offline |
| Windows PC | Chuyển từ `.exe portable` sang NSIS installer ký số, electron-updater tải gói cập nhật khác biệt (blockmap) hoặc cập nhật tài nguyên riêng. Giữ cache bản tốt cuối cùng và bản game cài sẵn | Bản portable hiện chỉ **kiểm tra và thông báo** cập nhật; chưa tự cài. Cần test giữ save qua upgrade |
| Android APK | Giữ APK gốc có tất cả asset Offline; cập nhật riêng asset/content ký số, tải phần thay đổi và rollback khi lỗi. Native SDK/permissions chỉ cập nhật qua APK được ký cùng một keystore, có hộp thoại cài hoặc qua cửa hàng | Không thể tự cài một APK mới âm thầm. Debug APK ký khác mỗi build có thể bắt gỡ ứng dụng và mất save; phải chuẩn hóa khóa ký bản phát hành trước |

**Bắt buộc cho cập nhật tài nguyên tải về:** manifest version, SHA-256 và chữ ký phát hành, kiểm tra đường dẫn chống path traversal, staging tạm, thay thế nguyên tử, lưu ít nhất một phiên bản hoạt động, kiểm thử fail-over lúc máy mất mạng. Không tải và thực thi code tùy ý từ URL do người chơi nhập. Những giới hạn Firebase và quyền IP Pokémon vẫn áp dụng như trước.

## Tiêu chuẩn chấp nhận bản cross-play

- Web ↔ PC ↔ Android cùng phòng Co-op, chơi trận 2–4 người. Beta Sinh tồn mở dần đến 10; tất cả thấy cùng trạng thái/quyết định Host. Không phá save khi thay thiết bị.
- Cả PC và Android mở được game và chơi solo khi **tắt Wi-Fi**, kể cả Firebase và GitHub không truy cập được.
- Sau update nội dung, kiểm thử lại cùng hồ sơ Offline, tên hiển thị, thiết lập, controller, âm thanh, xu, Túi đồ và Google Cloud.
- Phiên bản mạng cũ không tương thích thì báo cập nhật **chỉ khi vào Online**; Offline vẫn chơi được. Tuyệt đối không bắt người chơi cài bản mới chỉ để chơi solo.
