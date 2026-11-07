/* PokéBox Stage 3 — Reforge Prism QA. Isolated from all production builds.
 * Item reset, one daily Kecleon slot, and one per Solo-PvE run kill reward.
 * Testable functions take explicit saves; no silent legacy migration.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.G)root.G.PKMSVVBox3=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const ITEM='reforge-prism',PRICE=6500,SHOP_RATE=0.12,PITY=180,MAX_DROPS_PER_RUN=1;
 const RATES=Object.freeze({type:0.0035,species:0.015,elite:0.03,boss:0.08});
 const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
 const deep=x=>JSON.parse(JSON.stringify(x));
 const nonneg=n=>Number.isSafeInteger(n)&&n>=0;
 const integer=n=>Number.isSafeInteger(n)&&n>0;
 const getSave=()=>typeof G==='undefined'?null:G.DB?.save;
 const box2=()=>typeof G==='undefined'?null:G.PKMSVVBox2;
 let dropsThisRun=0,unflushedPityKills=0,pendingPitySave=null,enemyInstalled=false,shopInstalled=false;
 const PITY_BATCH=25; // far fewer synchronous save writes in crowded solo runs
 function validPurchase(s){
  if(!s||typeof s!=='object'||Array.isArray(s)||!Number.isFinite(Number(s.coins))||Number(s.coins)<0)return false;
  if(s.pkmsvvBoxSchema!==undefined&&!box2()?.valid?.(s))return false;
  if(s.pkmsvvReforgePrisms!==undefined&&!nonneg(s.pkmsvvReforgePrisms))return false;
  if(s.pkmsvvReforgeBoughtDay!==undefined&&typeof s.pkmsvvReforgeBoughtDay!=='string')return false;
  return true;
 }
 function valid(s){
  if(!box2()?.valid?.(s))return false;
  if(s.pkmsvvReforgePrisms!==undefined&&!nonneg(s.pkmsvvReforgePrisms))return false;
  if(s.pkmsvvReforgePity!==undefined&&!nonneg(s.pkmsvvReforgePity))return false;
  if(s.pkmsvvReforgeBoughtDay!==undefined&&typeof s.pkmsvvReforgeBoughtDay!=='string')return false;
  return true;
 }
 function count(s=getSave()){return validPurchase(s)?s.pkmsvvReforgePrisms||0:0;}
 function pity(s=getSave()){return valid(s)?s.pkmsvvReforgePity||0:0;}
 function today(){
  if(typeof G!=='undefined'&&typeof G.Shop?.today==='function')return String(G.Shop.today());
  const p={};
  for(const part of new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()))p[part.type]=part.value;
  return p.year+p.month+p.day;
 }
 function slotRoll(day){
  // Stable across app refresh; do not roll again by reopening the shop.
  const seed='pkmsvv:reforge:shop:v1:'+String(day);
  let h=2166136261;
  for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619);}
  h^=h>>>13;h=Math.imul(h,0x5bd1e995);h^=h>>>15;
  return (h>>>0)/4294967296;
 }
 function shopOffer(day=today(),s=getSave()){
  // Stable, day-scoped rare item rotation: reopening shop cannot reroll.
  const available=slotRoll(day)<SHOP_RATE;
  return {day,available,bought:!!(s&&s.pkmsvvReforgeBoughtDay===day),price:PRICE,
   canBuy:available&&validPurchase(s)&&s.pkmsvvReforgeBoughtDay!==day&&Number(s.coins)>=PRICE&&
    !(typeof G!=='undefined'&&G.DB?.save===s&&G.DB?.guest)};
 }
 function commitDraft(s,draft,validate=valid){
  if(!validate(draft))throw Error('Invalid save; no item was changed');
  const max=box2()?.MAX_SAVE_CHARS||1400000;
  if(JSON.stringify(draft).length>max)throw Error('Save too large to commit safely');
  const previous=deep(s);
  try{
   for(const k of Object.keys(s))delete s[k];
   Object.assign(s,draft);
   if(typeof G!=='undefined'&&G.DB?.save===s&&G.DB.commit?.(true)===false)
    throw Error('Save commit failed');
  }catch(e){
   for(const k of Object.keys(s))delete s[k];
   Object.assign(s,previous);
   throw e;
  }
 }
 function atomic(s,cb,validate=valid){
  if(!validate(s))throw Error('Invalid save; operation blocked');
  const draft=deep(s);
  const result=cb(draft);
  commitDraft(s,draft,validate);
  return result;
 }
 function buy(s=getSave(),day=today()){
  if(!shopOffer(day,s).canBuy)throw Error('Prism unavailable, already purchased or not enough PokéCoins');
  return atomic(s,draft=>{
   if(!shopOffer(day,draft).canBuy)throw Error('Prism already purchased or not enough PokéCoins');
   draft.coins-=PRICE;
   draft.pkmsvvReforgePrisms=(draft.pkmsvvReforgePrisms||0)+1;
   draft.pkmsvvReforgeBoughtDay=day;
   return {item:ITEM,price:PRICE,count:draft.pkmsvvReforgePrisms,day};
  },validPurchase);
 }
 function resetBranch(id,newBranch,s=getSave()){
  return atomic(s,draft=>{
   const chosen=box2().get(draft,id);
   const progress=chosen&&box2().speciesProgress(draft,chosen.dex);
   const item=progress&&box2().get(draft,progress.ownerId);
   if(!item||progress.rank<3||!progress.rankBranch)throw Error('Choose a Rank 3 branch first');
   const choices=box2().branches(item.dex);
   if(!choices.includes(newBranch)||newBranch===progress.rankBranch)throw Error('Select a different, valid branch');
   if(!integer(draft.pkmsvvReforgePrisms||0))throw Error('A Reforge Prism is required');
   const from=progress.rankBranch;
   draft.pkmsvvReforgePrisms--;
   for(const x of draft.pkmsvvBox)if(x.dex===item.dex&&x.rankBranch)x.rankBranch=null;
   item.rankBranch=newBranch;
   draft.pkmsvvBoxLog=Array.isArray(draft.pkmsvvBoxLog)?draft.pkmsvvBoxLog:[];
   draft.pkmsvvBoxLog.push({kind:'reforge',id,dex:item.dex,from,to:newBranch,at:Date.now()});
   draft.pkmsvvBoxLog=draft.pkmsvvBoxLog.slice(-30);
   return {id,from,to:newBranch,remaining:draft.pkmsvvReforgePrisms,rank:progress.rank};
  });
 }
 function isSoloPvE(s=getSave()){
  if(!valid(s)||!box2()?.selected?.(s))return false;
  if(typeof G==='undefined')return true; // function-level unit testing
  const state=G.Game?.state;
  if(state!==undefined&&state!=='playing')return false;
  if(G.Coop?.active||G.Royale?.active||G.Arena?.active||
    G.PKMSVVArenaPvp?.active||G.PKMSVVChampion?.active||
    G.PKMSVVBerryRescue?.active||G.Rift?.inArena)return false;
  return true;
 }
 function enemyInfo(enemy,s=getSave()){
  if(!enemy||enemy.remote||enemy.arceus||enemy._pkmsvvPrismCounted||enemy.isCompanion||
    enemy._pkmsvvBossSupport||enemy._pkmsvvSupportGuard||enemy.pkmsvvBossGuard)return null;
  const dex=Number(enemy.dex||enemy.mon?.dex||enemy.data?.dex);
  if(!Number.isSafeInteger(dex)||dex<1||dex>1025)return null;
  const played=box2()?.selected?.(s),me=typeof G!=='undefined'?G.DEX_BY?.[played?.dex]:null;
  const foe=typeof G!=='undefined'?G.DEX_BY?.[dex]:null;
  const a=me?.types,b=enemy.types||enemy.mon?.types||foe?.types;
  const myTypes=Array.isArray(a)?a:[],theirTypes=Array.isArray(b)?b:[];
  const sameSpecies=dex===played?.dex;
  if(!sameSpecies&&!myTypes.some(t=>theirTypes.includes(t)))return null;
  let rate=sameSpecies?RATES.species:RATES.type,kind=sameSpecies?'species':'type';
  if(enemy.elite||enemy.isElite||enemy.kind==='elite'){
   rate=Math.max(rate,RATES.elite);kind='elite';
  }
  if(enemy.boss){rate=RATES.boss;kind='boss';}
  return {dex,rate,kind};
 }
 function eligibleDefeat(enemy,s=getSave()){
  if(!isSoloPvE(s)||dropsThisRun>=MAX_DROPS_PER_RUN)return null;
  return enemyInfo(enemy,s);
 }
 function defeated(enemy,random=Math.random,s=getSave()){
  const info=eligibleDefeat(enemy,s);
  if(!info)return {eligible:false,dropped:false};
  enemy._pkmsvvPrismCounted=true; // a defeat can only increment pity once
  const counter=pity(s)+1;
  const drops=counter>=PITY||random()<info.rate;
  const nextDrops=dropsThisRun+(drops?1:0);
  try{
   // Regular kills update in-memory pity without forcing a localStorage write
   // on every death. Existing game autosave and the run boundary flush it.
   if(!drops&&counter%PITY_BATCH!==0){
    s.pkmsvvReforgePity=counter;unflushedPityKills++;pendingPitySave=s;
    return {eligible:true,dropped:false,kind:info.kind,rate:info.rate,
      pity:counter,prisms:s.pkmsvvReforgePrisms||0};
   }
   const receipt=atomic(s,draft=>{
    draft.pkmsvvReforgePity=drops?0:counter;
    if(drops)draft.pkmsvvReforgePrisms=(draft.pkmsvvReforgePrisms||0)+1;
    return {eligible:true,dropped:drops,kind:info.kind,rate:info.rate,
     pity:draft.pkmsvvReforgePity,prisms:draft.pkmsvvReforgePrisms||0};
   });
   unflushedPityKills=0;pendingPitySave=null;dropsThisRun=nextDrops;
   return receipt;
  }catch(e){
   enemy._pkmsvvPrismCounted=false;
   throw e;
  }
 }
 function flushPity(){
  if(!unflushedPityKills)return false;
  if(typeof G==='undefined'||!G.DB?.commit)return false;
  // Never flush pending kills from another login into the next save profile.
  if(G.DB.save!==pendingPitySave){unflushedPityKills=0;pendingPitySave=null;return false;}
  try{
   if(G.DB.commit(true)===false)return false;
   unflushedPityKills=0;pendingPitySave=null;return true;
  }catch(_){return false}
 }
 function resetRun(){flushPity();dropsThisRun=0;}
 function runDrops(){return dropsThisRun;}
 function enemyHook(EnemyClass,manager,db){
  if(!EnemyClass?.prototype||typeof EnemyClass.prototype.hurt!=='function')return false;
  if(EnemyClass.prototype._pkmsvvReforgeHurtWrapped)return true;
  const old=EnemyClass.prototype.hurt;
  EnemyClass.prototype.hurt=function(...args){
   const deadBefore=!!this.dead;
   const result=old.apply(this,args);
   if(!deadBefore&&this.dead&&!this.remote&&!this.arceus&&db?.save===getSave()){
    try{
     const reward=defeated(this,Math.random,db.save);
     if(reward.dropped&&typeof G!=='undefined'){
      const vi=G.I18n?.lang!=='en';
      G.UI?.toast?.(vi?'🔮 Nhặt được Lăng Kính Tái Khắc!':'🔮 Reforge Prism obtained!',3600);
     }
    }catch(e){if(typeof console!=='undefined')console.warn('[PokéBox Prism reward]',e.message);}
   }
   return result;
  };
  EnemyClass.prototype._pkmsvvReforgeHurtWrapped=true;
  // The engine clears enemies at a fresh run; reset the one-drop cap there.
  if(manager&&typeof manager.clear==='function'&&!manager._pkmsvvReforgeClearWrapped){
   const origClear=manager.clear;
   manager.clear=function(...args){const out=origClear.apply(this,args);resetRun();return out;};
   manager._pkmsvvReforgeClearWrapped=true;
  }
  enemyInstalled=true;
  return true;
 }
 function installShop(ui,db){
  if(!ui||typeof ui.open!=='function'||!ui.render||shopInstalled)return false;
  function draw(){
   const list=typeof document!=='undefined'?document.getElementById('pkmk-list'):null;
   const active=!!document.getElementById('pkmk-tab-shop')?.classList?.contains('gold');
   const inBag=!!document.getElementById('pkmk-tab-bag')?.classList?.contains('gold');
   if(!list||(!active&&!inBag)||list.querySelector('#pkmbx-prism-store'))return;
   const s=db?.save,offer=shopOffer(today(),s);
   if(active&&!offer.available)return; // Stock controls whether card exists.
   if(inBag&&!count(s))return;
   const section=document.createElement('section');section.id='pkmbx-prism-store';
   section.setAttribute('translate','no');
   section.className='pkmk-card pkmbx-prism-store';
   const vi=G.I18n?.lang!=='en';
   const title=vi?'Lăng Kính Tái Khắc':'Reforge Prism';
   const status=offer.bought?(vi?'Đã mua hôm nay · mở bán lại ngày mai':'Purchased today · available again tomorrow'):
    (vi?'Có bán hôm nay · giới hạn 1 viên/ngày':'In stock today · limit one per day');
   section.innerHTML='<div class="pkmk-product-art pkmbx-prism-product-icon" aria-hidden="true"><svg class="pkmbx-prism-glass" viewBox="0 0 64 64" role="img" aria-label="Reforge Prism" xmlns="http://www.w3.org/2000/svg"><path d="M35 39L53 57 60 50 42 32" fill="#e6c7a4" stroke="#0c1120" stroke-width="4" stroke-linejoin="round"/><path d="M47 45L55 53" stroke="#866b51" stroke-width="2"/><circle cx="26" cy="24" r="20" fill="#322757" stroke="#0a1120" stroke-width="5"/><circle cx="26" cy="24" r="15.5" fill="#b497ef" stroke="#ede2ff" stroke-width="2"/><path d="M12 21L23 11 36 17 33 35 20 38 12 29Z" fill="#775ec4" opacity=".72"/><path d="M19 16L28 12 35 20 29 29 17 27Z" fill="#cdb5ff" opacity=".9"/><path d="M22 15L25 21 31 24 25 27 22 33 19 27 13 24 19 21Z" fill="#fff7d7"/><circle cx="36" cy="34" r="2" fill="#fff"/></svg></div>'+
    '<div class="pkmk-product-copy pkmbx-prism-product-info"><b>'+title+'</b>'+
    '<small>'+(vi?'Đổi hướng Rank 3/5, giữ nguyên cấp Rank.':'Switch Rank 3/5 branch while keeping Rank level.')+'</small>'+
    '<small>'+(vi?'Đang có: ':'Owned: ')+count(s)+' · '+status+'</small></div>'+
    '<div class="pkmk-product-tail pkmbx-prism-actions"><strong class="pkmbx-prism-price">'+
      PRICE.toLocaleString('vi-VN')+' PokéCoins</strong></div>';
   if(inBag){
    // When Prism is the only held item, the native inventory renders its
    // empty placeholder. Replace only that placeholder; preserve Mint/TM/Berry cards.
    const empty=list.querySelector('.pkmk-empty');if(empty)empty.remove();
    const info=document.createElement('p');
    info.textContent=vi?'Đã có trong Túi đồ. Dùng tại PokéBox → Rank → Đổi hướng.':'Owned item. Use from PokéBox → Rank → Change Path.';
    section.appendChild(info);
    const jump=document.createElement('button');jump.type='button';jump.className='btn small';
    jump.textContent=vi?'🦎 Đến cửa hàng':'🦎 Go to Shop';
    jump.onclick=()=>ui.open('shop');
    section.appendChild(jump);
    let cards=list.querySelector('.pkmk-cards');
    if(!cards){cards=document.createElement('div');cards.className='pkmk-cards';list.appendChild(cards);}
    cards.appendChild(section);return;
   }
   const button=document.createElement('button');
   button.className='btn small gold pkmbx-prism-buy';button.type='button';
   button.textContent=offer.bought?(vi?'✓ Đã mua hôm nay':'✓ Bought today'):
    (vi?'Mua Lăng Kính · ':'Buy Prism · ')+PRICE.toLocaleString('vi-VN')+' PokéCoins';
   button.disabled=!offer.canBuy;
   button.onclick=()=>{
    button.disabled=true;
    try{buy(db.save,offer.day);G.UI?.refreshCoins?.();ui.render();}
    catch(e){G.UI?.toast?.(e.message,3000);ui.render();}
   };
   section.querySelector('.pkmbx-prism-actions').appendChild(button);
   if(!offer.canBuy&&!offer.bought){
    const reason=document.createElement('p');reason.className='pkmbx-prism-unavailable';
    reason.textContent=!validPurchase(s)?
     (vi?'Hồ sơ lưu không hợp lệ, chưa thể mua.':'Invalid save profile; purchase disabled.'):
     Number(s?.coins)<PRICE?(vi?'Không đủ PokéCoins.':'Not enough PokéCoins.'):
     (vi?'Hồ sơ khách không thể mua vật phẩm.':'Guest profiles cannot buy items.');
    section.appendChild(reason);
   }
   // Add alongside ordinary Mint/Capsule cards, not alone after the TM grid.
   const cards=list.querySelector('.pkmk-cards');
   if(cards)cards.appendChild(section);
   else list.appendChild(section);
  }
  const oldRender=ui.render;
  ui.render=function(...args){const r=oldRender.apply(this,args);draw();return r;};
  const oldOpen=ui.open;
  ui.open=function(...args){const r=oldOpen.apply(this,args);draw();return r;};
  if(typeof document!=='undefined'){
   // Tab clicks call a local closure in upstream UI, so redraw after bubbling.
   document.addEventListener('click',event=>{
    if(!event.target?.closest?.('#scr-kecleon'))return;
    if(typeof queueMicrotask==='function')queueMicrotask(draw);
    else Promise.resolve().then(draw);
   });
  }
  shopInstalled=true;return true;
 }
 function init(){
  if(typeof window==='undefined'||!window.G)return;
  function install(){
   try{enemyHook(G.Enemy,G.EnemyMgr,G.DB);}catch(e){console.warn(e);}
   try{installShop(G.KecleonUI,G.DB);}catch(e){console.warn(e);}
  }
  install();
  if(typeof document!=='undefined'){
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
   else install();
  }
 }
 return {ITEM,PRICE,SHOP_RATE,PITY,MAX_DROPS_PER_RUN,RATES,valid,count,pity,today,slotRoll,
  shopOffer,buy,resetBranch,enemyInfo,eligibleDefeat,defeated,resetRun,runDrops,isSoloPvE,enemyHook,
  PITY_BATCH,flushPity,
  installShop,init};
});
if(typeof window!=='undefined'&&window.G)window.G.PKMSVVBox3?.init?.();
