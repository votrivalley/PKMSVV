/* Web-only release note: offline PC/Android have no multiplayer microphone. */
{
 const entry=G.CHANGELOG.find(x=>(x.title||[])[0]&&
   (x.title||[])[0].includes('v1.4'));
 if(entry)entry.new.unshift([
  'Voice giờ chỉ còn hai nút Mic/Loa nhỏ bên cạnh Pause, bật/tắt độc lập. Nhấn giữ Loa hoặc nhấn chuột phải để mở cài đặt nâng cao (âm lượng, Push-to-Talk, tắt tiếng từng người, thử lại). Không còn bảng thoại lớn che trận đấu.',
  'Voice now has two tiny independent Mic/Speaker buttons beside Pause. Hold Speaker or right-click to open advanced settings (volume, PTT, per-player mute, reconnect). The large overlay no longer covers gameplay.'
 ]);
 if(entry)entry.new.unshift([
  'Voice Chat P2P (thử nghiệm): chỉ phòng Sống Sót 2–4 người. Tự chọn Tham gia thoại; mic mặc định tắt. Có bật/tắt mic, giữ V để nói, âm lượng và tắt tiếng đồng đội. Không ghi âm; không dùng Firebase để chuyển âm thanh. Cần kết nối WebRTC trực tiếp, không có TURN dự phòng.',
  'Experimental P2P Voice Chat: only 2–4 player Co-op. Opt in to listen; the mic stays off until explicitly enabled. Toggle mic, hold V to talk, control volume and mute teammates. No recording or Firebase audio relay. Direct WebRTC required; no TURN fallback.'
 ]);
}