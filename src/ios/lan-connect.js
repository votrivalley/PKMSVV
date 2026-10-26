'use strict';
/* Static LAN address entry: deliberately independent from old Online/Firebase. */
(function(){
 const form=document.getElementById('lan-form'),input=document.getElementById('lan-address');
 const error=document.getElementById('error');
 if(!form||!input||!error)return;
 try{input.value=localStorage.getItem('pkmsvv.lan.host.ip')||'';}catch(_){}
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const value=input.value.trim().replace(/^https?:\/\//i,'').replace(/\/.*$/,'');
  const found=value.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::(\d{2,5}))?$/);
  const ip=found?.[1]||'',port=found?.[2]?Number(found[2]):37816;
  const octets=ip.split('.').map(Number);
  const privateIP=octets.length===4&&octets.every(n=>Number.isInteger(n)&&n>=0&&n<=255)&&(
   octets[0]===10||(octets[0]===172&&octets[1]>=16&&octets[1]<=31)||
   (octets[0]===192&&octets[1]===168));
  if(!privateIP||!Number.isInteger(port)||port<1024||port>65535){
   error.textContent='Nhập IPv4 nội bộ hợp lệ, ví dụ 192.168.1.168:37816';
   input.focus();return;
  }
  error.textContent='';
  try{localStorage.setItem('pkmsvv.lan.host.ip',ip+':'+port);}catch(_){}
  window.location.assign('http://'+ip+':'+port+'/game/');
 });
})();
