/* Pokémon Chuyển Sinh — persistent Berry inventory, pre-battle item choice, effects and Rescue Berry mini-game.
 * All inventory/quest progress lives inside G.DB.save; no server, no localStorage sidecar.
 */
G.PKMSVVBerry=(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const vi=()=>G.I18n?.lang!=='en',tr=(a,b)=>vi()?a:b;
 const TYPES=Object.freeze([
  {id:'oran',name:'Oran',tier:1,price:100,desc:['HP <30%: hồi 20%','HP <30%: heal 20%']},
  {id:'sitrus',name:'Sitrus',tier:1,price:240,desc:['HP <25%: hồi 40%','HP <25%: heal 40%']},
  {id:'liechi',name:'Liechi',tier:1,price:290,desc:['+30% sát thương đầu trận, giảm trong 90s','+30% damage decays over 90s']},
  {id:'salac',name:'Salac',tier:1,price:290,desc:['+30% tốc chạy, giảm trong 90s','+30% move speed decays over 90s']},
  {id:'ganlon',name:'Ganlon',tier:1,price:290,desc:['Giảm 30% sát thương, giảm trong 90s','30% damage resist decays over 90s']},
  {id:'leppa',name:'Leppa',tier:1,price:340,desc:['-20% hồi chiêu trong 45s','20% cooldown reduction for 45s']},
  {id:'lum',name:'Lum',tier:2,price:760,desc:['Xóa hiệu ứng xấu, miễn nhiễm 3s','Cleanse first debuff; immunity 3s']},
  {id:'petaya',name:'Petaya',tier:2,price:780,desc:['HP <30%: +50% kỹ năng trong 10s','HP <30%: +50% skill power for 10s']},
  {id:'starf',name:'Starf',tier:3,price:0,desc:['Ngẫu nhiên buff 25% trong 60s','Random 25% buff for 60s']},
  {id:'enigma',name:'Enigma',tier:3,price:0,desc:['8% thoát chết ở 1 HP; bất tử 7s PvE / 3s PvP','8% cheat death; 7s PvE / 3s PvP']}
 ]);
 const byId=Object.fromEntries(TYPES.map(x=>[x.id,x]));
 // Descriptions only: gameplay probabilities, durations and reward tables stay unchanged.
 const DETAILS=Object.freeze({
  oran:{trigger:['HP dưới 30%','Below 30% HP'],duration:['Hồi ngay 20% HP','Instant +20% HP'],limit:['1 lần/trận','Once per run']},
  sitrus:{trigger:['HP dưới 25%','Below 25% HP'],duration:['Hồi ngay 40% HP','Instant +40% HP'],limit:['1 lần/trận','Once per run']},
  liechi:{trigger:['Đầu trận','At start'],duration:['90 giây · giảm dần +30% sát thương','90s · +30% damage fades'],limit:['Tự động','Automatic']},
  salac:{trigger:['Đầu trận','At start'],duration:['90 giây · giảm dần +30% tốc chạy','90s · +30% speed fades'],limit:['Tự động','Automatic']},
  ganlon:{trigger:['Khi chịu sát thương','On damage'],duration:['90 giây · giảm dần 30% giảm sát thương','90s · 30% resistance fades'],limit:['Tự động','Automatic']},
  leppa:{trigger:['Đầu trận','At start'],duration:['45 giây · giảm 20% hồi chiêu','45s · 20% cooldown reduction'],limit:['Tự động','Automatic']},
  lum:{trigger:['Dính hiệu ứng xấu đầu tiên','First negative status'],duration:['Thanh tẩy + miễn nhiễm 3 giây','Cleanse + 3s immunity'],limit:['1 lần/trận','Once per run']},
  petaya:{trigger:['HP dưới 30%','Below 30% HP'],duration:['+50% sức mạnh kỹ năng trong 10 giây','+50% skill power for 10s'],limit:['1 lần/trận','Once per run']},
  starf:{trigger:['Ngẫu nhiên khi vào trận','Random at start'],duration:['1 buff ngẫu nhiên +25% trong 60 giây','Random +25% boost for 60s'],limit:['1 lần/trận','Once per run']},
  enigma:{trigger:['Khi tử vong','On fatal damage'],duration:['Bất tử 7s PvE / 3s PvP nếu thành công','Invulnerable 7s PvE / 3s PvP on success'],limit:['8% cơ hội · 1 lần/trận','8% chance · Once per run']}
 });
 function berryDetails(id){const d=DETAILS[id];if(!d)return null;const i=vi()?0:1;
 const rarity=byId[id]?.tier===3?tr('Cực hiếm','Ultra-rare'):
  byId[id]?.tier===2?tr('Hiếm','Rare'):tr('Thường','Common');
 return {
  trigger:d.trigger[i],duration:d.duration[i],limit:d.limit[i],rarity,
  text:[rarity,d.trigger[i],d.duration[i],d.limit[i]].join(' · ')
 };}
 function detailsHtml(id){const d=berryDetails(id);return d?
  '<span class="pkmsvv-berry-details"><b>'+esc(d.rarity)+'</b> · '+esc(d.trigger)+'<span> · '+esc(d.duration)+'</span><span> · '+esc(d.limit)+'</span></span>':'';}
 const cap=n=>Math.max(0,Math.min(999,Math.floor(Number(n)||0)));
 let choiceOpen=false,turn=0,current=null,chooseTimer=null,menuAdded=false,modals=[];
 let hudEl=null,hudStamp='',hudClock=0;
 function hideHud(){
  if(hudEl)hudEl.hidden=true;
  hudStamp='';hudClock=0;
 }
 function cancelOffer(){
  if(!choiceOpen)return false;
  choiceOpen=false;turn++;
  if(chooseTimer!==null){clearInterval(chooseTimer);chooseTimer=null;}
  clearModal();return true;
 }
 function data(){
  const save=G.DB?.save;if(!save)return null;
  if(!save.pkmsvvBerry||typeof save.pkmsvvBerry!=='object')save.pkmsvvBerry={bag:{},used:{},last:[],rescueWins:0};
  const b=save.pkmsvvBerry;b.bag=b.bag&&typeof b.bag==='object'?b.bag:{};
  b.used=b.used&&typeof b.used==='object'?b.used:{};b.last=Array.isArray(b.last)?b.last:[];
  for(const id in b.bag)if(!byId[id])delete b.bag[id];else b.bag[id]=cap(b.bag[id]);
  return b;
 }
 function save(){G.DB?.commit?.(true);}
 function count(id){return cap(data()?.bag?.[id]);}
 function grant(id,n=1){
  const d=data();if(!d||!byId[id])return false;
  d.bag[id]=cap((Number(d.bag[id])||0)+n);save();return true;
 }
 function chapterProgress(){return TYPES.filter(t=>data()?.used[t.id]).length;}
 function markUsed(ids){
  const d=data();if(!d)return;
  for(const id of ids)if(byId[id])d.used[id]=true;
  if(chapterProgress()>=5&&!G.DB.save.pkmsvvBerryChapterDone){
   G.DB.save.pkmsvvBerryChapterDone=true;
   G.PKMSVVStory?.syncChapterPurpleRewards?.();
   G.UI?.toast?.(tr('🍓 Đã dùng 5 loại Berry! Hoàn thành Chương 6.','🍓 Five different Berries! Chapter 6 complete.'),4500);
  }
  save();
 }
 function buy(id){
  const t=byId[id],d=data(),s=G.DB?.save;
  if(!t||!d||!s||!t.price)return false;
  if((Number(s.coins)||0)<t.price){G.UI?.toast?.(tr('Thiếu xu!','Not enough coins!'),1600);return false;}
  s.coins-=t.price;d.bag[id]=cap((Number(d.bag[id])||0)+1);save();G.UI?.refreshCoins?.();
  G.UI?.toast?.('🍓 '+t.name+' Berry +1',1300);renderBag();return true;
 }
 function clearModal(){for(const el of modals){el.remove?.();}modals=[];}
 function shell(title,sub){
  const shade=document.createElement('div');shade.className='pkmsvv-berry-overlay';shade.setAttribute('role','dialog');
  shade.setAttribute('aria-label',title);
  const panel=document.createElement('div');panel.className='pkmsvv-berry-panel';
  const h=document.createElement('h2');h.textContent=title;panel.append(h);
  const hint=document.createElement('p');hint.textContent=sub;panel.append(hint);
  shade.append(panel);document.body.append(shade);modals.push(shade);
  return panel;
 }
 function button(label,cb,cls=''){
  const b=document.createElement('button');b.type='button';b.className='pkmsvv-berry-btn '+cls;b.textContent=label;
  b.onclick=cb;return b;
 }
 function renderBag(){
  const root=$('pkmsvv-berry-bag');if(!root)return;
  root.replaceChildren();
  const s=G.DB?.save||{},d=data(),top=document.createElement('div');top.className='pkmsvv-berry-top';
  top.textContent=tr('🍓 Túi Berry · ','🍓 Berry Bag · ')+(s.coins||0)+' '+tr('xu','coins');
  root.append(top);
  const prog=document.createElement('p');
  prog.textContent=tr('Chương 6 · Đã dùng ','Chapter 6 · Used ')+chapterProgress()+'/5 '+tr('loại Berry','Berry types')+(s.pkmsvvBerryChapterDone?' ✅':'');
  root.append(prog);
  const grid=document.createElement('div');grid.className='pkmsvv-berry-grid';
  for(const t of TYPES.filter(t=>t.price>0)){
   const tile=document.createElement('div');tile.className='pkmsvv-berry-tile';
   const name=document.createElement('strong');name.textContent=t.name+' ×'+count(t.id);tile.append(image(t.id,42));
   const desc=document.createElement('small');desc.textContent=berryDetails(t.id)?.text||t.desc[vi()?0:1];
   tile.append(name,desc);
   if(t.price)tile.append(button(tr('Mua ','Buy ')+t.price+' 🪙',()=>buy(t.id)));
   else {const rare=document.createElement('small');rare.textContent=tr('Chỉ nhận qua Giải Cứu Berry','Rescue Berry reward only');tile.append(rare);}
   grid.append(tile);
  }
  root.append(grid);
  root.append(button(tr('🌿 Giải Cứu Berry','🌿 Rescue Berry'),rescue,'rescue'));
  root.append(button(tr('Đóng','Close'),()=>{clearModal();},'ghost'));
 }
 function openBag(){
  if(choiceOpen||G.Game?.state==='playing')return false;
  clearModal();const p=shell(tr('TÚI BERRY / CỬA HÀNG','BERRY BAG / SHOP'),tr('Mỗi trận chọn tối đa 2 Berry; sử dụng là tiêu hao.','Equip up to 2 consumable Berries before a match.'));
  const box=document.createElement('div');box.id='pkmsvv-berry-bag';p.append(box);renderBag();return true;
 }
 function rescue(){
  // Rescue is a full 4-trainer PvE battle mode, not the old click-to-win tiles.
  if(G.Game?.state==='playing'||choiceOpen)return false;
  clearModal();
  const ui=typeof window==='object'?window.PKMSVVCoop:null;
  if(ui?.open){ui.open('berry');return true;}
  G.MultiplayerUI?.open?.();
  G.UI?.toast?.(tr('Chọn Giải Cứu Berry trong Co-op.','Choose Rescue Berry in Co-op.'),2000);
  return true;
 }
 function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function spriteUrl(id){return 'assets/berry/'+encodeURIComponent(id)+'.png';}
 function image(id,size=40){
  const img=document.createElement('img');img.className='pkmsvv-berry-sprite';
  img.src=spriteUrl(id);img.alt=(byId[id]?.name||id)+' Berry';
  img.width=img.height=size;img.loading='lazy';return img;
 }
 function imageHtml(id){return '<img class="pkmsvv-berry-sprite" src="'+spriteUrl(id)+'" width="42" height="42" loading="lazy" alt="'+esc(byId[id]?.name||id)+' Berry">';}
 function kecleonHtml(){
  const d=data();if(!d)return '';
  const header='<p class="pkmk-lead">'+tr('Berry là vật phẩm dùng một lần. Trang bị tối đa 2 quả trước trận; các quả hiếm nhận từ Giải Cứu Berry.','Berries are consumable. Equip up to two before battle; rare Berries drop in Rescue Berry.')+'</p>';
  let out=header+'<h3 class="pkmk-group-title">'+tr('Berry của bạn · ','Your Berries · ')+chapterProgress()+'/5 '+tr('loại đã dùng','types used')+'</h3><div class="pkmk-cards">';
  for(const t of TYPES.filter(t=>t.price>0)){
   const stock=count(t.id),canBuy=t.price>0&&(G.DB.save.coins||0)>=t.price;
   const buy=t.price?'<button class="btn small gold" data-berry-buy="'+t.id+'" '+(!canBuy?'disabled':'')+'>🪙 '+t.price+'</button>':
    '<small>'+tr('Giải Cứu Berry','Rescue Berry')+'</small>';
   out+='<div class="pkmk-card pkmsvv-berry-store-card"><div class="pkmk-product-art">'+imageHtml(t.id)+'</div><div class="pkmk-product-copy"><b>'+t.name+' Berry</b><small>'+esc(t.desc[vi()?0:1])+'</small>'+detailsHtml(t.id)+'</div><div class="pkmk-product-tail">'+buy+'<span class="pkmk-stock">×'+stock+'</span></div></div>';
  }
  return out+'</div><button class="btn gold" data-berry-rescue="1">🌿 '+tr('Chơi Giải Cứu Berry · Co-op 4 người · 8 phút','Rescue Berry · 4-player Co-op · 8 min')+'</button>';
 }
 function legacyRescueTiles(){
  if(G.Game?.state==='playing'||choiceOpen)return false;
  clearModal();
  const p=shell(tr('GIẢI CỨU BERRY','RESCUE BERRY'),
   tr('Cứu đủ 5 Berry trong 20 giây; tránh quả bị bóng tối chiếm lấy. Sai 3 lần sẽ thua.',
      'Rescue 5 Berries in 20 seconds. Avoid shadow-infected fruit; three mistakes end the run.'));
  p.classList.add('pkmsvv-berry-rescue');
  const hud=document.createElement('div');hud.className='pkmsvv-berry-rescue-hud';p.append(hud);
  const board=document.createElement('div');board.className='pkmsvv-berry-rescue-board';p.append(board);
  const status=document.createElement('p');status.className='pkmsvv-berry-result';p.append(status);
  let saved=0,mistakes=0,remaining=20,finished=false,interval=null;
  const stamp=()=>{hud.textContent=tr('🍓 Đã cứu: ','🍓 Rescued: ')+saved+'/5  ·  '+
    tr('Sai: ','Misses: ')+mistakes+'/3  ·  ⏱ '+remaining+'s';};
  function clearClock(){if(interval!==null){clearInterval(interval);interval=null;}}
  function finish(won){
   if(finished)return;finished=true;clearClock();board.replaceChildren();
   if(won){
    const r=Math.random();
    const id=r<.015?'enigma':r<.045?'starf':r<.12?'petaya':r<.20?'lum':
      TYPES[Math.floor(Math.random()*6)].id;
    grant(id,1);const d=data();d.rescueWins=(d.rescueWins||0)+1;save();
    status.textContent=tr('✨ Giải cứu thành công! Nhận ','✨ Rescue complete! Reward: ')+byId[id].name+' Berry ×1';
   }else{
    status.textContent=tr('Bóng tối đã lấy mất Berry! Thử lại nhé.','The shadows won this round. Try again!');
   }
   p.append(button(tr('Chơi lại','Play again'),rescue,'primary'));
   p.append(button(tr('Về túi Berry','Back to Berry Bag'),openBag,'ghost'));
  }
  function wave(){
   if(finished)return;stamp();board.replaceChildren();
   const target=Math.floor(Math.random()*6);
   const kind=TYPES[Math.floor(Math.random()*6)].id;
   for(let i=0;i<6;i++){
    const safe=i===target;
    const cell=button(safe?'🍓':'🌑',()=>{
     if(finished)return;
     if(safe){saved++;status.textContent=tr('Đã cứu thêm một Berry!','A Berry was rescued!');
      if(saved>=5){finish(true);return;}}
     else{mistakes++;status.textContent=tr('Một quả bị bóng tối chiếm lấy!','A shadow-infected fruit!');
      if(mistakes>=3){finish(false);return;}}
     wave();
    },safe?'pkmsvv-berry-target':'pkmsvv-berry-shadow');
    cell.setAttribute('aria-label',safe?tr('Cứu Berry '+byId[kind].name,'Rescue '+byId[kind].name):
      tr('Berry nhiễm bóng tối','Shadow berry'));
    board.append(cell);
   }
  }
  wave();
  interval=setInterval(()=>{if(finished)return;remaining--;stamp();if(remaining<=0)finish(false);},1000);
  p.append(button(tr('Thoát','Exit'),()=>{finished=true;clearClock();openBag();},'ghost'));
  return true;
 }
 function effectState(pl,id){
  const b=pl?._pkmsvvBerry;
  if(!b||!b.ids?.includes(id))return null;
  const t=b.elapsed||0,once=b.once||{},countdown=n=>Math.max(0,Math.ceil(n-t));
  let remain=0,state='waiting';
  if(['liechi','salac','ganlon'].includes(id)){remain=countdown(90);state=remain?'active':'spent';}
  else if(id==='leppa'){remain=countdown(45);state=remain?'active':'spent';}
  else if(id==='starf'){remain=countdown(60);state=remain?'active':'spent';}
  else if(id==='petaya'){remain=countdown(b.powerUntil||0);state=remain?'active':once.petaya?'spent':'waiting';}
  else if(id==='lum'){remain=countdown(b.lumUntil||0);state=remain?'active':once.lum?'spent':'waiting';}
  else if(id==='enigma'){remain=countdown(b.enigmaUntil||0);state=remain?'active':once.enigma?'spent':'waiting';}
  else state=once[id]?'spent':'waiting';
  return {state,remaining:remain,label:state==='active'?tr('Đang tác dụng','Active'):
   state==='spent'?tr('Đã sử dụng','Consumed'):tr('Chờ kích hoạt','Waiting')};
 }
 function renderHud(pl,force=false){
  const b=pl?._pkmsvvBerry;
  if(!b||!b.ids?.length||G.Game?.state==='over'||G.Game?.state==='ui'){hideHud();return;}
  hudClock+=force?0:.05;
  if(!force&&hudClock<.25)return;
  hudClock=0;
  const rows=b.ids.slice(0,2).map(id=>({id,details:berryDetails(id),state:effectState(pl,id)}));
  const stamp=rows.map(row=>[row.id,row.state?.state,row.state?.remaining].join(':')).join('|')+String(vi());
  if(hudEl&&hudStamp===stamp&&!hudEl.hidden)return;
  hudStamp=stamp;
  if(!hudEl){
   hudEl=document.createElement('aside');hudEl.id='pkmsvv-berry-active-hud';
   hudEl.className='pkmsvv-berry-active-hud';hudEl.setAttribute('aria-label',tr('Hiệu ứng Berry','Berry effects'));
   document.body.append(hudEl);
  }
  hudEl.hidden=false;hudEl.replaceChildren();
  const title=document.createElement('strong');title.className='pkmsvv-berry-hud-title';
  title.textContent=tr('🍓 BERRY','🍓 BERRIES');hudEl.append(title);
  for(const row of rows){
   if(!row.state)continue;
   const tile=document.createElement('div');tile.className='pkmsvv-berry-hud-item is-'+row.state.state;
   tile.title=(byId[row.id]?.name||row.id)+' · '+(row.details?.text||'');
   tile.append(image(row.id,24));
   const info=document.createElement('span');info.textContent=(byId[row.id]?.name||row.id)+' · '+row.state.label;
   const seconds=document.createElement('b');seconds.textContent=row.state.remaining?row.state.remaining+'s':'';
   tile.append(info,seconds);hudEl.append(tile);
  }
 }
 function apply(pl,ids,mode){
  // Reset old Berry multipliers on rematch, preventing permanent buffs/stacking.
  if(!pl)return;
  const old=pl._pkmsvvBerry;
  if(old){
   pl.atkMul=(pl.atkMul||1)/(old.atkK||1);
   pl.spdMul=(pl.spdMul||1)/(old.spdK||1);
   pl.cdMul=(pl.cdMul||1)/(old.cdK||1);
  }
  pl._pkmsvvBerry={ids,mode,elapsed:0,once:{},atkK:1,spdK:1,cdK:1,powerUntil:0,lumUntil:0,enigmaUntil:0};
  renderHud(pl,true);
  if(ids.includes('starf'))pl._pkmsvvBerry.starf=['liechi','salac','ganlon','leppa'][Math.floor(Math.random()*4)];
  G.UI?.toast?.(tr('🍓 Berry kích hoạt: ','🍓 Active Berries: ')+ids.map(id=>byId[id]?.name).join(' + '),2200);
 }
 function finishChoice(ids,cb,mode,preRun=false){
  // Pre-run choice is a preview, not a purchase: commit inventory ONLY after
  // the engine successfully creates the player and enters gameplay.
  if(preRun){cb?.(ids.slice(0,2));return;}
  const d=data(),picked=[];
  if(d)for(const id of ids.slice(0,2))if(byId[id]&&count(id)>0&&!picked.includes(id)){
   d.bag[id]--;picked.push(id);
  }
  if(d){d.last=picked;markUsed(picked);}
  const pl=G.Game?.player;
  if(pl&&!preRun){apply(pl,picked,mode);pl.invuln=Math.max(pl.invuln||0,1.5);}
  cb?.(picked);
 }
 function offer({onDone,mode,preRun=false}={}){
  if(choiceOpen){onDone?.([]);return false;}
  const d=data();
  if(!d){onDone?.([]);return false;}
  choiceOpen=true;const token=++turn;let seconds=4;
  const picked=[];let locked=false;
  const panel=shell(tr('CHỌN BERRY TRƯỚC TRẬN','CHOOSE PRE-BATTLE BERRIES'),
    tr('Còn 4 giây · Chọn tối đa 2 Berry · Có thể bỏ qua','4 seconds · Max 2 Berries · You may skip'));
  const clock=document.createElement('strong');clock.className='pkmsvv-berry-clock';clock.textContent='04s';panel.append(clock);
  const grid=document.createElement('div');grid.className='pkmsvv-berry-grid';panel.append(grid);
  const done=()=>{
   if(token!==turn||!choiceOpen)return;choiceOpen=false;clearInterval(chooseTimer);chooseTimer=null;
   clearModal();finishChoice(picked,onDone,mode||'pve',preRun);
  };
  for(const type of TYPES.filter(t=>count(t.id)>0)){
   const b=button(type.name+' ×'+count(type.id)+' · '+type.desc[vi()?0:1],()=>{
    if(locked)return;
    if(picked.includes(type.id)){picked.splice(picked.indexOf(type.id),1);b.classList.remove('picked');}
    else if(picked.length<2){picked.push(type.id);b.classList.add('picked');}
   });
   b.title=berryDetails(type.id)?.text||'';b.setAttribute('aria-label',b.textContent+' · '+b.title);
   const meta=document.createElement('small');meta.className='pkmsvv-berry-option-detail';
   meta.textContent=berryDetails(type.id)?.text||'';b.append(meta);
   b.append(image(type.id,36));grid.append(b);
  }
  if(!grid.children.length){const empty=document.createElement('p');empty.className='pkmsvv-berry-empty';empty.textContent=tr('Túi đang trống. Trận sẽ bắt đầu sau 4 giây.','No Berries yet. Match begins in 4 seconds.');grid.append(empty);}
  panel.append(button(tr('Xác nhận','Confirm'),()=>{locked=true;clock.textContent='✓ '+seconds+'s';},'primary'));
  panel.append(button(tr('Không dùng Berry','No Berry'),()=>{picked.length=0;locked=true;clock.textContent='✓ '+seconds+'s';},'ghost'));
  chooseTimer=setInterval(()=>{if(token!==turn)return;seconds--;clock.textContent='0'+seconds+'s';if(seconds<=0)done();},1000);
  // During the four-second selection, prevent unavoidable early deaths.
  const pl=!preRun&&G.Game?.player;if(pl)pl.invuln=Math.max(pl.invuln||0,5);
  return true;
 }
 function ratio(pl,key,val){
  const b=pl._pkmsvvBerry;if(!b)return;
  const prev=b[key]||1;
  if(key==='atkK')pl.atkMul=(pl.atkMul||1)/prev*val;
  if(key==='spdK')pl.spdMul=(pl.spdMul||1)/prev*val;
  if(key==='cdK')pl.cdMul=(pl.cdMul||1)/prev*val;
  b[key]=val;
 }
 function tick(pl,dt){
  const b=pl._pkmsvvBerry;if(!b||pl.dead)return;
  b.elapsed+=Math.max(0,dt);
  if(G.Coop?.active&&(G.Royale?.active||G.EggRush?.active)||G.PKMSVVChampionArena?.stage==='fight')
   b.mode='pvp';
  const run=t=>b.ids.includes(t)||b.starf===t;
  const pct=Math.max(0,1-b.elapsed/90);
  ratio(pl,'atkK',1+(run('liechi')? (b.ids.includes('liechi')?.30*pct:.25*(b.elapsed<60)):0)+(b.powerUntil>b.elapsed?.5:0));
  ratio(pl,'spdK',1+(run('salac')?(b.ids.includes('salac')?.30*pct:.25*(b.elapsed<60)):0));
  ratio(pl,'cdK',1-(run('leppa')&&b.elapsed<(b.ids.includes('leppa')?45:60)?(b.ids.includes('leppa')?.20:.25):0));
  const status=['slowT','poisonT','burnT','freezeT','paralyzeT'];
  if(b.ids.includes('lum')&&!b.once.lum&&status.some(k=>(pl[k]||0)>0)){
   b.once.lum=1;b.lumUntil=b.elapsed+3;
   G.UI?.toast?.(tr('✨ Lum Berry đã thanh tẩy!','✨ Lum Berry cleansed your Pokémon!'),1200);
  }
  if(b.lumUntil>b.elapsed){
   for(const k of status)if(pl[k]>0)pl[k]=0;
  }
  renderHud(pl);
 }
 function hurt(pl,original,args){
  const b=pl._pkmsvvBerry;
  if(!b||pl.remote||pl.dead)return original.apply(pl,args);
  const amount=args[0];
  const armor=b.ids.includes('ganlon')?.30*Math.max(0,1-b.elapsed/90):b.starf==='ganlon'&&b.elapsed<60?.25:0;
  if(armor>0&&Number.isFinite(amount))args[0]=amount*(1-armor);
  const was=pl.hp;original.apply(pl,args);
  if(!b.once.oran&&b.ids.includes('oran')&&pl.hp>0&&pl.hp/pl.maxHp<.30){b.once.oran=1;pl.heal(pl.maxHp*.20);}
  if(!b.once.sitrus&&b.ids.includes('sitrus')&&pl.hp>0&&pl.hp/pl.maxHp<.25){b.once.sitrus=1;pl.heal(pl.maxHp*.40);}
  if(!b.once.petaya&&b.ids.includes('petaya')&&pl.hp>0&&pl.hp/pl.maxHp<.30){b.once.petaya=1;b.powerUntil=b.elapsed+10;}
  if(!b.once.lum&&b.ids.includes('lum')&&(pl.slowT>0||pl.poisonT>0||pl.burnT>0||pl.freezeT>0)){
   b.once.lum=1;b.lumUntil=b.elapsed+3;
   for(const k of ['slowT','poisonT','burnT','freezeT','paralyzeT'])if(pl[k]>0)pl[k]=0;
  }
  if(pl.dead&&!b.once.enigma&&b.ids.includes('enigma')){
   b.once.enigma=1;
   if(Math.random()<.08){
    pl.dead=false;pl.hp=1;pl.invuln=b.mode==='pve'?7:3;
    b.enigmaUntil=b.elapsed+pl.invuln;
    pl.anim?.play?.('Idle');
    G.FX?.ring?.(pl.x,pl.y,16,120,'#ffe47a',.95,6);
    G.UI?.toast?.(tr('✨ ENIGMA! Bộc phát thoát chết!','✨ ENIGMA! Cheat death!'),2600);
   }
  }
  renderHud(pl,true);
  return was;
 }
 function install(){
  if(G.Player?.prototype&&!G.Player.prototype._pkmsvvBerryPatched){
   const p=G.Player.prototype,oldUpdate=p.update,oldHurt=p.hurt;
   p._pkmsvvBerryPatched=true;
   p.update=function(dt){const ret=oldUpdate.call(this,dt);if(this===G.Game?.player)tick(this,dt);return ret;};
   p.hurt=function(...args){return hurt(this,oldHurt,args);};
  }
  if(G.Game?.startRun&&!G.Game._pkmsvvBerryStartWrapped){
   const start=G.Game.startRun;G.Game._pkmsvvBerryStartWrapped=true;
   G.Game.startRun=function(...args){
    const ctx=this;
    hideHud();
    // Solo starts AFTER the 4-second pre-match choice, before monsters spawn.
    // Champion's launch must initialize its farm arena synchronously; the
    // tournament separately prompts again before each actual duel.
    const champion=!!G.PKMSVVChampionArena?.active;
    const online=!!args[0]||!!G.Coop?.active;
    if(!champion&&!online){
     offer({preRun:true,mode:'pve',onDone:ids=>{
      start.apply(ctx,args);
      if(G.Game?.state==='playing'&&G.Game?.player)
       finishChoice(ids,null,'pve',false);
     }});
     return;
    }
    const result=start.apply(ctx,args);
    // Survival/Berry Co-op is PvE; Royale/Egg Rush/Arena duels use PvP timing.
    const competitive=!!(G.Royale?.active||G.EggRush?.active||
     G.PKMSVVArenaSolo?.active||G.PKMSVVChampionArena?.stage==='fight');
    offer({mode:competitive?'pvp':'pve'});
    return result;
   };
  }
  if(G.MenuUI?.open&&!G.MenuUI._pkmsvvBerryMenuWrapped){
   const old=G.MenuUI.open;G.MenuUI._pkmsvvBerryMenuWrapped=true;
   G.MenuUI.open=function(...args){cancelOffer();hideHud();const ret=old.apply(this,args);mountMenu();return ret;};
  }
  mountMenu();
 }
 function mountMenu(){
  const menu=$('scr-menu');if(!menu||$('pkmsvv-berry-open'))return;
  // Berry inventory and purchases now live in Kecleon Shop's third tab.
  // Do not reintroduce a floating button that overlays the main menu.
 }
 // Stable public QA interface.
 return {TYPES,byId,berryDetails,effectState,renderHud,hideHud,cancelOffer,data,count,grant,buy,chapterProgress,markUsed,offer,openBag,rescue,kecleonHtml,spriteUrl,image,install,tick,apply,hurt,get choosing(){return choiceOpen;}};
})();
// This deferred file executes before js/game.js. Bind startRun again after
// all deferred scripts finish, otherwise no four-second pre-match picker.
G.PKMSVVBerry.install();
if(document.readyState!=='complete'&&typeof document.addEventListener==='function')
 document.addEventListener('DOMContentLoaded',()=>G.PKMSVVBerry.install(),{once:true});
