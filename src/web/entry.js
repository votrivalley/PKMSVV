'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const cloud = document.getElementById('cloud');
  const enabled = document.documentElement.dataset.cloudEnabled === 'true';
  const status = document.getElementById('cloud-status');
  cloud.disabled = !enabled;
  status.textContent = enabled
    ? 'Online cần Internet; phòng Sống Sót tối đa 4 người khi đăng nhập.'
    : 'Chưa cấu hình Firebase riêng. Hiện chỉ mở được chế độ offline trên web.';
  function start(mode) {
    try { localStorage.setItem('pkmsvv.web.saveMode', mode); }
    catch (e) { status.textContent = 'Trình duyệt chặn lưu cài đặt. Hãy cho phép lưu dữ liệu website.'; return; }
    window.location.assign('./game/');
  }
  document.getElementById('local').addEventListener('click', () => start('local'));
  cloud.addEventListener('click', () => { if (enabled) start('cloud'); });
  // Fullscreen activation needs a real click; no Google login is required.
  document.getElementById('fullscreen').addEventListener('click', () => {
    const el=document.documentElement,request=el.requestFullscreen||el.webkitRequestFullscreen;
    const note=document.getElementById('fullscreen-status');
    if(!request){
      note.textContent='iPhone/Safari: thêm vào Màn hình chính và mở qua biểu tượng để có giao diện toàn màn hình.';
      return;
    }
    Promise.resolve(request.call(el)).then(()=>{
      note.textContent='Đã bật toàn màn hình. Chọn chế độ chơi để tiếp tục.';
      try{if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(()=>{});}catch(e){}
    }).catch(()=>{note.textContent='Trình duyệt không cho phép toàn màn hình. Hãy thử bấm lại.';});
  });
  // Register a tiny PWA shell for reliable home-screen launch, never clear saves.
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

});