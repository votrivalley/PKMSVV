# Đưa PKMSVV Web Online lên Firebase Hosting – làm một mạch

**Đã xong:** Google Authentication, Cloud Firestore, Realtime Database, quy tắc truy cập và GitHub Secret `PKMSVV_FIREBASE_CONFIG_JSON` (theo các bước chủ dự án đã thao tác trên Console). **Chưa công khai trang web; chưa xác minh chế độ nhiều người chơi bằng thiết bị thật.**

**Dự án Firebase:** `pkmsvv-b84d2`  
**Repo phát triển web:** https://github.com/votrivalley/PKMSVV

## A. Tạo gói website trên GitHub

1. Trong GitHub của `votrivalley/PKMSVV`, chọn **Actions → Build Web Edition (test artifact)**.
2. Chọn **Run workflow → Branch: main → Run workflow**.
3. Chờ dấu tích xanh. Chọn run vừa xong → cuối trang **Artifacts → PKMSVV-Web-Hosting** để tải file ZIP.
4. Giải nén ZIP vào một thư mục riêng, ví dụ `D:\\PKMSVV-Web-Hosting`. Bên trong phải có:
   - `firebase.json` — cấu hình Firebase Hosting được đóng gói sẵn.
   - `site\\index.html` — trang chọn phương thức save.
   - `site\\game\\index.html` — trò chơi HTML5.
5. Nếu workflow đỏ, xem job lỗi. Nếu báo `Firebase config must be valid JSON`, `missing apiKey` hoặc `Missing own Firebase config`, hãy sửa **GitHub Secret** bằng JSON cấu hình Web App của chính `pkmsvv-b84d2`. **Không** dùng khóa quản trị Firebase, không đăng nội dung Secret vào chat.

Không cần tạo GitHub Variable `PKMSVV_ALLOWED_HOSTS` nếu dùng tên miền Firebase mặc định. Builder tự nhận `pkmsvv-b84d2.web.app` và `pkmsvv-b84d2.firebaseapp.com`. Nếu dùng tên miền riêng thì mới khai báo tên miền (không có `https://`) trong biến này rồi build lại.

## B. Cài Firebase CLI trên Windows (một lần)

1. Cài Node.js phiên bản LTS tại https://nodejs.org/ nếu máy chưa có. Sau khi cài, **mở cửa sổ PowerShell mới**.
2. Chạy `node -v` để xác nhận đã cài Node.js.
3. Cài công cụ Firebase:

```powershell
npm install -g firebase-tools
```

4. Đăng nhập tài khoản Google đang quản lý dự án Firebase:

```powershell
firebase login
```

Trình duyệt bật ra, chọn đúng Gmail chủ dự án và đồng ý quyền cần thiết.

## C. Đưa game lên Firebase Hosting

1. Mở thư mục **đã giải nén** chứa `firebase.json` và `site` trong File Explorer.
2. Nhấp chuột vào thanh địa chỉ thư mục, nhập `powershell`, nhấn Enter để mở PowerShell ngay trong thư mục.
3. Chạy:

```powershell
firebase deploy --only hosting --project pkmsvv-b84d2
```

Chú ý **có chữ `--only hosting`**: lệnh này chỉ đưa website lên, **không tự ghi đè** Firestore Rules hay Realtime Database Rules bạn đã thiết lập.

4. Nếu deploy thành công, Firebase cung cấp URL mặc định:
   - https://pkmsvv-b84d2.web.app
   - https://pkmsvv-b84d2.firebaseapp.com

**Đừng coi các đường dẫn trên là website đã hoạt động cho đến khi Firebase báo deploy thành công.** Website Firebase Hosting là **công khai với bất kỳ ai biết đường dẫn**, không phải hệ thống được giới hạn đăng nhập. Chỉ triển khai khi chấp nhận phạm vi phân phối và đã xem xét quyền sử dụng tài sản game.

## D. Cho phép đăng nhập Google tại tên miền game

1. Mở https://console.firebase.google.com/project/pkmsvv-b84d2/authentication/settings
2. Chọn **Authorized domains**.
3. Kiểm tra `pkmsvv-b84d2.web.app` và `pkmsvv-b84d2.firebaseapp.com`. Nếu thiếu, chọn **Add domain** và nhập đúng tên miền, **không có** `https://`.
4. Google Authentication đang bật; không cần cấu hình SHA-1 Android cho bản web.

## E. Thử chức năng

