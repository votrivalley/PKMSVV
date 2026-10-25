# Pokémon Chuyển sinh — nhạc nền tùy chỉnh

Đặt tệp nhạc trong thư mục `custom-music/` của repo `votrivalley/PKMSVV`. Nhạc phải là tệp âm thanh thực sự được xuất sang OGG, không chỉ đổi tên phần mở rộng.

| Tên tệp ví dụ | Phát khi |
|---|---|
| `village.ogg` | Menu và chọn Pokémon |
| `forest.ogg` | Sinh tồn trong rừng |
| `cave.ogg` | Hang pha lê |
| `volcano.ogg` | Vùng dung nham |
| `boss.ogg` | Boss |
| `rift.ogg` | Khe Nứt |
| `judgment.ogg` | Phán Quyết của Arceus |
| `eggrush.ogg` | **Tranh Trứng** — chế độ nhiều người chơi hiện có trên Web |
| `capture_flag.ogg` | **Cướp Cờ** — vị trí nhạc đã dự phòng; chưa có chế độ Cướp Cờ riêng trong game hiện tại |

**Cách dùng:** trong GitHub, mở `custom-music/` → **Add file → Upload files** → tải bài `capture_flag.ogg` (hoặc `eggrush.ogg` nếu nhạc dành cho Tranh Trứng) → **Commit changes**. Build lại gói Web/PC/Android để đóng gói bài nhạc. Nếu tệp chưa có, game tiếp tục phát nhạc thông thường, không bị mất nhạc.

**Lưu ý:** gói portable EXE / APK đã build không tự nhận bản nhạc chép bên cạnh file cài đặt. Hãy bổ sung file trước khi build. Hiện chưa có mode `ctf` / Cướp Cờ trong repo; `capture_flag.ogg` chỉ được chọn khi có mode này trong một bản cập nhật tương lai. **Không đổi tên Tranh Trứng thành Cướp Cờ**, và hai bài nhạc được tách độc lập.

Ngoài `.ogg`, bộ đóng gói vẫn hỗ trợ `.mp3` và `.wav` tương ứng. Ưu tiên: MP3 → OGG → WAV. Các bài được lặp lại và dùng chung điều khiển âm lượng/tắt nhạc của game.

Chỉ sử dụng nhạc do bạn có quyền phân phối hoặc có giấy phép phù hợp; không tải nhạc thương mại không được cấp phép lên repo công khai.
