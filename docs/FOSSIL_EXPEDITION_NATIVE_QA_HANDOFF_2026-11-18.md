# Handoff: Co-op Khai quật hóa thạch — 2–4 người (QA, 18/11/2026)

## Đã làm và kiểm thử thành công

- **2–4 tổng thành viên** ở tất cả luật liên quan: người chơi thật + đồng đội do máy điều khiển. Một người chơi được lập đội với **1–3 AI**; không chấp nhận trận chỉ có một thành viên. Không đụng số lượng 2–10 của Sống Còn và các chế độ Co-op cũ.
- Định danh riêng `fossil_lab` đã thêm vào nguồn menu chung `src/shared/coop-unified.js`, danh sách mode của `src/lan/solo-ai-bus.js`, LAN Host `lan-server/server.cjs`. Gating menu từ chối bắt đầu khi engine chưa tích hợp; không ngầm chuyển về `coop`.
- Lõi logic `src/pkmsvv-fossil-expedition-core.cjs` đã có: 3 điểm đào, 3 lần khai quật/điểm, kiểm tra khoảng cách, bảo vệ máy trước quái thật, rút lui **chỉ từ phút 6 đến trước phút 8**, thất bại khi máy hư, hết thời gian hay đội không đủ 2. Tạo receipt chỉ sau chiến thắng, không trả thưởng khi thất bại.
- `tests/fossil-expedition-core.test.cjs`, `tests/fossil-expedition-routing.test.cjs` và `tests/coop-lab-core.test.cjs` chạy thành công trên GitHub Actions.
- Giao diện Web QA 2.3.0 hiển thị 2–4 ở ô mới, có smoke Chromium; **chỉ là preview**, không gọi gameplay hay tự trừ/cộng xu.

## Đã viết nhưng CHƯA qua QA native

- `src/pkmsvv-fossil-expedition-native.js`: điều khiển đào E, máy nghiên cứu, HUD, bản đồ và Host/guest snapshot cho nhiệm vụ Co-op.
- `scripts/patch-fossil-expedition-native.cjs`: hook vào Game update/draw, mode validation, network event, kết thúc trận; chỉ chạy khi `PKMSVV_FOSSIL_NATIVE_QA=1`.
- `tests/fossil-expedition-native-browser.cjs` và workflow `.github/workflows/fossil-native-game-qa.yml` thử tạo phòng thật + AI, chơi trận và khai quật trên Browser.
- **Native test chưa chạy tới Chromium**: workflow `44139932765` hỏng ở bước tải upstream pinned revision `11fe868c640b62ac37beacc222e056bc4d9ec892` của `JPTER78/pokesurvivor`, báo `fatal: could not read Username for https://github.com`. GitHub URL upstream cũng không tải được trong lần tra cứu hiện tại. Đây là **build blocker**, không đồng nghĩa gameplay đã đạt.
- Source hiện tại chưa kết nối thanh toán thắng trận `settle()` vào adapter native. Reward vẫn để **tắt** để không phát xu/Kabuto do UI giả. Guest interaction còn cần kiểm thử đồng bộ. Đã có thiết kế phần thưởng ở `data/pkmsvv-coop-lab-catalog.json` và rollback trong `src/pkmsvv-coop-lab-core.cjs`.

## Việc cần hoàn thiện trước khi công bố bản chơi được

1. Khôi phục **đúng** source upstream pinned revision hoặc một bản sao đã xác minh cùng commit, không thay âm thầm bằng fork/phiên bản khác.
2. Build native candidate với `PKMSVV_FOSSIL_NATIVE_QA=1`; sửa mọi anchor drift khi patch sau Berry; kiểm thử real browser 2–4 thành viên, Co-op AI và multiplayer LAN.
3. Kiểm tra 3 rock interaction, va chạm map, host state và truyền trạng thái tới guest, thất bại, rút lui 6–8 phút, thoát trận và replay; tuyệt đối không crash UI/Android.
4. Kết nối settlement Host-authoritative với kiểm tra room/match ID, chống nhận thưởng hai lần, save rollback; first clear mở máy vĩnh viễn và nhận Kabuto miễn phí; replay trả Xu Đồng Đội.
5. Chỉ sau khi game loop, LAN và save cùng đạt mới bật nút Bắt đầu trên Web QA; không đụng production.

## Links

- QA UI: https://research-ui-qa.pkmsvv-web.pages.dev/ai/game/
- Core QA: https://github.com/votrivalley/PKMSVV/actions/runs/44139181562
- Blocked native workflow: https://github.com/votrivalley/PKMSVV/actions/runs/44139932765

## Cập nhật khôi phục upstream và build native — 18/11/2026

- Nguyên nhân lỗi workflow #44139932765: `https://github.com/JPTER78/pokesurvivor.git` trả 404 / `fatal: could not read Username`, không tải được mã gốc.
- Đã xác minh commit `11fe868c640b62ac37beacc222e056bc4d9ec892` tồn tại trên **hai mirror public** `ovolee37/pokesurvivor-ayn-thor` và `Tpg590/Pokemon`. Cả hai giữ cùng tree SHA `0a36feb1d9639efd7383bf30d1bfb08830dd8c6e` của đúng snapshot 20/10; không dùng HEAD mới của fork.
- Workflow `.github/workflows/fossil-native-game-qa.yml` được cập nhật để fetch immutable SHA từ mirror và chặn build nếu SHA/tree không khớp. Thêm tải PMDCollab sprites Pippi bằng script có kiểm tra hash.
- **Workflow #44143839021 PASSED**: build `PKMSVV_FOSSIL_NATIVE_QA=1`, Chromium tạo phòng riêng `fossil_lab` cho 2–4 người (host+AI), bắt đầu trận, hiện 3 điểm khai quật, đào đá bằng thao tác gốc, không crash trong smoke. Artifact `PKMSVV-Fossil-Native-Gameplay-QA` ~79 MB tải từ GitHub Actions; chưa tự triển khai lên Cloudflare QA.
- Chưa test soak cả 6–8 phút / guest join 2 client / settlement Kabuto/Xu Đồng Đội. Phần thưởng vẫn bị vô hiệu hóa trong native QA cho tới khi có bằng chứng kết thúc và chống duplicate. Web QA 2.3.0 vẫn là **preview UI** và không phải bản Native gameplay vừa build.
- Run: https://github.com/votrivalley/PKMSVV/actions/runs/44143839021

