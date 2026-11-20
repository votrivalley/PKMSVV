# Pokémon Chuyển Sinh 3DS — Kanto Alpha 01 (native C++)

**Đây là bản chuyển đổi gameplay đầu tiên, chưa phải PKMSVV 3DS đầy đủ.**

## Có gì khác PokéSurvivor gốc?
- Menu native hiển thị `PKMSVV · KANTO`, `Khám phá`, `Pokédex`, `Nâng cấp`, `Cài đặt`, v.v.
- Chế độ Normal (solo) trở thành nguyên mẫu **Khám phá Kanto**.
- Bộ chọn Pokémon hoang dã thường và **boss ngẫu nhiên** chỉ chọn các Pokémon Gen 1 nguyên bản (không bao gồm dạng Alola/Galar/Hisui/Paldea).
- Khi mở trận có lời nhắc PKMSVV Kanto; cơ chế quái được thực thi trong C++.
- Chế độ Quick được gắn `Gốc (QA)`, phục vụ so sánh engine, chưa phải chế độ PKMSVV.
- Font runtime được dựng lại từ mã nguồn, bổ sung glyph cần cho nhãn tiếng Việt (cần kiểm tra độ hiển thị thực tế).
- **Title ID** `000400000F5B1400` (khác cả game PokéSurvivor gốc lẫn engine QA trước đó).
- **Save riêng** `sd:/3ds/pkmsvv-kanto01/`; không dùng hoặc ghi đè save cũ.

## Chưa chuyển
- Bản đồ Kanto riêng, 10 chương, các mốc boss 15/30, Mewtwo story boss.
- Phòng nghiên cứu, Pippi, Mega/Fusion theo PKMSVV, Arena, các nhiệm vụ Berry/Rotom.
- Save Guardian/Save Web, co-op và cân bằng PKMSVV.
- Các scripted boss/event Eternatus, Arceus và rift vẫn dựa trên engine gốc (nên bản này chưa phải Chương 1 chính thức).
- Việt hóa toàn bộ UI và thoại.

## Tiêu chí xác nhận
1. GitHub Actions phải biên dịch được `.3dsx` và `.cia`.
2. CIA có Title ID/Product Code riêng, RomFS intact và font Vietnamese.
3. Autotest Azahar chơi được, log `PKMSVV_KANTO_CAST_PASS` — không được có quái hoặc boss ngẫu nhiên ngoài Gen 1.
4. Sau đó mới thử New 3DS thực tế và lên tính năng tiếp theo.

Chỉ làm trên nhánh `feature/3ds-kanto-native-slice01`. Chưa merge vào main, chưa thay Web/Android/Switch hoặc Beta của PKMSVV.
