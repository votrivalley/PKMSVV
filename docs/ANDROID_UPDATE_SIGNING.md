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

## Khóa cố định đã chốt ngày 28/10/2026

Người dùng đã cho phép tạo một khóa phát hành duy nhất và cấu hình GitHub.
Đây là **khóa ký APK, không phải API key**. Bốn Actions Secrets đã được thiết lập
và đều thuộc cùng một keystore, không phải bốn khóa khác nhau:

- `PKMSVV_ANDROID_KEYSTORE_BASE64`
- `PKMSVV_ANDROID_KEYSTORE_PASSWORD`
- `PKMSVV_ANDROID_KEY_ALIAS`
- `PKMSVV_ANDROID_KEY_PASSWORD`

Dấu vân tay chứng chỉ công khai cố định:
`bdb2c03f6eaa4906a1f4604886b6b2a2ae0562d9b1cc2953ab56147a2c8e2d26`.
Alias: `pkmsvv`. Ứng dụng: `com.votrivalley.pkmsvv.fulllan`.
Nguồn chuẩn: `config/android-signing-identity.json` và luật bắt buộc trong `AGENTS.md`.

**Không tạo khóa mới ở lần build sau. Không đổi dấu vân tay/alias/package ID để ép
build xanh.** Nếu thiếu hoặc sai Secrets, dừng build và khôi phục đúng khóa đã chốt.
Chạy `verify-android-signing.cjs --keystore` trước build và `--apk` sau build;
trình kiểm tra từ chối khóa khác, APK debug, sai phiên bản hoặc sai applicationId.
Workflow FULL LAN chỉ tạo/phát `SIGNED-UPDATE`, không còn phát APK debug dự phòng.
Những kiểm thử gameplay, save và thử tải cũ vẫn được giữ nguyên.

## Sao lưu và cập nhật

File keystore được giữ trong thư mục bảo mật bên cạnh repo `.pkmsvv-signing`,
không nằm trong Git; bản thứ hai được mã hóa trong GitHub Actions Secrets.
Không gửi keystore/mật khẩu qua chat, commit vào repo hoặc upload bản rõ làm artifact.
Bản sao mật khẩu cục bộ đang được kiểm tra/khôi phục: **chưa được coi là bản sao
khôi phục được** cho đến khi kiểm tra giải mã và đối chiếu chứng chỉ thành công.
Khóa ký đã chốt trên GitHub giữ nguyên trong quá trình sửa sao lưu này.

Mỗi bản cập nhật tiếp theo phải tăng version trong package.json để versionCode tăng
(ví dụ 1.5.29 = 1005029, 1.5.30 = 1005030), giữ nguyên khóa và các khóa save.
Chỉ lấy APK từ artifact `PKMSVV-Android-FULL-LAN-SIGNED-UPDATE` của workflow đầy đủ.
Vẫn cần kiểm tra package/version/chứng chỉ của APK tải về trước khi giao.

## Chuyển từ APK debug cũ — đúng một lần

Hai APK đã đối chiếu (1.5.27 từ Downloads và 1.5.28 từ GitHub) có chứng chỉ khác
nhau và khác khóa cố định mới. Không thể hứa cài đè giữ save trực tiếp cho chúng.
Giữ ứng dụng cũ cho đến khi đã xuất JSON và xác minh file chứa đúng tiến độ/Pokémon.
Sau đó mới thay ứng dụng bằng bản dùng khóa cố định và nhập JSON lại. Từ lần sau,
bản đã dùng khóa cố định có thể cài đè khi versionCode tăng. Agent không tự gỡ ứng
dụng hay xóa dữ liệu trên thiết bị của người dùng.

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

Trạng thái: khóa cố định đã tạo và lưu trong GitHub Secrets; chờ xác minh APK
SIGNED-UPDATE thực tế qua workflow có kiểm tra dấu vân tay.
