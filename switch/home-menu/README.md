# Pokémon Chuyển Sinh — Switch One-File NRO Beta

**Một file:** `PKMSVV.nro`. Game vẫn là HTML5, không phải native port.
NRO có sẵn Brewser runtime và dữ liệu game offline trong RomFS. Lần mở đầu
NRO tự cài game/Brewser vào thẻ nhớ rồi chạy thẳng Pokémon Chuyển Sinh.
Không cần tải thêm Brewser, không cần gõ URL, không cần tạo NSP.

## Cài đơn giản
1. Giải nén gói GitHub Actions lấy **một file PKMSVV.nro**.
2. Chép file vào `sd:/switch/PKMSVV.nro`.
3. Mở Homebrew Menu ở chế độ full RAM (giữ R khi mở một game hợp lệ),
   chọn Pokémon Chuyển Sinh. Lần đầu để màn hình tự cài xong, lần sau mở nhanh hơn.

## Kỹ thuật / hạn chế
- NRO dùng Brewser (MPL-2.0) để chạy game HTML5 offline; tài nguyên
  được giải nén tự động vào `sd:/switch/brewser/apps/com.votrivalley.pkmsvv/`.
- Brewser được tự cài nếu chưa có ở `sd:/switch/brewser.nro`. Nếu đã có
  Brewser, chương trình không tự ghi đè bản đó.
- Không yêu cầu khóa mã hóa hay NSP. Game và engine không nằm trong sysMMC.
- Không xóa localStorage, save, ảnh/thiết lập hiện có; cập nhật chỉ ghi đè
  file game trong thư mục app, không xóa thư mục user hoặc dữ liệu Brewser.
- Đây là bản **thử nghiệm**: CI có thể xác minh NRO hợp lệ và dữ liệu đầy đủ,
  nhưng không thể xác nhận FPS, controller, âm thanh và save trên Switch thực.
- Tắt máy/thoát NRO khi đang sao chép có thể để lại file tạm; mở lại NRO để
  nó thử cài lại. Đảm bảo thẻ SD còn tối thiểu khoảng 350 MB.
- Sống Còn / Tranh Trứng offline AI đi theo bản game build, khả năng vận hành
  trong engine Brewser trên Switch thật cần test riêng.
- Không phải phần mềm chính thức Nintendo/Pokémon. Chỉ phát hành phi thương mại.

## Nguồn và giấy phép
- Pokémon Chuyển Sinh: Votri Valley, dựa trên PokéSurvivor của JPTER78
  (PolyForm Noncommercial 1.0.0).
- Brewser (MPL-2.0): https://github.com/natureglass/Brewser
- NRO tự giải nén engine được tải từ release chính thức, checksum SHA-256
  được cố định/kiểm tra tại workflow GitHub.

## Sửa lỗi microSD (Switch NRO Beta)
- Bản đầu có lỗi gắn lại SD khi libnx đã gắn sẵn; dễ hiện `Cannot access microSD` dù thẻ bình thường.
- Bản sửa sẽ dùng ổ `sdmc:/` đã được gắn và thử đọc thư mục gốc trước khi tiếp tục.
- Không cần format thẻ, gỡ phần mềm, hay xóa save. Khi cập nhật chỉ thay file `sd:/switch/PKMSVV.nro`.

## Hotfix: "No such file or directory: --fwd=1"
- Bản trước giải nén xong rồi bị lỗi vì truyền `--fwd=1` tại `argv[1]` cho nx.js.
- nx.js chỉ dùng `argv[1]` để xác định file script/NRO cần chạy. Hotfix đặt `sdmc:/switch/brewser.nro` vào `argv[1]` và giữ các cờ `--fwd=1`, `--app=com.votrivalley.pkmsvv` ở phía sau.
- Không cần xóa 12.000+ file đã chép hoặc xóa save. Chỉ chép đè `PKMSVV.nro` mới trong `sd:/switch/`.
