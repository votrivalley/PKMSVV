/* Isolated QA: one original PC with Pokédex, PokéBox and upgrades.
 * Display-only routing; never changes save, modes, Pokémon IDs or rewards. */
(()=>{
 'use strict';
 if(typeof document==='undefined'||typeof G==='undefined')return;
 const d=document,$=q=>d.querySelector(q),isEn=()=>G.I18n?.lang==='en';
 const L=(vi,en)=>isEn()?en:vi;
 const typeVi={psychic:'Siêu linh',grass:'Cỏ',fire:'Lửa',water:'Nước',bug:'Bọ',normal:'Thường',dragon:'Rồng',flying:'Bay',electric:'Điện',ice:'Băng',poison:'Độc',ground:'Đất',rock:'Đá',steel:'Thép',dark:'Bóng tối',ghost:'Ma',fairy:'Tiên',fighting:'Giác đấu'};
 const typeColors={psychic:'#e7549a',grass:'#49bd64',fire:'#ee794b',water:'#5196d5',bug:'#7db44a',normal:'#9a9b91',dragon:'#7a70ce',flying:'#80acd0',electric:'#e2b23f',ice:'#7acbd0',poison:'#ab65c4',ground:'#bda25d',rock:'#ad8754',steel:'#779ca8',dark:'#696779',ghost:'#745b9d',fairy:'#c581ac',fighting:'#b95e4c'};
 const dexIcon='<svg class="pkmsvv-pc-gen1-icon" viewBox="0 0 48 48" width="57" height="57" aria-hidden="true"><rect x="6" y="2" width="35" height="44" rx="5" fill="#d72e39" stroke="#631b30" stroke-width="2"/><rect x="10" y="6" width="27" height="4" rx="2" fill="#f57c79"/><circle cx="14" cy="17" r="5" fill="#b9efff" stroke="#31506a" stroke-width="2"/><circle cx="25" cy="15" r="2" fill="#64d8ba"/><circle cx="32" cy="15" r="2" fill="#f6c36b"/><rect x="10" y="23" width="27" height="13" rx="2" fill="#203c4d" stroke="#7bdbcd" stroke-width="2"/><rect x="14" y="26" width="19" height="7" rx="1" fill="#6ed0b6"/><rect x="12" y="39" width="12" height="3" rx="1" fill="#293b4b"/><circle cx="32" cy="40" r="3" fill="#f5d36f" stroke="#5c3040"/></svg>';
 let observerBusy=false;
 function card(id,icon,label,action){
  const b=d.createElement('button');b.id=id;b.type='button';b.className='pkmsvv-pc-card pkmsvv-pc-unified-card';
  b.setAttribute('aria-label',label);
  const art=d.createElement('div');art.className='pkmsvv-pc-unified-icon';art.innerHTML=icon;
  const name=d.createElement('strong');name.textContent=label;
  b.append(art,name);b.onclick=action;return b;
 }
 function mountPC(){
  const overlay=$('#pkmsvv-wiki-overlay'),grid=overlay?.querySelector('.pkmsvv-pc-grid');
  if(!grid||grid.dataset.pkmsvvUnified==='1')return false;
  grid.dataset.pkmsvvUnified='1';
  const dex=card('pkmsvv-pc-dex',dexIcon,'Pokédex',()=>G.PKMSVVBoxHubUI?.openDex?.());
  const box=card('pkmsvv-pc-box','<span aria-hidden="true">📦</span>','PokéBox',()=>G.PKMSVVBoxHubUI?.openBox?.());
  const upgrade=card('pkmsvv-pc-upgrades','<span aria-hidden="true">⬆️</span>',L('Nâng cấp','Upgrades'),()=>{
   overlay.querySelector('.pkmsvv-pc-close')?.click();
   G.PKMSVVBoxHubUI?.openUpgrades?.();
  });
  grid.prepend(box,dex,upgrade);
  overlay.querySelector('.pkmsvv-pc-hint')?.remove();
  for(const btn of overlay.querySelectorAll('.pkmsvv-pc-learn button')){
   if(!/Sương Ký Ức|Memory Mist|Season(?:al)? Event|Sự kiện mùa/i.test(btn.textContent||''))continue;
   const sibling=btn.nextElementSibling;
   if(sibling?.classList?.contains('pkmsvv-pc-orb-details'))sibling.remove();
   btn.remove();
  }
  return true;
 }
 function number(s,keys){
  for(const key of keys){const v=s?.[key];if(v===null||v===undefined||v==='')continue;const n=Number(v);if(Number.isFinite(n)&&n>=0)return n;}
  return null;
 }
 function format(t){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');}
 function restorePartner(){
  const menu=$('#scr-menu'),s=G.DB?.save;if(!menu||!s||!Number.isFinite(Number(s.partner)))return;
  const mon=G.DEX_BY?.[s.partner],meta=menu.querySelector('.pkmsvv-v15-meta');if(!mon||!meta)return;
  const name=meta.querySelector('#menu-partner-name'),info=meta.querySelector('#menu-partner-info'),stats=meta.querySelector('#menu-stats');
  const monName=typeof mon.name==='string'?mon.name:Array.isArray(mon.name)?mon.name[isEn()?1:0]:'Pokémon #'+s.partner;
  // Always update: previous species' text can remain after returning from battle.
  if(name)name.textContent=monName;
  const portrait=menu.querySelector('#menu-partner');
  const portraitKey=String(s.partner)+':'+String(!!s.partnerShiny);
  if(portrait&&portrait.dataset.pkmsvvPortraitKey!==portraitKey&&G.UI?.sprite){
   try{G.UI.sprite(portrait,Number(s.partner),{hero:true,lively:true,spin:false,scale:3,shiny:!!s.partnerShiny});
    portrait.dataset.pkmsvvPortraitKey=portraitKey;
   }catch(err){console.warn('[Pokemon home portrait]',err);}
  }
  const types=Array.isArray(mon.types)?mon.types:[];
  meta.querySelector('#pkmsvv-home-types')?.remove();
  if(types.length&&name&&!meta.querySelector('.type-pill,.pkmsvv-type-badge')){
   const row=d.createElement('div');row.id='pkmsvv-home-types';row.className='pkmsvv-home-type-row';
   for(const t of types){
    const code=String(t).toLowerCase(),chip=d.createElement('span');chip.className='pkmsvv-home-type-chip';
    chip.style.backgroundColor=typeColors[code]||'#628fa4';
    chip.textContent=isEn()?code[0].toUpperCase()+code.slice(1):(typeVi[code]||t);
    row.append(chip);
   }
   name.insertAdjacentElement('afterend',row);
  }
  const st=s.stats||{};
  if(info){
   const runs=number(st,['runs']),best=number(st,['bestTime']),lines=[];
   if(runs!==null)lines.push(L('Lượt chơi ','Runs ')+runs.toLocaleString(isEn()?'en-US':'vi-VN'));
   if(best!==null)lines.push(L('Kỷ lục sống sót ','Best survival ')+format(best));
   info.textContent=lines.join(' · ');
  }
  if(stats){
   const level=number(st,['bestLevel','maxLevel','bestLv','highestLevel','maxLv','levelBest']);
   const kills=number(st,['kills','totalKills','enemiesKilled','defeated']),lines=[];
   if(level!==null)lines.push(L('Cấp cao nhất ','Highest level ')+level);
   if(kills!==null)lines.push(L('Đã hạ ','Defeated ')+kills.toLocaleString(isEn()?'en-US':'vi-VN'));
   stats.textContent=lines.join(' · ');
  }
 }
 function syncHome(){
  const menu=$('#scr-menu');if(!menu)return;
  if(menu.querySelector('#pkmsvv-menu-wiki')){
   const pokemon=menu.querySelector('[data-go="dex"]');
   if(pokemon){
    pokemon.setAttribute('aria-label','Pokémon');
    const title=pokemon.querySelector('.pkmsvv-menu-label, strong, .menu-label');
    if(title)title.textContent='Pokémon';
   }
   // Nâng cấp remains a tab within Pokémon; never remove the real upgrade screen.
   menu.querySelector('[data-go="upgrades"]')?.remove();
  }
  const left=menu.querySelector('.menu-left'),bottom=menu.querySelector('.pkmsvv-v15-bottom');
  if(left){
   let banner=left.querySelector('.pkmsvv-save-banner')||left.querySelector('.pkmsvv-season-banner');
   if(!banner){banner=d.createElement('p');if(bottom?.parentElement===left)bottom.before(banner);else left.append(banner);}
   for(const extra of left.querySelectorAll('.pkmsvv-season-banner'))if(extra!==banner)extra.remove();
   banner.className='pkmsvv-save-banner';banner.setAttribute('role','note');
   banner.textContent=L('💾 Thường xuyên sao lưu để tránh mất save!','💾 Back up regularly to avoid losing your save!');
   left.querySelector('.pkmsvv-offline-save-note')?.remove();
   const event=menu.querySelector('.pkmsvv-v15-event');
   if(event){
    const label=event.querySelector('span'),button=event.querySelector('button');
    const live=!!G.PKMSVVSeason?.nowActive?.();
    if(label)label.textContent=live?L('Sương Ký Ức · 01–30/11 · 3 cảnh quan ngẫu nhiên','Memory Mist · Nov 1–30 · 3 landscape variants'):L('Chưa có sự kiện mới','No current events');
    if(button)button.hidden=live;
   }
  }
  restorePartner();
 }
 function install(){
  if(!G.MenuUI||G.MenuUI._pkmsvvPcUnified)return;
  G.MenuUI._pkmsvvPcUnified=true;
  const old=G.MenuUI.open;
  if(typeof old==='function')G.MenuUI.open=function(...args){const result=old.apply(this,args);syncHome();return result;};
  d.addEventListener('click',e=>{if(e.target?.closest?.('#pkmsvv-menu-wiki'))Promise.resolve().then(mountPC);},true);
  const observer=new MutationObserver(()=>{
   if(observerBusy)return;
   observerBusy=true;
   try{
    const event=$('#scr-menu .pkmsvv-v15-event span'),live=!!G.PKMSVVSeason?.nowActive?.();
    const expected=live?L('Sương Ký Ức · 01–30/11 · 3 cảnh quan ngẫu nhiên','Memory Mist · Nov 1–30 · 3 landscape variants'):L('Chưa có sự kiện mới','No current events');
    if(event&&event.textContent!==expected)syncHome();
    mountPC();
   }finally{observerBusy=false;}
  });
  // Watch the home menu only; never observe combat HUD/FX mutations globally.
  observer.observe($('#scr-menu')||d.body,{childList:true,subtree:true});
  syncHome();mountPC();
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',install,{once:true});else install();
 G.PKMSVVMenuCleanQA={syncHome,mountPC,restorePartner};
})();
