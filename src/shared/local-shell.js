'use strict';
/* One local-only navigation layer. Never changes stored profiles or save keys. */
(()=>{
 const mode=window.PKMSVV_LOCAL_UI_MODE||'lan',el=id=>document.getElementById(id);
 let active=false;
 function refresh(){
  const menu=el('scr-menu');if(!menu)return;
  const coop=menu.querySelector('[data-go="multiplayer"],[data-go="online"]');
  if(coop){
   if(mode==='lan'&&coop.dataset.go==='online')coop.dataset.go='multiplayer';
   let node=[...coop.childNodes].find(x=>x.nodeType===3);
   if(node)node.textContent='🤝 Co-op';
   else if(!coop.querySelector('.pkmsvv-local-coop')){
    node=document.createElement('span');node.className='pkmsvv-local-coop';node.textContent='🤝 Co-op';coop.prepend(node);
   }
   const desc=coop.querySelector('small');
   if(desc)desc.textContent=mode==='pages'?'Kết nối PC Host trong Wi-Fi':'Chơi bạn bè / AI qua Wi-Fi';
   if(mode==='pages')coop.onclick=e=>{
    e.preventDefault();e.stopPropagation();
    const raw=prompt('Nhập địa chỉ IPv4 của PC Host cùng Wi-Fi:','');
    if(raw===null)return;const ip=raw.trim(),p=ip.split('.');
    if(p.length!==4||!p.every(s=>/^\d{1,3}$/.test(s)&&+s<=255)||
     !(+p[0]===10||(+p[0]===172&&+p[1]>=16&&+p[1]<=31)||(+p[0]===192&&+p[1]===168))){
      window.G?.UI?.toast?.('IP LAN không hợp lệ');return;
    }
    location.assign('http://'+ip+':37816/');
   };
  }
  const backup=el('btn-backup'),topbar=el('topbar');
  const actions=topbar?.querySelector('.pkmsvv-top-actions')||topbar;
  if(backup&&actions){
   const sound=el('btn-sound');
   if(sound?.parentElement===actions&&backup.nextElementSibling!==sound)actions.insertBefore(backup,sound);
   else if(backup.parentElement!==actions)actions.appendChild(backup);
   backup.classList.remove('hidden');backup.hidden=false;
   backup.title='Sao lưu / Khôi phục Save';backup.setAttribute('aria-label',backup.title);
   backup.onclick=()=>window.G?.PKMSVVSaveUI?.openQuick?.();
  }
  const duplicate=el('pkmsvv-main-save');if(duplicate)duplicate.style.display='none';
  el('pkmsvv-v15-backup')?.classList.add('hidden');
 }
 function start(){
  if(active||!window.G?.MenuUI?.open)return;
  active=true;const prev=G.MenuUI.open;
  G.MenuUI.open=function(...args){const result=prev.apply(this,args);refresh();return result;};
  refresh();window.addEventListener('resize',refresh,{passive:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();