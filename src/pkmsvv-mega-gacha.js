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
  a.trophyPaid=a.trophyPaid||{};
  return a;
 }
 const balance=s=>Math.max(0,Math.floor(Number(s?.arenaGacha?.points)||0));
 const stoneOwned=(save,key)=>{const v=save?.megaStones?.[key];
  return v===true||v===1||!!(v&&typeof v==='object'&&v.unlocked===true);};
 const formCatalog=()=>Array.isArray(G.PKMSVV_MEGA_CATALOG)?G.PKMSVV_MEGA_CATALOG:[];
 function pool(save,legendary){
  const known=new Set();
  return formCatalog().filter(f=>{
   if(!f?.stoneKey||!!f.storyLocked!==legendary||known.has(f.stoneKey))return false;
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
  const duplicate=stoneOwned(save,picked.stoneKey);
  const refund=duplicate?(special?200:50):0;
  save.megaStones=save.megaStones||{};
  if(!duplicate)save.megaStones[picked.stoneKey]=1;
  a.points+=refund;
  // Duplicates refund Arena Points only. Never unlock Pokémon or bypass story.
  G.DB.commit(true);
  if(save===G.DB?.save)G.PKMSVVStory?.onMegaUnlocked?.();
  return {key:picked.key,stoneKey:picked.stoneKey,name:picked.name,
   stone:picked.stone,legendary:special,duplicate,refund,pity:a.pity,balance:a.points};
 }
 function grantTournament(save,region,rank,firstTitle){
  if(!save||!region)return 0;
  const award=rank===1?(firstTitle?40:20):rank===2?10:rank===3?5:0;
  if(!award)return 0;
  const a=ledger(save);
  if(rank===1&&firstTitle)a.trophyPaid[region]=true;
  a.points+=award;return award;
 }
 function grantChampion(save,region){
  if(!save||!region)return 0;
  const a=ledger(save);
  if(a.championPaid[region])return 0;
  a.championPaid[region]=true;
  a.points+=100;
  return 100;
 }
 // Backfill points for genuine regional achievements from before this currency
 // existed. An idempotent marker prevents any new points on reload/reimport.
 function syncLegacyArena(save=G.DB?.save){
  if(!save)return 0;
  const a=ledger(save),book=save.arenas?.pkmChampion;
  if(!book)return 0;
  let amount=0;
  for(const [region,won] of Object.entries(book.trophies||{})){
   if(won===true&&!a.trophyPaid[region]){
    a.trophyPaid[region]=true;a.points+=40;amount+=40;
   }
  }
  for(const [region,won] of Object.entries(book.seals||{})){
   if(won===true&&!a.championPaid[region]){
    a.championPaid[region]=true;a.points+=100;amount+=100;
   }
  }
  if(amount)G.DB.commit(true);
  return amount;
 }


 // The same sprite sheet is decoded once for the canvas reels. Only the
 // Mega mode invokes this; the ordinary Pokémon Gacha keeps its old draw path.
 let stoneSheet=null,stoneSheetLoad=null;
 function preloadStoneSheet(){
  if(stoneSheet?.complete&&stoneSheet.naturalWidth)return Promise.resolve(true);
  if(stoneSheetLoad)return stoneSheetLoad;
  if(typeof Image==='undefined')return Promise.resolve(false);
  stoneSheetLoad=new Promise(resolve=>{
   const img=new Image();
   stoneSheet=img;
   img.onload=()=>resolve(true);
   img.onerror=()=>resolve(false);
   img.src='assets/mega-items/itemicons-sheet.png';
   if(img.complete&&img.naturalWidth)resolve(true);
  });
  return stoneSheetLoad;
 }
 function drawStoneSlot(ctx,key,x,y,size=24){
  const n=G.PKMSVV_MEGA_ITEM_MAP?.icons?.[key];
  if(!stoneSheet?.complete||!stoneSheet.naturalWidth||!Number.isInteger(n)||!ctx?.drawImage)return false;
  ctx.drawImage(stoneSheet,(n%16)*24,Math.floor(n/16)*24,24,24,x,y,size,size);
  return true;
 }
 // Use the exact pixel item icon from the offline Showdown atlas. One file
 // covers all 92 named Mega Stones; no runtime network access is required.
 function stoneIcon(key,size=72){
  const n=G.PKMSVV_MEGA_ITEM_MAP?.icons?.[key];
  const icon=document.createElement('span');
  icon.className='pkmsvv-mega-item-icon';
  icon.style.width=size+'px';icon.style.height=size+'px';
  if(Number.isInteger(n)&&n>=0){
   icon.classList.add('has-sprite');
   icon.style.backgroundSize=(size*16)+'px auto';
   icon.style.backgroundPosition='-'+((n%16)*size)+'px -'+(Math.floor(n/16)*size)+'px';
  }else{
   icon.textContent='◇';
   icon.classList.add('is-missing');
  }
  icon.setAttribute('role','img');icon.setAttribute('aria-label',key||'Mega Stone');
  return icon;
 }
 function createUI(){
  if($('pkmsvv-mega-gacha-tabs'))return;
  const screen=$('scr-gacha'),container=screen?.querySelector('.box.wide');
  const gens=$('gacha-gens');
  if(!container||!gens)return;
  let busy=false;
  const tabs=document.createElement('div');
  tabs.id='pkmsvv-mega-gacha-tabs';tabs.className='pkmsvv-mega-gacha-tabs';
  const regular=document.createElement('button'),mega=document.createElement('button');
  for(const el of [regular,mega]){el.type='button';el.className='btn pkmsvv-mega-gacha-tab';}
  regular.id='pkmsvv-gacha-tab-pokemon';regular.textContent='◉ Pokémon';
  mega.id='pkmsvv-gacha-tab-mega';mega.textContent=tr('✧ Tiến hóa Mega','✧ Mega Evolution');
  tabs.append(regular,mega);container.insertBefore(tabs,gens);
  const panel=document.createElement('div');panel.id='pkmsvv-mega-gacha-panel';
  panel.className='pkmsvv-mega-gacha-panel';panel.hidden=true;
  panel.innerHTML='<div class="pkmsvv-mega-gacha-machine">'+
   '<div class="pkmsvv-mega-gacha-plate">MEGA STONE</div>'+
   '<div id="pkmsvv-mega-gacha-preview" class="pkmsvv-mega-gacha-preview" aria-label="Mega Stone"></div>'+
   '<div class="pkmsvv-mega-gacha-machine-hint">✦ '+tr('Mỗi lần quay, một viên đá!','One stone per pull!')+'</div></div>'+
   '<div class="pkmsvv-mega-gacha-data"><h3 id="pkmsvv-mega-gacha-heading"></h3>'+
   '<p id="pkmsvv-mega-gacha-balance"></p><p id="pkmsvv-mega-gacha-pity"></p>'+
   '<p id="pkmsvv-mega-gacha-odds"></p>'+
   '<p class="pkmsvv-mega-refund">'+tr('Trùng Mega thường: +50 Điểm Arena · Trùng Mega huyền thoại: +200 Điểm Arena',
    'Normal duplicate: +50 Arena Points · Legendary duplicate: +200 Arena Points')+'</p>'+
   '<button class="btn gold" id="pkmsvv-mega-gacha-pull" type="button" data-sfx="none"></button>'+
   '<div id="pkmsvv-mega-gacha-result" role="status" aria-live="polite"></div>'+
   '<p id="pkmsvv-mega-gacha-note" class="note"></p></div>';
  container.insertBefore(panel,gens);
  const sample=formCatalog().filter(f=>f.stoneKey);
  const preview=$('pkmsvv-mega-gacha-preview');
  for(const f of [sample[0],sample[Math.floor(sample.length/3)],sample[Math.floor(sample.length*2/3)]]){
   if(!f)continue;
   const art=stoneIcon(f.stoneKey,64);
   art.title=f.stone||f.name;
   preview.append(art);
  }
  function show(mode){
   if(busy)return;
   const isMega=mode==='mega';screen.classList.toggle('pkmsvv-mega-gacha-mode',isMega);
   panel.hidden=!isMega;regular.classList.toggle('on',!isMega);mega.classList.toggle('on',isMega);
   if(isMega)refresh();
  }
  function refresh(){
   const save=G.DB?.save||{};
   syncLegacyArena(save);
   G.PKMSVVStory?.onMegaUnlocked?.();
   const a=save.arenaGacha||{};
   $('pkmsvv-mega-gacha-heading').textContent=tr('Máy quay Mega Stone','Mega Stone Machine');
   $('pkmsvv-mega-gacha-balance').textContent=tr('✦ Điểm Arena: ','✦ Arena Points: ')+balance(save);
   $('pkmsvv-mega-gacha-pity').textContent=
    tr('Bảo hiểm Mega huyền thoại: ','Legendary Mega pity: ')+(Number(a.pity)||0)+'/'+LEGEND_PITY;
   $('pkmsvv-mega-gacha-odds').textContent=
    tr('Mega thường 98,5% · Mega huyền thoại 1,5% · Bảo hiểm lượt thứ 30.',
       'Normal Mega 98.5% · Legendary Mega 1.5% · Guaranteed by pull 30.');
   const btn=$('pkmsvv-mega-gacha-pull');
   btn.textContent=tr('🎰 Quay Mega · 100 Điểm Arena','🎰 Mega Spin · 100 Arena Points');
   btn.disabled=busy||!canPull(save);
   $('pkmsvv-mega-gacha-note').textContent=!save.pkmsvvChapter7Seen?
    tr('🔒 Đánh bại Champion đầu tiên ở Chương 8 để mở máy quay Mega.',
       '🔒 Defeat your first Champion in Chapter 8 to unlock Mega Gacha.'):
    tr('Thắng Champion lần đầu từng vùng: +100 điểm. Vô địch Arena: +40 lần đầu / +20 lần sau. Mega huyền thoại vẫn cần mở cốt truyện riêng.',
       'First Champion win per region: +100. Arena win: +40 first / +20 repeat. Legendary Mega still needs its own storyline.');
  }
  function revealStone(root,r){
   root.replaceChildren();
   const card=document.createElement('div');
   card.className='pkmsvv-mega-reveal-card'+(r.legendary?' is-legend':'');
   const heading=document.createElement('strong');
   heading.textContent=r.legendary?tr('✦ MEGA HUYỀN THOẠI!','✦ LEGENDARY MEGA!'):
    tr('✦ NHẬN ĐƯỢC MEGA STONE!','✦ MEGA STONE OBTAINED!');
   const art=stoneIcon(r.stoneKey,112);
   art.setAttribute('aria-label',r.stone||r.name);
   const label=document.createElement('h3');label.textContent=r.stone||r.name;
   const detail=document.createElement('p');
   detail.textContent=r.duplicate?
    tr('Đã sở hữu · Hoàn +','Duplicate · Refund +')+r.refund+' '+tr('Điểm Arena','Arena Points'):
    tr('Đã thêm vào bộ sưu tập Mega Stone.','Added to your Mega Stone collection.');
   card.append(heading,art,label,detail);root.append(card);
   G.Audio?.sfx?.(r.legendary?'legend':'reveal',{rarity:r.legendary?5:3});
  }
  // Exactly the original Pokémon Gacha's animated 3-reel slot machine,
  // including lever, staggered stopping, particles and sound. The stone
  // outcome is already saved before animation, so closing cannot reroll it.
  async function showSpin(r){
   const layer=document.createElement('div');layer.id='pkmsvv-mega-spin-fx';
   layer.className='pkmsvv-mega-spin-fx';
   layer.setAttribute('role','dialog');
   layer.setAttribute('aria-modal','true');
   layer.setAttribute('aria-label',tr('Quay Mega Stone','Mega Stone spin'));
   const stage=document.createElement('section');stage.className='pkmsvv-mega-spin-stage';
   const title=document.createElement('h2');title.textContent=tr('🎰 QUAY MEGA STONE','🎰 MEGA STONE SPIN');
   const canvas=document.createElement('canvas');canvas.id='pkmsvv-mega-spin-slot';
   canvas.width=176;canvas.height=170;
   canvas.title=tr('Chạm để tăng tốc','Tap to speed up');
   const hint=document.createElement('p');hint.className='pkmsvv-mega-spin-hint';
   hint.textContent=tr('Chạm vào máy để tăng tốc vòng quay','Tap the machine to speed up the spin');
   const result=document.createElement('div');result.id='pkmsvv-mega-spin-result';result.hidden=true;
   const close=document.createElement('button');close.type='button';close.className='btn gold pkmsvv-mega-spin-close';
   close.textContent=tr('Tiếp tục','Continue');close.hidden=true;
   close.onclick=()=>{
    layer.remove();busy=false;
    const out=$('pkmsvv-mega-gacha-result');
    if(out){
     out.className='pkmsvv-mega-gacha-result'+(r.legendary?' is-legend':'');
     out.textContent=(r.stone||r.name)+(r.duplicate?
      tr(' · Trùng, hoàn +',' · Duplicate, refund +')+r.refund+' Arena':'');
    }
    refresh();
   };
   stage.append(title,canvas,hint,result,close);layer.append(stage);document.body.append(layer);
   try{
    if(!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches&&G.Slots?.play){
     await preloadStoneSheet();
     const keys=[...new Set(formCatalog().filter(f=>f.stoneKey).map(f=>f.stoneKey))];
     await G.Slots.play(canvas,[{rarity:r.legendary?5:3,shiny:false}],{
      mega:{prize:r.stoneKey,keys}
     });
    }
   }catch(err){console.warn('Mega slot visual skipped; award already saved',err);}
   if(!layer.isConnected)return;
   canvas.hidden=true;hint.hidden=true;result.hidden=false;
   stage.classList.toggle('is-legend',!!r.legendary);
   revealStone(result,r);close.hidden=false;close.focus?.();
  }
  $('pkmsvv-mega-gacha-pull').onclick=()=>{
   if(busy)return;
   busy=true;
   const r=pull();
   if(!r){
    busy=false;G.Audio?.sfx?.('error');
    G.UI?.toast?.(tr('Chưa đủ điều kiện hoặc Điểm Arena.','Requirements or Arena Points missing.'));
    refresh();return;
   }
   refresh();
   void showSpin(r).catch(err=>{console.error('Mega Gacha screen failed',err);busy=false;refresh();});
  };
  regular.onclick=()=>show('pokemon');mega.onclick=()=>show('mega');
  const oldOpen=G.GachaUI?.open;
  if(typeof oldOpen==='function')G.GachaUI.open=function(...args){
   const result=oldOpen.apply(this,args);if(!busy)show('pokemon');return result;
  };
  show('pokemon');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',createUI,{once:true});
 else createUI();
 return {COST,LEGEND_RATE,LEGEND_PITY,ledger,balance,pool,canPull,pull,
  grantTournament,grantChampion,syncLegacyArena,preloadStoneSheet,drawStoneSlot,stoneIcon,createUI};
})();
