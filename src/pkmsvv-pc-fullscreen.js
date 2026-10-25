/* Pokemon Chuyển sinh: Native fullscreen restore, Windows PC ONLY.
 * Excludes browser and Android: only the Electron preload exposes both IPCs.
 * Never unpauses the run or toggles OUT of fullscreen accidentally.
 */
(()=>{
 'use strict';
 const native=window.PKMSVVNative;
 if(!native||typeof native.isFullscreen!=='function'||typeof native.toggleFullscreen!=='function')return;
 const $=id=>document.getElementById(id);
 const en=()=>G.I18n?.lang==='en';
 let busy=false;
 const label=full=>full?(en()?'Windowed mode':'Thu gọn màn hình'):(en()?'Return to fullscreen':'Trở lại toàn màn hình');
 const tip=full=>full?(en()?'Switch to a resizable window.':'Chuyển về cửa sổ có thể thay đổi kích thước.'):(en()?'Return the game to fullscreen.':'Đưa game trở lại chế độ toàn màn hình.');
 const buttons=()=>[$('pkmsvv-pc-restore-pause'),$('pkmsvv-pc-restore-settings')].filter(Boolean);
 async function refresh(){
  try{
   const state=await native.isFullscreen();
   for(const button of buttons()){
    button.hidden=false;
    button.disabled=busy;
    button.textContent=label(!!state?.fullscreen);
    button.title=tip(!!state?.fullscreen);
   }
  }catch(e){for(const button of buttons())button.hidden=true;}
 }
 async function restore(){
  if(busy)return;
  busy=true;
  try{
   // This is an explicit user toggle for BOTH entering and leaving fullscreen.
   await native.toggleFullscreen();
  }catch(e){
   G.UI?.toast?.(en()?'Cannot restore fullscreen':'Không thể khôi phục toàn màn hình');
  }finally{busy=false;await refresh();}
 }
 function addPause(){
  const pause=$('scr-pause'),row=$('btn-pause-settings')?.parentElement;
  if(!pause||!row||$('pkmsvv-pc-restore-pause'))return;
  const button=document.createElement('button');
  button.type='button';button.className='btn pkmsvv-pc-restore';
  button.id='pkmsvv-pc-restore-pause';
  button.textContent=label(true);button.title=tip(true);button.hidden=true;
  button.addEventListener('click',restore);
  row.append(button); // Keep next to Resume / Settings / End run.
 }
 function addGraphics(){
  const settings=$('scr-settings'),box=$('set-body');
  if(!settings||settings.classList.contains('hidden')||!box)return;
  const gfx=$('set-tabs')?.querySelector('[data-t="gfx"]');
  if(!gfx?.classList.contains('on')||$('pkmsvv-pc-restore-settings'))return;
  const row=document.createElement('div');row.id='pkmsvv-pc-restore-settings-row';
  row.className='set-row';
  const text=document.createElement('div');text.className='grow';
  const name=document.createElement('b');name.textContent=label();
  const note=document.createElement('small');note.textContent=tip();
  text.append(name,note);
  const button=document.createElement('button');button.type='button';
  button.className='btn small pkmsvv-pc-restore';
  button.id='pkmsvv-pc-restore-settings';button.textContent=label(true);
  button.hidden=true;button.addEventListener('click',restore);
  row.append(text,button);box.append(row);
 }
 function openPause(){addPause();void refresh();}
 function openSettings(){addGraphics();void refresh();}
 const oldPause=G.RunUI?.showPause;
 if(typeof oldPause==='function')G.RunUI.showPause=function(...args){
  const result=oldPause.apply(this,args);openPause();return result;
 };
 const oldOpen=G.SettingsUI?.open;
 if(typeof oldOpen==='function')G.SettingsUI.open=function(...args){
  const result=oldOpen.apply(this,args);openSettings();return result;
 };
 // The tab renderer runs on its own click handler; mount after that render.
 document.addEventListener('click',event=>{
  if(event.target?.closest?.('#set-tabs [data-t="gfx"]'))
   Promise.resolve().then(openSettings);
 });
 // Familiar desktop shortcut; only Electron receives this script's native bridge.
 document.addEventListener('keydown',event=>{
  if(event.key==='F11'&&!event.repeat){
   event.preventDefault();void restore();
  }
 });
 // Account for a pause already open when the script first initializes.
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{
  addPause();void refresh();
 },{once:true});
 else {addPause();void refresh();}
})();
