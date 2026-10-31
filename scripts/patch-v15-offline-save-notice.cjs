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
   ? 'REMINDER: Back up your game regularly.'
   : 'Nhớ sao lưu game thường xuyên.';
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
/* Local-profile status, small and persistent: not a popup covering gameplay. */
#scr-menu .pkmsvv-offline-save-note{
 margin:6px auto 4px;padding:5px 13px;display:block;
 width:max-content;max-width:95%;box-sizing:border-box;
 text-align:center;line-height:1.4;font-size:clamp(11px,1.12vw,13px);font-weight:800;
 color:#fff0ae!important;background:rgba(8,26,39,.91)!important;border:1px solid #d9bc6f;
 text-shadow:0 1px 2px #020c16;box-shadow:0 2px 9px #05101a99;
 border-radius:15px;overflow-wrap:anywhere;flex:0 0 auto
}
@media(max-width:650px){#scr-menu .pkmsvv-offline-save-note{padding:0 4px;font-size:10px}}
`,'utf8');
console.log('PKMSVV: clear offline/online save isolation notice on main menu, no save mutation.');
