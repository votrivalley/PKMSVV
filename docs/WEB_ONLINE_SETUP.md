# Hướng dẫn bật Web Game và chơi online – Pokémon Survivor (Votri Valley)

> **Tài liệu tiếng Việt dành cho người quản lý dự án.** Các tên nút tiếng Anh như `Authentication`, `Firestore`, `Actions` được giữ nguyên để bạn dễ tìm đúng mục trên website Firebase/GitHub.

## 0. Hiện giờ chúng ta đã làm tới đâu?

- Đã sao chép **79 tệp mã nguồn** từ bản `ronvotri/PKMSVV` v1.2.1 (mốc `7a40ae7`) sang repo này. Đây là **bản sao mã nguồn**, **không phải** bản sao toàn bộ lịch sử commit của repo gốc.
- Đã có quy trình tạo bản **Web Game HTML5** và trang chọn cách lưu game.
- Đã chuẩn bị mã để khôi phục đăng nhập, phòng co-op qua Firebase/WebRTC từ game gốc.
- **Chưa có website đang hoạt động công khai. Chưa có máy chủ Firebase riêng được kết nối. Chưa kiểm tra được 2 người chơi online thật.**
- Bản Windows, Android và Switch offline ở repo `ronvotri/PKMSVV` **không bị thay đổi**.

**Để chơi online được, trước tiên bạn cần tạo một dự án Firebase riêng cho Votri Valley.** Không dùng Firebase của JPTER78 vì đó là máy chủ và dữ liệu của tác giả game gốc.

## 1. Tạo Firebase miễn phí để bắt đầu

1. Vào **https://console.firebase.google.com/** rồi đăng nhập Google.
2. Chọn **Create a project / Tạo dự án**.
3. Đặt tên, ví dụ `pkmsvv-votrivalley` (tên và mã dự án thực tế có thể khác).
4. Có thể **tắt Google Analytics** nếu hiện tại chỉ thử nghiệm game.
5. Chọn **Create project / Tạo dự án** và mở dự án vừa tạo.

**Lưu ý:** Firebase có hạn mức miễn phí theo từng dịch vụ. Nếu vượt hạn mức, chức năng có thể ngừng hoặc phát sinh phí tùy gói bạn chọn. Không nên bật thanh toán khi chưa hiểu giới hạn sử dụng.

## 2. Cho phép đăng nhập Google

Trong dự án Firebase:

1. Ở menu bên trái, tìm **Build → Authentication**.
2. Chọn **Get started / Bắt đầu**.
3. Mở tab **Sign-in method / Phương thức đăng nhập**.
4. Chọn **Google → Enable / Bật**.
5. Chọn email hỗ trợ theo yêu cầu, sau đó nhấn **Save / Lưu**.
6. Nếu muốn dùng tài khoản kiểu tên người dùng + mật khẩu như game gốc, bật thêm **Email/Password**. Đây là chức năng *tùy chọn* cho giai đoạn thử nghiệm Google.

Sau này người chơi có thể chọn:

- **Chơi và lưu trên thiết bị:** không đăng nhập, lưu trong trình duyệt.
- **Đăng nhập Google để chơi online:** dùng Firebase để xác thực, lưu đám mây và tham gia phòng chơi.

**Quan trọng:** Hai chế độ hiện chưa có chức năng tự nhập/chuyển save cho nhau. Hãy xuất bản sao lưu trước khi đổi trình duyệt hoặc xóa dữ liệu web.

## 3. Tạo hai loại cơ sở dữ liệu

### 3.1. Cloud Firestore – dùng cho tài khoản và save

1. Trong Firebase chọn **Build → Firestore Database**.
2. Nhấn **Create database / Tạo cơ sở dữ liệu**.
3. Chọn vị trí máy chủ phù hợp và bắt đầu bằng **Production mode / Chế độ sản xuất** (chặn truy cập mặc định).
4. Vào tab **Rules / Quy tắc**.
5. Mở tệp [`firebase/firestore.rules`](../firebase/firestore.rules) trong repo này; dùng nội dung đó làm **bản khởi đầu để rà soát** rồi mới xuất bản lên Firebase.

**Không chọn chế độ thử nghiệm mở quyền đọc/ghi cho mọi người.** Cần kiểm tra quy tắc sao cho mỗi người chỉ truy cập được save của mình. Quy tắc hiện tại lấy cảm hứng từ mã gốc và **chưa được kiểm toán bảo mật cho việc đưa ra công chúng**.

### 3.2. Realtime Database – dùng để tìm phòng và kết nối người chơi

