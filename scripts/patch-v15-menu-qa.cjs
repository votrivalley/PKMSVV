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
   // Anchor the right menu's bottom edge to the LEFT event/news cards.
   // No translateY or animation: re-opening the menu will not bounce.
   const panel=right.querySelector('.box');
   const lower=menu.querySelector('.pkmsvv-v15-bottom');
   if(panel&&lower&&window.matchMedia?.('(min-width: 901px) and (min-height: 580px)').matches){
    const bounds=menu.getBoundingClientRect();
    const gap=bounds.bottom-lower.getBoundingClientRect().bottom;
    const topSafe=Math.max(65,Math.round(bounds.height*.08));
    const maxGap=Math.max(8,right.clientHeight-panel.offsetHeight-topSafe);
    right.style.setProperty('--pkmsvv-nav-bottom-gap',
     Math.round(Math.max(8,Math.min(gap,maxGap)))+'px');
   }else right.style.removeProperty('--pkmsvv-nav-bottom-gap');
  }
  // Settings Save is an action: close Settings and open the existing
  // separate Backup / Restore dialog above the menu (no nested tab content).
  const saveTab=document.getElementById('pkmsvv-v15-backup');
  if(saveTab){
   saveTab.classList.add('hidden'); // no duplicate backup action inside Settings
   saveTab.type='button';
   saveTab.removeAttribute('data-t');
   saveTab.onclick=event=>{
    event.preventDefault();
    event.stopPropagation();
    if(!G.PKMSVVSaveUI?.openQuick){
     G.UI.toast(G.I18n?.lang==='en'?'Backup tools unavailable':'Không thể mở công cụ sao lưu');
     return;
    }
    G.SettingsUI?.close?.();
    G.PKMSVVSaveUI.openQuick();
   };
  }
  // Keep backup accessible directly on the HOME MENU, never hidden in Settings.
  // Reuse the existing verified JSON export/import modal without changing saves.
  const menuList=menu.querySelector('.menu-right .menu-list');
  if(menuList){
   let quick=menuList.querySelector('#pkmsvv-main-save');
   if(!quick){
    quick=document.createElement('button');
    quick.id='pkmsvv-main-save';quick.type='button';
    quick.className='menu-item pkmsvv-menu-save';
    const settings=menuList.querySelector('[data-go="settings"]');
    if(settings)menuList.insertBefore(quick,settings);else menuList.appendChild(quick);
   }
   quick.innerHTML='<span class="mi-ico" aria-hidden="true">💾</span>'+
    (G.I18n?.lang==='en'?'Back up game':'Sao lưu game')+
    '<small>'+(G.I18n?.lang==='en'?'Export / import save file':'Xuất / nhập file save')+'</small>';
   quick.onclick=()=>{
    if(G.PKMSVVSaveUI?.openQuick)G.PKMSVVSaveUI.openQuick();
    else G.UI?.toast?.('Chức năng sao lưu chưa sẵn sàng');
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
 // Recompute after screen resize / fullscreen toggle, not only when opening.
 window.addEventListener('resize',()=>{
  const menu=document.getElementById('scr-menu');
  if(menu&&!menu.classList.contains('hidden'))polish();
 },{passive:true});
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
// Final user-facing rename: never change account IDs, storage paths or PKMSVV_SAVE.
const dev=path.join(game,'dev.html');
let markup=fs.readFileSync(dev,'utf8');
if(!markup.includes('Pokémon Sống Sót'))throw Error('Expected old display name in prepared HTML');
markup=markup.replaceAll('Pokémon Sống Sót','Pokemon Chuyển sinh');
/* New story tagline below the logo. Change ONLY the game home menu,
   not login, account identity or any saved data. */
const menuStart=markup.indexOf('<section id="scr-menu"');
const menuEnd=markup.indexOf('</section>',menuStart);
if(menuStart<0||menuEnd<menuStart)throw Error('Missing game menu when setting awakening tagline');
let home=markup.slice(menuStart,menuEnd);
const oldTagline='<div class="t2">Mundo Misterioso</div>';
if(home.split(oldTagline).length!==2)throw Error('Expected one original menu subtitle');
home=home.replace(oldTagline,'<div class="t2 pkmsvv-awakening-tagline" translate="no">Tỉnh giấc tôi thấy mình hóa Pokemon</div>');
markup=markup.slice(0,menuStart)+home+markup.slice(menuEnd);

fs.writeFileSync(dev,markup,'utf8');
const settings=path.join(game,'js','ui','settings-ui.js');
let settingsJs=fs.readFileSync(settings,'utf8');
if(!settingsJs.includes('about-logo">PokéSurvivor</div>'))throw Error('Original About title changed');
settingsJs=settingsJs.replace('about-logo">PokéSurvivor</div>','about-logo" translate="no">Pokemon Chuyển sinh</div>');
settingsJs=settingsJs.replace("const VERSION = '1.2 · 2026-10-09';","const VERSION = '1.5.16 · 2026-10-26';");
fs.writeFileSync(settings,settingsJs,'utf8');
const newsFile=path.join(game,'js','ui','news-ui.js');
let newsJs=fs.readFileSync(newsFile,'utf8');
if(!newsJs.includes('Có gì mới: 1.4'))throw Error('Expected old 1.4 News button label');
newsJs=newsJs.replaceAll('Có gì mới: 1.4','Có gì mới: 1.5').replaceAll("What's New: 1.4","What's New: 1.5");
fs.writeFileSync(newsFile,newsJs,'utf8');
fs.appendFileSync(css,`
/* Long storyline tagline stays centered below the single-line game name.
   Keep its intended Vietnamese wording intact on PC, Android and Web. */
#scr-menu.pkmsvv-v15-menu .menu-left .logo>.pkmsvv-awakening-tagline{
  width:100%!important;max-width:100%!important;
  margin:6px auto 0!important;padding:0 8px!important;
  box-sizing:border-box!important;text-align:center!important;
  text-transform:uppercase!important;white-space:normal!important;
  overflow-wrap:normal!important;line-height:1.35!important;
  font-size:clamp(10px,1.04vw,14px)!important;
  letter-spacing:clamp(.3px,.12vw,1.7px)!important;
}
@media(max-width:650px){
 #scr-menu.pkmsvv-v15-menu .menu-left .logo>.pkmsvv-awakening-tagline{
  font-size:10px!important;letter-spacing:.4px!important;
  line-height:1.3!important;
 }
}
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
/* Keep the main menu close to the left panel's baseline without making
   the mobile navigation taller or spilling below the viewport. */
/* Navigation uses layout constraints, not animated transforms. */
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
console.log('PKMSVV v1.5.16: renamed menu, popup backup, aligned navigation and single News panel.');
