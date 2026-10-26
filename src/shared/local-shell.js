'use strict';
/* Local-only navigation shared by Windows LAN / Android full / hosted PWA.
 * Never resets or migrates existing saves. Keep original game menu nodes intact.
 */
(()=>{
 const mode=window.PKMSVV_LOCAL_UI_MODE||'lan';
 const el=id=>document.getElementById(id);
 let installed=false;
 const inactive=['friends','rank'];
 const isPages=mode==='pages';
 function enterLan(event){
  if(!isPages)return;
  const target=event.target?.closest?.('#scr-menu [data-go="multiplayer"],#scr-menu [data-go="online"]');
  if(!target)return;
  // Intercept at capture phase BEFORE the original menu's Online/Firebase
  // handler on the target element. Cloudflare static pages cannot host rooms.
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  const previous=(()=>{try{return localStorage.getItem('pkmsvv.lan.host.ip')||'';}catch(_){return '';}})();
  const input=window.prompt('Co-op dùng PC LAN Host cùng Wi-Fi, không dùng đăng nhập Google.\nMở PC Host trước và nhập IP của PC (ví dụ 192.168.1.168):',previous);
  if(input===null)return;
  const ip=input.trim(),octets=ip.split('.');
  const valid=octets.length===4&&octets.every(o=>/^\d{1,3}$/.test(o)&&Number(o)<=255)&&(
   Number(octets[0])===10||
   (Number(octets[0])===172&&Number(octets[1])>=16&&Number(octets[1])<=31)||
   (Number(octets[0])===192&&Number(octets[1])===168));
  if(!valid){window.alert('Địa chỉ IP LAN không hợp lệ. Hãy xem IP Host trong Co-op trên PC.');return;}
  try{localStorage.setItem('pkmsvv.lan.host.ip',ip);}catch(_){}
  location.assign('http://'+ip+':37816/');
 }
 function refresh(){
  const menu=el('scr-menu');
  if(!menu)return;
  for(const name of inactive){
   const item=menu.querySelector('[data-go="'+name+'"]');
   if(item){item.classList.add('pkmsvv-local-hidden');item.style.setProperty('display','none','important');}
  }
  for(const item of menu.querySelectorAll('#pkmsvv-menu-google,.pkmsvv-google-switch,#pkmsvv-main-save')){
   item.classList.add('pkmsvv-local-hidden');
   item.style.setProperty('display','none','important');
  }
  const coop=menu.querySelector('[data-go="multiplayer"],[data-go="online"]');
  if(coop){
   if(mode==='lan'&&coop.dataset.go==='online')coop.dataset.go='multiplayer';
   let label=Array.from(coop.childNodes).find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
   if(label)label.textContent='🤝 Co-op';
   else{
    label=coop.querySelector('.pkmsvv-local-coop');
    if(!label){label=document.createElement('span');label.className='pkmsvv-local-coop';coop.appendChild(label);}
    label.textContent='🤝 Co-op';
   }
   const small=coop.querySelector('small');
   if(small)small.textContent=isPages?'PC Host cùng Wi-Fi · nhập IP':'Co-op LAN · cùng Wi-Fi';
  }
  const topbar=el('topbar');
  if(topbar){
   // Use the tested JSON backup modal; the upstream hosted UI does not
   // always ship btn-backup, so create the shortcut only when absent.
   let button=el('btn-backup');
   if(!button){
    button=document.createElement('button');
    button.id='btn-backup';button.type='button';button.className='btn small ghost pkmsvv-top-backup';
    button.textContent='💾';
   }
   const speaker=el('btn-sound');
   if(speaker&&speaker.parentElement===topbar&&button.nextElementSibling!==speaker)
    topbar.insertBefore(button,speaker);
   else if(button.parentElement!==topbar)topbar.appendChild(button);
   button.classList.remove('hidden');button.hidden=false;
   button.style.removeProperty('display');
   button.title='Sao lưu / Khôi phục game';button.setAttribute('aria-label',button.title);
   button.onclick=event=>{
    event?.preventDefault();event?.stopPropagation();
    if(window.G?.PKMSVVSaveUI?.openQuick)G.PKMSVVSaveUI.openQuick();
    else window.G?.UI?.toast?.('Công cụ sao lưu chưa sẵn sàng');
   };
  }
  el('pkmsvv-v15-backup')?.classList.add('hidden');
 }
 function start(){
  if(installed)return;
  installed=true;
  // Early capture ensures no offline menu click can invoke the Firebase
  // "requires Online" popup from MenuUI / MultiplayerUI.
  if(isPages)document.addEventListener('click',enterLan,true);
  if(window.G?.MenuUI?.open){
   const old=G.MenuUI.open;
   G.MenuUI.open=function(...args){const result=old.apply(this,args);refresh();return result;};
  }
  refresh();
  window.addEventListener('resize',refresh,{passive:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
