# Pokémon Chuyển Sinh — Phòng nghiên cứu / Co-op v2 (QA, 17/11/2026)

## Những thay đổi đã có code

- Trang **Phòng nghiên cứu**: hotspot trên đồ vật; nhãn chữ nhỏ, khoảng cách viền tăng.
- Mega và Pokémon hỗ trợ: lúc mở từ Phòng nghiên cứu phải đóng về **← Phòng nghiên cứu**; khi mở ngoài phòng vẫn có nút **Đóng**. QA Web cần biên dịch đúng hai module mới, không chỉ đè nhãn.
- Phục nguyên: hiển thị **đá hóa thạch** trước khi hồi sinh; đá chưa phát hiện có silhouette đen. Pokémon chỉ hiển thị sau khi phục nguyên bằng máy.
- Thuộc tính `pkmsvvFossils.discovered` được giữ sau khi tiêu hết vật liệu; `pkmsvvFossils.restored` xác định thành tựu (không dựa vào `owned`).
- **Nhà khảo cổ vĩ đại** khi `restored` đủ **15 công thức**; hoàn thành lần đầu lưu `greatArchaeologist:true`.
- **Kho Hậu Cần Co-op**: mới có giao diện chia nhóm, hiển thị xu và tính năng đổi xu; trang phục/vật phẩm khi chưa có gameplay/sprite chỉ xem trước, không mua.

## Ví Xu Đồng Đội (chung mọi Co-op)

- Dùng chung `save.pkmsvvCoopLab.coopCoins` (giữ tương thích với save QA cũ). Không tạo ví riêng cho phòng hóa thạch, cứu hộ, hộ tống, săn kho báu.
- Công thức theo mốc thử nghiệm: **100 Xu Đồng Đội = 250 PokéCoins**, tối đa **2.000 PokéCoins/tuần** (tuần tính theo Asia/Ho_Chi_Minh). Giao dịch sửa cả ví và PokéCoins trong cùng một commit, rollback khi save lỗi.
- Hạn mức được lưu dưới `lastExchangeWeek`, `weeklyPokeCoins`; không cho tua đồng hồ về tuần trước. Vì game offline, *không thể chống việc chỉnh đồng hồ/JSON tuyệt đối*.
- Phòng thí nghiệm hóa thạch: nhiệm vụ đầu tiên của Co-op. Lượt đầu hoàn thành hợp lệ tặng **200 xu + 20 xu/mục tiêu phụ**, **mở máy vĩnh viễn**, và tặng **Kabuto miễn phí** (không trừ Dome Fossil). Lượt sau **120 + 20 xu/mục tiêu phụ**. Các nhiệm vụ Co-op khác dự kiến cơ bản 100 xu, nhưng **chưa kích hoạt**.
- Solo cùng đồng đội do máy điều khiển nhận phần thưởng ngang nhóm người, không cần online. Bộ lõi hiện chỉ nhận receipt `fossil_lab` sau khi bộ điều phối nhiệm vụ tin cậy xác minh; UI không chứa API `settle` để người chơi bấm tạo phần thưởng.

## Đề xuất nhiệm vụ chơi thật — bước triển khai tiếp theo (chưa có runtime)

- Thời lượng hướng tới **6–8 phút**; hiện core yêu cầu receipt tối thiểu 360 giây.
- Nhiệm vụ mở đầu **Phòng thí nghiệm thất lạc**: thu mẫu, ổn định máy, chống quái phá máy, rút lui an toàn; thử thách phụ có thể thay đổi giữa các trận.
- Adapter Native/AI Co-op cần xác minh session ID, nhiệm vụ, thời lượng, event thực tế, thành viên/đồng đội do máy điều khiển và chống settle lặp `seq`.
- Trên kết quả hợp lệ: gọi `settle` đúng **một lần**, trong một transaction; nếu commit thất bại, không cấp xu, Kabuto hoặc mở khóa máy.
- Các nhiệm vụ **giải cứu Pokémon**, **hộ tống đoàn hàng**, **săn kho báu** dùng chung ví. Không giới hạn phòng hóa thạch.

## Kho Hậu Cần của Pippi

1. **Dụng cụ khai quật**: Máy dò hóa thạch (80 xu, một trận, không tăng drop); Vé thử thách (120 xu, điều kiện thưởng khó — chưa có runtime).
2. **Ngoại hình bạn đồng hành**: Pippi giáo sư/nhà thám hiểm/vương miện/kính râm, có thể mở rộng cho bạn đồng hành tương lai. Cần sprite, biểu cảm, animation riêng.
3. **Nội thất**: 8 vị trí, 11 món trong catalog cũ (1 máy mặc định, 9 món bán, 1 tượng vàng không bán). Tranh toàn cảnh đang là một texture, **không giả vờ đã sở hữu hoặc đổi nội thất**.

Pippi vẫn xưng "Giám đốc Phòng thí nghiệm Hoàng gia Pippi" và dùng giọng điệu kiêu kỳ, vui nhộn. Thiếu tiền/đồ đắt sẽ có câu thoại theo từng trường hợp khi giao dịch thật hoạt động.

## Ranh giới phát hành

- **QA branch**: `fix/pippi-follow-menu-qa-20261115`; production không thay đổi.
- Kho hậu cần chưa mở bán trang phục, máy dò hay nội thất. **Nhiệm vụ Co-op mới chưa chơi được**, và receipt đang là core/test — không cấp thưởng theo bất kỳ nút UI nào.
- Cần QA thực tế Web/Android/PC về điều hướng + save trước khi ghép mission adapter. Phải lưu ý màn hình nhỏ, co giãn phòng, cache Web và không làm hỏng save cũ.
- Kiểm thử: `tests/coop-lab-core.test.cjs`, `tests/fossil-system.test.cjs`, `tests/pippi-web-browser.cjs`, và CI preview QA.
