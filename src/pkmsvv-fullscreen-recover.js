/* PKMSVV: one-tap restore fullscreen DURING a run (never toggles it off).
 * Android loses immersive flags when another app/chat overlays its WebView.
 * Use native Capacitor plugin for Android, Electron IPC for PC, browser API
 * for Web/PWA, and do not assume remembered fullscreen state is still true.
 */
G.PKMSVVFullRestore=(()=>{
 let btn=null,busy=false,actualFullscreen=null,checking=false,refreshQueued=false,platform='',wasActive=false;
 const active=()=>!!(G.Game&&G.Game.player&&G.Game.state&&
   G.Game.state!=='ui'&&G.Game.state!=='over');
 const coop=()=>!!(G.Coop&&G.Coop.active);
 const L=(vi,en)=>G.I18n&&G.I18n.lang==='vi'?vi:en;
 const plugin=()=>window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.PKMSVVScreen;
 const native=()=>window.PKMSVVNative&&typeof window.PKMSVVNative.isFullscreen==='function';
 // Only offer recovery if the player is in a run AND the screen is actually windowed.
 // Web uses the Fullscreen API; Electron and Android report their native state.
 const platformNow=()=>plugin()?'android':native()?'desktop':'web';
 const webFullscreen=()=>!!(
  document.fullscreenElement||document.webkitFullscreenElement||
  (window.matchMedia&&window.matchMedia('(display-mode: fullscreen)').matches)
 );
 function draw(){
  if(!btn)return;
  const showing=active()&&actualFullscreen===false;
  btn.hidden=!showing;
  document.documentElement.classList.toggle('pkmsvv-full-restore-coop',showing&&coop());
  btn.title=L('Khôi phục toàn màn hình','Restore fullscreen');
  btn.setAttribute('aria-label',btn.title);
 }
 function sync(){
  if(!btn)return;
  const playing=active(),mode=platformNow();
  if(platform!==mode||(!wasActive&&playing))actualFullscreen=null;
  platform=mode;wasActive=playing;
  if(!playing){actualFullscreen=null;draw();return;}
  if(mode==='web'){actualFullscreen=webFullscreen();draw();return;}
  // Native status checks are asynchronous: remain hidden until status is known.
  draw();
  if(checking){refreshQueued=true;return;}
  checking=true;
  const status=mode==='android'?
   (typeof plugin().state==='function'?plugin().state():Promise.resolve({enabled:true})):
   window.PKMSVVNative.isFullscreen();
  Promise.resolve(status).then(result=>{
   if(!active()||mode!==platformNow())return;
   actualFullscreen=typeof result?.fullscreen==='boolean'?result.fullscreen:
    (typeof result?.enabled==='boolean'?result.enabled:true);
   draw();
  }).catch(()=>{
   // An unreadable native state is NOT proof that fullscreen was lost.
   actualFullscreen=true;draw();
  }).finally(()=>{
   checking=false;
   if(refreshQueued){refreshQueued=false;sync();}
  });
 }
 function error(e){
  const details=e&&e.message?e.message:'';
  const message=L('Không thể mở toàn màn hình trên thiết bị này.','Fullscreen could not be restored on this device.');
  if(G.UI&&G.UI.toast)G.UI.toast(message+(details?' '+details:''),4000);
 }
 async function restore(){
  if(busy||!active())return;
  busy=true;btn.disabled=true;
  try{
   if(plugin()){
    // Reassert immersive flags even if native state was stale after a chat overlay.
    await plugin().toggle({enabled:true});
   }else if(native()){
    const before=await window.PKMSVVNative.isFullscreen();
    if(!before||!before.fullscreen)await window.PKMSVVNative.toggleFullscreen();
   }else if(!(document.fullscreenElement||document.webkitFullscreenElement)){
    const root=document.documentElement;
    const enter=root.requestFullscreen||root.webkitRequestFullscreen;
    if(!enter)throw Error(L('Hãy mở game từ biểu tượng đã cài trên màn hình chính.','Try launching from the installed home-screen app.'));
    await Promise.resolve(enter.call(root));
   }
   // Lock landscape only where supported; fullscreen success must not depend on it.
   if(screen.orientation&&screen.orientation.lock)
    Promise.resolve().then(()=>screen.orientation.lock('landscape')).catch(()=>{});
   actualFullscreen=true;draw();
   window.dispatchEvent(new Event('resize'));
   sync();
  }catch(e){error(e);}
  finally{busy=false;btn.disabled=false;sync();}
 }
 function init(){
  if(btn)return;
  btn=document.createElement('button');btn.id='pkmsvv-full-restore';
  btn.type='button';btn.className='pkmsvv-full-restore';
  btn.textContent='⛶';btn.hidden=true;
  btn.onclick=restore;
  document.body.appendChild(btn);
  sync();
  // Runs and Co-op change without a DOM event; this avoids patching game state.
  setInterval(sync,400);
  document.addEventListener('fullscreenchange',sync);
  document.addEventListener('webkitfullscreenchange',sync);
  window.addEventListener('focus',sync);
  window.addEventListener('pageshow',sync);
  document.addEventListener('visibilitychange',sync);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 return {init,sync,restore};
})();
