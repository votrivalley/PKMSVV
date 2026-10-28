# PKMSVV v1.5.29 — nghiệm thu Wi-Fi trên thiết bị thật

Trạng thái: **CHƯA CHẠY QA THIẾT BỊ THẬT** (28/10/2026). Đây là checklist thực thi, không phải báo cáo PASS.
Nhánh: `feature/lan-local-beta`. Build game đã xác minh: `915ba8c678cdc3379f440721ee17f759a1cc3028`; commit bàn giao tài liệu: `3984878121faedb4fea4aa0903b1669488ca5208`.

Tài liệu bắt buộc: `AGENTS.md`, `docs/CLOUD_HANDOFF.md`, `docs/QA_V1529.md`, `docs/WIFI_CROSSPLAY.md`, `docs/ANDROID_UPDATE_SIGNING.md`, đặc tả `docs/PKMSVV_V1529_ARENA_EGG_SPAWN_CODEX_HANDOFF.md` và Issue #7.
**Không được đánh dấu đạt chỉ vì CI xanh hoặc đóng Issue #7 khi chưa có chứng cứ thiết bị thật.**

## 1. Khóa phát hành và dữ liệu trước khi thử

- [ ] Ghi model/OS/browser và phiên bản của từng thiết bị; cùng SSID, cùng LAN, không bật guest/client isolation. Ghi cách truy cập Web (HTTPS/PWA) và nguồn điện/pin.
- [ ] PC dùng artifact **PKMSVV-LAN-Windows-Fast-Start**, Web dùng **PKMSVV-Cloudflare-Pages-FULL-HTML5**, Android chỉ dùng **PKMSVV-Android-FULL-LAN-SIGNED-UPDATE**. Đối chiếu workflow, source SHA và phiên bản 1.5.29 giữa ba artifact.
- [ ] Trước mọi thao tác với Android có app debug cũ: **xuất JSON save, thử đọc lại file và đối chiếu tiến độ/Pokémon**. Không gỡ app hay xóa dữ liệu khi chưa có bản sao xác minh. APK debug 1.5.27/1.5.28 không cùng chứng chỉ với APK release cố định, nên không thể giả định cài đè được.
- [ ] APK release phải được kiểm bằng `scripts/verify-android-signing.cjs --apk`, đúng pin ở `config/android-signing-identity.json`, package `com.votrivalley.pkmsvv.fulllan` và versionCode **1005029**. Không ghi hoặc công khai keystore, mật khẩu, key vật lý, save JSON.
- [ ] Khi kiểm tra bản cập nhật **tiếp theo**, không đổi khóa/package/alias/fingerprint; phải tăng versionCode. Không lấy debug APK thay cho bản release.
- [ ] Web cần tải và cache/install đầy đủ khi còn mạng. Sau đó mới thử tắt Internet **nhưng vẫn bật Wi-Fi nội bộ**; HTTP origin chưa cache không được coi là offline-capable.

## 2. Ghép nối thật — tối thiểu sáu chiều khác nền tảng

Mỗi ca: tạo phòng ở Host, chọn đúng chế độ, tạo lời mời **riêng cho từng Guest**; Guest đọc/dán QR, văn bản hoặc file; Guest trả phản hồi; Host nhận phản hồi; Guest bấm Vào phòng. Lặp lại để ghép thêm người. Không dùng server Internet, STUN/TURN hay PC trung gian.

| Host | Guest | Kết quả | Lỗi/ảnh/video/log |
| --- | --- | --- | --- |
| PC | Web | Chưa thử | |
| PC | APK | Chưa thử | |
| Web | PC | Chưa thử | |
| Web | APK | Chưa thử | |
| APK | PC | Chưa thử | |
| APK | Web | Chưa thử | |

Nếu có đủ thiết bị, thêm PC↔PC, Web↔Web, APK↔APK. Không diễn giải sáu ca này thành chứng nhận mọi router hoặc iOS. Cần thử ít nhất một router phổ thông, và nếu có thể thêm router có client isolation để xác nhận thông báo lỗi/retry.

- [ ] Đường QR thực tế quét được; nếu máy không có `BarcodeDetector`, đường văn bản và file `.txt` vẫn hoạt động. Kiểm tra lời mời hết hạn sau 2 phút, hủy và tạo mới.
- [ ] Không có truy cập Internet sau khi tài nguyên đã tải; không phải nhập IP hoặc dùng dịch vụ phòng trực tuyến. Hai máy vẫn trao đổi trạng thái/tọa độ.
- [ ] Guest không thể kick/add bot/start, giả mạo Host, dùng lại phản hồi cũ hoặc nhận thêm người quá giới hạn. Host kick người/bot đúng đối tượng; Host thoát thì Guest thấy phòng đóng.
- [ ] Chuyển app Android sang nền, tắt/bật màn hình, đổi Wi-Fi rồi trở lại: ghi rõ có mất kết nối hay không; **không mặc định** có reconnect hoặc Host migration.

## 3. Chế độ chơi và vòng đời trận

Chạy Host lần lượt trên **PC, Web, APK**, với đủ ba mode khi thiết bị và thời gian cho phép. Điền PASS/FAIL/BLOCKED cùng điều kiện và bằng chứng; không thay bằng kết quả mô phỏng CI.

