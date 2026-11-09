/* QA-only polish: equalize Recruitment card size without replacing buttons,
 * losing their click handlers, ticket prices or language-switch behavior. */
(function(){
 'use strict';
 if(typeof document==='undefined')return;
 let busy=false;
 let detailObserver=null,observedDetail=null;
 function focusedDex(){
  const s=G.DB?.save;
  const id=G.PKMSVVBox?.focusedId?.();
  const item=G.PKMSVVBoxHub?.item?.(s,id);
  if(item?.dex)return Number(item.dex);
  const legacy=String(id||'').match(/^b1-(\d+)-[ns]$/);
  return legacy?Number(legacy[1]):Number(s?.partner)||0;
 }
 function singleAbility(){
  const dex=focusedDex(),choices=G.DEX_ABIL?.[dex]||[];
  return dex>0&&[...new Set(choices.filter(Boolean))].length===1;
 }
 function abilityAction(button){
  return !!button&&/^(?:⚙|🔄|↻|✦|\s)*\s*(?:Đổi đặc tính|Change Ability|Reroll Ability)\s*$/i
   .test(String(button.textContent||'').trim());
 }
 function guardAbilityButtons(){
  const profile=document.querySelector('#pkmsvv-pokebox-overlay #pkmbx-profile');
  if(!profile)return;
  const blocked=singleAbility();
  for(const button of profile.querySelectorAll('button')){
   if(!abilityAction(button))continue;
   if(blocked){
    if(!button.hasAttribute('data-pkmsvv-ability-original-disabled'))
     button.dataset.pkmsvvAbilityOriginalDisabled=String(!!button.disabled);
    button.disabled=true;
    button.title=G.I18n?.lang==='en'?
     'This Pokémon has only one Ability; Capsules cannot change it.':
     'Pokémon này chỉ có 1 Đặc tính, không thể đổi bằng Viên nang.';
   }else if(button.hasAttribute('data-pkmsvv-ability-original-disabled')){
    button.disabled=button.dataset.pkmsvvAbilityOriginalDisabled==='true';
    button.removeAttribute('data-pkmsvv-ability-original-disabled');
    button.removeAttribute('title');
   }
  }
 }
 function observeDetails(){
  const profile=document.querySelector('#pkmsvv-pokebox-overlay #pkmbx-profile');
  if(!profile||profile===observedDetail)return;
  detailObserver?.disconnect();
  observedDetail=profile;
  if(typeof MutationObserver==='function'){
   detailObserver=new MutationObserver(guardAbilityButtons);
   detailObserver.observe(profile,{childList:true,subtree:true});
  }
  guardAbilityButtons();
 }
 function sync(){
  if(busy)return;busy=true;
  try{
   const root=document.getElementById('scr-gacha');
   if(!root)return;
   const matches=[...root.querySelectorAll('button')].filter(el=>{
    const label=String(el.textContent||'').trim();
    return /(?:Quay|Chiêu mộ|Recruit|Pull|Draw)/i.test(label)&&
     /(?:1|10|100|vé|ticket|×|x)/i.test(label)&&
     !/Đóng|Close|Bỏ qua|Skip/i.test(label);
   });
   for(const btn of matches)btn.classList.add('pkmsvv-v20-gacha-card');
   if(matches.length>=3){
    const p=matches[0].parentElement;
    if(p&&matches.every(x=>x.parentElement===p))
     p.classList.add('pkmsvv-v20-gacha-actions');
   }
  }finally{busy=false;}
  observeDetails();
 }
 function install(){
  sync();
  // Older detail layouts expose a confirmation button before they know the
  // species has no alternate Ability. Block it in capture phase as a
  // last-resort guard, so it never opens a pointless purchase dialog.
  document.addEventListener('click',event=>{
   const button=event.target?.closest?.('#pkmbx-profile button');
   if(button&&abilityAction(button)&&singleAbility()){
    event.preventDefault();event.stopImmediatePropagation();
    G.UI?.toast?.(G.I18n?.lang==='en'?
     'Only one Ability is available. No Capsule was used.':
     'Pokémon này chỉ có 1 Đặc tính. Không trừ Viên nang.',2800);
    observeDetails();
    return;
   }
   if(event.target?.closest?.('#scr-menu [data-go="dex"],[data-box-tab],[data-pc-tab],.pkmbx-hub-slot'))
    Promise.resolve().then(observeDetails);
  },true);
  document.addEventListener('focusin',event=>{
   if(event.target?.closest?.('#pkmsvv-pokebox-overlay'))observeDetails();
  },true);
  const root=document.getElementById('scr-gacha');
  if(root&&typeof MutationObserver==='function'){
   const observer=new MutationObserver(sync);
   observer.observe(root,{subtree:true,childList:true,characterData:true});
  }
 }
 if(document.readyState==='loading')
  document.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
 G.PKMSVV20UIPolish={sync,guardAbilityButtons,singleAbility,focusedDex};
})();
