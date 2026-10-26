# Pokémon Chuyển Sinh LAN — PC Fast Start

## Vì sao EXE Portable có thể mất tới 2 phút?
Bản Portable do electron-builder đóng gói thành 1 file EXE lớn chứa Electron và hơn 13.000 tài nguyên Pokémon. Khi chạy, gói Portable có thể phải giải nén vào TEMP và Windows Defender quét nhiều file. Nếu mỗi lần mở đều chậm nhưng bản thư mục chạy nhanh, nguyên nhân nằm ở bước giải nén portable (không phải game hoặc LAN server).

## Cách dùng PC Fast Start (khuyến nghị cho máy Host)
1. Mở GitHub Actions workflow **Build LAN PC Host Beta** → lần Success mới nhất → tải Artifact **PKMSVV-LAN-Windows-Fast-Start**. File GitHub tải về là ZIP.
2. Giải nén toàn bộ ZIP vào một thư mục cố định, ví dụ D:\Games\PKMSVV-LAN\, **không mở file EXE trực tiếp trong trình xem ZIP**.
3. Chạy file **Pokemon Chuyển sinh LAN.exe** ngay trong thư mục đã giải nén (cùng cấp với thư mục resources). Có thể tạo shortcut ra Desktop.
4. Giữ nguyên thư mục resources\lan-site\game\ với toàn bộ sprite, nhạc và mã game. Không chép EXE ra riêng hoặc xóa file đi kèm.
5. Windows Firewall khi hỏi cho phép **Private network**. Không cần mở cổng ngoài Internet.
6. Nếu bị lỗi: đọc %APPDATA%\PKMSVV-LAN-Beta\lan-host-startup.log.

## Bản nào nên tải?
- **PKMSVV-LAN-Windows-Fast-Start:** thư mục Windows đã giải nén, tránh việc giải nén lại mỗi lần chạy.
- **PKMSVV-LAN-Windows-Host-Beta:** EXE Portable một tệp, dễ chia sẻ nhưng có thể khởi động chậm.
- **PKMSVV-LAN-Windows-Unpacked-Debug:** thư mục tương đương Fast Start, dùng khi cần QA.

## Kiểm thử
GitHub Actions chạy EXE nằm trong win-unpacked, kiểm tra HTTP /game/ và process còn sống. Chưa đo thời gian startup trên máy Windows của từng người; không bảo đảm mọi trường hợp chậm đều do Portable.


## PC Browser Host — nếu EXE không mở được
Artifact **PKMSVV-LAN-PC-Browser-Host** có nguyên bộ game HTML5 + Node LAN server, không sử dụng Electron. Máy Windows cần Node.js đã được cài (kiểm tra bằng lệnh node --version). Tải ZIP, giải nén toàn bộ ra thư mục cố định. Nhấp đôi **START-HOST-WIFI.cmd**. Giữ cửa sổ dòng lệnh mở trong khi chơi; chương trình tự mở game trong trình duyệt mặc định tại http://127.0.0.1:37816/game/ (hoặc cổng kế tiếp nếu bận). Mọi người cùng Wi-Fi truy cập địa chỉ IP được in trên cửa sổ Host. Trong game nhấn Co-op để tạo phòng. Không sử dụng Firebase hoặc Cloudflare cho LAN Host.

**Quan trọng:** không chạy đồng thời EXE LAN Host và PC Browser Host trên cùng cổng. Khi chơi xong, bấm Ctrl+C trong cửa sổ Host. Giữ nguyên các thư mục site/, desktop/, lan-server/ và node_modules/.
