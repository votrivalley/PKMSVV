# Chơi qua LAN — thử nghiệm tách biệt (v1.5.16 LAN beta)

Mục tiêu: giữ các gameplay **Sống Sót (2–4)**, **Tranh Trứng (4)** và **Sống Còn (2–10)** từ Web Online, thay quản lý phòng Firebase bằng PC Host qua mạng nội bộ.

## Cách vào phòng

1. PC chạy bản **Windows LAN Host**. Giữ ứng dụng mở suốt trận, Windows Firewall cho phép Private Network, không bật port forwarding.
2. Xem IP nội bộ của PC qua ipconfig (IPv4 Address); ví dụ 192.168.1.20.
3. PC / Android cùng Wi-Fi mở Chrome/Edge tại http://192.168.1.20:37816 (điều chỉnh địa chỉ IP theo PC thực tế). Máy Host mở http://127.0.0.1:37816.
4. Chọn **Vào game**, tạo/đăng nhập hồ sơ local trên trình duyệt hoặc WebView LAN của thiết bị đó. Trong **Nhiều người chơi**, Host chọn chế độ/Tạo phòng; chia sẻ mã phòng cho người tham gia. Phòng công khai chỉ xuất hiện trong LAN của PC Host.
5. Tất cả cùng vào sảnh; Host chọn Bắt đầu khi có đủ người.

## AI trong Co-op (thử nghiệm)
- Host có nút **Thêm AI** / **Bớt AI** trong phòng **Sống Sót (Co-op)**. AI chiếm 1 chỗ (tối đa 4 người tính cả người thật và AI) và di chuyển, sử dụng chiêu cơ bản trong gameplay do Host điều khiển.
- AI không phải tài khoản hay người chơi từ máy khác, không kết nối Firebase và không tạo save riêng.
- Đây là bot chiến đấu cơ bản, chưa phải đối thủ PvP thông minh: **không hỗ trợ Tranh Trứng hoặc Sống Còn**; chưa có thu thập trứng, dùng Orb, tiến hóa/nâng cấp kỹ năng và quyết định chiến thuật phức tạp.
- Cần QA thực tế để bảo đảm AI lên cấp không khiến trận đứng chờ và đánh quái không gây lỗi.

## Phạm vi và giới hạn

- Không cần Firebase, Google Sign-In, danh sách bạn bè hay bảng xếp hạng toàn cầu. Không dùng dữ liệu Online cũ.
- Sử dụng lớp chuyển tiếp cùng-origin WebSocket trên máy Host, vẫn giữ game engine và các mode host-authoritative từ phiên bản Web. Truyền dữ liệu game qua LAN, không qua cloud.
- Save LAN là localStorage **trên trình duyệt từng thiết bị**. Nó *không* nằm chung với save của bản EXE Offline (file://) hoặc tài khoản Google. Sao lưu thủ công trước khi xóa dữ liệu/trình duyệt.
- Có **APK LAN Client Beta** riêng (`com.votrivalley.pkmsvv.lan`), nhập IPv4 máy Host và mở WebView trong ứng dụng. Có thể dùng Chrome Android để thử cùng IP mà không cần cài APK. APK tách biệt khỏi bản Offline (`com.ronvotri.pkmsvv`).
- Voice chat chưa hoạt động trong Chrome Android qua địa chỉ HTTP LAN (micro cần secure context). Không khẳng định ngang đầy đủ các tính năng Online khi chưa thử thực tế.
- Không có Host migration, phòng đóng khi PC Host tắt ứng dụng, tối đa 10 người chỉ ở chế độ Sống Còn.
- Đây là bản **beta/QA**, cần thử bằng ít nhất 2 thiết bị thật (Windows và Android), đặc biệt là Tranh Trứng, mất kết nối và save, trước khi phát hành rộng.
