'use strict';
document.addEventListener('DOMContentLoaded',()=>{
 const status=document.getElementById('status');
 document.getElementById('play').addEventListener('click',()=>{
  try{localStorage.setItem('pkmsvv.web.saveMode','local');}
  catch(e){status.textContent='Safari đang chặn lưu dữ liệu. Hãy bật bộ nhớ website rồi thử lại.';return;}
  window.location.assign('/game/');
 });
 document.getElementById('lan-connect').addEventListener('click',()=>{
  const ip=document.getElementById('lan-ip').value.trim();
  const octets=ip.split('.');
  const valid=octets.length===4&&octets.every(x=>/^\d{1,3}$/.test(x)&&Number(x)>=0&&Number(x)<=255)&&
    (Number(octets[0])===10||
      (Number(octets[0])===172&&Number(octets[1])>=16&&Number(octets[1])<=31)||
      (Number(octets[0])===192&&Number(octets[1])===168));
  if(!valid){status.textContent='Nhập địa chỉ IPv4 nội bộ của PC Host (10.x / 172.16–31.x / 192.168.x).';return;}
  window.location.assign('http://'+ip+':37816/');
 });
 if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{
   status.textContent='Không bật được lưu tài nguyên trang web. Bạn vẫn có thể chơi khi có mạng.';
  });
 }
 if(!window.matchMedia('(display-mode: standalone)').matches&&!navigator.standalone)
  status.textContent='Mở bằng Safari, chọn Chia sẻ → Thêm vào Màn hình chính để sử dụng như app.';
});