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
 let dropsThisRun=0,unflushedPityKills=0,enemyInstalled=false,shopInstalled=false;
 const PITY_BATCH=25; // far fewer synchronous save writes in crowded solo runs
 function valid(s){
  if(!box2()?.valid?.(s))return false;
  if(s.pkmsvvReforgePrisms!==undefined&&!nonneg(s.pkmsvvReforgePrisms))return false;
  if(s.pkmsvvReforgePity!==undefined&&!nonneg(s.pkmsvvReforgePity))return false;
  if(s.pkmsvvReforgeBoughtDay!==undefined&&typeof s.pkmsvvReforgeBoughtDay!=='string')return false;
  return true;
 }
 function count(s=getSave()){return valid(s)?s.pkmsvvReforgePrisms||0:0;}
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
  const available=slotRoll(day)<SHOP_RATE;
  return {day,available,bought:!!(s&&s.pkmsvvReforgeBoughtDay===day),price:PRICE,
   canBuy:available&&valid(s)&&s.pkmsvvReforgeBoughtDay!==day&&Number(s.coins)>=PRICE};
 }
 function commitDraft(s,draft){
  if(!valid(draft))throw Error('Corrupt PokéBox save; no item was changed');
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
 function atomic(s,cb){
  if(!valid(s))throw Error('Create PokéBox from a backup first');
  const draft=deep(s);
  const result=cb(draft);
  commitDraft(s,draft);
  return result;
 }
 function buy(s=getSave(),day=today()){
  if(!shopOffer(day,s).canBuy)throw Error('Prism sold out, absent or not enough PokéCoins');
  return atomic(s,draft=>{
   // Recheck with the draft to prevent double purchases.
   if(!shopOffer(day,draft).canBuy)throw Error('Prism already purchased');
   draft.coins-=PRICE;
   draft.pkmsvvReforgePrisms=(draft.pkmsvvReforgePrisms||0)+1;
   draft.pkmsvvReforgeBoughtDay=day;
   return {item:ITEM,price:PRICE,count:draft.pkmsvvReforgePrisms,day};
  });
 }
 function resetBranch(id,newBranch,s=getSave()){
  return atomic(s,draft=>{
   const item=box2().get(draft,id);
   if(!item||item.rank<3||!item.rankBranch)throw Error('Choose a Rank 3 branch first');
   const choices=box2().branches(item.dex);
   if(!choices.includes(newBranch)||newBranch===item.rankBranch)throw Error('Select a different, valid branch');
   if(!integer(draft.pkmsvvReforgePrisms||0))throw Error('A Reforge Prism is required');
   const from=item.rankBranch;
   draft.pkmsvvReforgePrisms--;
   item.rankBranch=newBranch;
   draft.pkmsvvBoxLog=Array.isArray(draft.pkmsvvBoxLog)?draft.pkmsvvBoxLog:[];
   draft.pkmsvvBoxLog.push({kind:'reforge',id,dex:item.dex,from,to:newBranch,at:Date.now()});
   draft.pkmsvvBoxLog=draft.pkmsvvBoxLog.slice(-30);
   return {id,from,to:newBranch,remaining:draft.pkmsvvReforgePrisms,rank:item.rank};
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
    enemy._pkmsvvBossSupport||enemy._pkmsvvSupportGuard)return null;
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
    s.pkmsvvReforgePity=counter;unflushedPityKills++;
    return {eligible:true,dropped:false,kind:info.kind,rate:info.rate,
      pity:counter,prisms:s.pkmsvvReforgePrisms||0};
   }
   const receipt=atomic(s,draft=>{
    draft.pkmsvvReforgePity=drops?0:counter;
    if(drops)draft.pkmsvvReforgePrisms=(draft.pkmsvvReforgePrisms||0)+1;
    return {eligible:true,dropped:drops,kind:info.kind,rate:info.rate,
     pity:draft.pkmsvvReforgePity,prisms:draft.pkmsvvReforgePrisms||0};
   });
   unflushedPityKills=0;dropsThisRun=nextDrops;
   return receipt;
  }catch(e){
   enemy._pkmsvvPrismCounted=false;
   throw e;
  }
 }
 function flushPity(){
  if(!unflushedPityKills)return false;
  if(typeof G==='undefined'||!G.DB?.commit)return false;
  try{
   if(G.DB.commit(true)===false)return false;
   unflushedPityKills=0;return true;
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
   const section=document.createElement('section');section.id='pkmbx-prism-store';
   section.setAttribute('translate','no');
   section.className='pkmbx-prism-store';
   const vi=G.I18n?.lang!=='en';
   const title=vi?'🔮 Lăng Kính Tái Khắc':'🔮 Reforge Prism';
   const status=offer.bought?(vi?'Đã mua hôm nay':'Purchased today'):
    !offer.available?(vi?'Chưa xuất hiện hôm nay (12%/ngày)':'Not in stock today (12% per day)'):
    (vi?'Hàng hiếm hôm nay · chỉ 1 viên':'Rare daily stock · one only');
   section.innerHTML='<h3>'+title+'</h3><p>'+(vi?'Đổi hướng Rank 3/5 mà không mất Rank.':'Switch your Rank 3/5 branch without losing Rank.')+'</p>'+
    '<p>'+(inBag?(vi?'Số lượng trong Túi đồ: ':'Owned: '):(status+' · '+(vi?'Túi hiện có: ':'In Bag: ')))+count(s)+'</p>';
   if(inBag){
    const info=document.createElement('p');
    info.textContent=vi?'Dùng tại PokéBox → Rank → Đổi hướng.':'Use from PokéBox → Rank → Change Path.';
    section.appendChild(info);
    list.appendChild(section);
    return;
   }
   if(!valid(s)){
    const info=document.createElement('p');
    info.textContent=vi?'Cần tạo PokéBox từ bản sao save trước khi mua.':'Create PokéBox from a backed-up save before buying.';
    section.appendChild(info);
   }
   if(offer.available&&!offer.bought){
    const button=document.createElement('button');
    button.className='btn small gold';button.type='button';
    button.textContent=(vi?'Mua ':'Buy ')+PRICE.toLocaleString('vi-VN')+' PokéCoins';
    button.disabled=!offer.canBuy;
    button.onclick=()=>{
     button.disabled=true;
     try{buy(db.save,offer.day);G.UI?.refreshCoins?.();ui.render();}
     catch(e){G.UI?.toast?.(e.message,3000);ui.render();}
    };
    section.appendChild(button);
   }
   list.appendChild(section);
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
