# Co-op thống nhất — PC / Android / HTML5 (26/10/2026)

> Quyết định sản phẩm: KHÔNG phát hành tiếp các giao diện Co-op phân mảnh theo nền tảng.
> Tài liệu này ghi rõ **UX bắt buộc** và hạn chế kỹ thuật chưa giải quyết.
> Không được đánh dấu tính năng đã xong chỉ vì một APK/EXE/PWA đã build thành công.

## Luồng màn hình duy nhất
```
Menu chính → 🤝 Co-op
  ├── [Sống Sót] [Sống Còn] [Tranh Trứng]   (cùng 3 thẻ, luôn hiển thị)
  ├── [Tạo phòng] [Tham gia] [Chơi với AI] (cùng vị trí, cùng câu chữ)
  └── [Quay lại] [Hướng dẫn]
```
- Vào Co-op PHẢI nhìn thấy cả ba chế độ trước bất cứ màn nhập địa chỉ, danh sách Host, native AlertDialog hay trang web riêng nào.
- Chọn chế độ không rời màn; thao tác tiếp theo xác định vai trò chơi.
- Tạo phòng: sở hữu phòng/trận (room owner), tùy chọn công khai hoặc mã mời; không đồng nghĩa thiết bị đang chạy máy chủ truyền tải LAN.
- Tham gia: ưu tiên danh sách phòng tìm được; mã/QR liên kết để mời; IP chỉ trong xử lý sự cố nâng cao, không được là UI mặc định.
- Chơi với AI: tạo trận có người chơi + bot; hiện mức khó, số lượng, đội hình và bắt đầu. Không giả nút; chỉ bật chế độ có AI gameplay thật và kiểm thử được.
- Giao diện PC EXE, Android APK, iPhone/iPad HTML5 phải cùng copy, cùng thứ tự, cùng icon, cùng giới hạn phòng, cùng nút; thích ứng kích thước bằng CSS, không 3 menu khác nhau.
- Chỉ có một nguồn UI và các luật mode/bot. Native wrapper chỉ làm cầu nối OS (LAN discovery/file I/O).

## Ba chế độ và AI
| Chế độ | Người | AI mong muốn |
|---|---|---|
| Sống Sót / coop | 2–4 | AI đồng đội: di chuyển, đánh quái, HP/nhận sát thương, hồi chiêu; chủ phòng có thể thêm/bớt |
| Sống Còn / royale | 2–10 | AI đối thủ: né, tấn công, có thể bị loại, tính hạng |
| Tranh Trứng / eggrush | 4 | AI đối thủ biết tìm/nhặt trứng và tranh điểm theo đúng luật |

**Hiện trạng đã xác nhận trong mã (KHÔNG phải mục tiêu hoàn tất):**
- `src/lan/lan-ai.js` chỉ cập nhật bot nếu room.mode==='coop'.
- `lan-server/server.cjs` chỉ nhận addBot trong coop.
- `src/android/full-lan-ui.js` và `src/ios/lan-connect.html` hiện chưa dùng chung một menu Co-op.
- Browser website HTTPS không thể tự mở TCP/UDP listening socket như Node/Android; cơ chế tự quét Host gần đó qua broadcast UDP không thể chạy trong Safari như một trang HTML5 thông thường.
- LAN hiện còn cần PC chạy node/Electron relay. Android/Web có thể làm **chủ phòng**, nhưng chưa thể tự chạy **máy chủ truyền tải**; không được nhập nhằng hai nghĩa này.

## Kiến trúc phải thống nhất trước khi thay transport
1. `shared/coop-ui`: một luồng Co-op duy nhất cho ba build, hiển thị 3 mode, 3 hành động, lobby, bot config.
2. `shared/coop-rules`: giới hạn chế độ, hợp lệ thành viên/AI, trận đấu nhất quán.
3. `shared/coop-ai`: bot action frames và logic theo từng mode; test đối thủ/cướp trứng/đồng đội.
4. `transport-adapter`: chạy trên browser/Capacitor/Electron; không thay đổi màn hình người chơi. Kết nối cùng Wi-Fi không dùng Firebase/Google.
5. Với yêu cầu **bất cứ thiết bị nào cũng có thể Host không cần PC relay**: phải có transport thật ở cả ba nền tảng. Web có thể dùng WebRTC nhưng thiết lập Peer-to-Peer cần signaling/trao đổi offer-answer (QR thủ công hoặc dịch vụ rendezvous); không thể hứa tự phát hiện qua Wi-Fi chỉ bằng Cloudflare Pages tĩnh.

## Tiêu chí QA trước khi công bố
- [ ] Tap Co-op trên Windows, Android, HTML5 đều hiện cùng ba thẻ, ba action, không bật Online/Firebase UI.
- [ ] Chọn mỗi thẻ đều đi đến đúng mode, icon/label/giới hạn thống nhất.
- [ ] Ứng dụng chạy ngang Android 16:9/18:9/20:9 không tràn hoặc chồng topbar; iPhone Safari/PWA không che nút.
- [ ] PC mở trực tiếp trong EXE, không tự chuyển sang browser.
- [ ] Tạo phòng & tham gia qua cùng LAN giữa ba thiết bị, có thể chơi trận sau reload/reconnect.
- [ ] AI có hành vi thực cho từng mode, có sát thương/HP/điểm/hạng và kết thúc trận; không chỉ là mock member.
- [ ] Không xóa/chuyển đổi key save; backup JSON vẫn hoạt động.
- [ ] Tests + thử chơi 2 máy thật, không coi build OK là QA hoàn chỉnh.

## Không làm
- Không tiếp tục tạo 3 Co-op menu/3 logic tùy nền tảng.
- Không yêu cầu nhập IP là bước mặc định trong UX.
- Không báo “Host trên HTML5 không cần server” khi chưa có signaling WebRTC thực sự.
- Không tuyên bố AI đã hoàn chỉnh cho Sống Còn/Tranh Trứng khi chưa có simulation gameplay.
