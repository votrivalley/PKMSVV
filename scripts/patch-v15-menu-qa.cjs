'use strict';
/* v1.5 final UI QA. Applied AFTER v1.4 credit, new home layout and
 * v1.5 offline-save notice. Purely presentation; does not change saves. */
const fs=require('node:fs'),path=require('node:path');
const game=path.join(__dirname,'..','vendor','pokesurvivor');
const js=path.join(game,'js','ui','menu.js'),css=path.join(game,'css','style.css');
fs.appendFileSync(js,`
/* Final main menu QA: compact credit, single news panel, functional Discord. */
(()=>{
 const prev=G.MenuUI.open;
 if(typeof prev!=='function')throw Error('Missing MenuUI.open for v1.5 layout QA');
 const discord='https://discord.gg/z36Hb9775K';
 function polish(){
  const menu=document.getElementById('scr-menu');
  if(!menu)return;
  // Credit is displayed once as a tiny non-interactive line in upper left.
  const credit=menu.querySelector('.menu-left .pkmsvv-credit');
  if(credit){
   credit.textContent='Việt hóa và Mod điều chỉnh bởi Votri Valley';
   credit.setAttribute('aria-label',credit.textContent);
  }
  // The old v1.5 script nested the News BUTTON inside another bordered News
  // PANEL. Keep only the button as a single card, without duplicating chrome.
  const holder=menu.querySelector('.pkmsvv-v15-news');
  const news=document.getElementById('btn-news');
  if(holder&&news&&holder.contains(news)){
   news.classList.add('pkmsvv-v15-news-card');
   holder.replaceWith(news);
  }
  const right=menu.querySelector('.menu-right');
  if(right){
   right.classList.add('pkmsvv-v15-nav');
   const first=right.firstElementChild;
   if(first){first.style.marginTop='0';first.style.marginBottom='0';}
  }
  // Options -> Save is a REAL settings page, not a tab that opens a
  // second dialog behind Settings. Reuse the existing save/restore API.
  const saveTab=document.getElementById('pkmsvv-v15-backup');
  const saveBody=document.getElementById('set-body');
  if(saveTab&&saveBody){
   saveTab.type='button';
   saveTab.dataset.t='pkmsvv-backup';
   saveTab.onclick=event=>{
    event.preventDefault();
    event.stopPropagation();
    document.querySelectorAll('#set-tabs .gen-tab')
     .forEach(tab=>tab.classList.toggle('on',tab===saveTab));
    saveBody.replaceChildren();
    if(!G.PKMSVVSaveUI||typeof G.PKMSVVSaveUI.mount!=='function'){
     G.UI.toast(G.I18n?.lang==='en'?'Save tools unavailable':'Không thể mở công cụ sao lưu');
     return;
    }
    G.PKMSVVSaveUI.mount(saveBody,'pkmsvv-settings');
    saveBody.scrollTop=0;
   };
  }
  const link=document.getElementById('pkmsvv-v15-discord');
  if(link){
   link.href=discord;link.target='_blank';link.rel='noopener noreferrer';
   link.setAttribute('role','link');link.setAttribute('aria-label','Discord Votri Valley');
   if(!link.dataset.pkmsvvClickFixed){
    link.dataset.pkmsvvClickFixed='1';
    link.addEventListener('click',event=>{
     event.stopPropagation();
     // Windows Electron intentionally blocks all new-window navigation.
     // The native bridge opens only this fixed approved Discord URL.
     if(window.PKMSVVNative?.openDiscord){
      event.preventDefault();
      window.PKMSVVNative.openDiscord().catch(()=>{
       G.UI.toast(G.I18n?.lang==='en'?'Unable to open Discord':'Không thể mở Discord');
      });
     }else if(window.Capacitor?.Plugins?.Browser?.open){
      event.preventDefault();
      window.Capacitor.Plugins.Browser.open({url:discord}).catch(()=>{
       window.location.assign(discord);
      });
     }
     // Browser/Web: allow the actual anchor link's default action.
    });
   }
  }
 }
 G.MenuUI.open=function(...args){
  const result=prev.apply(this,args);
  polish();
  return result;
 };
 document.addEventListener('DOMContentLoaded',()=>{
  // In case the home menu was opened before the first DOMContentLoaded callback.
  if(!menuIsHidden())polish();
 },{once:true});
 function menuIsHidden(){
  const el=document.getElementById('scr-menu');
  return !el||el.classList.contains('hidden');
 }
})();
`,'utf8');
fs.appendFileSync(css,`
/* FINAL v1.5 credit: one quiet line, no circular badge, no overlay. */
#scr-menu.pkmsvv-v15-menu .menu-left .logo>.pkmsvv-credit{
 position:fixed!important;
 left:max(11px,env(safe-area-inset-left))!important;
 top:max(8px,env(safe-area-inset-top))!important;
 right:auto!important;bottom:auto!important;
 width:max-content!important;height:auto!important;min-width:0!important;
 max-width:calc(100vw - 24px)!important;max-height:none!important;
 padding:0!important;margin:0!important;border:0!important;
 border-radius:0!important;background:transparent!important;
 box-shadow:none!important;filter:none!important;
 transform:none!important;animation:none!important;
 display:block!important;white-space:nowrap!important;overflow:visible!important;
 font-size:clamp(9px,.8vw,11px)!important;
 line-height:1.15!important;font-style:italic!important;font-weight:600!important;
 letter-spacing:0!important;color:#ffe38e!important;
 text-align:left!important;text-shadow:0 1px 2px #000c!important;
 z-index:26!important;pointer-events:none!important;
}
/* The original CSS centers the first menu box with auto margins, pushing the
 * vertical menu to the bottom of the screen. Keep it top aligned instead. */
#scr-menu.pkmsvv-v15-menu .menu-right.pkmsvv-v15-nav{
 display:flex!important;flex-direction:column!important;align-items:stretch!important;
 justify-content:flex-start!important;align-self:stretch!important;
 padding-top:clamp(74px,11vh,126px)!important;
 padding-bottom:12px!important;
 overflow-y:auto!important;min-height:0!important;box-sizing:border-box!important;
}
#scr-menu.pkmsvv-v15-menu .menu-right.pkmsvv-v15-nav>:first-child{
 margin-top:0!important;margin-bottom:0!important;flex:0 0 auto!important;
}
#scr-menu.pkmsvv-v15-menu .menu-right.pkmsvv-v15-nav>:last-child{
 margin-bottom:0!important;
}
#scr-menu.pkmsvv-v15-menu .menu-right.pkmsvv-v15-nav .menu-list{
 display:flex!important;flex-direction:column!important;grid-template-columns:none!important;
}
#scr-menu.pkmsvv-v15-menu .menu-right.pkmsvv-v15-nav .menu-list>.menu-item{
 width:100%!important;min-height:42px!important;grid-column:auto!important;
}
/* A single framed News action, not a card inside a second card. */
#scr-menu.pkmsvv-v15-menu .pkmsvv-v15-bottom{align-items:stretch!important}
#scr-menu.pkmsvv-v15-menu .pkmsvv-v15-bottom>.pkmsvv-v15-news{
 border:0!important;background:transparent!important;padding:0!important;
 box-shadow:none!important;min-height:0!important;
}
#scr-menu.pkmsvv-v15-menu .pkmsvv-v15-bottom>#btn-news,
#scr-menu.pkmsvv-v15-menu .pkmsvv-v15-bottom>.pkmsvv-v15-news-card{
 display:flex!important;justify-content:center!important;align-items:center!important;
 width:100%!important;height:100%!important;min-height:72px!important;
 box-sizing:border-box!important;padding:12px!important;
 background:linear-gradient(155deg,#1c5962,#0c3749)!important;
 border:2px solid #6dd3c3!important;border-radius:14px!important;
 color:#fafffc!important;box-shadow:0 4px 14px #0005!important;
 cursor:pointer!important;pointer-events:auto!important;
}
#topbar{z-index:35!important}
#topbar #pkmsvv-v15-discord{
 position:relative!important;z-index:36!important;pointer-events:auto!important;
 cursor:pointer!important;touch-action:manipulation!important;
}
@media(max-width:900px){
 #scr-menu.pkmsvv-v15-menu .menu-right.pkmsvv-v15-nav{
  padding-top:clamp(56px,10vh,95px)!important
 }
 #scr-menu.pkmsvv-v15-menu .menu-right.pkmsvv-v15-nav .menu-list>.menu-item{
  min-height:36px!important;
 }
}
@media(max-width:650px){
 #scr-menu.pkmsvv-v15-menu .menu-left .logo>.pkmsvv-credit{
  font-size:9px!important;top:max(47px,env(safe-area-inset-top))!important;
 }
 #scr-menu.pkmsvv-v15-menu .pkmsvv-v15-bottom>#btn-news{min-height:52px!important}
}
`,'utf8');
console.log('PKMSVV v1.5 QA: one-line credit, aligned menu, single news panel, clickable Discord.');
