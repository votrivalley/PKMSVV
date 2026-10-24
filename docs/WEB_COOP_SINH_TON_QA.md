# Kiểm tra bản Web: sửa cửa hàng, Việt hóa và Sinh tồn 10 người

Ngày triển khai mã: **23/10/2026**.

## Các sửa đổi trong gói Web Game

- **Kecleon:** sửa lỗi khi tab Cửa hàng không có ô chọn Pokémon nhưng JavaScript vẫn thao tác với ô này, khiến các nút Mua không được gắn sự kiện. Giá và số xu vẫn được kiểm tra như cũ; sau khi mua, vật phẩm đi vào Túi đồ.
- **Thông báo khi đăng nhập:** bỏ các thông báo lỗi thời của bản gốc về việc reset bảng xếp hạng và tự lưu sau mỗi 10 phút. Thay bằng thông báo VI/EN hướng dẫn nhấn nút **Lưu** và chờ trạng thái đồng bộ Cloud; nút xác nhận là **Đã hiểu**.
- **Co-op thường:** phòng giới hạn 2–4 người, dùng logic hồi sinh và hợp tác cũ.
- **Sinh tồn (Beta):** phòng riêng 2–10 người, không hồi sinh bằng đứng cạnh nhau; quái thưa/yếu hơn lúc đầu và tăng tốc, HP, sát thương về sau. Host phân định kết quả khi chỉ còn một người sống; điểm thử nghiệm = 10 × số giây sinh tồn, cộng 1.000 cho người thắng. Danh sách xếp hạng hiện trong màn kết thúc trận. **Chưa tính vào bảng xếp hạng Online chính thức**.

## Để vào phòng

1. Trên trang chủ chọn **Đăng nhập / chơi online qua Google**.
2. Vào **Bạn bè**, chọn **Co-op · 2–4** hoặc **Sinh tồn · 2–10**, mời bạn đã kết bạn.
3. Sau khi có từ 2 người, Host nhấn Bắt đầu.
4. Dùng hai trình duyệt hoặc thiết bị đăng nhập **hai tài khoản Google khác nhau** để thử phòng Co-op trước; chỉ mở rộng Sinh tồn theo thứ tự 2 → 4 → 6 → 8 → 10.

## Chưa được chứng minh bằng QA nhiều người thật

- Bản build qua kiểm tra mã nguồn/đóng gói GitHub Actions, nhưng **chưa thử tương tác mua hàng trên trình duyệt thật**, chưa thử hai máy kết nối WebRTC hoặc trận 10 người.
- Host chết vẫn tiếp tục mô phỏng trận, nhưng nếu Host thoát/hỏng mạng thì **trận có thể kết thúc**; chưa có host migration.
- WebRTC gốc chỉ dùng STUN (không có TURN); một số mạng khác nhau không kết nối trực tiếp được.
- Thứ hạng và điểm Sinh tồn ở bản Beta do máy Host quyết định, **chưa có chống gian lận cấp máy chủ**.
- Không tự cập nhật website sau khi GitHub build. Chủ dự án cần tải Artifact mới và triển khai lại Firebase Hosting.
- Cloud save và Offline save vẫn chưa có cơ chế chuyển Online → Offline một chiều. Đừng xóa dữ liệu cũ khi đang thử bản mới.

## Cách triển khai bản mới

1. Mở [GitHub Actions → Build Web Edition](https://github.com/votrivalley/PKMSVV/actions/workflows/build-web.yml).
2. Chọn **bản build mới nhất có dấu tích xanh**, vào mục **Artifacts → PKMSVV-Web-Hosting** và tải ZIP.
3. Giải nén bản mới; trong thư mục phải có `firebase.json` và thư mục `site`. Đổi tên thư mục triển khai cũ để làm bản dự phòng.
4. Mở PowerShell tại thư mục mới và chạy:

```powershell
firebase.cmd deploy --only hosting --project pkmsvv-b84d2
```

5. Mở `https://pkmsvv-b84d2.web.app/`, nhấn Ctrl+Shift+R. Không xóa dữ liệu trình duyệt để tránh mất save chưa đồng bộ.

**Giới hạn phát hành:** Trang Firebase Hosting đang là web công khai. Trước khi chia sẻ rộng, hãy kiểm tra quyền sử dụng tài sản Pokémon và quy tắc Firebase.

## Vá lỗi Co-op WebRTC 24/10/2026

Bản vá **chỉ áp dụng cho Web Online**, không tự đưa mã lên Firebase Hosting:

- Sửa race condition: ICE candidate của khách đến **trước SDP answer** nay được máy chủ phòng thêm vào RTCPeerConnection sau khi set remote description (trước đây bị giữ lại mãi).
- Sau 8 giây WebRTC ở trạng thái `disconnected` liên tục, đánh dấu cần kết nối lại. Trận đang chạy vẫn có cửa sổ phục hồi 45 giây.
- Không hiện giả `relay` thành kết nối thành công khi WebRTC không hỗ trợ (Firebase data relay vẫn bị tắt).
- Bài kiểm thử `tests/web-rtc-stability.test.cjs` mô phỏng khách gửi ICE trước SDP answer. Cần chạy **sau khi** build Web để kiểm tra trực tiếp mã đã ghép.

**Chưa giải quyết mọi NAT:** Nếu hai máy không lập được đường WebRTC trực tiếp do CGNAT/firewall, chỉ chỉnh STUN và retry chưa đủ. Cần TURN có cơ chế cấp thông tin truy cập ngắn hạn hoặc máy chủ relay riêng, dự trù lưu lượng/chi phí rồi mới bật.

**QA thực tế:** triển khai bản Web mới nhất lên Firebase Hosting, đăng nhập hai tài khoản Google trên hai thiết bị khác nhau. Thử cùng Wi-Fi, khác Wi-Fi, Wi-Fi ↔ 4G; vào phòng, chờ trạng thái **Đã kết nối** trên cả hai đầu rồi mới bắt đầu. Nếu vẫn lỗi, ghi lại cấu hình mạng và trạng thái WebRTC từ `chrome://webrtc-internals` (không gửi token, UID Firebase hoặc thông tin nhạy cảm). Không xác nhận fix thành công ngoài môi trường thực nếu chưa qua bài thử này.
