'use strict';
/* Notice only: never modify data, storage keys, authentication or cloud mode.
 * Offline Windows/Android auto-restore straight to menu with no login screen.
 * Hosted Web shows this only when user selected the local offline profile.
 */
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..','vendor','pokesurvivor');
const menu=path.join(base,'js','ui','menu.js');
fs.appendFileSync(menu,`
/* Save isolation notice for local profiles; after existing v1.5 menu layout. */
(()=>{
 const orig=G.MenuUI.open;
 if(typeof orig!=='function')throw Error('Missing MenuUI.open for offline save notice');
 const mount=()=>{
  const screen=document.getElementById('scr-menu');
  const old=screen?.querySelector('.pkmsvv-offline-save-note');
  if(G.DB?.mode!=='local'){old?.remove();return;}
  const left=screen?.querySelector('.menu-left');
  if(!left)return;
  const en=G.I18n?.lang==='en';
  const label=en
   ? '💾 REMINDER: Back up your game regularly.'
   : '💾 Nhớ sao lưu game thường xuyên.';
  const note=old||document.createElement('p');
  note.className='pkmsvv-offline-save-note';
  note.setAttribute('role','note');note.setAttribute('translate','no');
  note.textContent=label;
  const bottom=screen.querySelector('.pkmsvv-v15-bottom');
  if(bottom)left.insertBefore(note,bottom);else if(!old)left.appendChild(note);
 };
 G.MenuUI.open=function(...args){
  const result=orig.apply(this,args);
  mount();
  return result;
 };
})();
`,'utf8');
fs.appendFileSync(path.join(base,'css','style.css'),`
/* Local-save reminder is a bright readable notice, not black-on-black.
   A pale gold fill and dark ink survive both pastel and original retro themes. */
#scr-menu .menu-left .pkmsvv-offline-save-note,
#scr-menu.pkmsvv-v15-menu .menu-left .pkmsvv-offline-save-note{
 display:block!important;align-self:center!important;flex:0 0 auto!important;
 margin:8px auto!important;padding:9px 18px!important;
 width:fit-content;max-width:min(96%,620px);box-sizing:border-box;
 text-align:center!important;line-height:1.4!important;
 font-size:clamp(13px,1.4vw,16px)!important;font-weight:900!important;
 color:#142e3d!important;-webkit-text-fill-color:#142e3d!important;
 background:#fff0a6!important;border:3px solid #996e24!important;
 text-shadow:none!important;box-shadow:0 3px 0 #523d28,0 5px 14px #001b2380!important;
 border-radius:14px!important;overflow-wrap:anywhere;
 opacity:1!important;visibility:visible!important;filter:none!important;
 mix-blend-mode:normal!important;isolation:isolate;letter-spacing:.01em!important
}
@media(max-width:650px){
 #scr-menu .menu-left .pkmsvv-offline-save-note{
  padding:7px 11px!important;font-size:13px!important;line-height:1.35!important
 }
}
`,'utf8');
console.log('PKMSVV: clear offline/online save isolation notice on main menu, no save mutation.');
