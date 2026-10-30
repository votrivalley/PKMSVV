# Tranh truyện Pokémon Sống Sót — Story artwork

Các tranh phải đồng bộ về phong cách với `eyes.webp`, `gate.webp`, `reveal.webp` và đặc biệt cặp `chapter2-orbs.webp` / `chapter2-shadow.webp`.

- **Tỷ lệ:** 16:9, lý tưởng 1280×720.
- **Định dạng:** WebP, chất lượng 80–85 (có thể chỉnh để ảnh ~100–350 KB mà không mất chi tiết).
- **Không có:** chữ, khung thoại, UI, giáo sư, phòng thí nghiệm hoặc nhân vật con người. Chương 0 đã hóa thành Pokémon nên các chương sau không minh họa nhân vật người.
- **Không đổi tên hoặc xóa** ảnh cũ; chỉ tải lên các file bổ sung đúng tên.
- Người dùng phải xem duyệt ảnh trước khi thay tranh trong bản public.

## File Chương 0 (đã có, giữ nguyên)

| File | Nội dung |
| --- | --- |
| `eyes.webp` | Đôi mắt huyền bí trong đêm |
| `gate.webp` | Cổng thức tỉnh |
| `reveal.webp` | Khoảnh khắc nhận hình hài Pokémon |

## File Chương 1 — Những Mảnh Ký Ức (mới, đang chờ ảnh)

| File | Nội dung | Đoạn thoại |
| --- | --- | --- |
| `chapter1-echo.webp` | Vòng lặp chiến đấu, bóng Pokémon và những lớp ký ức cũ | 2 đoạn đầu |
| `chapter1-fragments.webp` | Tám sức mạnh và ký ức đang dần trở lại | 2 đoạn cuối |

`src/pkmsvv-story.js` đã ánh xạ Chương 1 sang hai tên ảnh mới; không dùng lại hình Chương 0.

## File Chương 2 — Tiếng Vọng Thứ Tám (đã có)

| File | Nội dung |
| --- | --- |
| `chapter2-orbs.webp` | Vòng phép tám sức mạnh và Mystery Orbs |
| `chapter2-shadow.webp` | Cùng không gian, xuất hiện bóng trắng bí ẩn |

## File Chương 3 — Mầm Sống Bị Lãng Quên (mới, đang chờ ảnh)

| File | Nội dung | Đoạn thoại |
| --- | --- | --- |
| `chapter3-nest.webp` | Ổ trứng phát sáng trong vùng đất ký ức | 5 đoạn đầu |
| `chapter3-hatch.webp` | Pokémon nhỏ nở, bắt đầu đồng hành; bóng trắng thoáng hiện | 6 đoạn cuối |

## Cách chuẩn bị và upload

1. Tải 4 tranh đã duyệt về máy dưới dạng PNG hoặc JPG.
2. Mở **https://squoosh.app/**, kéo từng ảnh vào. Chỉnh kích thước về 1280×720 nếu muốn. Chọn **WebP**, chất lượng khoảng **80–85**, tải bản nén xuống.
3. Đổi tên **file đã mã hóa WebP** đúng bốn tên trong bảng. Chỉ đổi phần mở rộng từ PNG sang .webp **không phải là chuyển đổi định dạng**.
4. Vào https://github.com/votrivalley/PKMSVV/tree/main/src/story-art, chọn **Add file → Upload files**, kéo 4 file WebP vào, kiểm tra tên và bấm **Commit changes**. Chỉ cần upload ảnh, không sửa code.
5. `scripts/patch-story.cjs` sẽ đóng gói ảnh vào `assets/story/` khi build Web, PC, Android. Các ảnh Chương 3 cũng được xử lý trong patch v1.5.

**Không xóa save người chơi; không thay dữ liệu lưu hay Firebase chỉ để cập nhật hình.** Khi thiếu hình mới, trò chơi tạm dùng ảnh dự phòng `gate.webp`.

## Chương 6 — Bí Mật Berry

Hai ảnh riêng, không ghi đè hai ảnh Arena hiện có (`chapter6-arena.webp`, `chapter6-champion.webp`):

| Tên file chính xác | Nội dung | Vị trí thoại |
| --- | --- | --- |
| `chapter6-berry-grove.webp` | Vườn Berry bị lãng quên, các quả Berry tỏa sáng giữa rừng ký ức | Nửa đầu Chương 6 |
| `chapter6-berry-rescue.webp` | Khoảnh khắc cứu những quả Berry khỏi bóng tối | Nửa cuối Chương 6 |

Cùng chuẩn tranh trước: **16:9, 1280×720, WebP 80–85, không chữ, không khung UI, không có người**.
Upload vào nhánh `feature/lan-local-beta`, thư mục `src/story-art/`.
Khi chưa có hai ảnh, bản PC dùng tạm tranh Chương 3 để không hiện khung ảnh lỗi.
Sau khi upload ảnh cần build PC Fast Start lại để đóng gói ảnh mới vào EXE.
