# Đồng bộ phát hành PKMSVV: Web / Windows / Android

Tình trạng 23/10/2026: Repo \`votrivalley/PKMSVV\` có 3 workflow build chạy song song khi thay đổi mã chung:
- **Build Web Edition (test artifact)**: xuất \`PKMSVV-Web-Hosting\` với đăng nhập Google, Co-op, Sinh tồn 10 người Beta và log Web v1.3.
- **Build Windows Offline (synchronized)**: Windows portable \`.exe\`, hiện vẫn là **game Offline**. Có thể kiểm tra GitHub Releases khi khởi động và thông báo nếu có bản mới; **không tự cài đặt**.
- **Build Android Offline (synchronized)**: Android **debug** \`.apk\`, vẫn là **game Offline**, chưa có cập nhật APK tự động.

Cả hai gói native được tạo từ cùng mã gốc + patch chung, nhưng **chưa có Online Google/Co-op/Sinh tồn** như Web. Vì vậy chưa được gắn nhãn Online v1.3 hoặc đưa các tính năng web-only vào changelog native. Phiên bản native vẫn ở \`package.json\` (1.2.1) cho tới khi tính năng tương ứng được port và kiểm thử.

## Build cùng đợt
Mỗi lần push mã chung lên \`main\`, GitHub Actions tự chạy các workflow; vào trang [Actions](https://github.com/votrivalley/PKMSVV/actions), chọn bản build xanh để tải Artifact tương ứng. GitHub **chưa tự phát hành GitHub Release hoặc cập nhật APK đã cài**. Bản build đỏ không được dùng.

## Kích hoạt tự triển khai Web (tùy chọn, chưa bật)
Workflow \`Deploy Web to Firebase (opt-in)\` đã được chuẩn bị nhưng chỉ chạy khi **cả hai điều kiện** sau được thiết lập:

1. Repo → Settings → Secrets and variables → Actions → **Variables**: thêm \`PKMSVV_AUTO_DEPLOY_WEB\` có giá trị \`true\`.
2. Repo → Settings → Secrets and variables → Actions → **Secrets**: thêm \`FIREBASE_SERVICE_ACCOUNT_PKMSVV_B84D2\` bằng **Service Account JSON** có quyền triển khai Hosting của dự án \`pkmsvv-b84d2\`. Đây **KHÔNG PHẢI** Firebase Web \`apiKey\` và phải giữ kín. Làm theo hướng dẫn chính thức [Firebase Hosting GitHub integration](https://firebase.google.com/docs/hosting/github-integration) (ví dụ \`firebase init hosting:github\`) rồi kiểm tra đúng tên Secret mà workflow dùng.

Khi bật hai mục, workflow sẽ chỉ deploy artifact từ bản build xanh của đúng commit mới nhất lên **Firebase Hosting LIVE**. Mọi người dùng URL sẽ nhìn thấy thay đổi ngay sau deploy. Đây là game fan-made có tài sản Pokémon; chỉ bật khi chủ dự án sẵn sàng phát hành công khai và đã đánh giá rủi ro quyền sử dụng.

## Tự cập nhật đúng nghĩa trên thiết bị
- **Web**: người dùng nhận bản mới sau khi tải lại trang, nhưng chỉ sau khi Hosting thực sự được deploy.
- **PC portable**: có thể **kiểm tra phiên bản mới** và mở Release chính thức, không tự thay file đang chạy. Muốn tự tải/cài chuẩn cần một bản **Windows NSIS installer** và pipeline phát hành có kiểm soát (kèm thử nghiệm bảo toàn save).
- **Android debug APK**: **không thể tự cài âm thầm**. Để cài chồng bản sau phải có cùng package ID và cùng khóa ký trên tất cả phiên bản. Debug APK build ở máy runner khác nhau có thể đổi khóa; cần keystore phát hành cố định, lưu an toàn và kiểm thử trước khi chuyển người dùng.
- Chỉ xây dựng auto-install sau khi đã thử cập nhật từ bản cũ sang bản mới mà không mất dữ liệu; luôn sao lưu save trước.
