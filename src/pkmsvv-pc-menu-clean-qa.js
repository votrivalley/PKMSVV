/* Isolated QA: main Pokémon hub owns PokéBox/Pokédex/Upgrades, PC keeps utilities.
 * Display-only routing; never changes save, modes, Pokémon IDs or rewards. */
(()=>{
 'use strict';
 if(typeof document==='undefined'||typeof G==='undefined')return;
 const d=document,$=q=>d.querySelector(q),isEn=()=>G.I18n?.lang==='en';
 const L=(vi,en)=>isEn()?en:vi;
 const typeVi={psychic:'Siêu linh',grass:'Cỏ',fire:'Lửa',water:'Nước',bug:'Bọ',normal:'Thường',dragon:'Rồng',flying:'Bay',electric:'Điện',ice:'Băng',poison:'Độc',ground:'Đất',rock:'Đá',steel:'Thép',dark:'Bóng tối',ghost:'Ma',fairy:'Tiên',fighting:'Giác đấu'};
 const typeColors={psychic:'#e7549a',grass:'#49bd64',fire:'#ee794b',water:'#5196d5',bug:'#7db44a',normal:'#9a9b91',dragon:'#7a70ce',flying:'#80acd0',electric:'#e2b23f',ice:'#7acbd0',poison:'#ab65c4',ground:'#bda25d',rock:'#ad8754',steel:'#779ca8',dark:'#696779',ghost:'#745b9d',fairy:'#c581ac',fighting:'#b95e4c'};
 const dexIcon='<svg class="pkmsvv-pc-gen1-icon" viewBox="0 0 48 48" width="57" height="57" aria-hidden="true"><rect x="6" y="2" width="35" height="44" rx="5" fill="#d72e39" stroke="#631b30" stroke-width="2"/><rect x="10" y="6" width="27" height="4" rx="2" fill="#f57c79"/><circle cx="14" cy="17" r="5" fill="#b9efff" stroke="#31506a" stroke-width="2"/><circle cx="25" cy="15" r="2" fill="#64d8ba"/><circle cx="32" cy="15" r="2" fill="#f6c36b"/><rect x="10" y="23" width="27" height="13" rx="2" fill="#203c4d" stroke="#7bdbcd" stroke-width="2"/><rect x="14" y="26" width="19" height="7" rx="1" fill="#6ed0b6"/><rect x="12" y="39" width="12" height="3" rx="1" fill="#293b4b"/><circle cx="32" cy="40" r="3" fill="#f5d36f" stroke="#5c3040"/></svg>';
 let observerBusy=false,knowledgeObserver=null,observedKnowledge=null;
 function card(id,icon,label,action){
  const b=d.createElement('button');b.id=id;b.type='button';b.className='pkmsvv-pc-card pkmsvv-pc-unified-card';
  b.setAttribute('aria-label',label);
  const art=d.createElement('div');art.className='pkmsvv-pc-unified-icon';art.innerHTML=icon;
  const name=d.createElement('strong');name.textContent=label;
  b.append(art,name);b.onclick=action;return b;
 }
 function knowledgeDone(){
  // Skill Awakening is complete when all eight permanent skill slots unlock.
  // Never remove the guide from a save still missing unlock milestones.
  const save=G.DB?.save,tracker=G.PKMSVVSkillTrack;
  if(!save||typeof tracker?.progress!=='function')return false;
  try{return !!save.pkmsvvChapter2Seen || tracker.progress(save).count>=8 ||
    (Array.isArray(G.Game?.player?.moves)&&G.Game.player.moves.length>=8);}catch(error){
   console.warn('[PC Skill Awakening status]',error);return false;
  }
 }
 function tidyPcKnowledge(overlay){
  if(!overlay)return;
  overlay.querySelector('.pkmsvv-pc-hint')?.remove();
  const allDone=knowledgeDone();
  const labels=overlay.querySelectorAll('.pkmsvv-pc-learn>button');
  for(const btn of labels){
   const label=String(btn.textContent||'').trim();
   const seasonal=/Sương Ký Ức|Memory Mist|Season(?:al)? Event|Sự kiện mùa/i.test(label);
   const awakened=allDone&&/Skill Awakening|Thức tỉnh kỹ năng/i.test(label);
   if(!seasonal&&!awakened)continue;
   // Each knowledge entry is a full framed .pkmsvv-pc-learn row.
   // Removing only its button left an empty panel / repeated Awakening area.
   const row=btn.closest('.pkmsvv-pc-learn');
   if(row){row.remove();continue;}
   const detail=btn.nextElementSibling;
   if(detail?.matches?.('.pkmsvv-pc-orb-details,.pkmsvv-pc-learn-panel,[data-pkmsvv-knowledge-detail]'))detail.remove();
   btn.remove();
  }
 }
 function mountPC(){
  const overlay=$('#pkmsvv-wiki-overlay'),grid=overlay?.querySelector('.pkmsvv-pc-grid');
  if(!grid)return false;
  // The native Wiki can rebuild its knowledge rows after initial mount,
  // so reapply cleanup on every open and DOM change, not just once.
  tidyPcKnowledge(overlay);
  // Reapply knowledge cleanup if the legacy PC rebuilds its accordions.
  const knowledge=overlay.querySelector('.pkmsvv-pc-learn');
  if(knowledge&&knowledge!==observedKnowledge&&typeof MutationObserver==='function'){
   knowledgeObserver?.disconnect();observedKnowledge=knowledge;
   knowledgeObserver=new MutationObserver(()=>tidyPcKnowledge(overlay));
   knowledgeObserver.observe(knowledge,{childList:true,subtree:true});
  }
  if(grid.dataset.pkmsvvUnified==='1')return true;
  grid.dataset.pkmsvvUnified='1';
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
 // Reorder only the four requested HOME launchers; preserve existing nodes,
 // registered click handlers, and the position of all unrelated menu items.
 function reorderMainMenu(menu){
  const list=menu?.querySelector('.menu-right .menu-list');
  if(!list)return false;
  const nodes=[...list.children];
  const entry=(selector,names)=>{
   const found=list.querySelector(selector);
   const item=found?.closest?.('.menu-item')||found;
   if(item?.parentElement===list)return item;
   return nodes.find(node=>{
    const label=(node.querySelector('.pkmsvv-menu-label,.menu-label,strong')?.textContent||node.textContent||'').trim().toLowerCase();
    return names.some(name=>label===name||label.startsWith(name+' '));
   })||null;
  };
  const play=entry('[data-go="play"]',['khám phá','explore','chơi ngay','play','play now']);
  const pokemon=entry('[data-go="dex"]',['pokémon','pokemon']);
  const pc=entry('#pkmsvv-menu-wiki',['pc']);
  const coop=entry('[data-go="multiplayer"],[data-go="coop"],[data-go="co-op"],[data-go="coOp"]',['co-op','coop']);
  const arena=entry('#pkmsvv-champion-entry,[data-go="arena"]',['arena']);
  const order=[pokemon,pc,coop,arena].filter((el,i,all)=>el&&all.indexOf(el)===i);
  if(!order.length)return false;
  let target=play?.parentElement===list?play.nextElementSibling:list.firstElementChild;
  // Move actual buttons, not clones, so their handlers and state remain intact.
  for(const item of order){
   if(item===target){target=target.nextElementSibling;continue;}
   list.insertBefore(item,target);
  }
  return true;
 }
 // Relabel the existing action in place; never append a second title
 // underneath a native menu item's original text.
 function relabel(btn,from,to){
  if(!btn)return;
  btn.setAttribute('aria-label',to);
  let changed=false;
  const old=from.map(w=>w.toLowerCase());
  for(const el of [btn,...btn.querySelectorAll('*')]){
   for(const n of el.childNodes){
    if(n.nodeType!==3)continue;
    const text=n.nodeValue||'',trimmed=text.trim();
    if(old.includes(trimmed.toLowerCase())){
     n.nodeValue=text.slice(0,text.indexOf(trimmed))+to+text.slice(text.indexOf(trimmed)+trimmed.length);
     changed=true;
    }
   }
  }
  // Support markup where the visible label is inside a dedicated element.
  if(!changed){
   const label=btn.querySelector('.pkmsvv-menu-label,.menu-label,.mi-text,.mi-name,strong');
   if(label&&from.some(w=>label.textContent.trim().toLowerCase()===w.toLowerCase())){
    label.textContent=to;changed=true;
   }
  }
  return changed;
 }
 function syncLauncherLabels(menu){
  const play=menu.querySelector('[data-go="play"]');
  relabel(play,['Chơi ngay','Play now','Play'],L('Khám phá','Explore'));
  const recruitment=menu.querySelector('[data-go="gacha"]');
  if(recruitment)relabel(recruitment,
   ['Gacha','Chiêu mộ','Recruitment'],L('Chiêu mộ','Recruitment'));
  const pokemon=menu.querySelector('[data-go="dex"]');
  if(!pokemon)return;
  // Undo the accidental extra synthetic line added by the previous QA patch.
  for(const label of [...pokemon.children].filter(e=>e.classList?.contains('pkmsvv-menu-label'))){
   if(/^(Khám phá|Explore)$/i.test(label.textContent.trim())&&
      [...pokemon.childNodes].some(n=>n!==label&&/Pok[eé]mon/i.test(n.textContent||'')))
    label.remove();
  }
  relabel(pokemon,['Khám phá','Explore','Pokémon','Pokemon'],'Pokémon');
 }
 function syncMenuIcons(menu){
  // Three tiny WebP sprite cells; do not affect routing, click handlers,
  // controller focus or the other Pokémon/Ký Ức menu icons.
  const definitions=[
   ['#pkmsvv-menu-wiki','pc'],
   ['[data-go="multiplayer"],[data-go="coop"],[data-go="co-op"]','coop'],
   ['#pkmsvv-champion-entry,[data-go="arena"]','arena']
  ];
  for(const [selector,type] of definitions){
   // Arena's existing native action has different data-go identifiers
   // across PC/Web/Android builds. Use its visible menu label as a fallback,
   // while keeping the ORIGINAL interactive button and handler intact.
   let button=menu.querySelector(selector);
   if(!button&&type==='arena'){
    const list=menu.querySelector('.menu-right .menu-list');
    const item=[...list?.children||[]].find(node=>{
     const go=node.getAttribute('data-go')||node.querySelector('[data-go]')?.getAttribute('data-go')||'';
     const label=(node.querySelector('.pkmsvv-menu-label,.menu-label,strong')?.textContent||
      node.textContent||'').trim().toLowerCase();
     return /arena/i.test(go)||label==='arena'||label.startsWith('arena ');
    });
    // Some compiled builds render Arena as a plain button, not .menu-item.
    // Keep the native event target and keyboard focus rather than a proxy.
    button=item?.matches?.('button,[role="button"]')?item:
     item?.querySelector?.('button,[role="button"]')||item||null;
   }
   if(!button)continue;
   let art=button.querySelector(':scope > .mi-ico');
   if(!art){art=d.createElement('span');art.className='mi-ico';button.prepend(art);}
   if(art.classList.contains('pkmsvv-menu-icon-'+type))continue;
   art.replaceChildren();
   art.className='mi-ico pkmsvv-new-menu-icon pkmsvv-menu-icon-'+type;
   art.setAttribute('aria-hidden','true');
  }
 }
 function syncHome(){
  const menu=$('#scr-menu');if(!menu)return;
  if(menu.querySelector('#pkmsvv-menu-wiki')){
   const pokemon=menu.querySelector('[data-go="dex"]');
   if(pokemon){
    const sub=pokemon.querySelector('.pkmsvv-menu-copy small, small');
    if(sub)sub.textContent=L('PokéBox · Pokédex · Nâng cấp','PokéBox · Pokédex · Upgrades');
   }
   const pc=menu.querySelector('#pkmsvv-menu-wiki');
   const pcSub=pc?.querySelector('.pkmsvv-menu-copy small, small');
   if(pcSub)pcSub.textContent=L('Pokémon hỗ trợ · Mega · Berry','Support Pokémon · Mega · Berries');
   // Nâng cấp remains a tab within Pokémon; never remove the real upgrade screen.
   menu.querySelector('[data-go="upgrades"]')?.remove();
  }
  syncLauncherLabels(menu);
  reorderMainMenu(menu);
  syncMenuIcons(menu);
  const left=menu.querySelector('.menu-left'),bottom=menu.querySelector('.pkmsvv-v15-bottom');
  if(left){
   let banner=left.querySelector('.pkmsvv-save-banner')||left.querySelector('.pkmsvv-season-banner');
   if(!banner){banner=d.createElement('p');if(bottom?.parentElement===left)bottom.before(banner);else left.append(banner);}
   for(const extra of left.querySelectorAll('.pkmsvv-season-banner'))if(extra!==banner)extra.remove();
   banner.className='pkmsvv-save-banner notranslate';banner.setAttribute('role','note');
   banner.setAttribute('translate','no');banner.lang=isEn()?'en':'vi';
   banner.textContent=L('💾 Nhớ sao lưu thường xuyên để tránh mất dữ liệu!','💾 Back up regularly to avoid losing your save!');
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
  d.addEventListener('click',e=>{if(e.target?.closest?.('#pkmsvv-menu-wiki')){
   Promise.resolve().then(mountPC);requestAnimationFrame(mountPC);
  }},true);
  const observer=new MutationObserver(()=>{
   if(observerBusy)return;
   observerBusy=true;
   try{
    const event=$('#scr-menu .pkmsvv-v15-event span'),live=!!G.PKMSVVSeason?.nowActive?.();
    const expected=live?L('Sương Ký Ức · 01–30/11 · 3 cảnh quan ngẫu nhiên','Memory Mist · Nov 1–30 · 3 landscape variants'):L('Chưa có sự kiện mới','No current events');
    const banner=$('#scr-menu .pkmsvv-save-banner');
    const expectedBanner=L('💾 Nhớ sao lưu thường xuyên để tránh mất dữ liệu!','💾 Back up regularly to avoid losing your save!');
    if((event&&event.textContent!==expected)||(banner&&banner.textContent!==expectedBanner))syncHome();
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
