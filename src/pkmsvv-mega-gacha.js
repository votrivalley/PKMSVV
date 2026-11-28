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
 let transacting=false;
 // Same synchronous persistence contract as the Shop, but keep the Mega
 // module usable in isolated native builds without a Kecleon UI.
 function transact(s,kind,change){
  if(transacting||!s||s!==G.DB?.save||G.DB?.guest||typeof G.DB?.commit!=='function')return null;
  let before,guard,token,ok=false;
  transacting=true;
  try{
   guard=globalThis.window?.PKMSVVSaveGuardian;
   if(guard?.beginTransaction){token=guard.beginTransaction(kind);if(!token)return null;}
   before=JSON.parse(JSON.stringify(s));
   const result=change(s);if(!result)throw Error('No transaction');
   if(G.DB.commit(true)===false)throw Error('Save commit failed');
   ok=true;return result;
  }catch(_){
   if(before){for(const key of Object.keys(s))delete s[key];Object.assign(s,before);}
   return null;
  }finally{
   transacting=false;
   if(token)try{guard.endTransaction(token,ok);}catch(_){}
  }
 }
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
  return !!(save?.pkmsvvChapter7Seen&&!G.DB?.guest&&!transacting&&Number.isSafeInteger(balance(save))&&balance(save)>=COST&&
   (pool(save,false).length||pool(save,true).length));
 }
 // Non-legendary Mega stones are common, legendary stones use separate 1.5%
 // base chance with a more attainable 30-roll pity due to expensive Arena Points.
 function pull(save=G.DB?.save,random=Math.random){
  if(G.PKMSVVSpecialPowerQA?.busy?.()||!canPull(save))return null;
  const ordinary=pool(save,false),rare=pool(save,true);
  const result=transact(save,'mega-spin',draft=>{
   const a=ledger(draft),guaranteed=a.pity>=LEGEND_PITY-1;
   const rand=()=>{const value=Number(random());if(!Number.isFinite(value)||value<0||value>=1)throw Error('Invalid roll');return value;};
   const special=rare.length>0&&(guaranteed||!ordinary.length||rand()<LEGEND_RATE);
   const choice=special?rare:ordinary;
   if(!choice.length||!Number.isSafeInteger(a.pulls+1))return null;
   const picked=choice[Math.floor(rand()*choice.length)];if(!picked)return null;
   const duplicate=stoneOwned(draft,picked.stoneKey),refund=duplicate?(special?200:50):0;
   if(!Number.isSafeInteger(a.points-COST+refund))return null;
   a.points-=COST;a.pulls++;a.pity=special?0:Math.min(LEGEND_PITY-1,a.pity+1);
   if(draft.megaStones!==undefined&&(!draft.megaStones||typeof draft.megaStones!=='object'||Array.isArray(draft.megaStones)))return null;
   draft.megaStones=draft.megaStones||{};
   if(!duplicate)draft.megaStones[picked.stoneKey]=1;
   a.points+=refund;
   return {key:picked.key,stoneKey:picked.stoneKey,name:picked.name,stone:picked.stone,
    legendary:special,duplicate,refund,pity:a.pity,balance:a.points};
  });
  // UI/story notification must never make a successful persisted spin look
  // unsuccessful and tempt the player to spend another 100 points.
  if(result)try{G.PKMSVVStory?.onMegaUnlocked?.();}catch(err){console.warn('[Mega story notification]',err);}
  return result;
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
  const book=save?.arenas?.pkmChampion;
  if(!book||G.DB?.guest||transacting||G.PKMSVVSpecialPowerQA?.busy?.())return 0;
  const cups=Object.entries(book.trophies||{}).filter(([region,won])=>won===true&&!save.arenaGacha?.trophyPaid?.[region]);
  const seals=Object.entries(book.seals||{}).filter(([region,won])=>won===true&&!save.arenaGacha?.championPaid?.[region]);
  if(!cups.length&&!seals.length)return 0;
  return transact(save,'arena-backfill',draft=>{
   const a=ledger(draft),amount=cups.length*40+seals.length*100;
   if(!Number.isSafeInteger(a.points+amount))return null;
   for(const [region] of cups)a.trophyPaid[region]=true;
   for(const [region] of seals)a.championPaid[region]=true;
   a.points+=amount;return amount;
  })||0;
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
  mega.id='pkmsvv-gacha-tab-mega';mega.textContent=tr('✧ Sức mạnh Đặc biệt','✧ Special Powers');
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
  const extra=document.createElement('section');extra.id='pkmsvv-power-gacha-extra';extra.style.cssText='grid-column:1/-1;display:grid;gap:8px;padding:10px;';
  panel.append(extra);
  let powerResult='';
  function refreshExtra(){
   const api=G.PKMSVVSpecialPowerQA;extra.replaceChildren();if(!api){extra.hidden=true;return;}extra.hidden=false;
   const title=document.createElement('h3');title.textContent=tr('Vật phẩm Sức mạnh Đặc biệt','Special Power Items');extra.append(title);
   for(const [id,label,total] of [['dynamax','Dynamax Band',1],['zmove','Z-Crystal',18],['terastal','Tera Crystal',18]]){
    const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
    const desc=document.createElement('span');const remaining=api.pool(G.DB?.save,id).length;
    desc.textContent=label+' · '+(total-remaining)+'/'+total;
    const btn=document.createElement('button');btn.type='button';btn.className='btn small gold';btn.dataset.powerBuy=id;
    btn.textContent=remaining===0?tr('Đã sở hữu đủ','Complete'): (id==='dynamax'?tr('Mua','Buy'):tr('Quay không trùng','Draw new'))+' · '+api.COST+' Arena';
    btn.disabled=busy||!api.canBuy(id);btn.onclick=async()=>{
     if(busy||!api.canBuy(id))return;
     busy=true;refreshExtra();$('pkmsvv-mega-gacha-pull').disabled=true;
     try{const result=await api.buy(id);powerResult=result?label+(result.type?' · '+result.type.toUpperCase():'')+' ✓':tr('Không mua được. Điểm không bị trừ.','Purchase failed. Points not charged.');}
     finally{busy=false;refresh();}
    };
    row.append(desc,btn);extra.append(row);
   }
   const note=document.createElement('p');note.textContent=tr('Mỗi lượt Z/Tera nhận một hệ chưa sở hữu. Vật phẩm dùng chung, không tiêu hao.','Each Z/Tera draw grants an unowned type. Items are shared and reusable.');extra.append(note);
   const result=document.createElement('p');result.setAttribute('role','status');result.textContent=powerResult;extra.append(result);
  }
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
   if(isMega){
    refresh();
    // On choosing the Mega Stone machine, teach the cost/odds BEFORE a pull.
    G.PKMSVVPippiGuide?.openFeature?.('mega_spin');
   }
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
   btn.disabled=busy||!canPull(save)||!!G.PKMSVVSpecialPowerQA?.busy?.();
   refreshExtra();
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
   // Safety net if this screen was opened programmatically without its tab.
   // Never charge Arena Points on the first tutorial click.
   if(G.PKMSVVPippiGuide?.openFeature?.('mega_spin'))return;
   busy=true;
   const r=pull();
   if(!r){
    busy=false;G.Audio?.sfx?.('error');
    G.UI?.toast?.(tr('Không quay được. Điểm Arena không bị trừ.','Spin failed. Arena Points were not charged.'));
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
