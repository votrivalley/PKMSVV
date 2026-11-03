# v1.5.83 — Save Guardian và Arena terminal-sync

## Save Guardian (Cloudflare HTML5)

Kiểm thử snapshot mới kiểm tra tiến trình vĩnh viễn: Pokémon/Shiny, trận/kỷ lục, Mega Stones/Forms/story gates, Berry đã sử dụng và số lượt cứu thành công, itemsFound, TM đã học vĩnh viễn (ptm), Champion seals/trophies, và cờ hoàn thành chương.

Kiểm tra theo khóa định danh, không chỉ tổng số lượng; không nhầm với giảm số dư hợp lệ khi dùng Berry, TM, Mint, Capsule hay Điểm Arena. Chỉ coi việc mất hẳn trường dữ liệu túi là hỏng schema.

Snapshot tốt nhất trước đó được bảo toàn khi phát hiện save có tiến trình bị mất. Không tự ghi đè tài khoản khác, không gửi save lên cloud. Kiểm thử trong tests/save-guardian-regression.test.cjs và npm run test:cloudflare.

## Phân biệt issue #392 và Arena PvP SVV

Nguồn: https://github.com/JPTER78/pokesurvivor/issues/392 (01/11/2026). Issue gốc mô tả mất sự kiện aw/al khi thoát Rift. Đây KHÔNG phải bằng chứng rằng lỗi Arena Solo/Champion cũ của SVV cũng do Rift.

Arena PvP SVV vốn gửi gói apvp liên tục (130ms trong gameplay), gồm seed, seq, stage, winner, round, scores và HP. Khách kiểm tra UID Host/seed/seq và có thể phục hồi sau khi mất gói kết quả. Tuy nhiên apvp-exit chỉ phát một lần, rồi Host đóng trận.

Bản sửa cho Guest: khi bỏ lỡ apvp-exit nhưng nhận thông báo room.open=true từ Host của ĐÚNG room.id và mode trận, với điều kiện phòng đã được đóng lúc bắt đầu, Guest kết thúc phiên Arena tại chỗ. Không gửi lại yêu cầu thoát lỗi thời. Không áp dụng cho lobby lúc chưa vào trận, phòng cũ hoặc mode khác.

Bài thử: bỏ gói kết quả rồi nhận snapshot tiếp theo; bỏ apvp-exit rồi nhận trạng thái lobby; từ chối packet giả Host, seed sai, sequence cũ; không cộng thưởng Survival khi thoát Arena.

Không sao chép toàn bộ bản sửa Rift upstream vào coop.js vì chưa xác minh cùng nguyên nhân. Không thay đổi gameplay, save hoặc giải thưởng.