| Ca thực tế | PC Host | Web Host | APK Host |
| --- | --- | --- | --- |
| Sống Sót / Co-op (2–4 người, có AI) | Chưa thử | Chưa thử | Chưa thử |
| Sống Còn / Royale (2–10 người, có AI) | Chưa thử | Chưa thử | Chưa thử |
| Tranh Trứng (4 người, có AI) | Chưa thử | Chưa thử | Chưa thử |

- [ ] Tất cả: tạo/join phòng, chọn starter/skill hợp lệ, AI lên cấp, cứu AI ngã, kết thúc trận, trở lại lobby, chơi trận thứ hai và đổi mode **không bị dùng lại trạng thái trận cũ**.
- [ ] Co-op: tối đa 2 support riêng mỗi trainer, pet chạy/đánh/nhận damage đúng chủ; hỗ trợ AI; không có vòng bo ép Co-op. Trận dài lý tưởng qua mốc boss 10/20/30 phút.
- [ ] Royale: thử 2/4/10 người (được bổ sung AI nhưng không vượt 10). Vùng 1650 từ 0–4 phút, co về 1200 vào phút 8 và 900 vào phút 12; cảnh báo, ân hạn ngoài vùng 10 giây rồi mất 1% max HP/s do Host xác nhận. Trứng hỗ trợ: lần đầu tối đa 5 tổ lúc 00:30, tối đa 2 tổ/45s, cap 6 tổ chưa nhặt, TTL 180s, 2 support/trainer; double claim bị từ chối. Quái đầu trận có tăng riêng Royale, không vượt cap 60→80. Chạy tối thiểu **13 phút** để kiểm mốc bo phút 12.
- [ ] Tranh Trứng: đúng 4 người (kể cả AI); vùng cố định 1600 không co/không gây damage vùng; 12 phút tính điểm, sinh trứng tính điểm giữ nguyên, hồi sinh đúng luật, không PvP.
- [ ] Trong Royale/Tranh Trứng: vé và Shiny thưởng **riêng người nhặt/hạ**, không chia chung; kiểm riêng từng profile và save. Không để AI ghi đè save người thật.
- [ ] Sau trận: export/import JSON, thoát/mở lại, kiểm nickname, starter, collection, gacha, vé, Shiny và tiến độ. Không xóa storage/cache để làm test xanh.

## 4. Hiệu năng và bằng chứng

- [ ] Mỗi Host chạy cảnh 2/4 người ngắn và **10 phút với 10 người ở Royale** (AI có thể bù, ghi tỷ lệ human/bot). Nếu muốn xác nhận mốc bo, chạy thêm đến ít nhất phút 13. So sánh thiết bị foreground với background, tránh quy FPS nền thấp cho engine.
- [ ] Thu FPS mean/p95/worst frame, dropped frames, CPU/memory/nhiệt/pin Android nếu đo được, active enemy/support/nests, route/A* operations và Host payload bytes/s. Báo rõ cấu hình và khoảng thời gian; không chép FPS desktop sang FPS điện thoại.
- [ ] Mục tiêu tham khảo từ đặc tả: Android Host **>=30 FPS bền vững**, PC Host khoảng **50–60 FPS** khi phần cứng phù hợp. Ghi số thực và giật frame; không coi mục tiêu là thành tích đã đạt.
- [ ] Chụp hoặc quay HUD Android ngang trên màn hình nhỏ: bảng điểm/sinh tồn, HP, skill, trứng/chỉ dẫn, nút cảm ứng không chồng/overflow. Thử xoay màn hình và mất full-screen nếu phù hợp.
- [ ] Lưu log lỗi đã lọc dữ liệu riêng tư; **không công khai SDP/ICE có địa chỉ mạng nội bộ, save JSON, password hoặc keystore**. Với FAIL: ghi bước tái hiện, Host/Guest, loại router, thời điểm, kết quả mong đợi/thực tế và link bằng chứng riêng tư.

## 5. Kết luận nghiệm thu

- CI đã PASS trên SHA `915ba8c` cho ba workflow; các điểm đo 10 phút và checksum APK nằm tại `docs/QA_V1529.md`. Đây là **bằng chứng build/desktop browser**, không thay thế các ca phía trên.
- Bất kỳ ca quan trọng nào **FAIL/BLOCKED/CHƯA THỬ** phải được báo rõ, không ghi release acceptance PASS hoặc đóng Issue #7 như đã hoàn tất.
- Không mở lobby 20 người; không bỏ test; không tự merge `main`. Sau sửa code mới, chạy lại toàn bộ CI, build ba nền tảng **cùng commit**, kiểm APK ký cố định và versionCode tăng nếu phát hành bản Android mới.

Bản tải/bằng chứng gốc: Android [run 40565021872](https://github.com/votrivalley/PKMSVV/actions/runs/40565021872), PC [run 40565021889](https://github.com/votrivalley/PKMSVV/actions/runs/40565021889), Web [run 40565021820](https://github.com/votrivalley/PKMSVV/actions/runs/40565021820).
