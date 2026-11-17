# Pokémon Chuyển Sinh — Fossil Co-op & Phòng thí nghiệm trang trí (spec v1)

**Quy chuẩn vẽ phòng & nội thất:** [COOP_FOSSIL_LAB_ART_DIRECTION_V1.md](COOP_FOSSIL_LAB_ART_DIRECTION_V1.md) — palette, phối cảnh, 8 tọa độ và mô tả 11 sprite. 

**Đã chốt với người thiết kế ngày 17/11/2026.** Trạng thái: **spec + catalog + transaction core, CHƯA có nhiệm vụ Co-op chạy thật, CHƯA có sprite nội thất đã QA**. Không đưa lên Web production. Nối engine nhiệm vụ qua adapter sau.

## 1. Vòng lặp chơi

1. Khám phá -> đập đá sau phút 15 -> nhận **Hóa thạch Mái vòm** một lần trong hồ sơ.
2. Về PC -> có thể **xem** hóa thạch và phòng lab, nhưng **máy phục nguyên KHÓA**.
3. Pippi mở tuyến truyện *Phòng Thí Nghiệm Thất Lạc*; chơi một mình có AI hoặc 2–4 người.
4. Hoàn thành nhiệm vụ hợp lệ **lần đầu** -> mở **máy phục nguyên VĨNH VIỄN**, nhận 200 Xu Đồng Đội (+20 mỗi mục tiêu phụ, tối đa 2); từ đó hồi sinh Pokémon bằng vật liệu đúng công thức, **không phải chơi nhiệm vụ lại**. Trận đầu nên phục nguyên Kabuto trong cinematic.
5. Các lần sau -> quay lại **tự chọn**, kiếm Xu Đồng Đội, mua nội thất, săn món danh dự. Solo + AI nhận phần thưởng cơ bản **bằng** tổ đội có người thật, không ép phải online.

### Kịch bản nhiệm vụ 6–8 phút (Co-op / Solo AI)

- **Màn 1: Khai quật (2 phút)**. Chia ra phá đá tìm ba linh kiện. Phá nhầm đá chỉ mất thời gian, không xóa hóa thạch đang sở hữu.
- **Màn 2: Sửa máy (2–3 phút)**. Hai vị trí tương tác, bên thứ ba thủ quái. Solo AI tự nhận công việc còn trống; tự động hủy tương tác nếu nhân vật bị hạ gục. Người chơi được hồi sinh/cứu theo luật Co-op cũ.
- **Màn 3: Khởi động (90 giây)**. Máy chịu sát thương, team bảo vệ; nếu hỏng, nhiệm vụ thất bại, vẫn giữ hóa thạch. Sau khi thắng, tạo **một biên nhận** cho từng người chơi đủ điều kiện.
- Có 2 mục tiêu phụ: tìm đủ tài liệu bị thất lạc; máy kết thúc với HP >=70%. Không cần cả 2 để mở khóa máy, chỉ cộng xu và mở lượt săn tượng.
- Nhiệm vụ đầu tiên là hành trình hướng dẫn. Các lần chơi lại chọn thử thách phụ (không tăng chỉ số kẻ thù bằng cách gian lận) nhưng giữ thời lượng 6–8 phút.

## 2. Kinh tế Xu Đồng Đội

