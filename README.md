# Pokémon Survivor — PKMSVV (Votri Valley)

**Unofficial, free, noncommercial fan build** of [PokéSurvivor](https://github.com/JPTER78/pokesurvivor) for Windows 10/11 x64.

This repository is a **reproducible desktop build/customization layer**, not an independent Pokémon game and **not** an official JPTER78 release. It pulls the original game source at an exact pinned commit, applies optional local gameplay tweaks, and packages all assets into one portable Windows `.exe` using Electron. The app does **not** open pokesurvivor.com or require network access while playing.

## Tải bản Windows

1. Mở tab **Actions** của repository này.
2. Chọn workflow **Build Windows Offline (noncommercial)** và nhấn **Run workflow** (hoặc mở run sau một lần push).
3. Khi job **Build Windows portable EXE** hoàn tất, tải artifact **PKMSVV-Windows-Offline-x64**.
4. Giải nén ZIP và chạy file `PKMSVV-*-Windows-x64.exe`. Đây là bản **portable**, không cần cài đặt hay kết nối internet.

> Đây là quy trình tạo bản thử nghiệm. Nếu workflow báo lỗi, xem logs trước khi sử dụng. Windows SmartScreen có thể cảnh báo vì file chưa được ký số. Chỉ chạy file từ repo mình tin cậy.

## Chức năng

- **PC offline:** đầy đủ client game và sprites nằm trong .exe, không dùng website live.
- **Local saves không cần đăng nhập:** tự mở hồ sơ cục bộ, nếu có phiên đăng nhập local đang lưu thì khôi phục trước; không chuyển sang guest. Tiến trình lưu bền qua `localStorage` trong dữ liệu Electron.
- **Điều khiển:** WASD/phím mũi tên, phím 1–4, Q/E, Esc/P; F11 để bật/tắt toàn màn hình.
- **RVT Balanced:** gameplay dựa trên bản gốc, tùy chỉnh được lượng quái, sức mạnh, Shiny, gacha và tiền khởi đầu bằng [config/gameplay.json](config/gameplay.json). Muốn giữ cân bằng tác giả, xem preset trong tài liệu.
- **Offline-only:** tắt Firebase, ẩn các mục bạn bè/ranking online và chặn truy cập mạng từ game client.
- **Ngôn ngữ:** mặc định tiếng Việt (có dấu); từ điển sinh từ 1.374 mục tiếng Anh của nguồn, ưu tiên dịch thủ công và quy tắc thay thế. **Chưa được QA hoàn chỉnh từng câu**, có thể còn câu pha tiếng Anh hoặc thuật ngữ cần chỉnh.

## Mã nguồn / Git gốc

- Official source: https://github.com/JPTER78/pokesurvivor
- Author: Jonathan Piera Torregrosa / JPTER78
- Source revision pinned by build: `11fe868c640b62ac37beacc222e056bc4d9ec892` (2026-10-20)
- Local source folder generated during build: `vendor/pokesurvivor/` (not checked into PKMSVV)
- This repository contains only the desktop wrapper, customizer and build workflow. The **complete upstream game is cloned** into the build workspace and included in the compiled artifact.

## Build trên Windows (Node.js 22+ và Git)

```powershell
git clone https://github.com/ronvotri/PKMSVV.git
cd PKMSVV
git init vendor/pokesurvivor
git -C vendor/pokesurvivor remote add origin https://github.com/JPTER78/pokesurvivor.git
git -C vendor/pokesurvivor fetch --depth 1 origin 11fe868c640b62ac37beacc222e056bc4d9ec892
git -C vendor/pokesurvivor checkout --detach FETCH_HEAD
npm install
npm run prepare:game
npm run prepare:icons
npm run test:balance
npm run build:win
```

Output: `dist/PKMSVV-*-Windows-x64.exe`. The prep script is designed to run **once per clean source checkout**. To rebuild after changing the config, restore the upstream working tree first (or re-clone into `vendor/pokesurvivor`). The GitHub workflow starts from fresh source every time. Avoid running a modified game source from untrusted origins.

## Giấy phép — bắt buộc đọc

**Không thương mại hóa** bản build: không bán game, thu phí tải, quảng cáo/kiếm tiền bằng nội dung game, hoặc lấy tài nguyên Pokémon dùng cho sản phẩm thương mại. Mã game mới tại upstream được cấp phép **PolyForm Noncommercial 1.0.0** từ 14/10/2026. Bản cũ tới commit `b297089` là MIT, nhưng **bản PKMSVV này sử dụng mã hiện tại theo PolyForm NC**. Sprite SpriteCollab là **CC BY-NC 4.0**, font Pixelify Sans theo **OFL 1.1**. Thương hiệu và hình Pokémon là của Nintendo, Creatures Inc., GAME FREAK/The Pokémon Company, không thuộc giấy phép của tác giả.

See [NOTICE.md](NOTICE.md), and bundled original `LICENSE`, `LICENSE-NONCOMMERCIAL.md` and `CREDITS.md`. All source copyright notices remain in the imported source; the executable is for personal, noncommercial use only. Third-party IP holders may still impose independent restrictions.

The workflow publishes a **temporary GitHub Actions artifact**, not a public GitHub Release or commercial distribution. Do not imply endorsement by JPTER78 or The Pokémon Company.

## Tiến hóa Pokémon trong trận — v0.2.0

- Bảng [455 nhánh tiến hóa Pokédex](data/evolution-rules.json), đi kèm [checklist toàn bộ Pokémon](docs/EVOLUTION_CHECKLIST.md) và [bảng CSV](docs/EVOLUTION_CHECKLIST.csv). Dữ liệu lấy từ PokeAPI, chỉ xét các loài hiện có trong PokéSurvivor; cần sprite đích mới có thể tiến hóa.
- **Lên cấp:** tiến hóa đúng mốc cấp của Pokédex (Charmander Lv16 → Charmeleon; Charmeleon Lv36 → Charizard). Giữ chiêu thức, cấp, HP theo tỷ lệ, các buff đang có; chỉ đổi dạng, chỉ số cơ bản, hệ và sprite.
- **Tiến hóa bằng vật phẩm/trao đổi:** thắng boss để nhận 1 **Mảnh Tiến Hóa** mỗi boss, tiêu một mảnh để kích hoạt đúng đá/vật phẩm hoặc Dây Liên Kết; không cần mạng.
- **Điều kiện đặc biệt:** tính thân thiết dựa trên cấp và thời gian sinh tồn; luân phiên ngày/đêm theo chu kỳ 4 phút trong trận; di chuyển, chịu sát thương, dùng chiêu, thời tiết, địa hình và thắng boss cho các yêu cầu được chuyển thể.
- **Nhiều nhánh:** menu hiện các dạng thỏa điều kiện để tự chọn; có nút hoãn đến lần lên cấp tiếp theo.
- **Ngoại lệ:** Meltan → Melmetal sau 4 boss; Gimmighoul → Gholdengo bằng cách tiêu 999 Pokécoins local; Bisharp → Kingambit sau 3 boss (đều là quy đổi từ điều kiện gốc).
- **Giới hạn:** không hỗ trợ phát sinh thêm Shedinja như đồng đội; không tạo các dạng regional/giới tính riêng khi Pokédex gốc không có sprite tương ứng; biến thể hình thái và nhiều điều kiện ngoại lệ được **quy đổi**, không cam kết giống tuyệt đối game chính thức. Chưa kiểm thử thủ công tất cả 455 nhánh.
- **Sưu tầm:** tiến hóa trong run không tự mở khóa Pokémon mới trong bộ sưu tập; vẫn cần gacha/thu thập như cũ. Trong game chỉ phát triển một Pokémon đang điều khiển; không phải đội 6 Pokémon.

Xem `src/pkmsvv-evolution.js` để sửa logic và `tests/evolution.test.cjs` để kiểm tra tự động.

## Hướng phát triển tiếp

- Việt hóa tiếng Việt đầy đủ và kiểm tra tràn chữ.
- Menu cấu hình gameplay ngay trong game, thay vì chỉnh JSON rồi build lại.
- Export/import saves an toàn và phục hồi sau cài lại Windows.
- Kiểm tra gamepad, fullscreen và tối ưu dung lượng.

## Khởi động không đăng nhập và Việt hóa

- Lần đầu mở game: tự tạo hồ sơ **Người chơi** trên máy, vào bài kiểm tra Pokémon ban đầu nếu chưa chọn starter. Các lần sau vào menu trực tiếp; không cần user/password/Guest. **Nếu máy đang có phiên lưu local từ bản trước, sẽ khôi phục phiên đó**. Các file save khác được giữ nguyên, không tự ý hợp nhất hoặc xóa.
- Từ điển tiếng Việt: [src/vi-translations.cjs](src/vi-translations.cjs), tích hợp với hệ thống i18n của game. Bản này ưu tiên giao diện, HUD, nhiệm vụ, vật phẩm và tên chiêu thức; nguồn có nhiều nội dung phát sinh theo ngữ cảnh nên vẫn cần báo lỗi màn hình để rà soát.
- Giữ nguyên hành vi ghi localStorage của game. Không đưa lại Firebase hay màn hình cloud/login; các mục online và đăng xuất được ẩn. Thử nghiệm xuất/nhập save là hạng mục riêng.

## PKMSVV v0.4.0 — kỹ năng tự động và nhạc tùy chỉnh

- Mỗi chiêu học được tự đánh cùng lúc theo **hồi chiêu riêng**. Không cần chuyển qua lại bằng 1–4, Q/E; những phím số vẫn dùng để chọn thẻ lên cấp.
- Bắt đầu tối đa **6 kỹ năng**; mỗi lần hạ boss huyền thoại trong khe nứt mở thêm **1 ô** (tối đa 8 ô) và rút ngắn **4% hồi chiêu**. Vì mọi chiêu đã tự đánh nên không còn cần ghép Liên Kết để kích hoạt nhiều chiêu.
- HUD hiển thị AUTO cho tất cả ô kỹ năng, kèm bộ đếm hồi chiêu. Tiến hóa Pokémon, tiến hóa chiêu thức và lưu offline vẫn hoạt động như phiên trước.
- Băng Lựa Chọn đổi thành **+25% sát thương, -15% tốc chạy** do hình phạt không được chuyển chiêu đã không còn ý nghĩa.
- Hỗ trợ thay nhạc theo [7 vị trí đã đặt tên](custom-music/README.md). Thêm bài MP3/OGG/WAV đã có quyền sử dụng vào repo rồi build lại. Nếu không thêm bài nào, vẫn phát nhạc gốc do máy tổng hợp; không có nhạc Pokémon chính thức được phân phối kèm.

## Android APK — v0.5.0 (thử nghiệm)

- Android 7.0+ (API 24), WebView/Chrome hiện đại; yêu cầu chơi màn hình ngang. Game và tài nguyên nằm trong APK, không cần truy cập website để chơi.
- Đóng gói bằng Capacitor 8; giữ các bản vá hiện tại: tự động đăng nhập offline, tiếng Việt, tiến hóa Pokémon và tự thi triển các kỹ năng.
- Mở GitHub Actions, chọn workflow Build Android APK Offline; tải artifact PKMSVV-Android-APK-debug sau khi hoàn tất Success; giải nén ZIP và cài APK.
- APK debug không dành cho Google Play; Android có thể cảnh báo vì cài ứng dụng ngoài cửa hàng.
- Save Android hoàn toàn riêng Windows. Khóa ký debug do máy build tạo có thể thay đổi mỗi lần; nếu phải gỡ app để cài lại thì dữ liệu trong máy có thể mất. Chưa có chức năng sao lưu save, nên đừng dùng bản thử nghiệm để lưu tiến trình quan trọng.
- APK sẽ mang đầy đủ nhạc custom-music đã được phép phân phối nếu có; phần chưa được thay sử dụng nhạc game gốc.
- Chưa thử trực tiếp trên máy Android; cần kiểm tra cảm ứng, font dấu, lưu game, nhạc và hiệu suất 6–8 chiêu đồng thời.

### Build APK tại máy

Yêu cầu Node.js 22, Java 21 và Android SDK 36. Sau khi đã clone đúng revision upstream như README Windows:

```bash
npm install
npm run prepare:game
npm run prepare:icons
npm run test:balance
npm run prepare:android
npx cap add android
npx cap sync android
node scripts/configure-android.cjs
node scripts/apply-android-icons.cjs
cd android
./gradlew assembleDebug
```

File đầu ra: android/app/build/outputs/apk/debug/app-debug.apk.

## V0.5.0 — Cân bằng 103 chiêu tự động, 6 buff và biểu tượng Survivor

- Mọi **103 kỹ năng** được cân lại hồi chiêu theo **23 nhóm**. Không đổi tác dụng riêng của từng kỹ năng; khi học mới và lên cấp, vẫn hoạt động bình thường. Giảm hồi chiêu từ các thẻ nâng cấp có giới hạn an toàn tránh spam quá nhanh.
- **6 buff** (Swords Dance, Nasty Plot, Agility, Harden, Aqua Ring, Dragon Dance) không còn cộng dồn liên tục: cấp 1–4 tự bật và nghỉ theo chu kỳ 16 giây, với thời gian hiệu lực tăng theo cấp. Lên **cấp 5** buff duy trì vĩnh viễn, chỉ 1 tầng tác dụng, không tiếp tục tạo hoạt ảnh. Buff không chịu giảm hồi chiêu chung để giữ khoảng nghỉ ở cấp thấp.
- HUD kỹ năng hiển thị `ON 5s`, `OFF 4s` hoặc `MAX`; chiêu gây sát thương vẫn hiển thị `AUTO` và hồi chiêu.
- [Chi tiết hồi chiêu và buff cho từng chiêu](docs/SKILL_BALANCE.md) — đối chiếu 103 chiêu từ nguồn. Cân bằng là điểm khởi đầu, cần chơi thử để điều chỉnh thêm mật độ quái, DPS và FPS.
- Icon Windows EXE, favicon và launcher Android dùng **Poké Ball với chữ Survivor**. Nguồn icon có thể xem ở [assets/icon-survivor.svg](assets/icon-survivor.svg); icon được render trong CI từ nguồn vector này.

## v0.6.0 — QA sau bản chơi thử

- Khôi phục **hai ngôn ngữ Tiếng Việt (mặc định) và English** trong phần Cài đặt. Khi đổi ngôn ngữ sẽ lưu lựa chọn qua lần chạy sau.
- **Tên của 103 chiêu thức và 97 tên chiêu sau tiến hóa trở lại tiếng Anh**, tham chiếu theo tên tiếng Anh chính thức và bảng phân biệt tên Anh/Việt của cộng đồng. Phần mô tả, nâng cấp và nhiệm vụ vẫn bằng tiếng Việt.
- Mục **Có gì mới?** được đặt về danh sách trống để chờ nhật ký cập nhật PKMSVV do bạn biên soạn, không còn bản tin tác giả game gốc. Khi cần thêm bản tin, cập nhật `js/data/changelog.js` trong nguồn patch thay vì tin bản gốc.
- Không còn hướng dẫn đổi chiêu 1–4/Q/E hoặc LB/RB. Các chiêu bình thường vẫn tự dùng khi hồi chiêu xong.
- **4 chiêu lao vào mục tiêu** (nhóm `dash`): chỉ kích hoạt thủ công bằng **F trên PC / X trên tay cầm / nút kỹ năng ở cạnh phải màn hình cảm ứng**. Nếu học nhiều hơn một chiêu lao tới, mỗi lần bấm sẽ kích hoạt một chiêu sẵn sàng theo vòng luân phiên. Không thể kích hoạt khi đang hồi chiêu hoặc game tạm dừng.
- Màn hình **tiến hóa Pokémon** được đưa vào hệ thống chọn bằng tay cầm. D-pad/analog chọn, **A** xác nhận, **B** giữ nguyên dạng hiện tại.
- Bản vá này là bản kiểm thử mới. Cần xác nhận trực tiếp với các tay cầm Xbox, PlayStation hoặc Switch vì ánh xạ nút thực tế có thể khác trên từng thiết bị.

## Sao lưu và chia sẻ save Windows (.exe portable)

Bản `.exe` **không chứa save đang chơi**. PKMSVV Electron đặt dữ liệu ứng dụng và tiến trình offline tại **`%APPDATA%\PKMSVV-Offline`** trên Windows; lưu riêng khỏi EXE nên có thể di chuyển/đổi tên file EXE mà không mất tiến trình.

1. Thoát hẳn PKMSVV ở cả hai máy (kể cả cửa sổ chạy nền).
2. Máy nguồn: **Win + R** → nhập `%APPDATA%\PKMSVV-Offline` → mở thư mục và nén **toàn bộ thư mục PKMSVV-Offline** thành ZIP. Không chỉ chép một file `Local Storage` lẻ.
3. Máy nhận: chạy bản PKMSVV tương thích ít nhất một lần rồi thoát. Mở `%APPDATA%` và **đổi tên** thư mục `PKMSVV-Offline` hiện có thành `PKMSVV-Offline-backup` để giữ save cũ.
4. Giải nén thư mục `PKMSVV-Offline` máy nguồn vào `%APPDATA%` ở máy nhận; sau đó khởi động lại game.
5. Nếu có lỗi, đóng game, xóa thư mục vừa sao chép và đổi `PKMSVV-Offline-backup` về tên ban đầu.

**Lưu ý:** đây là cách sao chép **toàn bộ dữ liệu cấu hình Electron** (bao gồm Local Storage và dữ liệu trình duyệt), không chỉ save Pokémon. Chỉ nhập ZIP từ người tin cậy, không trộn các file riêng lẻ, không ghi đè khi ứng dụng đang mở. Dữ liệu Android/APK ở bộ nhớ riêng và chưa có chức năng đồng bộ/xuất nhập với PC.

### Điều khiển chiêu chủ động (hướng dẫn trong Cài đặt → Điều khiển)

- PC: **F**.
- Tay cầm Xbox: **X** (phím mặt ở bên trái). Tay cầm PlayStation: **□ Square**, nếu tay cầm dùng bố cục Gamepad chuẩn.
- Android: nút kỹ năng **hiện khi học chiêu lao tới**.
- Các chiêu không phải nhóm lao tới vẫn tự sử dụng khi hết hồi chiêu; chỉ những chiêu lao tới cần nhấn thủ công.

## Ghi công bản Việt hóa và mod

Trên màn hình khởi động và dưới logo menu chính: **Việt hóa và Mod điều chỉnh bởi Votri Valley**. Ghi công tác giả gốc JPTER78, SpriteCollab và những người đóng góp vẫn được giữ.

## Cảnh báo SmartScreen khi tải EXE

Bản Windows portable chưa ký số Authenticode. Thay icon và chữ trong menu sẽ không làm mất cảnh báo Unknown publisher. Xem [docs/WINDOWS_SMARTSCREEN.md](docs/WINDOWS_SMARTSCREEN.md).

## v0.6.3 — Nhãn Chủ động / Tự động và nhiều chiêu lao tới

- Các chiêu **Dash / lao tới** là **Kỹ năng chủ động**, hiện nhãn riêng khi học chiêu, trong thanh kỹ năng và bảng kỹ năng khi tạm dừng. Các chiêu thông thường là **Kỹ năng tự động**, buff là **Buff tự động**. Có cả nhãn tiếng Anh tương ứng.
- Có **4 kỹ năng lao tới**: Quick Attack, Aerial Ace, Flame Charge, U-turn. Chúng chỉ lao tới khi bạn nhấn **F (bàn phím), X (tay cầm Xbox), □ (PlayStation), nút riêng Android**.
- Khi sở hữu **2 hoặc nhiều chiêu lao tới**, một nút tiếp tục dùng chung: kích hoạt từng chiêu sẵn sàng theo vòng; chiêu đang hồi được tự bỏ qua, và mỗi chiêu hồi độc lập. Nút chủ động hiển thị **đúng biểu tượng và tên chiêu tiếp theo**, chỉ số `1/2`, `2/2`, và số giây nếu chưa có chiêu nào sẵn sàng.
- Nếu tất cả đều đang hồi, bấm nút không sử dụng chiêu và không làm mất lượt. Danh sách luân phiên được đặt lại với Pokémon mới khi bắt đầu một trận mới.

## Switch Lite / Switch Atmosphère — thử nghiệm v0.7.0

PKMSVV dùng công nghệ **HTML5/JavaScript/Canvas 2D**, không phải game Switch native. Để chơi trực tiếp trên Switch/Switch Lite đã hack bằng Atmosphère, bản thử nghiệm v0.7.0 được gói cho **Brewser Runtime** (homebrew hỗ trợ JavaScript, Canvas và Gamepad).

**Tải bản đóng gói:** vào [GitHub Actions → Build Switch Lite Brewser Offline Test](https://github.com/ronvotri/PKMSVV/actions/workflows/build-switch.yml), chọn lượt build *Success*, tải artifact **PKMSVV-Switch-Brewser-Offline-Test**. ZIP chứa sẵn thư mục `switch/brewser/apps/com.votrivalley.pkmsvv/` để ghép vào gốc thẻ nhớ.

1. Cài `brewser.nro` chính thức từ [Brewser Releases](https://github.com/natureglass/Brewser/releases) vào `sd:/switch/brewser.nro`.
2. Khởi động Brewser một lần trong **application/full-memory mode** (giữ R khi chạy game để mở hbmenu). Thoát Brewser.
3. Giải nén gói PKMSVV Switch ZIP vào **gốc thẻ microSD**, để gộp thư mục `switch/`. KHÔNG xóa thư mục Brewser cũ; không xóa save hoặc cấu hình.
4. Mở Brewser và nhập địa chỉ nội bộ: **`brewser://apps/com.votrivalley.pkmsvv/index.html`** (nếu bản Brewser hiện hành cho phép điều hướng trực tiếp tới ứng dụng sideload).
5. Nếu mở được, thử: A xác nhận, B trở lại, analog trái/D-pad di chuyển, **X dùng Dash chủ động**, **+ tạm dừng**, **- thoát**. Kiểm tra thêm âm thanh và lưu/mở lại.

**Giới hạn và lưu ý:** Đây là bản Brewser phụ thuộc `brewser.nro`, **không phải EXE, APK, NSP hay NRO game độc lập**. Chưa chạy trên Switch Lite thật; API của Brewser đang được hoàn thiện (đặc biệt Web Audio). Có thể cần điều chỉnh bổ sung nếu game không chạy hoặc không hiện đúng trong Brewser. Không nên cập nhật firmware hoặc can thiệp dữ liệu save chỉ để chạy bản thử nghiệm. Bản này giữ điều khoản **PolyForm Noncommercial** và ghi công trò chơi gốc JPTER78.

Để đóng gói thử trên PC: `npm run prepare:game && npm run prepare:icons && npm run prepare:android && npm run prepare:switch && npm run test:switch` (cần tải mã nguồn gốc theo workflow trước). File ZIP được GitHub Actions tạo từ `dist/switch-package/`.

**Về dạng icon Homebrew Menu:** Brewser có chức năng tạo shortcut `.nro` cho những ứng dụng đã đăng ký/cài đặt theo catalogue; việc chép app thủ công chưa bảo đảm Brewser sẽ hiển thị nó trong danh sách catalogue hoặc cung cấp nút tạo shortcut. Trước mắt sử dụng URL nội bộ để test; chỉ tạo shortcut khi trò chơi được Brewser nhận là app đã cài.

## PKMSVV.nro — Mở game bằng Homebrew Menu (v0.7.1)

Bản Switch hiện có thể tạo **PKMSVV.nro** (native ARM64 launcher bằng libnx/devkitPro, có icon Poké Ball Survivor). Nhờ tham số `--fwd=com.votrivalley.pkmsvv` theo giao thức Brewser, khi bạn bấm PKMSVV trong Homebrew Menu, trò chơi sẽ mở ngay mà không cần gõ đường dẫn Brewser.

- Tải **PKMSVV-Switch-NRO-Launcher** (chứa `PKMSVV.nro`) và **PKMSVV-Switch-Brewser-Offline-Test** (chứa game offline cùng file NRO) tại workflow [Build Switch Lite Brewser Offline Test](https://github.com/ronvotri/PKMSVV/actions/workflows/build-switch.yml).
- Chép `PKMSVV.nro` và `brewser.nro` vào `sd:/switch/`. Chép thư mục `switch/brewser/apps/com.votrivalley.pkmsvv/` từ gói offline vào thẻ nhớ như hướng dẫn trước đó.
- Mở Homebrew Menu chế độ đầy đủ RAM, chọn biểu tượng **Pokémon Survivor**. Launcher kiểm tra hai đường dẫn này trước khi chạy, và sẽ hiển thị hướng dẫn nếu thiếu file.
- Đây là **NRO chạy được ở cấp hệ thống (launcher)**, không phải NRO chứa engine và assets độc lập trong cùng một file. Switch vẫn cần `sd:/switch/brewser.nro` và thư mục game đã giải nén. Không có NSP hay cài vào Nintendo Home Menu.
- Chưa kiểm thử trên Switch Lite thật, nên việc chuyển giao Brewser bằng `--fwd` và tương thích game vẫn cần test thực tế.

## v0.7.2 — Sửa toàn bộ icon và tên Pokémon Survivor

**Tên app và icon chính thức của bản mod: Pokémon Survivor.** Chữ trên Poké Ball là **Survivor** (không phải Survival), áp dụng thống nhất cho icon Windows EXE/shortcut, icon Android (5 DPI + adaptive), favicon, icon PWA, biểu tượng và tiêu đề NRO Switch. Dữ liệu save trên Windows/Android không thay đổi đường dẫn lưu vì app ID vẫn giữ nguyên.

### Một gói Switch đầy đủ, có Brewser và NSP tuỳ chọn

- Từ v0.7.2, gói Switch ZIP chứa `switch/brewser.nro` (Brewser chính thức v0.1.1.31), `switch/PKMSVV.nro` (shortcut mở thẳng game), thư mục `switch/brewser/apps/com.votrivalley.pkmsvv/` (game offline), và `NSP_TUY_CHON/brewser-forwarder.nsp` (chỉ mở Brewser tại Nintendo Home Menu). **Không cần tải riêng brewser.nro** nếu gói đã chứa đủ hai file.
- NSP đi kèm là **Brewser forwarder**, KHÔNG phải NSP trò chơi Pokémon Survivor. Người dùng có thể chạy `PKMSVV.nro` mà không cần cài NSP. Nếu cài NSP, mở Brewser rồi chọn PKMSVV hoặc dùng URL nội bộ `brewser://apps/com.votrivalley.pkmsvv/index.html`.
- SHA-256 của hai tệp Brewser được kiểm tra tự động với bản phát hành chính thức [v0.1.1.31](https://github.com/natureglass/Brewser/releases/tag/v0.1.1.31); giữ giấy phép MPL-2.0 và liên kết mã nguồn Brewser trong ZIP. Các điều khoản phi thương mại của PokéSurvivor vẫn giữ nguyên.
- Đọc **HUONG_DAN_SWITCH.txt** mới nằm ở gốc ZIP; nó thay cho hướng dẫn Switch cũ ở những đoạn mô tả rằng gói không chứa Brewser.


## v1.2.0 — Kecleon Shop, Nature, Ability, TM và nhịp chơi mới

Bản nâng cấp gameplay phi thương mại của Votri Valley, dựa trên mã PokéSurvivor được cố định tại upstream commit `11fe868`, không dùng dịch vụ online khi chơi.

- **Cửa hàng Kecleon:** mua Mint, Ability Capsule, Hidden Ability Capsule và TM bằng PokéCoin. Có **8 TM luân phiên mỗi ngày**.
- **Túi đồ:** vật phẩm được lưu trong hồ sơ local. Chọn một Pokémon đã mở khóa, rồi dùng vật phẩm; TM đã học được lưu cho Pokémon đó.
- **Nature:** 25 tính cách; Mint đổi Nature, ảnh hưởng chỉ số (+10%/−10% với Nature không trung tính).
- **Ability:** các đặc tính phù hợp từng Pokémon, có hiệu ứng trong trận; thay bằng Capsule hợp lệ.
- **TM:** dạy chiêu tương thích và lưu dài hạn; mỗi TM đã sử dụng bị trừ khỏi túi.
- **Nhịp sinh tồn:** từ **00:00 đến trước 03:00**, tốc độ sinh quái thường, đợt dồn quái và quái phát sinh theo sự kiện giảm còn **2/3**; từ **03:00** trở đi về mức cũ. Không thay thời điểm boss, HP, sát thương hoặc kinh nghiệm từng quái.
- **Có gì mới:** hai ngôn ngữ Việt / Anh, giữ nguyên đầy đủ nội dung v1.1 đã duyệt. Phần v1.2 dùng nội dung từ [src/pkmsvv-changelog-v12.js](src/pkmsvv-changelog-v12.js), không đưa chỉnh sửa credit màn hình chính vào release note.

**Bản dựng:** [Windows portable](.github/workflows/build-windows.yml), [Android universal debug APK](.github/workflows/build-android.yml) và [Switch Brewser offline](.github/workflows/build-switch.yml). Xem [GitHub Actions](https://github.com/ronvotri/PKMSVV/actions), chọn lượt build thành công ở commit phát hành tương ứng. Build/kiểm thử tự động không chứng minh chất lượng cảm ứng, âm thanh hoặc hiệu suất trên điện thoại/Switch thật: các nền tảng này vẫn cần người chơi QA trực tiếp trước khi được coi là tương thích hoàn toàn. Sao lưu Save ra file JSON trước khi đổi bản, đặc biệt khi cài lại APK.

**Giấy phép:** giữ nguyên quyền tác giả gốc JPTER78, SpriteCollab và bên nắm giữ IP Pokémon. Bản chỉnh sửa chỉ dành cho mục đích phi thương mại.
