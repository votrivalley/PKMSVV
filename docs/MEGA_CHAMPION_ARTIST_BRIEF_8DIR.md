# PKMSVV – Brief dành cho artist: Mega Champion PMD animation 8 hướng

**Đặt hàng / tìm nguồn ảnh gốc chính xác**, không tự vẽ bằng hình học, không lật/nghiêng ảnh đứng để giả các hướng còn thiếu.

## Ưu tiên

1. Mega Scizor (Thường + Shiny)
2. Mega Swampert (Thường + Shiny)
3. Mega Garchomp (Thường + Shiny)
4. Mega Dragonite (Thường + Shiny)
5. Sau đó: Mega Greninja, Golisopod, Falinks, Baxcalibur (cũng cần Thường + Shiny).

Những nguồn hiện có của bốn Pokémon đầu chỉ có walking overworld 4 hướng. Không được coi là đủ để dùng trong trận chiến.

## Định dạng bàn giao

Chỉ chấp nhận **gói animation gốc chuẩn PMD**, gồm:
- `AnimData.xml` ghi rõ `FrameWidth`, `FrameHeight`, thời gian `Duration` mỗi frame, action copy nếu có, `ShadowSize`, cùng thông tin frame cho các action.
- Bộ tối thiểu `Idle-Anim.png`, `Walk-Anim.png`, `Attack-Anim.png`, `Shoot-Anim.png`, `Charge-Anim.png`, `Hurt-Anim.png`, `Faint-Anim.png`, theo đúng tên action hoặc fallback có chứng cứ và được xác nhận từ XML.
- Offsets/shadows tương ứng: `<Action>-Offsets.png`, `<Action>-Shadow.png` cho từng action (trường hợp CopyOf theo đúng quy chuẩn).
- **8 hướng thật**, đầy đủ hình riêng và che khuất cơ thể chính xác; hàng PMD theo thứ tự từ phía Nam và xoay ngược chiều kim đồng hồ: S, SE, E, NE, N, NW, W, SW. Kiểm tra engine hàng/offset trước khi build; không suy thứ tự từ Mega Studio đang thử nghiệm.
- Kích cỡ frame nguyên gốc, nearest-neighbor. Không khóa cứng thành 96×96 hoặc 4 frame/action; tùy tạo hình và thời lượng hành động trong `AnimData.xml`.
- Sprite source/editable project ở dạng Aseprite hoặc PNG riêng; file phân loại Thường/Shiny. Không nhúng hình chân dung PNG 1 frame làm animation.
- **Danh sách tác giả, liên hệ, bằng chứng đồng ý chỉnh sửa và phát hành**, loại giấy phép phù hợp. Tác phẩm có thể liên quan quyền IP của Pokémon; phải đánh giá riêng trước khi công bố.

## Kiểm tra nghiệm thu

1. Không phải sprite Pokémon thường, Altcolor, Cutscene hoặc Mega bản Z/X/Y sai tên.
2. Không bị cụt cánh, càng, gai, đuôi khi chuyển khung; không có mảnh pixel của ô bên cạnh. Test từng hướng, frame và kiểm tra alpha/anchor.
3. Khi quay đủ 360°, nhân vật giữ kích thước, tâm chân và khối lượng nhất quán. Các hướng phải thể hiện hình dạng 3/4 tự nhiên, không đơn thuần lật/phóng một ảnh.
4. Các action có đúng chuyển động, thời lượng và hướng, không dùng Idle/Walk thay Attack hay Hurt rồi gọi là hoàn chỉnh.
5. Test sprite Thường và Shiny riêng, kèm Pokémon hỗ trợ và Mega Evolution, chuyển dạng/hoàn nguyên.
6. Bắt buộc chạy QA bộ `scripts/build-mega-forms.cjs`, test animation metadata, runtime PC, rồi mới xét Web/Android.
7. Ban đầu chỉ gắn `assetOnly:true`, `qaRequired:true`. Không tự mở Mega Stone, Dex, Gacha, save hoặc quest.

## Những nguồn để cung cấp cho artist (chỉ tham khảo tạo hình)

- Willøw Eevee Expo: https://eeveeexpo.com/resources/1475/ (4 hướng overworld; kiểm tra lại quyền tác giả)
- Pokémon Showdown/PokéRogue: ảnh mặt trước/sau để đối chiếu hình Mega, **không phải tám hướng**
- PMDCollab format: https://wiki.pmdo.pmdcollab.org/Tutorial:PMD_Sprite_Format
- Project source audit: `docs/MEGA_CHAMPION_UPSTREAM_VERIFIED_2026-10-30.md`
- PA2.1 for source edge QA: `scripts/mega-pa21-bleed-filter.py`
- Stage4A Scizor tự phác **đã bị từ chối**, tuyệt đối không làm mẫu tham chiếu.

## Mẫu yêu cầu gửi artist (English)

> We need authentic pixel-art Mega Pokémon animation sheets compatible with the Pokémon Mystery Dungeon format for a noncommercial fan project. Priority: Mega Scizor, Swampert, Garchomp, and Dragonite, normal and shiny. Please provide eight true facing directions, original Walk/Idle/Attack/Shoot/Charge/Hurt/Faint animation art, AnimData.xml with timing, offsets/shadows, and contributor credits. No AI-generated art, mirrored front-facing clones, distorted silhouettes, or base/Altcolor substitutes. Please confirm ownership, permission to adapt, and explicit permission to redistribute before any artwork is integrated. We can supply our existing four-direction source sheets as references only when their licenses allow.
