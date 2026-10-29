'use strict';
/* Offline Arena Point Mega Stone banner — separate from Pokemon ticket Gacha.
 * Only user-earned tournament or first Champion victories credit this balance.
 * Legendary Stones NEVER bypass story/quest unlocks or grant a Pokemon.
 */
G.PKMSVVMegaGacha=(()=>{
 const COST=100,LEGEND_RATE=.015,LEGEND_PITY=30;
 const $=id=>document.getElementById(id);
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 function ledger(s=G.DB?.save){if(!s)return null;
  if(!s.arenaGacha||typeof s.arenaGacha!=='object')s.arenaGacha={};
  const a=s.arenaGacha;
  a.points=Math.max(0,Math.floor(Number(a.points)||0));
  a.pity=Math.max(0,Math.min(LEGEND_PITY-1,Math.floor(Number(a.pity)||0)));
  a.pulls=Math.max(0,Math.floor(Number(a.pulls)||0));
  a.championPaid=a.championPaid||{};
  return a;
 }
 const balance=s=>Math.max(0,Math.floor(Number(s?.arenaGacha?.points)||0));
 const stoneOwned=(save,key)=>{const v=save?.megaStones?.[key];
  return v===true||v===1||!!(v&&typeof v==='object'&&v.unlocked===true);};
 const formCatalog=()=>Array.isArray(G.PKMSVV_MEGA_CATALOG)?G.PKMSVV_MEGA_CATALOG:[];
 function pool(save,legendary){
  const known=new Set();
  return formCatalog().filter(f=>{
   if(!f?.stoneKey||!!f.storyLocked!==legendary||stoneOwned(save,f.stoneKey)||known.has(f.stoneKey))return false;
   known.add(f.stoneKey);return true;
  });
 }
 function canPull(save=G.DB?.save){
  return !!(save?.pkmsvvChapter7Seen&&balance(save)>=COST&&
   (pool(save,false).length||pool(save,true).length));
 }
 // Non-legendary Mega stones are common, legendary stones use separate 1.5%
 // base chance with a more attainable 30-roll pity due to expensive Arena Points.
 function pull(save=G.DB?.save,random=Math.random){
  if(!canPull(save))return null;
  const ordinary=pool(save,false),rare=pool(save,true);
  const a=ledger(save);
  const guaranteed=a.pity>=LEGEND_PITY-1;
  let special=rare.length>0&&(guaranteed||!ordinary.length||random()<LEGEND_RATE);
  const choice=special?rare:ordinary;
  if(!choice.length)return null;
  const index=Math.min(choice.length-1,Math.floor(Math.max(0,random())*choice.length));
  const picked=choice[index];if(!picked)return null;
  a.points-=COST;a.pulls++;
  a.pity=special?0:Math.min(LEGEND_PITY-1,a.pity+1);
  save.megaStones=save.megaStones||{};
  save.megaStones[picked.stoneKey]=1;
  // Do NOT set owned, megaForms, megaStoryCleared or chapter flags.
  G.DB.commit(true);
  return {key:picked.key,stoneKey:picked.stoneKey,name:picked.name,
   stone:picked.stone,legendary:special,pity:a.pity,balance:a.points};
 }
 function grantTournament(save,region,rank,firstTitle){
  if(!save||!region)return 0;
  const award=rank===1?(firstTitle?40:20):rank===2?10:rank===3?5:0;
  if(!award)return 0;
  ledger(save).points+=award;return award;
 }
 function grantChampion(save,region){
  if(!save||!region)return 0;
  const a=ledger(save);
  if(a.championPaid[region])return 0;
  a.championPaid[region]=true;
  a.points+=100;
  return 100;
 }
 function createUI(){
  if($('pkmsvv-mega-gacha-tabs'))return;
  const screen=$('scr-gacha'),container=screen?.querySelector('.box.wide');
  const gens=$('gacha-gens');
  if(!container||!gens)return;
  const tabs=document.createElement('div');
  tabs.id='pkmsvv-mega-gacha-tabs';tabs.className='pkmsvv-mega-gacha-tabs';
  const regular=document.createElement('button'),mega=document.createElement('button');
  for(const el of [regular,mega]){el.type='button';el.className='btn pkmsvv-mega-gacha-tab';}
  regular.id='pkmsvv-gacha-tab-pokemon';regular.textContent=tr('◉ Pokémon','◉ Pokémon');
  mega.id='pkmsvv-gacha-tab-mega';mega.textContent=tr('✧ Tiến hóa Mega','✧ Mega Evolution');
  tabs.append(regular,mega);container.insertBefore(tabs,gens);
  const panel=document.createElement('div');panel.id='pkmsvv-mega-gacha-panel';
  panel.className='pkmsvv-mega-gacha-panel';panel.hidden=true;
  panel.innerHTML='<div class="pkmsvv-mega-gacha-machine" aria-hidden="true"><div class="pkmsvv-mega-gacha-gem">✧</div>'+
   '<div class="pkmsvv-mega-gacha-plate">MEGA</div></div>'+
   '<div class="pkmsvv-mega-gacha-data"><h3 id="pkmsvv-mega-gacha-heading"></h3>'+
   '<p id="pkmsvv-mega-gacha-balance"></p><p id="pkmsvv-mega-gacha-pity"></p>'+
   '<p id="pkmsvv-mega-gacha-odds"></p><button class="btn gold" id="pkmsvv-mega-gacha-pull" type="button"></button>'+
   '<div id="pkmsvv-mega-gacha-result" role="status" aria-live="polite"></div>'+
   '<p id="pkmsvv-mega-gacha-note" class="note"></p></div>';
  container.insertBefore(panel,gens);
  function show(mode){
   const isMega=mode==='mega';screen.classList.toggle('pkmsvv-mega-gacha-mode',isMega);
   panel.hidden=!isMega;regular.classList.toggle('on',!isMega);mega.classList.toggle('on',isMega);
   if(isMega)refresh();
  }
  function refresh(){
   const save=G.DB?.save||{},a=save.arenaGacha||{};
   $('pkmsvv-mega-gacha-heading').textContent=tr('Máy quay Mega Stone','Mega Stone Machine');
   $('pkmsvv-mega-gacha-balance').textContent=tr('✦ Điểm Arena: ','✦ Arena Points: ')+balance(save);
   $('pkmsvv-mega-gacha-pity').textContent=
    tr('Bảo hiểm Mega huyền thoại: ','Legendary Mega pity: ')+(Number(a.pity)||0)+'/'+LEGEND_PITY;
   $('pkmsvv-mega-gacha-odds').textContent=
    tr('Mega thường 98,5% · Mega huyền thoại 1,5% · Bảo hiểm lượt thứ 30.',
       'Normal Mega 98.5% · Legendary Mega 1.5% · Guaranteed by pull 30.');
   const btn=$('pkmsvv-mega-gacha-pull');
   btn.textContent=tr('Quay Mega · 100 Điểm Arena','Mega Draw · 100 Arena Points');
   btn.disabled=!canPull(save);
   $('pkmsvv-mega-gacha-note').textContent=!save.pkmsvvChapter7Seen?
    tr('🔒 Đánh bại Champion đầu tiên và hoàn thành Chương 7 để mở máy quay Mega.',
       '🔒 Defeat your first Champion and complete Chapter 7 to unlock Mega Gacha.'):
    tr('Thắng Champion lần đầu từng vùng: +100 điểm. Vô địch Arena: +40 lần đầu / +20 lần sau. Mega huyền thoại vẫn cần mở cốt truyện riêng.',
       'First Champion win per region: +100. Arena win: +40 first / +20 repeat. Legendary Mega still needs its own storyline.');
  }
  $('pkmsvv-mega-gacha-pull').onclick=()=>{
   const r=pull();if(!r){G.UI?.toast?.(tr('Chưa đủ điều kiện hoặc Điểm Arena.','Requirements or Arena Points missing.'));refresh();return;}
   const out=$('pkmsvv-mega-gacha-result');
   out.className='pkmsvv-mega-gacha-result'+(r.legendary?' is-legend':'');
   out.textContent=(r.legendary?'🌟 ':'✧ ')+(r.stone||r.name)+
    (r.legendary?tr(' · HUYỀN THOẠI!',' · LEGENDARY!'):'');
   G.Audio?.sfx?.('shinyGet');refresh();
  };
  regular.onclick=()=>show('pokemon');mega.onclick=()=>show('mega');
  const oldOpen=G.GachaUI?.open;
  if(typeof oldOpen==='function')G.GachaUI.open=function(...args){
   const result=oldOpen.apply(this,args);show('pokemon');return result;
  };
  show('pokemon');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',createUI,{once:true});
 else createUI();
 return {COST,LEGEND_RATE,LEGEND_PITY,ledger,balance,pool,canPull,pull,
  grantTournament,grantChampion,createUI};
})();
