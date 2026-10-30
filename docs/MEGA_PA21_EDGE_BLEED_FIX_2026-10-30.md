# Mega PA2.1 – sửa lỗi so sánh và pixel rời sát mép (30/10/2026)

**Trạng thái:** QA-only, chưa bật Mega trong game; không phát hành fan art, không sửa save.

Phát hiện từ phản hồi của người chơi:
1. Preview cũ resize 64×64 và 96×96 vào cùng ô 192px. Như vậy Pokemon trong ô 96px bị thu nhỏ còn 2/3 so với ảnh gốc. So sánh mới dùng **cùng mức phóng đại 3× tính trên pixel gốc**.
2. Ba frame có mảnh **không dính thân chính** tại đường chia ô: Scizor Shiny (6px), Swampert normal (10px), Garchomp normal (16px). Đó là alpha component rời ở sát mép, được lọc có điều kiện (8-connectivity, dưới 40px, dưới 3% component chính).
3. Mảnh lớn dính thân vẫn phải giữ, kể cả khi chạm mép: **không có thuật toán nào có thể khôi phục phần art không tồn tại trong PNG nguồn**. Các frame còn chạm mép được đánh dấu để artist sửa thủ công.

Công cụ: `scripts/mega-pa21-bleed-filter.py`
Bài test: `tests/test_mega_pa21.py`

Chạy nội bộ với 8 PNG nguồn từ chủ sở hữu:
```sh
python scripts/mega-pa21-bleed-filter.py --source /path/to/original-sprites --output /tmp/pkmsvv-pa21
python -m unittest discover -s tests -p test_mega_pa21.py
```
Kết quả thực tế sau quét 128 frame:
- Scizor: normal 0 frame được lọc; Shiny 6.
- Swampert: normal 3; Shiny 1.
- Garchomp: normal 9; Shiny 2.
- Dragonite: normal 0; Shiny 0.
5 bài test chạy local với dữ liệu nguồn và các điều kiện ảnh tổng đều qua. Không đổi tỉ lệ, không làm lại pixel, không thêm tám hướng hay battle animation.

Nguồn art: https://eeveeexpo.com/resources/1475/
Cần kiểm tra quyền sửa và phân phối từ các tác giả trước khi đưa vào bản phát hành.

**Việc chưa xong:** Garchomp, Swampert còn các frame với phần thân lớn chạm mép nguồn. Phải chỉnh art gốc (có sự cho phép) nếu thực sự bị lẹm, sau đó mới xây animation 8 hướng.
