'use strict';
/* Add LAN access to the COMPLETE offline game; do not touch save state. */
(()=>{
 const vi=()=>window.G?.I18n?.lang!=='en';
 function mount(){
  const list=document.querySelector('#scr-menu .menu-right .menu-list');
  if(!list)return;
  let b=document.getElementById('pkmsvv-full-lan-entry');
  if(!b){
   b=document.createElement('button');b.type='button';b.id='pkmsvv-full-lan-entry';b.className='menu-item';
   const settings=list.querySelector('[data-go="settings"]');
   if(settings)list.insertBefore(b,settings);else list.appendChild(b);
  }
  b.innerHTML='<span class="mi-ico" aria-hidden="true">🤝</span>'+(vi()?'Co-op · Mạng nội bộ':'Co-op · LAN')+
   '<small>'+(vi()?'Chơi với bạn bè / AI cùng Wi-Fi':'Play with friends / AI on Wi-Fi')+'</small>';
  b.onclick=async e=>{
   e.preventDefault();e.stopPropagation();
   const api=window.Capacitor?.Plugins?.PKMSVVLAN;
   if(!api?.open){window.G?.UI?.toast?.('Không mở được Co-op LAN');return;}
   try{await api.open();}
   catch(err){if(err?.message)window.G?.UI?.toast?.(String(err.message).slice(0,150),3500);}
  };
 }
 function install(){
  if(!window.G?.MenuUI?.open)return;
  const old=G.MenuUI.open;if(old.__pkmsvvFullLAN)return;
  function patched(...args){const result=old.apply(this,args);mount();return result;}
  patched.__pkmsvvFullLAN=true;G.MenuUI.open=patched;mount();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
})();