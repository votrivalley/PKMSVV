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
 function openLanDialog(){
  if(!isPages)return;
  let overlay=el('pkmsvv-lan-connect-modal');
  if(overlay){overlay.querySelector('#pkmsvv-lan-ip')?.focus();return;}
  overlay=document.createElement('div');
  overlay.id='pkmsvv-lan-connect-modal';
  overlay.className='pkmsvv-lan-connect-modal';
  overlay.innerHTML=[
   '<section class="pkmsvv-lan-connect-box" role="dialog" aria-modal="true" aria-labelledby="pkmsvv-lan-connect-title">',
   '<h2 id="pkmsvv-lan-connect-title">🤝 Co-op qua Wi-Fi / LAN</h2>',
   '<p><b>Không cần đăng nhập Google hoặc phiên bản Online.</b> PC chạy LAN Host,',
   ' điện thoại hoặc trình duyệt cùng Wi-Fi truy cập địa chỉ của Host.</p>',
   '<label for="pkmsvv-lan-ip">IP và cổng hiển thị trên máy Host</label>',
   '<input id="pkmsvv-lan-ip" type="text" inputmode="url" autocomplete="off"',
   ' placeholder="192.168.1.168:37816" aria-describedby="pkmsvv-lan-example">',
   '<p id="pkmsvv-lan-example" class="pkmsvv-lan-connect-hint">',
   'Trên PC mở Co-op → Hướng dẫn LAN để xem IP:cổng. Nếu Host đổi sang 37817, nhập đúng cổng đó.</p>',
   '<p class="pkmsvv-lan-connect-save">💾 Save của Cloudflare và IP Host tách biệt.',
   ' Hãy xuất file JSON rồi nhập vào trang LAN nếu muốn dùng cùng tiến trình.</p>',
   '<p id="pkmsvv-lan-connect-status" role="status" aria-live="polite"></p>',
   '<div class="pkmsvv-lan-connect-actions">',
   '<button type="button" id="pkmsvv-lan-cancel">Quay lại</button>',
   '<button type="button" id="pkmsvv-lan-submit">Kết nối PC Host</button>',
   '</div></section>'
  ].join('');
  const input=overlay.querySelector('#pkmsvv-lan-ip');
  const msg=overlay.querySelector('#pkmsvv-lan-connect-status');
  try{input.value=localStorage.getItem('pkmsvv.lan.host.ip')||'';}catch(_){}
  const dismiss=()=>{overlay.remove();document.removeEventListener('keydown',onKey);};
  const onKey=e=>{if(e.key==='Escape'){e.preventDefault();dismiss();}};
  const submit=()=>{
   let value=input.value.trim().replace(/^http:\/\//i,'').replace(/\/.*$/,'');
   const m=value.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::(\d{2,5}))?$/);
   const ip=m?.[1]||'',port=m?.[2]?Number(m[2]):37816,octets=ip.split('.');
   const local=octets.length===4&&octets.every(x=>/^\d{1,3}$/.test(x)&&Number(x)<=255)&&
    (Number(octets[0])===10||(Number(octets[0])===172&&Number(octets[1])>=16&&Number(octets[1])<=31)||
     (Number(octets[0])===192&&Number(octets[1])===168));
   if(!local||!Number.isInteger(port)||port<1024||port>65535){
    msg.textContent='Địa chỉ chưa hợp lệ. Ví dụ: 192.168.1.168:37816';return;
   }
   try{localStorage.setItem('pkmsvv.lan.host.ip',ip+':'+port);}catch(_){}
   // This is a top-level navigation, not a mixed-content fetch or WebSocket
   // from HTTPS Cloudflare. The independent LAN HTTP origin owns LAN saves.
   window.location.assign('http://'+ip+':'+port+'/game/');
  };
  overlay.querySelector('#pkmsvv-lan-submit').addEventListener('click',submit);
  overlay.querySelector('#pkmsvv-lan-cancel').addEventListener('click',dismiss);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit();}});
  overlay.addEventListener('click',e=>{if(e.target===overlay)dismiss();});
  document.addEventListener('keydown',onKey);
  document.body.appendChild(overlay);
  input.focus();
 }
 function enterLan(event){
  if(!isPages)return;
  const target=event.target?.closest?.('#scr-menu [data-go="multiplayer"],#scr-menu [data-go="online"]');
  if(!target)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  openLanDialog();
 }
 function guardLegacyOnline(){
  if(!isPages||!window.G?.MultiplayerUI||G.MultiplayerUI.__pkmsvvLanOnly)return;
  // Replaces the old online-only WITHNICK/Firebase guard even when code calls
  // MultiplayerUI.open() directly (controller, keyboard or menu binding).
  G.MultiplayerUI.open=openLanDialog;
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
  line.textContent='Đây là website Preview: save của nó KHÔNG chung với pkmsvv-web.pages.dev. Hãy cứu/xuất save trước khi đổi địa chỉ.';
  const rescue=document.createElement('a');rescue.href='/save-rescue.html';
  rescue.style.cssText='color:#fff4cf;text-decoration:underline;margin-right:16px';
  rescue.textContent='Cứu save tại địa chỉ này';
  const close=document.createElement('button');close.type='button';close.textContent='Đóng';
  close.onclick=()=>panel.remove();
  panel.append(line,rescue,close);document.body.append(panel);
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
  const coop=menu.querySelector('[data-go="multiplayer"],[data-go="online"]');
  if(coop){
   if(mode==='lan'&&coop.dataset.go==='online')coop.dataset.go='multiplayer';
   if(isPages){
    coop.disabled=false;coop.removeAttribute('aria-disabled');
    coop.style.setProperty('pointer-events','auto','important');
    coop.style.setProperty('opacity','1','important');
    // Backup for programmatic b.onclick() and keyboard/controller bindings.
    coop.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();openLanDialog();};
   }
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
  guardLegacyOnline();
  refresh();
  previewAlert();
  window.addEventListener('resize',refresh,{passive:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
