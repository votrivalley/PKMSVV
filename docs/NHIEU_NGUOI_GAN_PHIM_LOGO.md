# Pokémon Sống Sót — Nhiều người chơi riêng, gán phím, logo hai dòng

Cập nhật 23/10/2026.

## Đã đưa vào mã
- **Tên chế độ hiển thị:** `coop` → **Sống Sót** (nhóm cùng chống quái, 2–4 người); `royale` → **Sống Còn** (đấu loại, 2–10 người). Chỉ đổi chuỗi giao diện; giữ nguyên khóa kỹ thuật, save và ghép phòng.
- **Web Online:** Menu **Nhiều người chơi** riêng gồm Chơi nhanh (Sống Sót hoặc Sống Còn), danh sách phòng công khai, tạo phòng công khai/riêng tư, tham gia bằng mã phòng. Người lạ có thể ghép không cần kết bạn; nếu Chơi nhanh không tìm được phòng, hệ thống tạo phòng công khai để chờ người khác. Vẫn cần tối thiểu hai người để bắt đầu. **Bạn bè** chỉ hiển thị danh sách/nhận kết bạn và có thể mời vào phòng đã tham gia.
- **Phòng có tên chế độ:** Sống Sót (hợp tác) tối đa 4; Sống Còn (đối kháng, Beta) tối đa 10. Phòng đã vào trận `open=false` và không được nhận người mới.
- **Bộ gán phím dùng chung Web/Windows/Android:** Cài đặt → Điều khiển → **Gán phím bàn phím**. Nhấn một hành động rồi nhấn phím muốn dùng; báo trùng, phím Esc hủy đang gán; có **Lưu phím, Hủy, Mặc định**. Lưu qua `ps.settings.keys` của từng thiết bị, **không chỉnh Save hoặc tự đồng bộ vào Online**. Phím tay cầm/cảm ứng vẫn tách biệt.
- **Tên game:** Logo màn đăng nhập, menu, màn hình khác đặt chính xác thành **Pokémon** (dòng 1) và **Sống Sót** (dòng 2), không tự ngắt giữa hai chữ `Sống Sót`. Tên package và vị trí save không thay đổi.

## Cấu hình Firebase bắt buộc (trước khi sử dụng phòng công khai)

Bản GitHub mới có file `firebase/database.rules.json` với nhánh `publicRooms`, cần triển khai trên **Firebase Realtime Database → Rules**. Chỉ thay rules của **Realtime Database** (không thay Firestore Rules bằng JSON). Có thể dùng Firebase CLI trong thư mục có file `firebase.json` trỏ đúng tới rules đã kiểm tra và chạy:

```powershell
firebase.cmd deploy --only database --project pkmsvv-b84d2
```

**Quan trọng:** Kiểm tra `firebase.json` tham chiếu đúng file rules và backup rules trên Firebase Console trước khi deploy. Chưa được giả định Rules đã lên server chỉ vì workflow build xanh. Việc tạo phòng công khai sẽ báo lỗi nếu thiếu rules.

## QA còn cần
1. Hai tài khoản Google riêng: tạo phòng công khai, làm mới danh sách trên máy thứ hai, vào phòng, thoát phòng, xác nhận index mất và không ai lọt vào phòng đã khóa.
2. Chơi nhanh 2–4 người và Sống Còn 2→4→10; xác minh WebRTC, tốc độ truyền và lỗi Host mất kết nối.
3. PC: đổi W thành I, A thành J, S thành K, D thành L, F thành Space; lưu rồi kiểm tra trong trận và khởi động lại. Đổi phím lá bài 1–3 trong màn lên cấp, đảm bảo tay cầm còn hoạt động.
4. Kiểm tra logo trên màn hình ngang/dọc, Android kích thước nhỏ; không để dòng 2 ngắt chữ.
5. Cả ba bản build có thể cập nhật tệp, **nhưng PC và APK chưa được tích hợp đăng nhập Online**. Mục Nhiều người chơi chỉ xuất hiện ở Web cho đến khi native cross-play hoàn thành.

## Giới hạn
- Tạo/ghép phòng thử nghiệm kiểu `join public or create` **không phải matchmaking xếp hạng có máy chủ riêng**. Race condition khi nhiều người vào sát giới hạn phòng vẫn cần server-side transaction hoàn chỉnh.
- Mã phòng cần được chủ phòng chia sẻ trực tiếp; không được đăng nhập để lấy mã phòng của người khác.
- Điểm Sống Còn vẫn chỉ tính thử nghiệm trong trận, không đẩy lên bảng xếp hạng chính thức.
- **Chưa triển khai** Firebase Hosting/Realtime Database tự động; build xanh không đồng nghĩa đã phát hành.
