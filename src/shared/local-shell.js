'use strict';
/* Local-only navigation shared by Windows LAN / Android full / hosted PWA.
 * Never resets or migrates existing saves. Keep original game menu nodes intact.
 */
(()=>{
 const mode=window.PKMSVV_LOCAL_UI_MODE||'lan';
 const L=(vi,en)=>window.G?.I18n?.lang==='en'?en:vi;
 const el=id=>document.getElementById(id);
 let installed=false;
 const inactive=['friends','rank'];
 const isPages=mode==='pages';
 const isAndroidFull=mode==='android-full-lan';

 function openLanDialog(){
  if(window.PKMSVVCoop?.open){window.PKMSVVCoop.open();return;}
  if(!isPages)return;
  // Independent page: bypasses ALL legacy Online/Firebase UI callbacks.
  window.location.assign('/lan-connect.html');
 }
 function enterLan(event){
  if(window.PKMSVV_UNIFIED_COOP_ENABLED)return;
  if(!isPages&&!isAndroidFull)return;
  const target=event.target?.closest?.('#scr-menu [data-go="multiplayer"],#scr-menu [data-go="online"],#scr-menu #pkmsvv-full-lan-entry');
  if(!target)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  if(isAndroidFull){
   const open=window.PKMSVVOpenAndroidLan;
   if(typeof open==='function')open();
   else window.G?.UI?.toast?.(L('Co-op LAN chưa sẵn sàng','Co-op LAN is not available yet'));
   return;
  }
  openLanDialog();
 }
 function guardLegacyOnline(){
  if(window.PKMSVV_UNIFIED_COOP_ENABLED)return;
  if((!isPages&&!isAndroidFull)||!window.G?.MultiplayerUI||G.MultiplayerUI.__pkmsvvLanOnly)return;
  // Replaces the old online-only WITHNICK/Firebase guard even when code calls
  // MultiplayerUI.open() directly (controller, keyboard or menu binding).
  G.MultiplayerUI.open=isPages?openLanDialog:()=>window.PKMSVVOpenAndroidLan?.();
  G.MultiplayerUI.__pkmsvvLanOnly=true;
 }
 function previewAlert(){
  if(!isPages||location.hostname==='pkmsvv-web.pages.dev'||
   !location.hostname.endsWith('.pkmsvv-web.pages.dev')||
   document.getElementById('pkmsvv-preview-origin-warning'))return;
  const panel=document.createElement('div');
  panel.id='pkmsvv-preview-origin-warning';panel.style.cssText=
   'position:fixed;left:12px;right:12px;bottom:12px;max-width:680px;margin:auto;'+
   'z-index:99999;background:#153849;color:#fff4cf;padding:12px 16px;'+
   'font:14px system-ui;border:2px solid #f0be64;border-radius:10px';
  const line=document.createElement('p');
  line.textContent=L('Đây là website Preview: save của nó KHÔNG chung với pkmsvv-web.pages.dev. Hãy cứu/xuất save trước khi đổi địa chỉ.','This Preview website has a DIFFERENT save from pkmsvv-web.pages.dev. Export or rescue your save before switching addresses.');
  const rescue=document.createElement('a');rescue.href='/save-rescue.html';
  rescue.style.cssText='color:#fff4cf;text-decoration:underline;margin-right:16px';
  rescue.textContent=L('Cứu save tại địa chỉ này','Rescue save from this address');
  const close=document.createElement('button');close.type='button';close.textContent=L('Đóng','Close');
  close.onclick=()=>panel.remove();
  panel.append(line,rescue,close);document.body.append(panel);
 }

 // Normalize only the structural layout of home-navigation items. The pixel
 // drawings are owned by MenuUI/Icons; never recreate, crop or replace them.
 function normalizeNavigationLayout(menu){
  const list=menu.querySelector('.menu-right .menu-list');
  if(!list)return;
  for(const item of list.querySelectorAll(':scope > .menu-item')){
   const label=item.querySelector('.pkmsvv-menu-label')?.textContent?.trim();
   const isPC=label==='PC'||[...item.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()==='PC');
   const isArena=item.id==='pkmsvv-champion-entry';
   const isCoop=item.id==='pkmsvv-coop-lan-entry'||
    item.id==='pkmsvv-full-lan-entry'||['multiplayer','online'].includes(item.dataset.go);
   if(!isPC&&!isArena&&!isCoop)continue;
   const art=[...item.children].filter(n=>n.matches?.('.mi-ico,.pkmsvv-champion-menu-icon'));
   const icon=art.find(n=>n.querySelector('img,svg,canvas'))||
    art.find(n=>n.textContent.trim()!=='🤝')||art[0];
   if(icon){
    if(item.firstElementChild!==icon)item.insertBefore(icon,item.firstElementChild);
    for(const extra of art)if(extra!==icon)extra.remove();
    icon.setAttribute('aria-hidden','true');
   }
   let copy=[...item.children].find(n=>n.classList?.contains('pkmsvv-menu-copy'));
   if(!copy&&isPC){
    // Original PC markup sometimes exposes a naked "PC" text node and a
    // separate <small>. Both become anonymous grid items on Android WebView.
    copy=document.createElement('span');copy.className='pkmsvv-menu-copy';
    const title=document.createElement('span');title.className='pkmsvv-menu-label';
    title.textContent='PC';copy.appendChild(title);
    const desc=item.querySelector(':scope > small');
    if(desc)copy.appendChild(desc);
    item.appendChild(copy);
   }
   if(copy){
    const desc=item.querySelector(':scope > small');
    if(desc&&desc.parentNode!==copy)copy.appendChild(desc);
    for(const n of [...item.childNodes]){
     if(n.nodeType===3 && (isPC&&n.textContent.trim()==='PC'||
        isCoop&&/^(?:🤝\s*)?Co-op$/.test(n.textContent.trim())))n.remove();
    }
   }
  }
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
  guardLegacyOnline();
  const coop=menu.querySelector('#pkmsvv-coop-lan-entry,[data-go="multiplayer"],[data-go="online"]');
  if(coop){
   if(mode==='lan'&&coop.dataset.go==='online')coop.dataset.go='multiplayer';
   if(isPages&&coop.tagName==='A')coop.href='/lan-connect.html';
   if((isPages||isAndroidFull)&&coop.tagName!=='A'){
    coop.disabled=false;coop.removeAttribute('aria-disabled');
    coop.style.setProperty('pointer-events','auto','important');
    coop.style.setProperty('opacity','1','important');
    // Backup for programmatic b.onclick() and keyboard/controller bindings.
    coop.onclick=e=>{
     e?.preventDefault?.();e?.stopPropagation?.();
     if(window.PKMSVVCoop?.open)window.PKMSVVCoop.open();
     else if(isPages)openLanDialog();else window.PKMSVVOpenAndroidLan?.();
    };
   }
   // A menu item is a CSS grid: naked text nodes become anonymous grid
   // children and push icon artwork into another row on Android WebView.
   // Keep exactly one original-art icon and one labeled text column on every refresh.
   const icons=[...coop.children].filter(n=>n.classList?.contains('mi-ico'));
   // Preserve the game's ORIGINAL pixel-art icon, including svg/img/canvas.
   // Never overwrite a custom menu icon with an OS-dependent emoji.
   let icon=icons.find(n=>n.querySelector('img,svg,canvas'))||
    icons.find(n=>n.textContent.trim()!=='🤝')||icons[0];
   if(!icon){
    icon=document.createElement('span');icon.className='mi-ico pkmsvv-coop-icon';
    icon.innerHTML=G.Icons?.html?.('online',28)||'';
    coop.insertBefore(icon,coop.firstChild);
   }else if(!icon.querySelector('img,svg,canvas')&&
    (icon.textContent.trim()==='🤝'||
     (coop.id==='pkmsvv-coop-lan-entry'&&!icon.childNodes.length))){
    // Repair a blank/static icon or emoji-only element from older Android builds
    // using the EXISTING pixel icon definition, not a new emoji.
    icon.innerHTML=G.Icons?.html?.('online',28)||'';
   }
   if(icon!==coop.firstElementChild)coop.insertBefore(icon,coop.firstChild);
   icon.setAttribute('aria-hidden','true');
   for(const extra of icons)if(extra!==icon)extra.remove();
   let copy=[...coop.children].find(n=>n.classList?.contains('pkmsvv-menu-copy'));
   if(!copy){
    copy=document.createElement('span');copy.className='pkmsvv-menu-copy';
    coop.appendChild(copy);
   }
   let label=copy.querySelector('.pkmsvv-menu-label');
   if(!label){
    label=document.createElement('span');label.className='pkmsvv-menu-label';
    copy.prepend(label);
   }
   label.textContent='Co-op';
   const small=coop.querySelector(':scope > small')||copy.querySelector('small');
   if(small&&small.parentElement!==copy)copy.appendChild(small);
   if(small)small.textContent=isPages?L('PC Host cùng Wi-Fi · nhập IP','PC Host on same Wi-Fi · enter IP'):L('Co-op LAN · cùng Wi-Fi','Co-op LAN · same Wi-Fi');
   // Remove old label/emoji nodes. Do not replace the parent button or its
   // handlers, dataset, lock state or focus — controller support stays intact.
   for(const child of [...coop.childNodes]){
    if(child.nodeType===Node.TEXT_NODE&&child.textContent.trim())child.remove();
    if(child.classList?.contains('pkmsvv-local-coop'))child.remove();
   }
  }
  normalizeNavigationLayout(menu);
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
   button.title=L('Sao lưu / Khôi phục game','Back up / Restore game');button.setAttribute('aria-label',button.title);
   button.onclick=event=>{
    event?.preventDefault();event?.stopPropagation();
    if(window.G?.PKMSVVSaveUI?.openQuick)G.PKMSVVSaveUI.openQuick();
    else window.G?.UI?.toast?.(L('Công cụ sao lưu chưa sẵn sàng','Backup tool is not available yet'));
   };
  }
  el('pkmsvv-v15-backup')?.classList.add('hidden');
 }
 function start(){
  if(installed)return;
  installed=true;
  // Early capture ensures no offline menu click can invoke the Firebase
  // "requires Online" popup from MenuUI / MultiplayerUI.
  if(isPages||isAndroidFull)document.addEventListener('click',enterLan,true);
  if(isPages){
   window.PKMSVVOpenLanDialog=openLanDialog;
   window.addEventListener('pkmsvv-open-lan',openLanDialog);
  }
  if(window.G?.MenuUI?.open){
   const old=G.MenuUI.open;
   G.MenuUI.open=function(...args){const result=old.apply(this,args);refresh();
    // Arena may insert its menu entry in another open() wrapper.
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>{
     const m=el('scr-menu');if(m&&!m.classList.contains('hidden'))normalizeNavigationLayout(m);
    });
    return result;};
  }
  guardLegacyOnline();
  refresh();
  previewAlert();
  window.addEventListener('resize',refresh,{passive:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
