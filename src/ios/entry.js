'use strict';
document.addEventListener('DOMContentLoaded',()=>{
 const status=document.getElementById('status');
 document.getElementById('play').addEventListener('click',()=>{
  try{localStorage.setItem('pkmsvv.web.saveMode','local');}
  catch(e){status.textContent='Safari đang chặn lưu dữ liệu. Hãy bật bộ nhớ website rồi thử lại.';return;}
  window.location.assign('/game/');
 });
 if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{
   status.textContent='Không bật được lưu tài nguyên trang web. Bạn vẫn có thể chơi khi có mạng.';
  });
 }
 if(!window.matchMedia('(display-mode: standalone)').matches&&!navigator.standalone)
  status.textContent='Mở bằng Safari, chọn Chia sẻ → Thêm vào Màn hình chính để sử dụng như app.';
});