1. Mở trang `.web.app` trên PC bằng HTTPS. Màn hình đầu tiên có hai lựa chọn: **Chơi và lưu trên thiết bị** / **Đăng nhập / chơi online qua Google**.
2. Chọn chơi online, thử mở popup Google và đăng nhập. Kiểm tra Firestore có save được tạo đúng tài khoản.
3. Mở trang trên điện thoại hoặc trình duyệt khác, dùng **tài khoản Google khác** để vào. Thử mời bạn và tạo phòng Co-op hai người.
4. Kiểm tra: vào trận, kỹ năng tự đánh, boss, thoát, tải lại trang, giữ save; sau đó mới thử ba hoặc bốn người.
5. Battle Royale 10 người hiện **mới có tài liệu thiết kế, chưa được tích hợp vào gameplay**.
6. Trước khi xóa dữ liệu trình duyệt hay đổi thiết bị, hãy sử dụng chức năng sao lưu save thủ công; Google/cloud chưa qua kiểm thử đầy đủ trên bản phát hành này.

## Khi gặp lỗi thường gặp

- **Build workflow đỏ:** kiểm tra Secret có phải JSON hợp lệ không; không dán `const firebaseConfig =` vào Secret.
- **Nút Google bị mờ:** build chưa nhận Secret; tải lại build mới của workflow, không dùng gói offline preview cũ.
- **Đăng nhập bị `auth/unauthorized-domain`:** thêm tên miền ở Firebase Authorized domains rồi thử lại.
- **`permission-denied`:** rà soát Firestore hoặc Realtime Database Rules, **không** chuyển sang Test mode để chữa lỗi.
- **Không vào được trận hai người:** thử hai mạng/thiết bị khác nhau; WebRTC gốc chỉ dùng STUN, một số mạng cần TURN và sửa tương thích multiplayer.

Các quy tắc bảo mật hiện là bản khởi đầu lấy từ upstream và chưa qua audit đầy đủ. Cần thử bằng tài khoản riêng biệt trước khi chia sẻ rộng.


## Sửa lỗi đăng nhập Google: auth/api-key-not-valid (23/10/2026)

Nếu form đăng nhập hiển thị `auth/api-key-not-valid-please-pass-a-valid-api-key`, cấu hình Firebase Web API Key của gói đang triển khai sai hoặc không được chấp nhận.

1. Mở https://console.firebase.google.com/project/pkmsvv-b84d2/settings/general, kéo xuống **Your apps**, chọn **PKMSVV Web**, mở **SDK setup and configuration → Config**.
2. Sao chép `apiKey` chính xác (chuỗi dài bắt đầu bằng `AIza`), không dùng placeholder như `GIÁ_TRỊ_APIKEY_TRONG_FIREBASE`.
3. Vào https://github.com/votrivalley/PKMSVV/settings/secrets/actions, chọn nút cây bút cạnh **PKMSVV_FIREBASE_CONFIG_JSON**. Thay `apiKey` bằng khóa thật; nên soát lại `authDomain`, `projectId`, `appId`, `databaseURL` so với Firebase Config. Nhấn **Update secret**. **Không đưa Service Account/Admin SDK keys vào Secret này**.
4. Sau khi sửa Secret, vào GitHub Actions → **Build Web Edition (test artifact)** → **Run workflow** (nhánh `main`). Nếu secret là placeholder/sai định dạng, bản build mới sẽ **báo lỗi đỏ** thay vì tạo một website đăng nhập bị lỗi.
5. Khi workflow xanh, tải **PKMSVV-Web-Hosting** của run MỚI, giải nén đè sang thư mục triển khai. Trên PowerShell trong thư mục có `firebase.json`, chạy `firebase.cmd deploy --only hosting --project pkmsvv-b84d2`.
6. Tải lại trang bằng **Ctrl+Shift+R**, kiểm tra Google Sign-In. Nếu vẫn có lỗi dù chuỗi `apiKey` đúng, kiểm tra **Google Cloud Console → APIs & Services → Credentials → Browser key**. Khóa cần thuộc cùng Firebase project và cho phép **Identity Toolkit API** và **Token Service API**. Nếu bị giới hạn HTTP referrer, thêm tên miền Web Hosting đúng định dạng `https://pkmsvv-b84d2.web.app/*`. Đừng tắt mọi hạn chế API để sửa tạm.
7. Chế độ Google phải thực sự đăng nhập xong và xuất hiện hồ sơ trong **Firebase Authentication → Users**; tạo tài khoản tên/mật khẩu riêng chỉ dùng Online nếu cũng bật **Authentication → Sign-in method → Email/Password**. Chức năng offline không tự trở thành online chỉ vì đang ở trên website.

Đừng thử đổi Firestore/Realtime Database sang Test Mode để chữa lỗi API Key: hai vấn đề không liên quan.
