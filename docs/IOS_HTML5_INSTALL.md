# Pokémon Chuyển Sinh trên iPhone/iPad — không cần App Store

## A. Co-op trong LAN, không cần ZIP và không cần Website HTTPS
1. Trên Windows chạy gói **LAN Host** mới. Bản mới mở game ngay, không qua trang bấm Vào game.
2. Trong game PC chọn **Co-op → ⓘ Hướng dẫn kết nối Co-op LAN**, xem địa chỉ Host được công bố. Cho Windows Firewall phép dùng mạng **Private**; không mở port ra Internet.
3. iPhone/iPad cùng Wi-Fi với PC, mở **Safari** và nhập URL của PC Host, ví dụ http://192.168.1.168:37816/ chỉ khi PC vẫn dùng IP này. Trang sẽ tự chuyển sang /game/.
4. PC Host chọn Co-op và Tạo phòng. Người chơi iPhone nhập mã phòng hoặc chọn phòng công khai. PC Host phải luôn bật.
5. Có thể dùng Safari → Chia sẻ → Thêm vào Màn hình chính để tạo lối tắt. Vì đây là HTTP LAN, không xem nó như một PWA HTTPS đảm bảo chạy ngoại tuyến.

## B. Chơi Offline PWA độc lập trên iPhone — cần HTTPS
**Không** chép website vào Files rồi mở index.html qua file://. Game dùng URL tuyệt đối /game/, manifest, service worker và lưu trữ theo origin website.

### 1. Lấy bộ HTML5 đã build
- Mở GitHub Actions → **Build iOS HTML5 PWA Beta** mới nhất có trạng thái Success.
- Phần Artifacts tải **PKMSVV-iOS-HTML5-PWA-Beta**. GitHub đóng thành một ZIP ngoài; giải nén để lấy tệp ZIP website bên trong, rồi giải nén lần nữa.
- Thư mục website giải nén phải có index.html, entry.js, sw.js, manifest.webmanifest và thư mục game/ cùng cấp. Không đưa chúng vào thêm một thư mục con trên hosting.

### 2. Đưa gói lên Cloudflare Pages (từ máy Windows hoặc Mac)
Bộ game gốc có khoảng 13.481 tệp assets, vì vậy **không dùng Drag-and-drop** của Cloudflare (giới hạn 1.000 files). Sử dụng **Wrangler CLI** (giới hạn 20.000 files trên Free plan) và đảm bảo không có file riêng lẻ quá 25 MiB.

- Đăng ký/đăng nhập Cloudflare: https://dash.cloudflare.com/
- Cài Node.js LTS từ https://nodejs.org/ trên PC nếu chưa có; mở PowerShell trong thư mục website vừa giải nén.
- Chạy lệnh: npx wrangler login . Trình duyệt mở để cấp quyền Cloudflare.
- Tạo dự án Direct Upload bằng: npx wrangler pages project create pkmsvv-ios . Nếu tên trùng, tự chọn tên dự án khác và dùng đúng tên đó trong lệnh tiếp theo.
- Đứng **ngay trong thư mục chứa index.html**, chạy: npx wrangler pages deploy . --project-name pkmsvv-ios
- Chờ Wrangler hoàn tất và nhận URL https://TEN-DU-AN.pages.dev/ . Dùng Safari thử URL đó và /game/ trước khi cài Home Screen.

### 3. Thêm vào màn hình chính trên iPhone/iPad
1. Trên iPhone/iPad mở Safari, truy cập URL HTTPS Pages đã được cấp.
2. Safari → nút **Chia sẻ** (hình vuông có mũi tên hướng lên; iOS mới có thể mở Menu trang rồi Chia sẻ).
3. Chọn **Thêm vào Màn hình chính / Add to Home Screen**. Nếu không thấy, kéo xuống → Sửa tác vụ / Edit Actions để thêm.
4. Bật **Mở dưới dạng ứng dụng web / Open as Web App** (nếu máy có), đặt tên Pokémon Chuyển Sinh và nhấn Thêm / Add.
5. Ra màn hình chính, nhấn icon game, chọn Offline và xoay ngang màn hình.

### 4. Lưu ý
- Truy cập lần đầu khi có Internet. Cache PWA hiện lưu theo yêu cầu và chưa được QA đảm bảo 100% các tệp đều offline ngay sau lần mở đầu tiên.
- Sao lưu save ra JSON, lưu bên ngoài website (Files/iCloud Drive). Dọn dữ liệu website có thể làm mất save.
- Web HTTPS và LAN HTTP là hai origin khác nhau, không tự dùng chung save hoặc tài khoản.
- Co-op LAN phải có PC Host, không phải máy chủ Internet. iPhone không tự chạy máy chủ LAN của Windows.
- Cloudflare Pages cần tuân thủ điều khoản và chính sách lưu trữ của dịch vụ.

Nguồn: https://developers.cloudflare.com/pages/get-started/direct-upload/ ; https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/27/ios/27