- Tiền tách biệt: \`save.pkmsvvCoopLab.coopCoins\`. Không cộng vào \`save.coins\` hay điểm Arena.
- Thắng **lần đầu: 200 xu**, những lần tiếp theo **120 xu**, mỗi mục tiêu phụ **+20 xu**, tối đa +40. 1–4 người, AI hỗ trợ được thưởng như người thật.
- Chỉ trả thưởng khi **thắng thật** và thời gian thi đấu >=4 phút. Không thưởng khi thoát trận, disconnect chưa hoàn thành, AFK hoặc chạy lại callback kết thúc.
- \`lastSettledSeq\` tăng tuần tự để chặn nhận tiền lặp. Chỉ mission engine được tạo biên nhận, phải xác thực host, từng người chơi, tiến độ và mục tiêu trước khi gọi \`settle\`. Biến \`verified:true\` tự nó KHÔNG phải chữ ký chống gian lận; đây là trò chơi offline-first.
- Chưa mở cổng quy đổi sang PokéCoins; nếu thêm sau phải có hạn mức theo tuần.
- Không có bán trang bị tăng sức mạnh trực tiếp bằng Xu Đồng Đội trong giai đoạn đầu.

## 3. Phòng trang trí — 8 slot cố định

\`center\` máy phục nguyên; \`shelf_left\` và \`shelf_right\` hiện vật; \`wall_left\`/\`wall_right\` tranh, chứng nhận; \`garden\` cây cảnh; \`desk\` dụng cụ nghiên cứu; \`trophy\` bệ danh dự.

- Không kéo thả, không xoay, không va chạm nội thất. Bấm slot -> danh sách món đúng loại -> chọn -> lưu. Bấm lại để thay; món đã mua vẫn sở hữu vĩnh viễn.
- Giao diện mobile/controller: L1/R1 đổi tab, D-pad chọn slot/món, A/Xác nhận để trang bị, B/Quay lại; PC dùng bàn phím và chuột.
- Có bố cục cố định và bảng layer; nội thất không đè UI, không cần vật lý. Không ghi 100 tọa độ vào save.
- Chưa có sprite chính thức. Yêu cầu **PNG thật pixel-art** (24–48 px nội thất nhỏ; 64–96 px đồ lớn), viền nhất quán, không dùng emoji làm sprite. Kiểm tra trên nền lab và màn hình 360 px trước khi chốt.

## 4. Catalog đợt đầu

10 món mặc định/mua được gồm máy cơ bản, máy nâng cấp, bộ xương Kabuto, hổ phách Aerodactyl, mô hình Omanyte, chứng nhận khảo cổ, poster cổ sinh, chậu dương xỉ, máy tính nghiên cứu, ống mẫu phát sáng. Món máy cơ bản có sẵn sau khi mở lab; 9 món còn lại mua bằng Xu Đồng Đội, giá 200–1.300 xu.

**Món danh dự:** \`gold_pippi_statue\` — *Tượng Vàng Giáo sư Pippi – Khảo Cổ Hoàng Gia*. **0,1%/rương cuối** chỉ trong lượt **chơi lại thắng và đạt cả hai mục tiêu phụ**. Không bán, không giao dịch, không pity, không tăng stats; tối đa một món/hồ sơ, nhận rồi thì không tiếp tục quay nữa. Pippi có riêng lời khoe; tương lai mở bảng xem phòng bạn bè (read-only, không tự chia sẻ save).

*Lưu ý cân bằng:* 0,1% là thiết kế khởi điểm để QA, không cam kết xác suất rơi thực tế khi nhiệm vụ chưa được nối. Trước phát hành phải kiểm tra thống kê 100k+ lượt mô phỏng và bảo đảm không trùng phần thưởng.

## 5. Save Guardian / tính toàn vẹn

\`\`\`json
{
  "pkmsvvCoopLab":{
    "schemaVersion":1,
    "machineUnlocked":false,
    "coopCoins":0,
    "totalCompletions":0,
    "lastSettledSeq":0,
    "ownedDecor":{"machine_old":true},
    "equippedDecorBySlot":{"center":"machine_old"}
  }
}
\`\`\`

- Đọc save cũ không có key vẫn được, **không tự đánh dấu mở khóa**, giữ nguyên mọi Pokémon đã có trước đây.
- Mọi thao tác thưởng/mua/trang bị phải transaction có rollback nếu \`DB.commit(true)\` trả \`false\` hoặc throw; không được lấy coin trước khi save.
- Tự khóa \`G.PKMSVVFossils.restore()\` **ở lớp logic**, không chỉ ẩn nút. PC hiển thị vật liệu đã tìm nhưng nút **Hồi sinh** bị khóa đến khi mission-cleared thực sự.
- Không reset \`guaranteedKabuto\`; Kabuto chỉ được tặng vật liệu một lần. Người chơi chưa mở máy vẫn tích lũy vật liệu.
- Bản đã hồi sinh trước khi feature lock phát hành: **giữ nguyên** Pokemon trong PokéBox, Pokédex và vật liệu còn lại, không hồi tố xóa.

## 6. Contract tích hợp engine / cần làm tiếp

1. Co-op mission runtime \`FossilLabQuest\` với state \`intro -> dig -> repair -> defend -> result\`; host-authoritative network, AI fill missing roles, no change to Arena/BR/Berry.
2. Adapter sở hữu \`sessionId\`, \`seq\`, participants, objective status, elapsed tick. Host xác nhận \`settle(save, receipt, commit)\` đúng một lần **cho từng hồ sơ**. Không cho client tự tuyên bố hoàn thành.
3. Khi commit hoàn tất, cập nhật PC lab panel và mở \`G.PKMSVVFossils.restore()\`; chỉ lúc đó Pippi mới chúc mừng mở máy.
4. Nội thất dùng fixed placements từ catalog; build atlas đồ vẽ gốc và kiểm thử ảnh trước khi làm shop hoạt động.
5. QA: save cũ, 2 lần bấm thưởng, ngắt Wi-Fi, host rời phòng, solo AI, 2–4 người, controller, Android WebView, Kanto/Grieta 150+45s, transaction rollback, 100k lượt roll vật phẩm hiếm.
6. PC Electron/NRO Switch không tuyên bố hỗ trợ cho tới khi pipeline tương ứng đạt.

## 7. Thoại Pippi tham khảo (không tiết lộ xác suất rơi)

- Thấy máy khóa: “Ê, khoan đút Kabuto vô! Cái máy này còn chưa biết ai là chủ. Dĩ nhiên là tui — giám đốc xinh đẹp, còn bạn là bộ phận khuân vác!”
- Bắt đầu nhiệm vụ: “Tuyển nhân viên Co-op! Lương trả bằng Xu Đồng Đội, làm sai tui trừ… lòng tự trọng. Thế thôi, chứ tui đâu ác!”
- Thắng lần đầu: “CHÍNH TAY PIPPI cứu sống ngành cổ sinh học! Ủa, bạn cũng có góp sức hả? Được, cho bạn đứng góc hình.”
- Khi không đủ tiền: “Ngó thôi nha. Đụng vô món này mà nghèo, máy tính tiền nó cười á!”
- Rớt tượng: “TRỜI ƠI! Chân dung quyền lực của tui bằng vàng thật! Hãy đặt lên bệ danh dự ngay. Ai nói tự luyến, tui khóa phòng đấy!”
