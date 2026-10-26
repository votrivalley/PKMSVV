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
#scr-menu .pkmsvv-offline-save-note{margin:5px auto 2px;padding:8px 12px;
 display:block;width:min(820px,96%);box-sizing:border-box;
 text-align:center;line-height:1.45;font-size:clamp(11px,1.12vw,13px);
 color:#ffe6aa;background:rgba(17,53,62,.95);border:1px solid #b8a36e;
 border-radius:11px;overflow-wrap:anywhere;flex:0 0 auto}
@media(max-width:650px){#scr-menu .pkmsvv-offline-save-note{padding:6px;font-size:10px;line-height:1.25}}
`,'utf8');
console.log('PKMSVV: clear offline/online save isolation notice on main menu, no save mutation.');
