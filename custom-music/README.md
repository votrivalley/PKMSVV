# PKMSVV — 7 vị trí nhạc nền

| Tên tệp | Hoàn cảnh phát | Hướng chọn bài |
|---|---|---|
| `village.mp3` | Menu / chọn Pokémon | Nhạc thị trấn, vui và ấm áp |
| `forest.mp3` | Sinh tồn trong rừng | Nhạc phiêu lưu trong rừng |
| `cave.mp3` | Hang pha lê | Nhạc hang động huyền bí |
| `volcano.mp3` | Núi lửa | Nhạc vùng dung nham, dồn dập |
| `boss.mp3` | Boss xuất hiện | Nhạc đấu trùm |
| `rift.mp3` | Trận đấu huyền thoại trong khe nứt | Nhạc đấu Pokémon huyền thoại |
| `judgment.mp3` | Phán Quyết của Arceus, phút 30 | Nhạc cao trào / Arceus |

**Hỗ trợ .mp3 / .ogg / .wav.** Tên phải trùng một trong 7 khóa bên trên; thí dụ `forest.ogg` và `boss.wav` cũng được. Nếu có nhiều định dạng cùng tên, thứ tự ưu tiên: MP3 → OGG → WAV. Mỗi bài sẽ lặp, đồng bộ với âm lượng và nút tắt nhạc trong trò chơi. Các vị trí chưa thêm tệp sẽ dùng bài gốc tổng hợp bằng Web Audio từ `js/data/music.js`.

**Cách dùng:** tải/chuẩn bị những bài bạn được phép sử dụng và phân phối → đặt chúng trong thư mục này của GitHub → commit → GitHub Actions đóng gói lại. Bản EXE đã build không cho thêm nhạc bằng cách thả file cạnh EXE vì các tài nguyên đã nằm bên trong gói portable.

**Bản quyền:** Nhạc Pokémon chính thức do chủ sở hữu nắm quyền. Không đưa bản nhạc có bản quyền vào repo công khai hoặc EXE chia sẻ khi chưa được phép. Có thể sử dụng nhạc sáng tác riêng, bản phối có giấy phép hoặc nhạc miễn phí phù hợp điều khoản.
