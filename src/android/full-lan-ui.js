'use strict';
/* Add LAN access to the COMPLETE offline game; do not touch save state. */
(()=>{
 const vi=()=>window.G?.I18n?.lang!=='en';
 function openCoop(){
  if(window.PKMSVVCoop?.open){window.PKMSVVCoop.open();return;}
  window.G?.UI?.toast?.('Menu Co-op đang tải, vui lòng thử lại.');
 }
 async function openNative(){
  const api=window.Capacitor?.Plugins?.PKMSVVLAN;
  if(!api?.open){window.G?.UI?.toast?.('Không mở được Co-op LAN');return;}
  try{await api.open();}
  catch(err){if(err?.message)window.G?.UI?.toast?.(String(err.message).slice(0,150),3500);}
 }
 function mount(){
  const list=document.querySelector('#scr-menu .menu-right .menu-list');
  if(!list)return;
  // If the complete game already renders Co-op, REUSE it.
  // Don't append a second Co-op row / old Online icon.
  const existing=list.querySelector('[data-go="multiplayer"],[data-go="online"]');
  let b=existing||document.getElementById('pkmsvv-full-lan-entry');
  const duplicate=document.getElementById('pkmsvv-full-lan-entry');
  if(existing&&duplicate&&duplicate!==existing)duplicate.remove();
  if(!b){
   b=document.createElement('button');b.type='button';
   b.id='pkmsvv-full-lan-entry';b.className='menu-item';
   const settings=list.querySelector('[data-go="settings"]');
   if(settings)list.insertBefore(b,settings);else list.appendChild(b);
  }
  if(b.id==='pkmsvv-full-lan-entry'){
   b.innerHTML='<span class="mi-ico" aria-hidden="true">🤝</span> Co-op'+
    '<small>'+(vi()?'Chơi cùng Wi-Fi':'Play over Wi-Fi')+'</small>';
  }else{
   const icon=b.querySelector('.mi-ico');
   if(icon)icon.textContent='🤝';
   for(const n of [...b.childNodes])if(n.nodeType===Node.TEXT_NODE&&n.textContent.trim())n.textContent=' Co-op';
  }
  b.disabled=false;b.removeAttribute('aria-disabled');
  b.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();openCoop();};
 }
 function install(){
  window.PKMSVVOpenAndroidLan=openNative;
  if(!window.G?.MenuUI?.open)return;
  const old=G.MenuUI.open;if(old.__pkmsvvFullLAN)return;
  function patched(...args){const result=old.apply(this,args);mount();return result;}
  patched.__pkmsvvFullLAN=true;G.MenuUI.open=patched;mount();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
})();
