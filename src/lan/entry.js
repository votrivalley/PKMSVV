'use strict';
document.addEventListener('DOMContentLoaded',()=>{
 const box=document.getElementById('lan-origin');
 box.textContent=location.origin;
 fetch('/lan/info',{cache:'no-store'}).then(r=>r.json()).then(info=>{
  if(info?.addresses?.length){box.textContent=info.addresses.map(ip=>'http://'+ip+':'+info.port).join('  |  ');}
 }).catch(()=>{});
 document.getElementById('start').onclick=()=>{
  try{localStorage.setItem('pkmsvv.web.saveMode','local');}catch(e){alert('Cần bật lưu trữ trình duyệt để giữ tiến trình LAN.');return;}
  location.href='./game/';
 };
});