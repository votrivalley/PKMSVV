# Android FULL LAN — cập nhật APK không cần xóa game

## Lý do bản 1.5.23 không cài đè được

Workflow cũ dùng `assembleDebug` trên máy ảo GitHub Actions. Mỗi máy ảo
có thể tạo một khóa ký debug mới. Android yêu cầu **package ID + chứng chỉ
chữ ký APK tương thích + versionCode không giảm** mới cài đè và giữ dữ liệu.

FULL LAN: `com.votrivalley.pkmsvv.fulllan`
Offline cũ: `com.ronvotri.pkmsvv`.
Đây là hai ứng dụng khác nhau; không thể chuyển save tự động giữa chúng.

**Không gỡ ứng dụng có save trước khi xuất save ra JSON và xác minh bản sao**.
Nếu chứng chỉ của APK đã cài khác và không còn khóa ký cũ, không thể
cài đè bằng key mới. Phải sao lưu, gỡ đúng ứng dụng cũ một lần, cài APK
phát hành ký cố định rồi nhập lại JSON. Từ những bản sau, miễn dùng đúng
key và tăng versionCode, có thể cài đè mà không xóa save.

## Cấu hình một khóa ký cố định, làm một lần

1. Trên **máy riêng của người phát hành** có JDK 21, tạo file keystore mới:

   ```powershell
   keytool -genkeypair -v -keystore pkmsvv-full-lan-update.jks -storetype PKCS12 -alias pkmsvv -keyalg RSA -keysize 3072 -validity 10000
   ```

   Đặt mật khẩu mạnh, giữ file và mật khẩu trong kho bí mật có sao lưu.
   **Không commit .jks, không gửi file khóa qua chat, không upload artifact.**
   Với PKCS12, mật khẩu khóa và mật khẩu keystore thường là một.

2. Mở repository `votrivalley/PKMSVV` → **Settings → Secrets and variables →
   Actions → New repository secret**. Lưu bốn secret:

   - `PKMSVV_ANDROID_KEYSTORE_BASE64`: Base64 của toàn bộ file keystore.
     Trên máy Windows, chạy trong thư mục chứa .jks:

     ```powershell
     [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path '.\pkmsvv-full-lan-update.jks'))) | Set-Clipboard
     ```

     Sau đó dán nội dung clipboard vào giá trị secret, không dán vào chat.
   - `PKMSVV_ANDROID_KEYSTORE_PASSWORD`: mật khẩu keystore.
   - `PKMSVV_ANDROID_KEY_ALIAS`: `pkmsvv`.
   - `PKMSVV_ANDROID_KEY_PASSWORD`: mật khẩu khóa (thường giống keystore).

3. Vào **Actions → Build Android FULL Game + Co-op LAN Beta → Run workflow**.
   Khi có đủ 4 secret, pipeline vừa tạo bản thử nghiệm debug vừa tạo bản
   **`PKMSVV-Android-FULL-LAN-SIGNED-UPDATE`**. Chỉ phát bản
   `SIGNED-UPDATE` cho người chơi muốn cài đè về sau.
   Nếu secrets chưa cấu hình, pipeline vẫn tạo
   `PKMSVV-Android-FULL-LAN-DEBUG-TEST-ONLY`, không nên phát hành làm
   bản cập nhật thường xuyên. Nếu chỉ cấu hình một phần secrets, pipeline
   báo lỗi rõ ràng.

4. Trước khi gửi APK, đối chiếu `applicationId`, `versionCode`,
   chứng chỉ ký SHA-256 của 2 APK nếu kiểm tra một bản cập nhật:

   ```powershell
   apksigner verify --print-certs --verbose .\PKMSVV-OLD.apk
   apksigner verify --print-certs --verbose .\PKMSVV-NEW.apk
   aapt dump badging .\PKMSVV-NEW.apk
   ```

   `apksigner` và `aapt` nằm trong Android SDK build-tools. SHA-256 của
   signer phải trùng nhau (trừ cấu hình rotation hợp lệ). Nếu không trùng,
   dừng cập nhật; **không thử cài đè để đánh cược dữ liệu save**.

## Những ràng buộc an toàn của workflow

- Signing riêng cho *release* `com.votrivalley.pkmsvv.fulllan`, không
  đổi ID sang ứng dụng Offline hoặc LAN Client.
- Key file chỉ tồn tại trong thư mục tạm của GitHub runner trong bước ký,
  được xóa sau khi build; Gradle chỉ lấy mật khẩu từ biến môi trường.
- Version code của 1.5.23 hiện được tính từ version dạng 1.5.23 =
  `1005023`. Phiên bản sau phải tăng version code.
- **Không có cách lấy lại khóa debug không được lưu trên runner cũ.**
  Bất kỳ bản APK nào đã ký bằng key đó cần bước chuyển một lần nói trên.
- Trên Android, nút *Cài đặt* với bản update có thể vẫn hiện cảnh báo do
  cài ngoài Play Store, nhưng khi chữ ký và version hợp lệ sẽ không bắt
  xóa ứng dụng để cài đè.

Trạng thái: mã nguồn và CI hỗ trợ signing cố định; **chưa có khóa phát hành
trong GitHub Secrets thì chưa có APK signed-update được xác nhận thực tế.**