## Gameplay Web QA có thể vào trận — xác nhận 18/11/2026

- **Đã phát hành riêng** tại: https://fossil-gameplay-qa.pkmsvv-web.pages.dev/game/ (branch Cloudflare `fossil-gameplay-qa`), không thay `pkmsvv-web` hay `research-ui-qa`. Run xác minh cuối `44147576836`, commit `a46942f141610cd684e6df8d1aa7d7543e811da9`, workflow **Success**.
- Cơ chế hoạt động trên static Web: **Co-op 2–4 thành viên, riêng bản thử này 1 người thật và 1–3 đồng đội máy**, không chạy LAN server/WebSocket. Muốn nhiều người thật cần Host LAN và thử nghiệm network riêng.
- Đã kiểm thử bằng Chromium **trực tiếp trên URL Cloudflare công khai**, không chỉ localhost: tạo phòng `fossil_lab`, thêm AI, khởi động trận, 3 điểm đá xuất hiện, thao tác khai quật và game tiếp tục chạy không page error. Bản QA được dấu bằng `build-info.json` + exact commit.
- **Chưa hoàn tất chứng nhận** trọn 6–8 phút, multiplayer 2 máy, kết thúc trận, phát thưởng. Trạng thái Kabuto miễn phí và Xu Đồng Đội vẫn bị khóa trong adapter native, không thể coi là gameplay thành phẩm.
- QA URL cho Phòng nghiên cứu cũ `research-ui-qa.pkmsvv-web.pages.dev` chỉ là Web UI preview đã biên dịch trước, không có gameplay Co-op mới. Hướng dài hạn: hợp nhất source QA sau khi chứng nhận, không dán file JS lên `app.min.js` cũ vô hạn.
- Run: https://github.com/votrivalley/PKMSVV/actions/runs/44147576836

## 18/11 — Beta hợp nhất cố định và sửa AI/sprite (QA 2.4.0)

- Chỉ dùng hai link để test/phát hành: **Web chính** `https://pkmsvv-web.pages.dev/` (không đụng trong QA) và **Beta** `https://beta.pkmsvv-web.pages.dev/game/`. Các workflow `preview-research-ui-qa.yml` và `preview-pippi-web-qa.yml` đã chuyển thành `workflow_dispatch` thủ công, không còn auto deploy các URL lẻ.
- **Lỗi AI đứng yên đã tìm được nguyên nhân mã nguồn:** `G.LanAI.activeBots()` trong `src/lan/lan-ai.js` quên đưa `fossil_lab` vào danh sách mode. Sau khi sửa, Host khởi tạo AI, đồng đội theo người đào, hỗ trợ phòng thủ máy bằng thuật toán lái cục bộ có chi phí giới hạn; khi đào xong chuyển ưu tiên về máy.
- **Sprite**: thay Canvas placeholder hình chữ nhật bằng `assets/coop-lab/fossil-excavation-rock.svg` (đá pixel-art) và `assets/coop-lab/decor/machine_old_modular.svg` (máy nghiên cứu riêng), cả hai được tải trong game và có fallback offline khi asset lỗi.
- **Hiểu đúng clock = 0 lúc mới vào trận:** game có màn chọn Berry đầu trận kéo dài tối đa 10 giây và bản patch `patch-berry.cjs` cố ý tạm dừng time/spawn. Bài QA ban đầu đo ngay trong màn chọn Berry nên sai. Test mới xác nhận/đóng Berry trước khi đo hoạt động gameplay.
- **Chromium trên bản engine + trực tiếp URL Beta đều PASS**: phòng `fossil_lab` 2–4 thành viên, host + AI, AI di chuyển (sample 150px / 11 giây), 3 vị trí đào, ảnh máy và đá load thành công, thao tác khai quật và vòng lặp engine không crash.
- **Soak 115 giây PASS**, game clock tiến tới 111,2 giây, 3/3 AI hoạt động, 33 quái cuối checkpoint, không có stalls, lỗi JavaScript hoặc console error trong kiểm thử nội bộ, sprite sẵn sàng; đủ bắt lỗi người dùng thấy trên dưới 1 phút, nhưng chưa chứng minh hoàn thành toàn bộ 6–8 phút.
- GitHub Actions run **44153769236** `Success`, Cloudflare verify exact SHA `e62d5bc27a3933a589cb696b727f746f8b72b142`; deployed build `2.4.0-Unified-Beta-Fossil-AI-Sprite-QA`.
- **Chưa bật thưởng, chưa thử nhiều người thật trên LAN, chưa QA 6–8 phút trọn trận hoặc so sánh save, chưa merge production.** Trước khi bật Kabuto miễn phí và Xu Đồng Đội phải hoàn thiện settlement idempotent theo room/match ID, thử guest interaction/đồng bộ và hồi sinh.
- Run: https://github.com/votrivalley/PKMSVV/actions/runs/44153769236
