/* QA UI: rename player-facing Gacha to Chiêu mộ / Recruitment.
 * Internal G.Gacha API, tickets, rates, save and reward logic are untouched. */
(function(){
 'use strict';
 if(typeof document==='undefined'||typeof G==='undefined')return;
 const roots=()=>[
  document.querySelector('#scr-menu [data-go="gacha"]'),
  document.getElementById('scr-gacha'),
  document.getElementById('pkmsvv-mega-gacha'),
  document.getElementById('pkmsvv-pokebox-overlay')
 ].filter(Boolean);
 let busy=false;
 function relocateRequirement(gacha,hint){
  if(!gacha||!hint)return;
  // The approved Chiêu mộ header has a title on the left and Quay lại
  // on the right. Put one compact italic note BETWEEN them, not as a
  // floating line over the Pokémon portrait behind the overlay.
  const headings=[...gacha.querySelectorAll('h1,h2,h3')];
  const title=headings.find(el=>/^(Chiêu mộ|Recruitment|Gacha)$/i.test((el.textContent||'').trim()));
  const back=[...gacha.querySelectorAll('button,a')].find(el=>/^(Quay lại|Back|Return)$/i.test((el.textContent||'').trim()));
  if(!title||!back)return;
  let bar=title.parentElement;
  if(bar&&!bar.contains(back)&&bar.parentElement?.contains(back))bar=bar.parentElement;
  if(!bar||!bar.contains(back))return;
  if(!bar.contains(hint)||hint.nextSibling!==back)bar.insertBefore(hint,back);
  bar.classList.add('pkmsvv-gacha-header-hint');
 }
 function sync(){
  if(busy)return;busy=true;
  try{
   const target=G.I18n?.lang==='en'?'Recruitment':'Chiêu mộ';
   const gacha=document.getElementById('scr-gacha');
   if(gacha&&!gacha.querySelector('#pkmsvv-gacha-dex-requirement')){
    const hint=document.createElement('p');
    hint.id='pkmsvv-gacha-dex-requirement';
    hint.setAttribute('role','note');
    hint.setAttribute('translate','no');
    hint.classList.add('notranslate');
    hint.textContent=G.I18n?.lang==='en'?
     'Only Pokémon unlocked in the Pokédex can be recruited.':
     'Chỉ những Pokémon đã mở trong Pokédex mới có thể chiêu mộ.';
    gacha.insertBefore(hint,gacha.firstChild);
   }
   const hint=gacha?.querySelector('#pkmsvv-gacha-dex-requirement');
   if(hint){
    const translation=G.I18n?.lang==='en'?
     'Only Pokémon unlocked in the Pokédex can be recruited.':
     'Chỉ những Pokémon đã mở trong Pokédex mới có thể chiêu mộ.';
    hint.lang=G.I18n?.lang==='en'?'en':'vi';
    if(hint.textContent!==translation)hint.textContent=translation;
    relocateRequirement(gacha,hint);
   }
   for(const root of roots()){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    for(let node;node=walker.nextNode();)nodes.push(node);
    for(const n of nodes){
     // Preserve complete localized sentences and gameplay descriptions:
     // only translate standalone launcher labels, not embedded prose.
     if(n.parentElement?.closest?.('[translate="no"],.notranslate'))continue;
     const old=n.nodeValue||'',word=old.trim();
     if(!/^(Gacha|Recruitment|Chiêu mộ)$/i.test(word))continue;
     const updated=old.replace(word,target);
     if(updated!==old)n.nodeValue=updated;
    }
    if(root.title)root.title=root.title.replace(/Gacha|Recruitment|Chiêu mộ/gi,target);
   }
  }finally{busy=false;}
 }
 function install(){
  sync();
  // Gacha re-renders its own child nodes while animating. Observing that
  // subtree and writing an injected hint in the observer's callback can
  // self-trigger repeated DOM work and stall headless/mobile WebViews.
  // Keep menu observation; the click handler already refreshes Gacha on open.
  for(const id of ['scr-menu']){
   const root=document.getElementById(id);
   if(root&&typeof MutationObserver==='function'){
    const ob=new MutationObserver(()=>sync());
    ob.observe(root,{subtree:true,childList:true});
   }
  }
  document.addEventListener('click',e=>{
   if(e.target?.closest?.('[data-go="gacha"],#scr-gacha,#pkmsvv-mega-gacha')){
    Promise.resolve().then(sync);
   }
  },true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
 G.PKMSVVRecruitmentQA={sync};
})();