1. Chọn **Build → Realtime Database**.
2. Nhấn **Create database / Tạo cơ sở dữ liệu**.
3. Chọn vị trí máy chủ, sau đó chọn chế độ **khóa mặc định**.
4. Mở tab **Rules / Quy tắc**.
5. Dùng [`firebase/database.rules.json`](../firebase/database.rules.json) làm bản tham khảo, kiểm tra rồi xuất bản.
6. Sao chép địa chỉ cơ sở dữ liệu, ví dụ:
   `https://ten-du-an-default-rtdb.asia-southeast1.firebasedatabase.app`

**Đừng nhầm:** Firestore dùng cho lưu tiến trình; Realtime Database dùng cho các sự kiện/phòng chơi. Muốn bật co-op theo mã game gốc, chúng ta cần cả hai.

## 4. Đăng ký ứng dụng Web trong Firebase

1. Trong Firebase, mở **Project settings / Cài đặt dự án** (biểu tượng bánh răng).
2. Tại mục **Your apps / Ứng dụng của bạn**, nhấn biểu tượng **`</>`** để tạo ứng dụng Web.
3. Đặt tên gợi nhớ như `PKMSVV Web`, rồi bấm **Register app**.
4. Firebase hiển thị phần cấu hình gồm các trường:

```json
{
  "apiKey": "GIA_TRI_FIREBASE_CUA_BAN",
  "authDomain": "ten-du-an.firebaseapp.com",
  "projectId": "ten-du-an",
  "appId": "1:123456:web:abc123",
  "databaseURL": "https://ten-du-an-default-rtdb.asia-southeast1.firebasedatabase.app"
}
```

Đây chỉ là **ví dụ**, không phải cấu hình có thể sử dụng ngay. Hãy lấy các giá trị thật từ dự án Firebase của bạn. Trường `databaseURL` lấy từ bước 3.2 nếu Firebase không đưa sẵn trong cấu hình ứng dụng Web.

- Cấu hình Firebase Web **khác** với khóa quản trị **Admin SDK / Service Account**.
- **Không tải hoặc đưa file khóa quản trị Firebase lên GitHub**, không đăng file đó ở nơi công khai.
- Không được dùng các thông số thuộc dự án `pokesurvivor-free` hoặc `pokesurvivor-jpter` của tác giả gốc.

## 5. Kết nối Firebase với GitHub repo Votri Valley

