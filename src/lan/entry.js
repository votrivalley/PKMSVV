'use strict';
document.addEventListener('DOMContentLoaded',()=>{
 document.getElementById('lan-origin').textContent=location.origin;
 document.getElementById('start').onclick=()=>{
  try{localStorage.setItem('pkmsvv.web.saveMode','local');}catch(e){alert('Cần bật lưu trữ trình duyệt để giữ tiến trình LAN.');return;}
  location.href='./game/';
 };
});