# Pokémon Chuyển Sinh trên iPhone/iPad

## A. Co-op qua Wi-Fi, không cần tải gói iOS
1. Mở Windows LAN Host trên PC. Bản mới vào game trực tiếp.
2. Mở Co-op → ⓘ Hướng dẫn kết nối Co-op LAN để xem địa chỉ Host.
3. iPhone/iPad nối cùng Wi-Fi. Mở Safari, nhập địa chỉ Host, ví dụ http://192.168.1.168:37816/ nếu PC đúng IP đó.
4. Safari vào thẳng game. Trong Co-op, nhập mã phòng của Host hoặc chọn phòng công khai.
5. Muốn có biểu tượng Home Screen, Safari → Chia sẻ → Thêm vào Màn hình chính. Với LAN HTTP, đây chủ yếu là lối tắt; không hứa chạy offline.

## B. Chơi độc lập, không App Store
1. Tải bản HTML5/PWA iOS tại GitHub Actions → Artifacts. Giải nén lớp ZIP của Artifact và ZIP nội dung.
2. Gói website phải có index.html, entry.js, sw.js, manifest.webmanifest và thư mục game/ cùng cấp.
3. Trên PC mở Cloudflare Dashboard → Workers & Pages → Create application → Get started → Drag and drop your files.
4. Tải thư mục website hoặc ZIP chứa index.html ở gốc; nhấn Deploy site. Nhận URL HTTPS dạng TEN-DU-AN.pages.dev.
5. Trên iPhone/iPad mở URL HTTPS bằng Safari → Chia sẻ → Thêm vào Màn hình chính → bật Mở dưới dạng ứng dụng web → Thêm.
6. Mở biểu tượng để chơi. Tải tài nguyên trước khi mất mạng và xuất save JSON thường xuyên.

Không chép ZIP vào thư mục Files rồi mở index.html qua file:// vì game dùng đường dẫn tuyệt đối /game/ và service worker yêu cầu website phù hợp. Cache PWA beta tải dần, chưa đảm bảo offline hoàn toàn sau một lần mở. HTTPS website và LAN HTTP là hai bộ nhớ/save khác nhau. Không mở cổng 37816 ra Internet.
