# Pokémon Chuyển Sinh — Cloudflare Pages Free (Full HTML5)

## Đã thiết kế
- Toàn bộ file Pokémon, hình động, âm thanh, bản đồ giữ nguyên trong thư mục `game/`; không phá đường dẫn.
- Truy cập website là vào game luôn, không có trang đăng nhập hoặc nút chơi trung gian.
- Save giữ **trên máy người chơi**, có nút 💾 sao lưu/khôi phục JSON. Không cần Cloudflare D1, KV, R2 hay Firebase.
- Service worker lưu các tệp game lõi, sau đó lưu hình/nhạc khi được sử dụng. Không ép tải toàn bộ 13k tệp trên iOS để tránh hết bộ nhớ.
- Kiểm tra trước khi build: Cloudflare Pages Free có tối đa 20.000 tệp, mỗi tệp 25 MiB. Nếu vượt giới hạn hoặc thiếu game, build **báo lỗi**, không phát hành gói vỏ rỗng.

## Cách lấy gói build xong
Vào GitHub Actions → `Build Cloudflare Pages FULL HTML5` → chọn lượt Success → Artifacts → `PKMSVV-Cloudflare-Pages-FULL-HTML5`.
**Bản mới đã bỏ ZIP lồng ZIP:** Tải Artifact từ GitHub và giải nén một lần. Đảm bảo `index.html` nằm cạnh thư mục `game/` (không triển khai chính file ZIP).
Thư mục cuối cùng phải có `index.html`, `game/`, `sw.js`, `manifest.webmanifest`, `_headers` cùng cấp.

## Cấp quyền và triển khai lần đầu (không cần đưa mật khẩu cho ChatGPT)
1. Trên Windows cài Node.js LTS từ https://nodejs.org/ và đăng nhập https://dash.cloudflare.com/ bằng trình duyệt.
2. Mở PowerShell, chạy `npx wrangler@4 login`, đăng nhập và cấp quyền trong cửa sổ trình duyệt.
3. Tạo Direct Upload project: `npx wrangler@4 pages project create pkmsvv-web --production-branch pkmsvv-web` (chỉ cần lần đầu).
4. Mở PowerShell ở thư mục website **đã giải nén** (nơi có file `index.html`), chạy `npx wrangler@4 pages deploy . --project-name pkmsvv-web --branch pkmsvv-web`.
5. Khi Wrangler báo Success, URL thực tế sẽ hiện trong terminal. Thông thường `https://pkmsvv-web.pages.dev/` nếu tên này không bị trùng.
6. Trên iPhone Safari mở URL HTTPS → Chia sẻ → Thêm vào Màn hình chính → Mở dưới dạng ứng dụng web.

**Không dùng nút kéo-thả ZIP ở Dashboard:** Cloudflare giới hạn kéo-thả 1.000 tệp. Gói này có hàng nghìn sprite, phải triển khai thư mục bằng Wrangler.

## Tùy chọn cho GitHub tự xuất bản những lần sau
1. Tạo Cloudflare API token chỉ cho phép quyền Pages:Edit đúng tài khoản của mình.
2. GitHub repo → Settings → Secrets and variables → Actions: thêm repository secrets `CF_API_TOKEN` và `CF_ACCOUNT_ID` (không chia sẻ nội dung các giá trị trong chat).
3. GitHub Actions → `Build Cloudflare Pages FULL HTML5` → Run workflow trên branch `feature/lan-local-beta` → đánh dấu `publish`.
4. Workflow sẽ build + kiểm tra rồi upload website lên Cloudflare Pages project đã tạo (`pkmsvv-web`).

## Điều cần hiểu
- Cloudflare Pages chỉ phục vụ **file HTML5 tĩnh**, không phải server Co-op qua Internet; Co-op LAN vẫn do PC Host chạy.
- Mở trên iPhone/iPad/PC sẽ dùng **save của chính thiết bị**. Muốn chuyển save PC sang iPhone, xuất/nhập JSON.
- Xóa dữ liệu Safari hoặc ứng dụng web có thể làm mất save; hãy sao lưu file JSON thường xuyên.
- Game **không được bảo đảm chơi mất Internet 100%** sau lần mở đầu tiên, vì 13k tài nguyên được cache khi cần và có thể bị iOS tự xóa cache.
- HTTPS Cloudflare và HTTP LAN của PC có localStorage tách biệt.

Nguồn giới hạn: https://developers.cloudflare.com/pages/platform/limits/
Tài liệu Wrangler: https://developers.cloudflare.com/pages/get-started/direct-upload/

**Lưu ý thực tế 26/10/2026:** project đã được tạo với production branch `pkmsvv-web`, nên dùng `--branch pkmsvv-web` để cập nhật trang chính `https://pkmsvv-web.pages.dev/`. Bản deploy với `--branch main` tạo đường dẫn preview `https://main.pkmsvv-web.pages.dev/` và không tự thay thế trang chính.

## Tránh lỗi Cloudflare 25 MiB (26/10/2026)
Artifact mới chứa **các file website trực tiếp**; tải về sẽ có 1 lớp ZIP do GitHub tạo. Giải nén vào thư mục riêng rồi deploy **thư mục đó**, tuyệt đối không deploy thư mục Downloads còn chứa ZIP nén 72 MiB.

Từ PowerShell, kiểm tra `Test-Path .\index.html` và `Test-Path .\game\index.html` phải trả về True. Kiểm tra `Get-ChildItem -File -Filter *.zip` không trả về gì trong thư mục upload. Dùng `npx.cmd wrangler@4 pages deploy . --project-name pkmsvv-web --branch pkmsvv-web`.
