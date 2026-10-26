# Chơi qua LAN — thử nghiệm tách biệt (v1.5.16 LAN beta)

Mục tiêu: giữ các gameplay **Sống Sót (2–4)**, **Tranh Trứng (4)** và **Sống Còn (2–10)** từ Web Online, thay quản lý phòng Firebase bằng PC Host qua mạng nội bộ.

## Cách vào phòng

1. PC chạy bản **Windows LAN Host**. Bản mới tự vào game, không có trang trung gian. Giữ ứng dụng mở, Windows Firewall cho phép Private Network, không bật port forwarding.
2. Xem IP nội bộ của PC qua ipconfig (IPv4 Address); ví dụ 192.168.1.20.
3. PC / Android / iPhone / iPad cùng Wi-Fi mở Chrome/Edge/Safari tại http://192.168.1.20:37816 (điều chỉnh địa chỉ IP theo PC thực tế). Máy Host mở http://127.0.0.1:37816.
4. Mở URL Host sẽ tự vào game, không còn nút Vào game. Từ trong game chọn **Co-op → ⓘ Hướng dẫn kết nối Co-op LAN** để xem địa chỉ IP, rồi chọn chế độ và tạo phòng. Host gửi mã phòng cho người tham gia.
5. Tất cả cùng vào sảnh; Host chọn Bắt đầu khi có đủ người.

## AI trong Co-op (thử nghiệm)
- Cả ba chế độ **Sống Sót**, **Sống Còn** và **Tranh Trứng** đã có khung AI host-authoritative. Nút **Chơi với AI** tạo phòng riêng và thêm bot tự động (1 bot ở Sống Sót; 3 bot ở hai chế độ còn lại). Host cũng có nút **Thêm AI** / **Bớt AI** trong sảnh, giới hạn 4 người/AI với Sống Sót và Tranh Trứng, tối đa 10 với Sống Còn.
- Sống Sót: bot đi theo Host, tìm quái, dùng chiêu cơ bản. Sống Còn: bot có HP, chịu sát thương khi ở gần quái và dừng hành động khi bị loại. Tranh Trứng: bot tìm ổ trứng chưa bị lấy và tham gia luật nhặt trứng do Host xác nhận.
- AI không phải tài khoản hoặc thiết bị độc lập, không kết nối Firebase và không tạo save riêng.
- Đây vẫn là AI thử nghiệm; chưa có chiến thuật phức tạp, dùng Orb, tiến hóa/nâng cấp chiêu hoặc điều chỉnh độ khó riêng. Các bài test Node chỉ kiểm tra một số hành vi, **chưa thay thế QA hai thiết bị thật** và kiểm tra trọn trận.

## Phạm vi và giới hạn

- Không cần Firebase, Google Sign-In, danh sách bạn bè hay bảng xếp hạng toàn cầu. Không dùng dữ liệu Online cũ.
- Sử dụng lớp chuyển tiếp cùng-origin WebSocket trên máy Host, vẫn giữ game engine và các mode host-authoritative từ phiên bản Web. Truyền dữ liệu game qua LAN, không qua cloud.
- Save LAN là localStorage **trên trình duyệt từng thiết bị**. Nó *không* nằm chung với save của bản EXE Offline (file://) hoặc tài khoản Google. Sao lưu thủ công trước khi xóa dữ liệu/trình duyệt.
- Có **APK LAN Client Beta** riêng (`com.votrivalley.pkmsvv.lan`), nhập IPv4 máy Host và mở WebView trong ứng dụng. Có thể dùng Chrome Android để thử cùng IP mà không cần cài APK. APK tách biệt khỏi bản Offline (`com.ronvotri.pkmsvv`).
- Voice chat chưa hoạt động trong Android/iOS qua địa chỉ HTTP LAN (micro cần secure context). Không khẳng định ngang đầy đủ các tính năng Online khi chưa thử thực tế.
- Không có Host migration, phòng đóng khi PC Host tắt ứng dụng, tối đa 10 người chỉ ở chế độ Sống Còn.
- Đây là bản **beta/QA**, cần thử bằng ít nhất 2 thiết bị thật (Windows và Android), đặc biệt là Tranh Trứng, mất kết nối và save, trước khi phát hành rộng.