Mở repo [`votrivalley/PKMSVV`](https://github.com/votrivalley/PKMSVV) và làm như sau:

1. Vào **Settings** của repository.
2. Ở bên trái chọn **Secrets and variables → Actions**.
3. Trong tab **Secrets**, nhấn **New repository secret**.
4. Phần **Name** nhập chính xác: `PKMSVV_FIREBASE_CONFIG_JSON`.
5. Phần **Secret** dán đối tượng JSON từ bước 4 rồi bấm **Add secret**.

Khi đã chọn tên miền chạy game thử nghiệm, bạn có thể vào **Variables → New repository variable** để tạo:

- **Name:** `PKMSVV_ALLOWED_HOSTS`
- **Value:** tên miền của bạn, ví dụ `game-thu.example.com` (**không** viết `https://`, không có dấu `/`).

Nếu có nhiều tên miền, phân tách bằng dấu phẩy.

**Đồng thời phải thêm đúng tên miền đó tại Firebase:**

**Authentication → Settings → Authorized domains → Add domain**.

> Tạo Secret xong **chưa đồng nghĩa game đã online**. Phải chạy lại workflow build web và triển khai tệp game lên một máy chủ HTTPS. Các thông số JSON của Web App được đưa vào trình duyệt khi chạy, nên bảo mật thật sự nằm ở quy tắc Firebase, xác thực người dùng và giới hạn dịch vụ; GitHub Secret chỉ giúp quản lý cấu hình trong quy trình build.

## 6. Build bản Web Game

### Cách A – Dùng GitHub Actions (đơn giản hơn)

1. Mở [**GitHub Actions**](https://github.com/votrivalley/PKMSVV/actions).
2. Chọn workflow **Build Web Edition (test artifact)**.
3. Chọn **Run workflow**, chọn nhánh `main` rồi chạy.
4. Khi workflow hoàn thành và có dấu tích xanh, vào mục **Artifacts**.
5. Tải **PKMSVV-Web-Dev-Build**.

Đây là **gói website**. Giải nén sẽ có `index.html`, thư mục `game/` và các tệp liên quan. Hiện workflow **chỉ đóng gói và kiểm thử, không tự đưa game lên Internet**.

Nếu chưa có Firebase, workflow vẫn tạo được **bản xem thử offline**.

### Cách B – Build trên máy tính (dành cho người làm kỹ thuật)

Yêu cầu: **Node.js 22+** và **Git**. Trong thư mục repo `votrivalley/PKMSVV`, chạy:

```bash
git init vendor/pokesurvivor
git -C vendor/pokesurvivor remote add origin https://github.com/JPTER78/pokesurvivor.git
git -C vendor/pokesurvivor fetch --depth 1 origin 11fe868c640b62ac37beacc222e056bc4d9ec892
git -C vendor/pokesurvivor checkout --detach FETCH_HEAD
npm install
npm run test:web
npm run prepare:web
```

Để build có online, hãy lưu cấu hình thật vào `config/firebase.web.local.json` trên máy của bạn. Tệp này đã được thêm vào `.gitignore`, không nên commit. Hoặc sử dụng biến môi trường `PKMSVV_FIREBASE_CONFIG_JSON` cùng `PKMSVV_ALLOWED_HOSTS`.

Nếu **chỉ muốn xem thử offline**, đặt biến môi trường `PKMSVV_WEB_PREVIEW=1` trước khi chạy `npm run prepare:web`.

Kết quả nằm ở thư mục **`dist/web`**.

## 7. Đưa game lên website để thử nghiệm

Cần dịch vụ lưu trữ website tĩnh có **HTTPS**. Bạn có thể dùng một dịch vụ hosting mình quản lý hoặc một máy chủ thử nghiệm riêng.

- Tải **toàn bộ nội dung** thư mục `dist/web` lên hosting.
- Đảm bảo trang đầu (`index.html`) nằm tại thư mục gốc của website.
- Dùng **HTTPS** khi thử đăng nhập Google / WebRTC trên Internet.
- Thêm tên miền vừa chọn vào **Firebase Authorized domains** và danh sách host được phép ở bước 5.

**Lưu ý về bản quyền:** GitHub Actions tạo gói Web Game không đồng nghĩa có quyền phát hành game Pokémon công khai. Chỉ nên thử nghiệm trong phạm vi kiểm soát khi chưa giải quyết quyền sử dụng nhân vật, hình ảnh và tài sản liên quan. Thẻ `noindex` không phải mật khẩu, không ngăn người khác truy cập nếu biết URL.

## 8. Cách người chơi sử dụng

1. Người chơi mở đường dẫn web.
2. Màn hình đầu tiên cho chọn **Chơi và lưu trên thiết bị** hoặc **Đăng nhập / chơi online qua Google**.
3. Nếu chọn **offline**, game lưu bằng `localStorage` trong trình duyệt. Xóa dữ liệu trang web có thể mất save.
4. Nếu chọn **Google**, hệ thống đăng nhập qua Firebase và dùng Firestore để lưu dữ liệu; sau đó có thể dùng giao diện bạn bè/phòng co-op của game gốc.
5. Multiplayer tối đa 4 người là **mục tiêu khôi phục theo game gốc**, chưa được kiểm thử hoàn chỉnh trên bản Votri Valley.

**Giới hạn kỹ thuật:** kết nối trận đánh dùng WebRTC và cơ chế tạo phòng qua Firebase. Một số loại mạng có thể không kết nối được với nhau nếu chưa bổ sung máy chủ TURN. Không nên hứa rằng mọi mạng đều chơi được.

## 9. Kiểm thử trước khi mời bạn bè

1. Mở web trên máy tính, chọn lưu offline, chơi thử rồi tải lại trang xem save còn không.
2. Đăng nhập Google, thử lưu tiến trình, thoát ra và đăng nhập lại.
3. Dùng **hai thiết bị thật** tạo phòng, mời bạn, vào phòng, bắt đầu trận và thử đánh quái.
4. Kiểm tra boss, tiến hóa, các kỹ năng tự đánh 6–8 ô, cửa hàng Kecleon, lên cấp và trường hợp mất kết nối.
5. Đảm bảo save offline không bị tự ghi đè khi đăng nhập.
6. Kiểm tra website không vô tình kết nối sang Firebase của tác giả gốc.

**Kết luận:** Hiện đã build thành công bản web thử nghiệm. Việc cần làm trước tiên để online là **tạo Firebase riêng và cấu hình trên GitHub**. Sau đó mới triển khai lên HTTPS, kiểm thử multiplayer thật và điều chỉnh lỗi.

---

*Bản offline Windows/Android/Switch ở repo cũ vẫn được giữ nguyên. Tài liệu này chỉ nói về nhánh Web Game của Votri Valley.*
