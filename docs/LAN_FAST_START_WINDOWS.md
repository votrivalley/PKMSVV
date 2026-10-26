# Pokémon Chuyển Sinh LAN — PC Fast Start

## Bản 1.5.20
- Sống Còn: xuất phát riêng, AI tự tản ra; có trứng và ấp, tối đa 2 hỗ trợ mỗi người.
- Tranh Trứng: mỗi phút thêm 1 trứng ngẫu nhiên và chỉ dẫn; hồi sinh sau 8 giây, không giới hạn lượt. Giữ không PvP và thời lượng 12 phút.
- Trong sảnh, Host kick được từng người/AI. Ô chọn Pokémon AI cho phép thêm đúng loài mong muốn hoặc để trống để random.
- Chi tiết và kiểm thử: `docs/LAN_1_5_20.md`.

## Bản 1.5.19 — chơi nhiều ván với AI
- Tranh Trứng không có sát thương giữa người chơi/AI; vẫn có sát thương từ quái và địa hình.
- Tất cả hết lượt hồi sinh thì kết thúc trận; hết ván xóa AI cũ, mở lại phòng và cho thêm AI mới/đổi chế độ.
- AI random từ 966 loài có trong bản game, gồm dạng tiến hóa và huyền thoại. Tránh trùng loài trong phòng.
- Cấp 1 là cấp khởi đầu của ván; chỉ số gốc theo loài, không tự sao chép sức mạnh hay loài Pokemon của chủ phòng.
- Chi tiết và kiểm thử: `docs/LAN_1_5_19.md`.

## AI 1.5.18
- AI tự chọn một trong ba thẻ thưởng hợp lệ; xét hệ, vật lý/đặc biệt, kỹ năng đang có và máu còn lại. AI đã gục cũng xác nhận chọn thưởng, không chặn người chơi ở màn hình lên cấp.
- Tìm đường vòng hồ/vật cản, thoát nước nếu đã mắc kẹt, né quái/đạn/vùng cảnh báo. Pokémon hệ Nước, Bay hoặc có khả năng tương ứng vẫn di chuyển theo luật địa hình gốc.
- AI dùng nhân vật, sát thương, skill, hồi chiêu và hồi sinh thật của game. Kỹ năng dash đã học chỉ dùng khi sẵn sàng và có hướng đáp an toàn hơn. AI vẫn có thể bị hạ.
- Xem chi tiết và phạm vi kiểm thử tại `docs/LAN_AI_1_5_18.md`.

## Bản sửa 1.5.17 — nhập IP và giao diện Co-op
- Đã sửa dấu nhận diện LAN bị mất khi biên dịch. Bản PC dùng máy chủ LAN cục bộ khi tạo/vào phòng.
- Co-op → Tham gia: danh sách phòng và mã phòng thuộc Host hiện tại. Để sang PC Host khác, nhập **IP:cổng** vào ô riêng, ví dụ `192.168.1.20:37816`.
- Khi nhập IP trên PC, game kiểm tra Host trước khi chuyển trang. Host không trả lời sau 4 giây sẽ báo lỗi và cho thử lại, không bỏ trang game hiện tại. Cả hai PC cần dùng bản LAN mới.
- Thẻ chế độ có lại Pokémon gốc: Sống Sót/Pikachu, Sống Còn/Charizard, Tranh Trứng/Togepi. Địa chỉ Host và QR nằm ngay trong Co-op.
- Giới hạn vẽ menu ở 30 khung hình/giây và trận đấu tối đa 60 để tránh vẽ quá nhiều trên màn hình tần số cao.
- Đã kiểm tra hai phiên game độc lập cho Sống Sót/Sống Còn, bốn phiên cho Tranh Trứng, cùng kiểm tra cửa sổ Electron và EXE Windows với IP không phản hồi rồi thử lại. Các phiên này chạy trên cùng một máy; vẫn cần QA giữa PC và điện thoại qua Wi-Fi thật.

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
