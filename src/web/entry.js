'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const cloud = document.getElementById('cloud');
  const enabled = document.documentElement.dataset.cloudEnabled === 'true';
  const status = document.getElementById('cloud-status');
  cloud.disabled = !enabled;
  status.textContent = enabled
    ? 'Online cần Internet; phòng co-op tối đa 4 người khi đăng nhập.'
    : 'Chưa cấu hình Firebase riêng. Hiện chỉ mở được chế độ offline trên web.';
  function start(mode) {
    try { localStorage.setItem('pkmsvv.web.saveMode', mode); }
    catch (e) { status.textContent = 'Trình duyệt chặn lưu cài đặt. Hãy cho phép lưu dữ liệu website.'; return; }
    window.location.assign('./game/');
  }
  document.getElementById('local').addEventListener('click', () => start('local'));
  cloud.addEventListener('click', () => { if (enabled) start('cloud'); });
});