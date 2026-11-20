# Pokémon Chuyển Sinh 3DS — Native Alpha 03: Region + Thức Tỉnh

## Căn cứ chính xác từ PKMSVV Web
- `src/pkmsvv-quick-region.js`: chạm `Chơi ngay / Khám phá` **trước tiên phải vào bộ chọn 10 Region**, không tự bắt đầu trận; Region Journey là chơi bình thường, không tự tạo trận Arena/Champion. Thứ tự key: Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos, Alola, Galar, Paldea, **Votri Valley** (hiển thị `Tháp Thiên Không`).
- `src/pkmsvv-story.js`: phần mở đầu Chương 1 `Thức Tỉnh`, với các vai `Tôi`, `Giọng nói bí ẩn`. Giữ đúng 7 câu mở đầu hỗ trợ được trên 3DS; **chưa chuyển** màn hỏi tên (`askName`) và ảnh WebP.
- Quy tắc hiện tại của nhánh: Kanto Gen 1 là **duy nhất được chơi**; 9 Region còn lại chỉ được hiển thị với trạng thái khóa, không giả lập tính năng chưa có.

## Luồng 3DS được triển khai
1. **Save mới**: Chương 1 mở đầu (7 lượt thoại) → bài trắc nghiệm/chọn Pokémon gốc → Menu PKMSVV.
2. **Save đang dùng**: vào menu bình thường; không phát lại prologue liên tục.
3. **Khám phá** → màn chọn Region dạng 2×5 trên màn hình cảm ứng; D-pad + A hoặc chạm, B để trở lại. Màn hình trên có Pokémon mascot của Region đang chọn.
4. Chọn **Kanto (Gen 1)** → gọi `start_run()` native solo Normal và kích hoạt `cfg.kanto_only` được xác nhận.
5. Chọn vùng khác → thông báo chưa được port; **không âm thầm chơi Kanto**. Y trên menu Region → phát lại prologue, xong trở lại Region.
6. Title ID `000400000F5B1400`, thư mục lưu `sd:/3ds/pkmsvv-kanto01/`, tách nguyên bản PokéSurvivor, không thay save Web.

## Không được gọi là xong
- Chưa chuyển các map thật, texture/địa hình Kanto độc lập, 9 Region bị khóa, badge unlock, chapter 2–10.
- Chưa chuyển hỏi tên, hình story WebP, Pippi, phòng nghiên cứu, Mega, Fusion, offline Co-op, Arena hoặc Save Guardian.
- Chưa hoàn tất Việt hóa toàn bộ; nhiều màn còn Spanish.
- **15/30p boss trong Alpha02 chỉ có native schedule + AI nguyên mẫu**, chưa QA suốt 30 phút/hardware.
- RomFS Pokémon sprites từ PokéSurvivor 3DS gốc, chưa tái cấu trúc toàn bộ tài nguyên PKMSVV.

## Kiểm thử bắt buộc
- Source patch fail-closed, kiểm tra logic: `SC_MENU → SC_PKM_REGION`, không đi `SC_MODE` nữa khi chọn Khám phá; 10 Region hiển thị; khóa 9 vùng; Kanto vào `start_run()`.
- GitHub Actions build cả `.3dsx` và `.cia`, ProductCode riêng `CTR-H-PK01`.
- Azahar kiểm tra CLI gameplay 12 giây với `PKMSVV_KANTO_LIVE_PASS`; riêng UI Region cần screenshot/thiết bị thật.
- Không gộp PR Draft vào Web chính.

**Đây là thay đổi flow thật trong C++, không phải thay tên CIA hoặc clone toàn bộ mã Web.**
