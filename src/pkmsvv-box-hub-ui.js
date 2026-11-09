/* PokéBox Hub — one screen for owned individual Pokémon, items/TM, Rank and Team 6.
 * Read-only Pokédex is separate and shows species/evolution routes only.
 * Injected ONLY into isolated Web/PC/Android QA; no production menu edits.
 */
(function(){
 'use strict';
 if(typeof window==='undefined'||!window.G?.PKMSVVBox||!G.PKMSVVBoxHub)return;
 const Hub=G.PKMSVVBoxHub,Box=G.PKMSVVBox,Rank=()=>G.PKMSVVRankUI;
 const doc=document,$=id=>doc.getElementById(id);
 const L=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const clean=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const natVi={hardy:'Chăm chỉ',bold:'Táo bạo',modest:'Khiêm tốn',calm:'Điềm tĩnh',
  timid:'Nhút nhát',lonely:'Cô độc',docile:'Ngoan ngoãn',mild:'Dịu dàng',
  gentle:'Hiền hòa',hasty:'Vội vàng',adamant:'Kiên định',impish:'Tinh nghịch',
  bashful:'Rụt rè',careful:'Thận trọng',rash:'Liều lĩnh',jolly:'Vui vẻ',
  naughty:'Nghịch ngợm',lax:'Thoải mái',quirky:'Kỳ quặc',naive:'Ngây thơ',
  brave:'Dũng cảm',relaxed:'Thư thái',quiet:'Trầm lặng',sassy:'Bướng bỉnh',serious:'Nghiêm túc'};
 const typeVi={fire:'Lửa',water:'Nước',grass:'Cỏ',electric:'Điện',flying:'Bay',
  bug:'Bọ',steel:'Thép',poison:'Độc',psychic:'Siêu linh',fighting:'Giác đấu',
  dark:'Bóng tối',ghost:'Ma',rock:'Đá',ground:'Đất',dragon:'Rồng',ice:'Băng',
  fairy:'Tiên',normal:'Thường'};
 const monName=dex=>G.DEX_BY?.[dex]?.name||('#'+dex);
 const typeName=t=>G.I18n?.lang==='en'?String(t):typeVi[t]||String(t);
 const natureName=id=>G.I18n?.lang==='en'?String(id):natVi[id]||String(id);
 const abilityName=id=>G.Mons?.abilityName?.(id)||G.ABIL?.[id]?.[1]||L('Không có','None');
 // Existing in-game AbilityText has localized descriptions of the ACTUAL
 // PokéSurvivor mechanics (Blaze low HP, Compound Eyes critical +6%, etc).
 // G.ABIL arrays contain language NAMES [es,en,fr,...], NOT descriptions.
 function abilityBenefit(id,dex){
  const mon=G.DEX_BY?.[Number(dex)]||{types:['normal']};
  const english=G.I18n?.lang==='en';
  try{
   const fx=G.AbilityFX?.of?.(id,mon);
   const text=G.PKMSVVAbilityText?.summary?.(id,mon,fx,english);
   if(typeof text==='string'&&text.trim())return text;
  }catch(_){/* missing optional AbilityFX must not crash the Box */ }
  const by=G.PKMSVVAbilityText?.BY?.[id];
  if(Array.isArray(by)&&by[english?1:0])return String(by[english?1:0]);
  return L('Chưa có mô tả hiệu ứng chính xác trong phiên bản này.',
   'No verified effect description in this version.');
 }
 const currentSave=()=>G.DB?.save;
 let rankBusy=false;
 let boxPane=null,dexPane=null,upgradePane=null,focused=null,infoDex=1,dexShinyView=false,query='',onlyFavorites=false,onlyShiny=false,
  onlyRankReady=false,boxSort='dex',view='info',page=0,dexQuery='',dexPage=0,
  dexGen=0,dexRarity=0,dexStatus='all',dexType='',dexSort='num',dexFavorites=false;
 const PAGE=30,DEX_PAGE=35;
 // Cache read-only preview until the next full Box render/save action.
 let boxItemsCache=null;
 const TYPE_FRAME_COLORS={normal:'#a7a9af',fire:'#ff7c48',water:'#4aabff',
  electric:'#ffd447',grass:'#64d884',ice:'#7fe5ea',fighting:'#ec876a',
  poison:'#bf80e8',ground:'#d6af67',flying:'#a6bffb',psychic:'#f982b4',
  bug:'#aad36d',rock:'#c5ac83',ghost:'#aa90e7',dragon:'#9681ff',
  dark:'#9e8a9c',steel:'#b0d1da',fairy:'#ffabd7'};
 const getStored=()=>Hub.valid(currentSave());
 function listPreview(){
  const s=currentSave();
  if(!s)return [];
  if(Hub.valid(s))return s.pkmsvvBox;
  try{
   return Box.listLegacy(s,{natureOf:d=>G.Mons?.natureOf?.(d),
    abilityOf:d=>G.Mons?.abilityOf?.(d)});
  }catch(_){return [];}
 }
 function focusedItem(){
  const s=currentSave();
  if(Hub.valid(s))return Hub.item(s,focused)||Hub.active(s)||s.pkmsvvBox[0]||null;
  const prev=boxItemsCache||listPreview();
  return prev.find(x=>x.id===focused)||prev.find(x=>x.dex===Number(s?.partner))||prev[0]||null;
 }
 // Legacy preview is still playable. Keep selection and favorites on the old
 // schema without automatically migrating or touching Rank/items/save history.
 function legacyCommit(mutator){
  const s=currentSave();
  if(!s||G.DB?.guest)throw Error(L('Hồ sơ này không thể lưu.','This profile cannot save.'));
  const before=JSON.stringify(s);
  try{
   mutator(s);
   if(G.DB.commit(true)===false)throw Error('Save commit failed');
  }catch(e){
   const old=JSON.parse(before);
   for(const key of Object.keys(s))delete s[key];
   Object.assign(s,old);throw e;
  }
 }
 function legacySelect(it){
  legacyCommit(s=>{
   if(!s.owned?.[it.dex]||(it.shiny&&!s.shiny?.[it.dex]))
    throw Error(L('Chưa sở hữu Pokémon này.','Pokémon is not owned.'));
   s.partner=it.dex;s.partnerShiny=it.shiny;
  });
  // The old-save collection has no individual IDs, but its chosen fighter
  // still needs to appear at HOME immediately without entering a battle.
  try{G.PKMSVVMenuCleanQA?.restorePartner?.();}
  catch(error){console.warn('[PokéBox legacy home portrait refresh]',error);}
 }
 function legacyFavorite(it){
  legacyCommit(s=>{
   const overrides=s.pkmsvvLegacyFavoriteOverrides;
   if(overrides!==undefined&&(typeof overrides!=='object'||overrides===null||Array.isArray(overrides)))
    throw Error('Invalid legacy favorites');
   s.pkmsvvLegacyFavoriteOverrides=overrides||{};
   s.pkmsvvLegacyFavoriteOverrides[it.dex]=!it.favorite;
  });
 }
 function saveAction(fn){
  try{fn();renderBox();return true}
  catch(e){alert(L('Không thể lưu thay đổi: ','Could not save change: ')+e.message);return false;}
 }
 // Rendering dozens of animated PokéBox thumbnails in a single click can
 // block the main thread. Paint the hero immediately, then distribute tiny
 // collection thumbnails over animation frames (without touching any saves).
 const thumbnailQueue=[],thumbnailSet=new WeakSet();
 let thumbnailScheduled=false;
 function paintSprite(canvas,dex,shiny,hero,unknown){
  if(!canvas||!G.UI?.sprite||!canvas.isConnected)return;
  try{G.UI.sprite(canvas,dex,{lively:hero,spin:hero,hero,
    silhouette:unknown,scale:hero?3:2,shiny});}
  catch(_){try{G.UI.sprite(canvas,dex,{scale:2,shiny,silhouette:unknown});}catch(__){}}
 }
 function flushThumbnails(){
  thumbnailScheduled=false;
  const start=typeof performance==='object'?performance.now():Date.now();
  let painted=0;
  while(thumbnailQueue.length&&painted<5){
   const [canvas,dex,shiny,unknown]=thumbnailQueue.shift();
   if(canvas?.isConnected)paintSprite(canvas,dex,shiny,false,unknown);
   painted++;
   if((typeof performance==='object'?performance.now():Date.now())-start>7)break;
  }
  if(thumbnailQueue.length){
   thumbnailScheduled=true;requestAnimationFrame(flushThumbnails);
  }
 }
 function draw(canvas,dex,shiny=false,hero=false,unknown=false){
  if(!canvas||!G.UI?.sprite)return;
  if(hero||typeof requestAnimationFrame!=='function'){
   paintSprite(canvas,dex,shiny,hero,unknown);return;
  }
  // Repeated focus changes never queue two paints for the same canvas.
  if(thumbnailSet.has(canvas))return;
  thumbnailSet.add(canvas);
  thumbnailQueue.push([canvas,dex,shiny,unknown]);
  if(!thumbnailScheduled){thumbnailScheduled=true;requestAnimationFrame(flushThumbnails);}
 }
 // Read-only selection must not rebuild the grid or re-evaluate all species.
 function chooseFocus(id){
  if(!boxPane?.isConnected){focused=id;return;}
  const s=currentSave(),items=boxItemsCache||listPreview();
  const it=items.find(x=>x.id===id);
  if(!it||focused===id)return;
  focused=id;
  const grid=boxPane.querySelector('#pkmbx-grid');
  grid?.querySelector('.pkmbx-hub-slot.focused')?.classList.remove('focused');
  const tile=Array.from(grid?.querySelectorAll('.pkmbx-hub-slot')||[])
   .find(el=>Number(el.dataset.dex)===it.dex);
  if(tile){
   if(tile.dataset.boxId===id)tile.classList.add('focused');
   else{
    // Normal/Shiny switching redraws only this one card.
    const active=Hub.valid(s)?Hub.active(s)?.id:
     items.find(x=>x.dex===Number(s?.partner)&&x.shiny===!!s?.partnerShiny)?.id;
    const count=items.reduce((n,x)=>n+(x.dex===it.dex&&!x.shiny?1:0),0);
    tile.replaceWith(slot(it,active,!getStored(),new Set(Hub.team(s)),
     Hub.rankOverview(s,it),count));
   }
  }
  const members=Hub.team(s);
  for(const t of boxPane.querySelectorAll('#pkmbx-six .pkmbx-team-slot')){
   t.classList.toggle('focused',t.dataset.boxId===id);
   if(t.dataset.boxId)continue;
   const canAdd=!members.includes(id)&&!G.DB?.guest;
   t.disabled=!canAdd;
   t.title=canAdd?L('Thêm Pokémon đang chọn','Add selected Pokémon'):L('Ô trống','Empty slot');
   t.setAttribute('aria-label',t.title);
   t.onclick=canAdd?()=>saveAction(()=>Hub.toggleTeam(id)):null;
  }
  renderStats(boxPane,it,getStored());
 }
 function badgeText(x){return '#'+x.dex+(x.shiny?' ✨':'')+' · R'+x.rank;}
 function rankStars(rank){
  const n=Math.max(0,Math.min(5,Number.isInteger(rank)?rank:0));
  return '<span class="pkmbx-rank-stars" aria-label="'+L('Hạng ','Rank ')+n+'/5">'+
   '★'.repeat(n)+'<span class="pkmbx-rank-empty">'+'☆'.repeat(5-n)+'</span></span>';
 }
 function rankBlock(it,progress){
  const {rank,max,cost,copies,fragments,protectedForms=0,available,missing,enabled,canRank}=progress;
  const next=G.PKMSVVBox2?.formatRank?.(Math.min(max,rank+1))||{hp:(rank+1)*6,damage:(rank+1)*6};
  const current=G.PKMSVVBox2?.formatRank?.(rank)||{hp:rank*6,damage:rank*6};
  const stored=copies+protectedForms,percent=cost?Math.round(100*available/cost):100;
  const note=rank>=max?L('Đã đạt Rank tối đa.','Maximum Rank reached.'):
    !enabled?L('Cần chuyển dữ liệu PokéBox một lần để sử dụng Rank.','One-time PokéBox migration is required.'):
    canRank?L('✓ Đủ bản trùng — nhấn Nâng Rank để dùng ngay.','✓ Duplicates ready — tap Rank Up to apply.'):
    L('Thiếu ','Need ')+missing+L(' bản trùng để lên Rank kế tiếp.',' more duplicate(s) for next Rank.');
  return '<section class="pkmbx-rank-overview'+(canRank?' is-rank-ready':' is-rank-disabled')+'" aria-label="'+L('Tiến trình Rank','Rank progress')+'">'+
   '<div class="pkmbx-rank-heading"><b>⭐ Rank</b>'+rankStars(rank)+
   '<strong>'+rank+'/'+max+'</strong></div>'+
   '<div class="pkmbx-rank-progress" role="progressbar" aria-label="'+
      L('Tiến trình nguyên liệu','Material progress')+'" aria-valuemin="0" aria-valuemax="'+
      (cost||1)+'" aria-valuenow="'+available+'"><span style="width:'+percent+'%"></span></div>'+
   '<p class="pkmbx-rank-materials"><b>'+L('Bản trùng khả dụng: ','Usable duplicates: ')+
      stored+'</b>'+(fragments?' · '+L('Mảnh cũ: ','Old shards: ')+fragments:'')+'</p>'+
   (rank<max?'<p class="pkmbx-rank-requirement">'+L('Cần ','Need ')+cost+
      L(' để lên Rank ',' for Rank ')+(rank+1)+'</p>':'')+
   '<p class="pkmbx-rank-status'+(canRank?' is-ready':'')+'">'+note+'</p>'+
   '<button type="button" class="btn pkmbx-rank-shortcut'+(canRank?' gold':' rank-disabled')+'" id="pkmbx-rank-shortcut" '+
      (!canRank||G.DB?.guest?'disabled':'')+'>'+
      L('⬆ Nâng Rank','⬆ Rank Up')+'</button>'+
   '<p class="pkmbx-rank-auto-note">'+L('Pokémon quay trùng tự động được tính làm nguyên liệu. Không cần đổi thành Mảnh Rank.',
      'Duplicate Recruitment pulls count as materials automatically. No shard conversion needed.')+'</p>'+
   '<p class="pkmbx-rank-next"><b>'+L('Hạng kế tiếp','Next Rank')+':</b> '+
      (rank>=max?L('Tối đa','Max'):L('Máu ','HP ')+'+'+next.hp+
      '% · '+L('Sát thương ','Damage ')+'+'+next.damage+'%'+
      (rank===3?' · '+L('Hồi chiêu −5%','Cooldown −5%'):''))+
   '</p></section>';
 }
 // Apply an available Rank instantly. Engine commits atomically and the UI
 // rerenders immediately. No native confirm dialog or shard picker.
 function performRank(it,ready){
  if(rankBusy)return false;
  if(!ready){
   alert(L('Hồ sơ cũ cần được chuyển sang PokéBox một lần. Hãy xuất file JSON dự phòng trước khi chuyển.',
    'This older save needs a one-time PokéBox migration. Export a JSON backup first.'));
   return false;
  }
  const api=G.PKMSVVBox2,s=currentSave();
  const plan=api?.rankMaterials?.(s,it.id);
  if(!plan?.cost){
   G.UI?.toast?.(L('Đã đạt Rank tối đa.','Maximum Rank reached.'),2000);return false;
  }
  if(plan.available<plan.cost){
   const missing=plan.cost-plan.available;
   G.UI?.toast?.(L('Còn thiếu ','Need ')+missing+
    L(' bản trùng cùng loài.',' more same-species duplicates.'),2600);
   return false;
  }
  rankBusy=true;
  try{
   return saveAction(()=>{
    api.rankUpAuto(it.id,s);
    G.UI?.toast?.(L('Đã nâng Rank cho ','Rank upgraded for ')+monName(it.dex),2300);
   });
  }finally{rankBusy=false;}
 }
 function renderTeam(root,s,items){
  const team=Hub.team(s),holder=root.querySelector('#pkmbx-six');
  const byId=new Map(items.map(x=>[x.id,x]));
  holder.replaceChildren();
  const active=Hub.valid(s)?Hub.active(s)?.id:
   byId.get('b1-'+s?.partner+(s?.partnerShiny?'-s':'-n'))?.id;
  const focusedId=focusedItem()?.id;
  for(let i=0;i<Hub.TEAM_MAX;i++){
   const id=team[i],it=id?byId.get(id):null;
   const b=doc.createElement('button');
   b.type='button';
   b.className='pkmbx-team-slot'+(it?.id===focused?' focused':'')+(it?.id===active?' active':'');
   if(it){
    b.dataset.boxId=it.id;
    b.title=monName(it.dex)+(it.shiny?' Shiny':'');
    b.setAttribute('aria-label',L('Xem ','View ')+monName(it.dex));
    b.innerHTML='<canvas width="56" height="56"></canvas><span>'+clean(monName(it.dex))+'</span>';
    b.onclick=()=>chooseFocus(it.id);
   }else{
    const canAdd=!!focusedId&&!team.includes(focusedId)&&!G.DB?.guest;
    b.title=canAdd?L('Thêm Pokémon đang chọn','Add selected Pokémon'):L('Ô trống','Empty slot');
    b.setAttribute('aria-label',b.title);
    b.innerHTML='<span class="pkmbx-team-empty">+</span>';
    b.disabled=!canAdd;
    if(canAdd)b.onclick=()=>saveAction(()=>Hub.toggleTeam(focusedId));
   }
   holder.appendChild(b);
   if(it)draw(b.querySelector('canvas'),it.dex,it.shiny);
  }
  root.querySelector('#pkmbx-team-count').textContent=team.length+'/'+Hub.TEAM_MAX;
 }
 function slot(it,selected,pre=false,members,progress,duplicates=1){
  const b=doc.createElement('button');b.type='button';
  b.dataset.boxId=it.id;b.dataset.dex=String(it.dex);
  b.className='pkmbx-slot pkmbx-hub-slot'+(it.id===focused?' focused':'')+
   (it.id===selected?' selected':'')+(progress?.canRank?' rank-ready':'');
  const team=(members||new Set(Hub.team(currentSave()))).has(it.id);
  b.innerHTML='<canvas width="76" height="76"></canvas>'+
   '<span class="pkmbx-name">'+clean(monName(it.dex))+'</span>'+
   '<small>#'+it.dex+(it.shiny?' ✨':'')+'</small>'+
   '<span class="pkmbx-slot-meta">'+rankStars(progress?.rank??it.rank)+'</span>'+
   (!it.shiny&&duplicates>1?'<span class="pkmbx-stack pkmbx-stack-count" title="'+
     L('Số Pokémon thường cùng loài. Shiny không tính bản trùng.',
       'Number of ordinary individuals of the same species. Shiny does not count.')+'">×'+duplicates+'</span>':'')+
   '<span class="pkmbx-mini-icons">'+(it.favorite?'★ ':'')+(team?'⑥ ':'')+
    (it.id===selected?'✓':'')+'</span>';
  b.onclick=()=>chooseFocus(it.id);
  b.setAttribute('aria-label',monName(it.dex)+' '+badgeText(it));
  draw(b.querySelector('canvas'),it.dex,it.shiny);
  return b;
 }
 function renderStats(root,it,ready){
  const s=currentSave(),selected=Hub.active(s);
  const isCurrent=!!(it&&(ready?selected?.id===it.id:
    Number(s?.partner)===it.dex&&!!s?.partnerShiny===!!it.shiny));
  const profile=root.querySelector('#pkmbx-profile');
  if(!it){
   profile.innerHTML='<p>'+L('Chưa có Pokémon trong kho.','No Pokémon in this box.')+'</p>';
   return;
  }
  const nature=Hub.nature(currentSave(),it),ability=Hub.ability(currentSave(),it);
  const abText=abilityName(ability?.id||'');
  const desc=abilityBenefit(ability?.id||'',it.dex);
  const attr={hp:L('Máu','HP'),pa:L('Tấn công','Attack'),sa:L('Đặc công','Sp. Atk'),
   df:L('Phòng thủ','Defense'),sd:L('Đặc thủ','Sp. Def'),spd:L('Tốc độ','Speed')};
  const natureHint=nature?.up&&nature?.down?
   L('Tăng 10% ','+10% ')+attr[nature.up]+L(' · Giảm 10% ',' · −10% ')+attr[nature.down]:
   L('Tính cách trung tính, không tăng/giảm chỉ số.','Neutral Nature: no stat increases or penalties.');
  const mon=G.DEX_BY?.[it.dex],types=Array.isArray(mon?.types)?mon.types:[];
  const PALETTE={
   normal:['#a7a9af','#515d72'],fire:['#ff7c48','#7c302f'],
   water:['#4aabff','#174d83'],electric:['#ffd447','#806420'],
   grass:['#64d884','#245b44'],ice:['#7fe5ea','#306b83'],
   fighting:['#ec876a','#773b37'],poison:['#bf80e8','#603a86'],
   ground:['#d6af67','#795d30'],flying:['#a6bffb','#546a9d'],
   psychic:['#f982b4','#783853'],bug:['#aad36d','#53672d'],
   rock:['#c5ac83','#685845'],ghost:['#aa90e7','#4b397c'],
   dragon:['#9681ff','#473c96'],dark:['#9e8a9c','#413b55'],
   steel:['#b0d1da','#466678'],fairy:['#ffabd7','#965675']
  };
  const primary=String(types[0]||'normal').toLowerCase();
  const palette=PALETTE[primary]||PALETTE.normal;
  profile.dataset.pkmType=primary;
  profile.style.setProperty('--pkmbx-type',palette[0]);
  profile.style.setProperty('--pkmbx-type-dark',palette[1]);
  const typePills=types.map(t=>{
   const color=(PALETTE[String(t).toLowerCase()]||PALETTE.normal)[0];
   return '<span class="pkmbx-type-pill" style="--pkmbx-pill:'+color+'">'+
    clean(typeName(t))+'</span>';
  }).join('');
  const team=Hub.team(s),member=team.includes(it.id);
  const progress=Hub.rankOverview(s,it);
  const allForms=(boxItemsCache||listPreview()).filter(x=>x.dex===it.dex);
  const normalForm=allForms.find(x=>!x.shiny),shinyForm=allForms.find(x=>x.shiny);
  const sharedFav=allForms.some(x=>x.favorite);
  const bonuses=G.PKMSVVBox2?.formatRank?.(progress.rank)||{hp:0,damage:0,cooldown:0};
  const number=k=>Number.isFinite(Number(mon?.[k]))?Number(mon[k]):null;
  const hp=number('hp'),attack=Math.max(number('pa')||0,number('sa')||0);
  const speed=number('spd'),cooldown=Number(bonuses.cooldown)||0;
  const rows=[
   ['hp','♥',L('Máu','HP'),hp,hp===null?'—':String(Math.round(hp))+' · +'+bonuses.hp+'%',hp===null?0:hp/255*100],
   ['damage','✦',L('Sát thương','Damage'),attack,attack?String(Math.round(attack))+' · +'+bonuses.damage+'%':'—',attack/255*100],
   ['speed','➤',L('Tốc độ','Speed'),speed,speed===null?'—':String(Math.round(speed)),speed===null?0:speed/255*100],
   ['cooldown','⌛',L('Hồi chiêu','Cooldown'),cooldown,'−'+cooldown+'%',cooldown/20*100]
  ];
  const statRows=rows.map(([key,icon,label,value,display,width])=>
   '<div class="pkmbx-stat-meter" data-stat="'+key+'">'+
    '<span class="pkmbx-meter-label"><i aria-hidden="true">'+icon+'</i>'+label+'</span>'+
    '<span class="pkmbx-meter-track" role="progressbar" aria-label="'+label+
    '" aria-valuemin="0" aria-valuemax="'+(key==='cooldown'?20:255)+'" aria-valuenow="'+
    Math.max(0,Number(value)||0)+'"><span class="pkmbx-meter-fill pkmbx-meter-'+key+
    '" style="width:'+Math.min(100,Math.max(0,width)).toFixed(1)+'%"></span></span>'+
    '<strong>'+clean(display)+'</strong></div>').join('');
  profile.innerHTML='<div class="pkmbx-hub-hero">'+
    '<div class="pkmbx-hero-title"><strong>#'+it.dex+' · '+clean(monName(it.dex))+'</strong>'+
      '<span>'+L('Pokémon đã sở hữu','Owned Pokémon')+(it.shiny?' ✨ Shiny':'')+'</span></div>'+
    '<div class="pkmbx-hero-stage"><canvas id="pkmbx-hero" width="176" height="176"></canvas>'+
      '<div class="pkmbx-type-pills">'+typePills+'</div></div></div>'+
    '<div class="pkmbx-box-variants" role="group" aria-label="'+L('Dạng Pokémon','Pokémon form')+'">'+
    '<button type="button" data-box-variant="normal" class="btn small'+(!it.shiny?' gold':'')+'" '+(!normalForm?'disabled':'')+'>'+L('Bình thường','Normal')+'</button>'+
    '<button type="button" data-box-variant="shiny" class="btn small'+(it.shiny?' gold':'')+'" '+(!shinyForm?'disabled':'')+'>✨ Shiny</button></div>'+
    rankBlock(it,progress)+
    '<section class="pkmbx-hub-stats" aria-label="'+L('Chỉ số Pokémon','Pokémon stats')+'">'+
      '<h3>▥ '+L('Chỉ số','Stats')+'</h3>'+statRows+
      '<p class="pkmbx-stat-caption">'+L('Thanh thể hiện chỉ số cơ bản. Tăng Rank cộng thêm sức mạnh khi chiến đấu.',
       'Bars show base stats. Rank grants combat bonuses.')+'</p></section>'+
    '<div class="pkmbx-hub-buttons">'+
    '<button class="btn small gold" id="pkmbx-use" '+(G.DB?.guest||isCurrent?'disabled':'')+'>'+
     (isCurrent?L('✓ Sử dụng','✓ Use'):L('✓ Sử dụng','✓ Use'))+'</button>'+
    '<button class="btn small" id="pkmbx-star" '+(G.DB?.guest?'disabled':'')+'>'+
     (sharedFav?L('★ Bỏ yêu thích','★ Unfavorite'):L('☆ Yêu thích','☆ Favorite'))+'</button>'+
    '<button class="btn small" id="pkmbx-team" '+(G.DB?.guest?'disabled':'')+'>'+
     (member?L('− Rời đội','− Leave Team'):L('+ Vào đội hình','+ Add to Team'))+'</button></div>'+
    '<div class="pkmbx-hub-tabs">'+
    '<button class="btn small'+(view==='info'?' gold':'')+'" data-box-tab="info">'+L('Thông tin','Details')+'</button>'+
    '<button class="btn small'+(view==='items'?' gold':'')+'" data-box-tab="items">'+L('Vật phẩm / TM','Items / TMs')+'</button>'+
    '<button class="btn small pkmbx-rank-tab'+(progress.canRank?(view==='rank'?' gold':''):' rank-disabled')+'" data-box-tab="rank" aria-label="'+
     (progress.canRank?L('Có thể nâng Rank','Rank available'):L('Chưa đủ nguyên liệu nâng Rank','Not enough Rank duplicates'))+'">⭐ Rank</button></div>'+
    '<div class="pkmbx-hub-tab-content" id="pkmbx-tab-content"></div>';
  draw(profile.querySelector('#pkmbx-hero'),it.dex,it.shiny,true);
  for(const b of profile.querySelectorAll('[data-box-variant]'))b.onclick=()=>{
   const variant=b.dataset.boxVariant==='shiny'?shinyForm:normalForm;
   if(variant&&variant.id!==focused)chooseFocus(variant.id);
  };
  // Primary actions belong ABOVE the Pokémon portrait and stats, not below.
  const topActions=profile.querySelector('.pkmbx-hub-buttons');
  if(topActions)profile.insertBefore(topActions,profile.firstChild);
  profile.querySelector('#pkmbx-rank-shortcut').onclick=()=>performRank(it,ready);
  profile.querySelector('#pkmbx-use').onclick=()=>saveAction(()=>{
   if(ready){
    if(!Hub.safeSelect(it.id))throw Error('Could not select this Pokémon');
   }else legacySelect(it);
   G.UI?.toast?.(L('Đã chọn ','Selected ')+monName(it.dex),2400);
  });
  profile.querySelector('#pkmbx-star').onclick=()=>saveAction(()=>ready?Hub.toggleFavorite(normalForm?.id||it.id):legacyFavorite(normalForm||it));
  profile.querySelector('#pkmbx-team').onclick=()=>saveAction(()=>Hub.toggleTeam(it.id));
  for(const b of profile.querySelectorAll('[data-box-tab]'))
   b.onclick=()=>{view=b.dataset.boxTab;renderBox();};
  if(view==='items')renderItems(profile.querySelector('#pkmbx-tab-content'),it,ready);
  else if(view==='rank')renderRank(profile.querySelector('#pkmbx-tab-content'),it,ready);
  else{
   profile.querySelector('#pkmbx-tab-content').innerHTML='<div class="pkmbx-hub-info">'+
    '<p><b>'+L('Tính cách','Nature')+':</b> '+clean(natureName(nature?.id||it.natureId))+'</p>'+
    '<p class="pkmbx-hint">'+clean(natureHint)+'</p>'+
    '<div class="pkmbx-hub-ability-explained"><b>'+L('Đặc tính','Ability')+
     ': '+clean(abText)+'</b><p class="pkmbx-ability-effect">'+clean(desc)+'</p></div>'+
    '<p><b>'+L('TM đã học','Learned TMs')+':</b> '+
     (Hub.learned(currentSave(),it).map(id=>clean(G.Moves?.BY_ID?.[id]?G.T(G.Moves.BY_ID[id].name,'move'):id)).join(', ')||L('Chưa có','None'))+
    '</p></div>';
  }
 }
 function renderItems(host,it,ready){
  const s=currentSave(),bag=s?.bag||{},tms=s?.tms||{};
  const natList=G.NATURES||[],abilities=G.DEX_ABIL?.[it.dex]||[],current=Hub.ability(s,it)?.slot||0;
  const learns=Object.keys(tms).filter(id=>tms[id]>0&&G.Moves?.BY_ID?.[id]);
  host.innerHTML='<section class="pkmbx-hub-items"><h3>'+L('Dùng vật phẩm cho ','Use items on ')+clean(monName(it.dex))+'</h3>'+
   '<div class="pkmbx-hub-inventory">'+
    '<label><b>'+L('Bạc hà','Nature Mint')+' ×'+(bag.mint||0)+'</b>'+
     '<select id="pkmbx-mint-select">'+natList.map(n=>'<option value="'+clean(n.id)+'"'+(n.id===it.natureId?' selected':'')+'>'+
      clean(natureName(n.id))+'</option>').join('')+'</select></label>'+
    '<button class="btn small gold" id="pkmbx-mint-use" '+(!ready||!bag.mint?'disabled':'')+'>'+L('Đổi tính cách','Change Nature')+'</button>'+
   '</div><h4>'+L('Viên nang Đặc tính','Ability Capsules')+' · '+L('Thường','Normal')+' ×'+(bag.cap||0)+
     ' · '+L('Ẩn','Hidden')+' ×'+(bag.caph||0)+'</h4><div class="pkmbx-hub-ability">'+
    abilities.map((id,slot)=>{
      if(!id)return '';
      const hidden=slot===2,dup=slot===1&&id===abilities[0];
      return '<button class="btn small" data-hub-ability="'+slot+'" '+(!ready||slot===current||dup||
       !(hidden?bag.caph:bag.cap)?'disabled':'')+'>'+clean(abilityName(id))+
       (hidden?' ★':'')+(slot===current?' ✓':'')+'</button>';
    }).join('')+'</div>'+
   '<h4>TM</h4>'+
   '<div class="pkmbx-hub-tms">'+(learns.length?learns.map(id=>{
     const title=G.T?G.T(G.Moves.BY_ID[id].name,'move'):id;
     return '<button class="btn small" data-hub-tm="'+clean(id)+'" '+
      (!ready||!Hub.canTeach(s,it,id)?'disabled':'')+'>'+clean(title)+' ×'+tms[id]+'</button>';
    }).join(''):'<p>'+L('Chưa có TM trong Túi đồ.','No TM in your Bag.')+'</p>')+'</div>'+
    '<button class="btn small" id="pkmbx-shop-open">'+L('🦎 Đến Cửa hàng Kecleon','🦎 Open Kecleon Shop')+'</button></section>';
  host.querySelector('#pkmbx-mint-use').onclick=()=>saveAction(()=>{
   const nat=host.querySelector('#pkmbx-mint-select').value;
   Hub.useMint(it.id,nat);
  });
  for(const b of host.querySelectorAll('[data-hub-ability]'))b.onclick=()=>saveAction(()=>{
   const slot=Number(b.dataset.hubAbility);
   Hub.useCapsule(it.id,slot,slot===2);
  });
  for(const b of host.querySelectorAll('[data-hub-tm]'))b.onclick=()=>saveAction(()=>Hub.teach(it.id,b.dataset.hubTm));
  host.querySelector('#pkmbx-shop-open').onclick=()=>{
   closeBox();G.KecleonUI?.open?.('shop');
  };
 }
 // Rank tab remains informative. One confirmation automatically picks usable
 // Gacha duplicates; no checkbox step and no Convert-to-Shards action.
 function renderRank(host,it,ready){
  const save=currentSave(),progress=Hub.rankOverview(save,it);
  const total=(boxItemsCache||listPreview()).filter(x=>x.dex===it.dex).length;
  const stock=progress.copies+progress.protectedForms;
  const next=progress.rank+1;
  host.innerHTML='<section class="pkmbx-hub-rank">'+
   '<h3>⭐ Rank '+progress.rank+'/5</h3>'+
   '<p class="pkmbx-rank-material-summary"><b>'+L('Đang sở hữu: ','Owned: ')+
    total+L(' cá thể · Bản trùng khả dụng: ',' individuals · Usable duplicates: ')+stock+'</b></p>'+
   (progress.fragments?'<p>'+L('Mảnh Rank cũ: ','Old Rank shards: ')+progress.fragments+'</p>':'')+
   '<p>'+L('Lên Rank ','Next Rank ')+next+L(' cần thêm ',' requires ')+progress.cost+
    L(' bản trùng. ',' duplicates. ')+
    (progress.canRank?L('✓ Đã đủ.','✓ Ready.'):L('Còn thiếu ','Missing ')+progress.missing+'.')+'</p>'+
   '<p class="pkmbx-rank-auto-note">'+L('Các bản trùng từ Chiêu mộ tự động nằm trong kho nguyên liệu. Không cần đổi Pokémon thành Mảnh Rank. Chỉ trừ nguyên liệu khi bạn xác nhận nâng cấp.',
     'Duplicate Recruitment pulls are automatically available for Rank. No shard conversion. Materials are spent only after your confirmation.')+'</p>'+
   '<button type="button" id="pkmbx-rank-direct" class="btn'+(progress.canRank?' gold':' rank-disabled')+'" '+
    (!progress.canRank||G.DB?.guest?'disabled':'')+'>'+
    L('⬆ Nâng Rank','⬆ Rank Up')+'</button></section>';
  host.querySelector('#pkmbx-rank-direct').onclick=()=>performRank(it,ready);
 }
 function ensureBox(){
  if(boxPane?.isConnected)return;
  boxPane=doc.createElement('div');boxPane.id='pkmsvv-pokebox-overlay';
  boxPane.setAttribute('translate','no');
  boxPane.innerHTML='<section class="pkmbx-panel pkmbx-hub-panel" role="dialog" aria-modal="true" aria-label="PokéBox">'+
   '<header class="pkmbx-head"><h2>◉ Pokémon</h2>'+pcTabs('box')+'<button class="btn small" id="pkmbx-close">'+L('✕ Đóng','✕ Close')+'</button></header>'+
   '<div class="pkmbx-hub-main"><div class="pkmbx-hub-left">'+
   '<div class="pkmbx-hub-team-title"><h3>'+L('Đội hình 6 Pokémon sẵn sàng','Ready Team of 6')+'</h3><b id="pkmbx-team-count">0/6</b></div>'+
   '<div id="pkmbx-six" class="pkmbx-team-six"></div>'+
   '<div class="pkmbx-actions pkmbx-hub-tools">'+
   '<input type="search" id="pkmbx-query" autocomplete="off" placeholder="'+L('Tìm Pokémon / #Dex','Search Pokémon / #Dex')+'"/>'+ 
   '<button type="button" class="btn small pkmbx-box-filter-toggle" id="pkmbx-box-filter-toggle" aria-expanded="false" aria-controls="pkmbx-box-filter-fields">'+L('☷ Lọc','☷ Filter')+'</button>'+ 
   '<div class="pkmbx-box-filter-fields" id="pkmbx-box-filter-fields" data-open="false">'+
   '<label><input type="checkbox" id="pkmbx-favorite"/> '+L('★ Yêu thích','★ Favorites')+'</label>'+
   '<label><input type="checkbox" id="pkmbx-shiny"/> Shiny</label>'+
   '<label><input type="checkbox" id="pkmbx-ready"/> '+L('Có thể nâng Rank','Rank ready')+'</label>'+
   '<label class="pkmbx-box-sort">'+L('Sắp xếp','Sort')+': <select id="pkmbx-sort">'+
    '<option value="dex">'+L('Số Pokédex','Dex number')+'</option>'+
    '<option value="name">'+L('Tên','Name')+'</option>'+
    '<option value="rank">Rank</option>'+
    '<option value="copies">'+L('Số bản sao','Copies')+'</option>'+
    '<option value="rarity">'+L('Độ hiếm','Rarity')+'</option></select></label>'+
   '</div><span id="pkmbx-found-count" class="pkmbx-found-count" aria-live="polite"></span></div>'+
   '<div id="pkmbx-legacy-migration" class="pkmbx-legacy-migration" hidden></div>'+
   '<nav class="pkmbx-page pkmbx-box-carousel" aria-label="'+L('Chuyển hộp Pokémon','Switch Pokémon boxes')+'">'+
   '<button type="button" class="btn small" id="pkmbx-prev" aria-label="'+L('Hộp trước','Previous box')+'">❮</button>'+
   '<div class="pkmbx-box-heading"><strong id="pkmbx-box-label">BOX 1</strong>'+
   '<span id="pkmbx-pagenum">1/1</span></div>'+
   '<button type="button" class="btn small" id="pkmbx-next" aria-label="'+L('Hộp tiếp','Next box')+'">❯</button></nav>'+
   '<div class="pkmbx-box-frame"><div class="pkmbx-grid" id="pkmbx-grid"></div></div></div>'+
   '<aside id="pkmbx-profile" class="pkmbx-profile"></aside></div></section>';
  doc.body.appendChild(boxPane);
  boxPane.querySelector('#pkmbx-close').onclick=closeBox;
  bindPcTabs(boxPane);
  boxPane.addEventListener('click',e=>{if(e.target===boxPane)closeBox();});
  const boxFilterToggle=boxPane.querySelector('#pkmbx-box-filter-toggle');
  const boxFilters=boxPane.querySelector('#pkmbx-box-filter-fields');
  boxFilterToggle.onclick=()=>{
   const open=boxFilters.dataset.open!=='true';
   boxFilters.dataset.open=String(open);
   boxFilterToggle.setAttribute('aria-expanded',String(open));
  };
  boxPane.querySelector('#pkmbx-query').oninput=e=>{query=e.target.value;page=0;renderBox();};
  boxPane.querySelector('#pkmbx-favorite').onchange=e=>{onlyFavorites=e.target.checked;page=0;renderBox();};
  boxPane.querySelector('#pkmbx-shiny').onchange=e=>{onlyShiny=e.target.checked;page=0;renderBox();};
  boxPane.querySelector('#pkmbx-ready').onchange=e=>{onlyRankReady=e.target.checked;page=0;renderBox();};
  boxPane.querySelector('#pkmbx-sort').onchange=e=>{boxSort=e.target.value;page=0;renderBox();};
  boxPane.querySelector('#pkmbx-prev').onclick=()=>{page=Math.max(0,page-1);renderBox();};
  boxPane.querySelector('#pkmbx-next').onclick=()=>{page++;renderBox();};
 }
 function renderBox(){
  if(!boxPane?.isConnected)return;
  const s=currentSave(),ready=getStored(),items=listPreview();
  boxItemsCache=items;
  const q=query.trim().toLocaleLowerCase();
  const counts=new Map(),groups=new Map();
  for(const x of items){
   // Do not label normal+Shiny as x2. Only independently summoned NORMAL
   // instances count as ordinary copies; Shiny stays its own unique form.
   if(!x.shiny)counts.set(x.dex,(counts.get(x.dex)||0)+1);
   if(!groups.has(x.dex))groups.set(x.dex,[]);
   groups.get(x.dex).push(x);
  }
  // One card per species; do not destroy legacy Normal/Shiny instance records.
  // Rank checks scan individual copies. Only evaluate visible species,
  // unless an explicit Rank filter/sort requires the full collection.
  const ranks=new Map();
  const rankFor=x=>{
   if(!ranks.has(x.dex))ranks.set(x.dex,Hub.rankOverview(s,x));
   return ranks.get(x.dex);
  };
  const shown=[...groups.values()].filter(group=>{
   const species=group[0];
   return (!onlyFavorites||group.some(x=>x.favorite))&&
    (!onlyShiny||group.some(x=>x.shiny))&&
    (!onlyRankReady||(ready&&group.some(x=>rankFor(x)?.canRank)))&&
    (!q||monName(species.dex).toLocaleLowerCase().includes(q)||String(species.dex).includes(q));
  }).map(group=>{
   const chosen=group.find(x=>x.id===focused);
   return (onlyShiny?group.find(x=>x.shiny):null)||chosen||
    group.find(x=>x.dex===Number(s?.partner)&&x.shiny===!!s?.partnerShiny)||
    group.find(x=>!x.shiny)||group[0];
  });
  shown.sort((a,b)=>{
   if(boxSort==='name')return monName(a.dex).localeCompare(monName(b.dex))||a.dex-b.dex;
   if(boxSort==='rank')return (rankFor(b)?.rank||0)-(rankFor(a)?.rank||0)||a.dex-b.dex;
   if(boxSort==='copies')return (counts.get(b.dex)||0)-(counts.get(a.dex)||0)||a.dex-b.dex;
   if(boxSort==='rarity')return (Number(G.DEX_BY?.[b.dex]?.rarity)||0)-(Number(G.DEX_BY?.[a.dex]?.rarity)||0)||a.dex-b.dex;
   return a.dex-b.dex;
  });
  const pages=Math.max(1,Math.ceil(shown.length/PAGE));page=Math.max(0,Math.min(page,pages-1));
  const selected=ready?Hub.active(s)?.id:
   items.find(x=>x.dex===Number(s?.partner)&&x.shiny===!!s?.partnerShiny)?.id;
  const grid=boxPane.querySelector('#pkmbx-grid');grid.replaceChildren();
  const members=new Set(Hub.team(s));
  for(const x of shown.slice(page*PAGE,(page+1)*PAGE))
   grid.appendChild(slot(x,selected,!ready,members,rankFor(x),counts.get(x.dex)||1));
  // Real PC-style boxes keep the same 6-column capacity and visible empty
  // slots instead of a floating list of cards.
  if(shown.length){
   const visibleCount=shown.slice(page*PAGE,(page+1)*PAGE).length;
   for(let i=visibleCount;i<PAGE;i++){
    const emptySlot=doc.createElement('div');emptySlot.className='pkmbx-empty-slot';
    emptySlot.setAttribute('aria-hidden','true');grid.appendChild(emptySlot);
   }
  }
  if(!shown.length){
   const empty=doc.createElement('p');empty.className='pkmbx-box-empty';
   empty.textContent=onlyRankReady&&!ready?
     L('Save cũ chưa lưu số bản trùng. Hãy chuyển PokéBox để theo dõi Chiêu mộ mới.',
       'Old save does not track duplicates. Migrate PokéBox to track future Recruitment pulls.'):
    onlyRankReady?L('Chưa có Pokémon đủ nguyên liệu nâng Rank.','No Pokémon has enough eligible Rank materials.'):
    L('Không tìm thấy Pokémon phù hợp.','No matching Pokémon found.');
   grid.appendChild(empty);
  }
  boxPane.querySelector('#pkmbx-found-count').textContent=shown.length+' / '+groups.size+' '+L('loài','species');
  const banner=boxPane.querySelector('#pkmbx-legacy-migration');
  banner.hidden=ready;
  if(!ready){
   banner.innerHTML='<strong>'+L('Save cũ chưa theo dõi Pokémon quay trùng.','This older save does not track individual duplicates.')+'</strong>'+
    '<span>'+L('Các lượt Chiêu mộ cũ không có nhật ký cá thể nên không thể khôi phục số bản trùng. Bạn có thể kích hoạt ngay, hoặc game sẽ sao lưu và tự kích hoạt PokéBox khi quay Chiêu mộ mới thành công.',
      'Past Recruitment duplicates without individual IDs cannot be reconstructed. Activate now, or the game will safely back up and activate PokéBox on your next successful Recruitment purchase.')+'</span>'+
    '<button type="button" class="btn small" id="pkmbx-activate-migration">'+
    L('💾 Sao lưu và kích hoạt PokéBox','💾 Back up & activate PokéBox')+'</button>';
   banner.querySelector('button').onclick=migrateLegacyFromBox;
  }
  if(!focused||!items.some(x=>x.id===focused))focused=selected||items[0]?.id||null;
  boxPane.querySelector('#pkmbx-box-label').textContent='BOX '+(page+1)+' · '+
   L('Kho Pokémon','Collection');
  boxPane.querySelector('#pkmbx-pagenum').textContent=(page+1)+' / '+pages;
  boxPane.querySelector('#pkmbx-prev').disabled=page===0;
  boxPane.querySelector('#pkmbx-next').disabled=page>=pages-1;
  renderTeam(boxPane,s,items);
  renderStats(boxPane,focusedItem(),ready);
 }
 // Shared in-game PC window: Pokédex is the FIRST PC tab, not a separate
 // home-menu button or a Windows-only feature.
 function pcTabs(selected){
  const tab=(id,label)=>'<button type="button" class="btn small pkmbx-pc-tab'+
   (selected===id?' gold':'')+'" data-pc-tab="'+id+'" role="tab" aria-selected="'+
   String(selected===id)+'">'+label+'</button>';
  return '<nav class="pkmbx-pc-tabs" role="tablist" aria-label="Pokémon · L1/R1 chuyển tab" title="L1 / R1: PokéBox ↔ Pokédex ↔ Nâng cấp">'+
   tab('box','📦 PokéBox')+
   tab('dex',pokedexIcon()+' Pokédex')+
   tab('upgrade','⬆️ '+L('Nâng cấp','Upgrades'))+'</nav>';
 }
 function bindPcTabs(parent){
  for(const button of parent.querySelectorAll('[data-pc-tab]'))
   button.onclick=()=>showPC(button.dataset.pcTab);
 }
 // The legacy upgrade economy is authoritative. This tab is navigation only:
 // save.pupg = one Pokémon; save.globalUpgrades = all Pokémon.
 function openLegacyUpgrade(kind){
  const single=kind==='single';
  const fn=single?(G.MenuUI?.openUpgrades||G.PKMSVVUpgradeChooser?.open):G.GlobalPowerUI?.open;
  if(typeof fn!=='function'){
   alert(L('Bảng nâng cấp chưa sẵn sàng trong bản thử nghiệm này.','Upgrade screen is unavailable in this QA build.'));
   return false;
  }
  closeBox();
  if(single&&typeof G.MenuUI?.openUpgrades==='function'){
   G.MenuUI.openUpgrades();
  }else if(single){
   G.PKMSVVUpgradeChooser.open();
  }else{
   G.GlobalPowerUI.open();
  }
  return true;
 }
 function ensureUpgrades(){
  if(upgradePane?.isConnected)return;
  upgradePane=doc.createElement('div');
  upgradePane.id='pkmbx-upgrade-overlay';
  upgradePane.className='pkmbx-upgrades-inside-pokemon';
  upgradePane.hidden=true;
  upgradePane.setAttribute('translate','no');
  upgradePane.innerHTML='<section class="pkmbx-panel pkmbx-upgrade-panel" role="region" aria-label="'+L('Nâng cấp Pokémon','Pokémon upgrades')+'">'+
   '<header class="pkmbx-head"><h2>◉ Pokémon</h2>'+pcTabs('upgrade')+'<button type="button" class="btn small" id="pkmbx-upgrade-close">'+L('✕ Đóng','✕ Close')+'</button></header>'+
   '<div class="pkmbx-upgrade-heading"><h3>'+L('Nâng cấp Pokémon','Pokémon upgrades')+'</h3>'+
   '<p>'+L('Hai nhánh nâng cấp thật của game — không đặt lại chỉ số hay chuyển đổi dữ liệu save.','Both original upgrade paths — no resets or save conversion.')+'</p></div>'+
   '<div class="pkmbx-upgrade-options">'+
   '<article class="pkmbx-upgrade-option"><span class="pkmbx-upgrade-symbol">✦</span><h4>'+L('Nâng cấp từng Pokémon','Individual Pokémon')+'</h4>'+
   '<p>'+L('Áp dụng cho Pokémon đang chọn; dùng điểm nâng cấp và PokéCoins như trước.','Applies to your selected Pokémon using the existing PokéCoins economy.')+'</p>'+
   '<p id="pkmbx-upgrade-single-info"></p><button type="button" class="btn gold" id="pkmbx-upgrade-single">'+L('Mở nâng cấp riêng','Open individual upgrades')+'</button></article>'+
   '<article class="pkmbx-upgrade-option"><span class="pkmbx-upgrade-symbol">✧</span><h4>'+L('Nâng cấp toàn đội','Team upgrades')+'</h4>'+
   '<p>'+L('Thưởng vĩnh viễn cho toàn bộ Pokémon, lưu riêng với nâng cấp từng con.','Permanent bonuses for every Pokémon, stored independently.')+'</p>'+
   '<p id="pkmbx-upgrade-team-info"></p><button type="button" class="btn gold" id="pkmbx-upgrade-team">'+L('Mở nâng cấp toàn đội','Open team upgrades')+'</button></article></div>'+
   '<p class="pkmbx-upgrade-footnote">'+L('Nâng Rank trong PokéBox là hệ thống riêng, không thay thế các nâng cấp hiện có.','PokéBox Rank is separate and does not replace existing upgrades.')+'</p></section>';
  boxPane.appendChild(upgradePane);
  bindPcTabs(upgradePane);
  upgradePane.querySelector('#pkmbx-upgrade-close').onclick=closeBox;
  upgradePane.querySelector('#pkmbx-upgrade-single').onclick=()=>openLegacyUpgrade('single');
  upgradePane.querySelector('#pkmbx-upgrade-team').onclick=()=>openLegacyUpgrade('team');
 }
 function renderUpgrades(){
  if(!upgradePane?.isConnected)return;
  const s=currentSave()||{},dex=Number(s.partner);
  const name=monName(dex)||('#'+dex);
  const money=Number.isFinite(Number(s.coins))?Number(s.coins).toLocaleString(G.I18n?.lang==='en'?'en-US':'vi-VN'):'—';
  upgradePane.querySelector('#pkmbx-upgrade-single-info').textContent=
   L('Đang chọn: ','Selected: ')+name+' · '+L('PokéCoins: ','PokéCoins: ')+money;
  upgradePane.querySelector('#pkmbx-upgrade-team-info').textContent=
   L('PokéCoins hiện có: ','Available PokéCoins: ')+money;
 }
 function showPC(which){
  if(!boxPane?.isConnected)return;
  const target=['box','dex','upgrade'].includes(which)?which:'box';
  if(target==='dex')ensureDex();
  if(target==='upgrade')ensureUpgrades();
  const hubPanel=boxPane.querySelector('.pkmbx-hub-panel');
  if(hubPanel)hubPanel.hidden=target!=='box';
  if(dexPane?.isConnected)dexPane.hidden=target!=='dex';
  if(upgradePane?.isConnected)upgradePane.hidden=target!=='upgrade';
  for(const button of boxPane.querySelectorAll('[data-pc-tab]')){
   const on=button.dataset.pcTab===target;
   button.classList.toggle('gold',on);
   button.setAttribute('aria-selected',String(on));
  }
  if(target==='dex')renderDex();
  else if(target==='upgrade')renderUpgrades();
  else renderBox();
 }
 // Controller shoulder navigation works in the SAME overlay, preserving the
 // focused Pokémon, filters, search and team. No save mutation, no recreation.
 const PC_TAB_ORDER=Object.freeze(['box','dex','upgrade']);
 function currentTab(){
  if(!boxPane?.isConnected)return null;
  if(dexPane?.isConnected&&!dexPane.hidden)return 'dex';
  if(upgradePane?.isConnected&&!upgradePane.hidden)return 'upgrade';
  return 'box';
 }
 function cycleTab(step){
  const now=currentTab();
  if(!now)return false;
  const move=Number(step);
  if(!Number.isFinite(move)||move===0)return false;
  const at=PC_TAB_ORDER.indexOf(now);
  const next=PC_TAB_ORDER[(at+(move>0?1:-1)+PC_TAB_ORDER.length)%PC_TAB_ORDER.length];
  showPC(next);
  return currentTab()===next;
 }
 function openPC(target='dex',nextView='info'){
  if(!currentSave())return;
  closeBox();
  view=['items','rank','info'].includes(nextView)?nextView:'info';
  page=0;query='';onlyFavorites=false;onlyShiny=false;onlyRankReady=false;boxSort='dex';
  const s=currentSave();
  focused=Hub.active(s)?.id||
   listPreview().find(x=>x.dex===Number(s?.partner)&&x.shiny===!!s?.partnerShiny)?.id||null;
  ensureBox();
  boxPane.querySelector('#pkmbx-query').value='';
  for(const id of ['pkmbx-favorite','pkmbx-shiny','pkmbx-ready'])boxPane.querySelector('#'+id).checked=false;
  boxPane.querySelector('#pkmbx-sort').value='dex';
  showPC(target);
 }
 function openBox(nextView='info'){openPC('box',nextView);}
 function openUpgrades(){if(!boxPane?.isConnected)openPC('upgrade');else showPC('upgrade');}
 function closeBox(){boxPane?.remove();boxPane=null;dexPane=null;upgradePane=null;}
 function evoRules(){
  return G.PKMSVV_EVOLUTION_DATA?.rules||[];
 }
 function evoLabel(r){
  if(G.I18n?.lang!=='en')return G.PKMSVVEvo?.requirement?.(r)||L('Điều kiện đặc biệt','Special condition');
  const parts=[];
  if(r.level)parts.push('Lv. '+r.level);
  if(r.item)parts.push('Item: '+r.item.replaceAll('-',' '));
  if(r.friendship)parts.push('Friendship '+r.friendship);
  if(r.knownMove)parts.push('Move: '+r.knownMove.replaceAll('-',' '));
  if(r.time)parts.push('Time: '+r.time);
  return parts.join(' · ')||'Special evolution requirement';
 }
 function ensureDex(){
  if(dexPane?.isConnected)return;
  const genOptions=Array.from({length:9},(_,i)=>'<option value="'+(i+1)+'">Gen '+(i+1)+'</option>').join('');
  const typeOptions=Object.keys(typeVi).sort().map(t=>'<option value="'+clean(t)+'">'+clean(typeName(t))+'</option>').join('');
  dexPane=doc.createElement('div');dexPane.id='pkmbx-dex-overlay';
  dexPane.className='pkmbx-dex-inside-pc';dexPane.setAttribute('translate','no');dexPane.hidden=true;
  dexPane.innerHTML='<section class="pkmbx-panel pkmbx-dex-panel" role="dialog" aria-modal="true" aria-label="Pokédex">'+
   '<header class="pkmbx-head"><h2>◉ Pokémon</h2>'+pcTabs('dex')+'<button class="btn small" id="pkmbx-dex-close">'+L('✕ Đóng','✕ Close')+'</button></header>'+


   '<div class="pkmbx-dex-toolbar"><input id="pkmbx-dex-search" type="search" autocomplete="off" placeholder="'+L('Tìm tên Pokémon hoặc số Pokédex','Search Pokémon name or Dex number')+'"/>'+
   '<button type="button" class="btn small" id="pkmbx-dex-discovered" aria-pressed="false">'+L('✓ Đã phát hiện','✓ Discovered')+'</button>'+ 
   '<button type="button" class="btn small" id="pkmbx-dex-fav" aria-pressed="false">'+L('☆ Yêu thích','☆ Favorites')+'</button>'+
   '<button type="button" class="btn small" id="pkmbx-dex-sort-toggle" aria-expanded="false">'+L('☷ Sắp xếp / Lọc','☷ Sort / Filter')+'</button></div>'+
   '<div class="pkmbx-dex-filters" id="pkmbx-dex-filters" hidden>'+
   '<label>'+L('Thế hệ','Generation')+'<select id="pkmbx-dex-gen"><option value="0">'+L('Tất cả Gen','All generations')+'</option>'+genOptions+'</select></label>'+
   '<label>'+L('Tình trạng','Collection')+'<select id="pkmbx-dex-status"><option value="all">'+L('Tất cả','All')+'</option>'+
    '<option value="owned">'+L('Đã phát hiện','Discovered')+'</option><option value="missing">'+L('Chưa đánh bại','Not defeated')+'</option><option value="shiny">Shiny</option></select></label>'+
   '<label>'+L('Độ hiếm','Rarity')+'<select id="pkmbx-dex-rarity"><option value="0">'+L('Tất cả độ hiếm','All rarities')+'</option>'+
    [1,2,3,4,5].map((n)=>'<option value="'+n+'">'+L(['','Thường','Khá hiếm','Hiếm','Sử thi','Huyền thoại'][n],['','Common','Uncommon','Rare','Epic','Legendary'][n])+'</option>').join('')+'</select></label>'+
   '<label>'+L('Hệ','Type')+'<select id="pkmbx-dex-type"><option value="">'+L('Tất cả hệ','All types')+'</option>'+typeOptions+'</select></label>'+
   '<label>'+L('Thứ tự','Sort')+'<select id="pkmbx-dex-order"><option value="num">'+L('Số Pokédex','Dex number')+'</option>'+
   '<option value="name">'+L('Tên','Name')+'</option><option value="rar">'+L('Độ hiếm','Rarity')+'</option>'+
   '<option value="new">'+L('Mới thu thập','Recently caught')+'</option><option value="used">'+L('Chơi nhiều nhất','Most used')+'</option></select></label>'+
   '<button type="button" class="btn small" id="pkmbx-dex-clear">'+L('Xóa lọc','Clear filters')+'</button>'+
   '<button type="button" class="btn small" id="pkmbx-dex-sort-close">'+L('✕ Đóng bộ lọc','✕ Close filters')+'</button></div>'+
   '<p class="pkmbx-dex-count" id="pkmbx-dex-count"></p>'+
   '<div class="pkmbx-dex-main"><div class="pkmbx-dex-results"><div id="pkmbx-dex-list" class="pkmbx-dex-grid"></div>'+
    '<nav class="pkmbx-page"><button class="btn small" id="pkmbx-dex-prev">◀</button><span id="pkmbx-dex-pages">1/1</span><button class="btn small" id="pkmbx-dex-next">▶</button></nav></div>'+
   '<aside id="pkmbx-dex-details" class="pkmbx-profile"></aside></div></section>';
  boxPane.appendChild(dexPane);
  dexPane.querySelector('#pkmbx-dex-close').onclick=closeBox;
  bindPcTabs(dexPane);
  const field=(id,fn)=>{dexPane.querySelector(id).onchange=e=>{fn(e.target.value);dexPage=0;renderDex();};};
  dexPane.querySelector('#pkmbx-dex-search').oninput=e=>{dexQuery=e.target.value;dexPage=0;renderDex();};
  field('#pkmbx-dex-gen',v=>dexGen=Number(v));
  field('#pkmbx-dex-status',v=>dexStatus=v);
  field('#pkmbx-dex-rarity',v=>dexRarity=Number(v));
  field('#pkmbx-dex-type',v=>dexType=v);
  field('#pkmbx-dex-order',v=>dexSort=v);
  dexPane.querySelector('#pkmbx-dex-discovered').onclick=()=>{
   dexStatus=dexStatus==='owned'?'all':'owned';dexPage=0;
   dexPane.querySelector('#pkmbx-dex-status').value=dexStatus;
   renderDex();
  };
  dexPane.querySelector('#pkmbx-dex-fav').onclick=()=>{dexFavorites=!dexFavorites;dexPage=0;renderDex();};
  const panel=dexPane.querySelector('#pkmbx-dex-filters'),toggle=dexPane.querySelector('#pkmbx-dex-sort-toggle');
  const show=on=>{panel.hidden=!on;toggle.setAttribute('aria-expanded',String(on));};
  toggle.onclick=()=>show(panel.hidden);
  dexPane.querySelector('#pkmbx-dex-sort-close').onclick=()=>show(false);
  dexPane.querySelector('#pkmbx-dex-clear').onclick=()=>{
   dexQuery='';dexGen=0;dexRarity=0;dexStatus='all';dexType='';dexSort='num';dexFavorites=false;dexPage=0;
   for(const id of ['#pkmbx-dex-search','#pkmbx-dex-gen','#pkmbx-dex-rarity','#pkmbx-dex-status','#pkmbx-dex-type','#pkmbx-dex-order'])
    dexPane.querySelector(id).value=id==='#pkmbx-dex-search'?'':id==='#pkmbx-dex-status'?'all':id==='#pkmbx-dex-order'?'num':id==='#pkmbx-dex-type'?'':'0';
   renderDex();show(false);
  };
  dexPane.querySelector('#pkmbx-dex-prev').onclick=()=>{dexPage--;renderDex();};
  dexPane.querySelector('#pkmbx-dex-next').onclick=()=>{dexPage++;renderDex();};
 }
 function pokedexIcon(){
  // Editable vector inspired by the classic Gen 1 red handheld Pokédex.
  return '<svg class="pkmbx-gen1-icon" viewBox="0 0 48 48" width="39" height="39" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'+
   '<rect x="6" y="2" width="35" height="44" rx="5" fill="#d72e39" stroke="#631b30" stroke-width="2"/>'+
   '<rect x="10" y="6" width="27" height="4" rx="2" fill="#f57c79"/>'+
   '<circle cx="14" cy="17" r="5" fill="#b9efff" stroke="#31506a" stroke-width="2"/>'+
   '<circle cx="25" cy="15" r="2" fill="#64d8ba"/><circle cx="32" cy="15" r="2" fill="#f6c36b"/>'+
   '<rect x="10" y="23" width="27" height="13" rx="2" fill="#203c4d" stroke="#7bdbcd" stroke-width="2"/>'+
   '<rect x="14" y="26" width="19" height="7" rx="1" fill="#6ed0b6"/>'+
   '<path d="M16 30h15" stroke="#2a725e" stroke-width="2"/>'+
   '<rect x="12" y="39" width="12" height="3" rx="1" fill="#293b4b"/>'+
   '<circle cx="32" cy="40" r="3" fill="#f5d36f" stroke="#5c3040"/>'+
   '</svg>';
 }
 function renderDex(){
  if(!dexPane?.isConnected)return;
  const s=currentSave()||{},nums=Object.keys(G.DEX_BY||{}).map(Number)
   .filter(n=>Number.isSafeInteger(n)&&n>0&&n<=1025&&G.DEX_BY[n]).sort((a,b)=>a-b);
  const favorites=new Set((Hub.valid(s)?s.pkmsvvBox:listPreview()).filter(x=>x.favorite).map(x=>x.dex));
  const q=dexQuery.trim().toLocaleLowerCase();
  const has=n=>G.PKMSVVDexDefeats?.unlocked?.(s,n)??!!(s.owned?.[n]||s.shiny?.[n]);
  const list=nums.filter(n=>{
   const p=G.DEX_BY[n];
   if(q&&!String(n).includes(q)&&!monName(n).toLocaleLowerCase().includes(q))return false;
   if(dexGen&&p.gen!==dexGen)return false;
   if(dexFavorites&&!favorites.has(n))return false;
   if(dexType&&!(p.types||[]).includes(dexType))return false;
   if(dexStatus==='owned'&&!has(n))return false;
   if(dexStatus==='missing'&&has(n))return false;
   if(dexStatus==='shiny'&&!s.shiny?.[n])return false;
   if(dexRarity&&(dexRarity===5?!(p.rarity>=5):p.rarity!==dexRarity))return false;
   return true;
  });
  if(dexSort==='name')list.sort((a,b)=>monName(a).localeCompare(monName(b))||a-b);
  else if(dexSort==='rar')list.sort((a,b)=>(G.DEX_BY[b].rarity||0)-(G.DEX_BY[a].rarity||0)||a-b);
  else if(dexSort==='new')list.sort((a,b)=>(Number(s.owned?.[b]?.at)||0)-(Number(s.owned?.[a]?.at)||0)||a-b);
  else if(dexSort==='used')list.sort((a,b)=>(Number(s.pused?.[b])||0)-(Number(s.pused?.[a])||0)||a-b);
  const pages=Math.max(1,Math.ceil(list.length/DEX_PAGE));dexPage=Math.min(Math.max(0,dexPage),pages-1);
  const host=dexPane.querySelector('#pkmbx-dex-list');host.replaceChildren();
  if(!list.length)host.innerHTML='<p class="pkmbx-dex-empty">'+L('Không có Pokémon phù hợp bộ lọc.','No Pokémon match these filters.')+'</p>';
  for(const dex of list.slice(dexPage*DEX_PAGE,(dexPage+1)*DEX_PAGE)){
   const b=doc.createElement('button');b.type='button';
   b.className='pkmbx-dex-card'+(infoDex===dex?' focused':'')+(has(dex)?'':' is-undefeated');
   b.innerHTML='<canvas width="56" height="56"></canvas><span>#'+dex+(favorites.has(dex)&&has(dex)?' ★':'')+'</span><b>'+ (has(dex)?clean(monName(dex)):'???')+'</b>';
   b.onclick=()=>{infoDex=dex;dexShinyView=false;renderDex();};
   host.appendChild(b);draw(b.querySelector('canvas'),dex,false,false,!has(dex));
  }
  dexPane.querySelector('#pkmbx-dex-pages').textContent=(dexPage+1)+' / '+pages;
  dexPane.querySelector('#pkmbx-dex-prev').disabled=dexPage===0;
  dexPane.querySelector('#pkmbx-dex-next').disabled=dexPage>=pages-1;
  dexPane.querySelector('#pkmbx-dex-count').textContent=list.length+' / '+nums.length+' Pokémon';
  const discoveredButton=dexPane.querySelector('#pkmbx-dex-discovered');
  discoveredButton.classList.toggle('gold',dexStatus==='owned');
  discoveredButton.setAttribute('aria-pressed',String(dexStatus==='owned'));
  const favButton=dexPane.querySelector('#pkmbx-dex-fav');favButton.classList.toggle('gold',dexFavorites);
  favButton.setAttribute('aria-pressed',String(dexFavorites));
  if(!list.includes(infoDex))infoDex=list[0]||null;
  const mon=G.DEX_BY?.[infoDex],detail=dexPane.querySelector('#pkmbx-dex-details');
  const primaryDexType=String(mon?.types?.[0]||'normal').toLowerCase();
  detail.style.setProperty('--pkmbx-type',TYPE_FRAME_COLORS[primaryDexType]||'#e64a93');
  if(!mon){detail.innerHTML='<p>'+L('Không có Pokémon phù hợp.','No matching species.')+'</p>';return;}
  if(!has(infoDex)){
   detail.classList.add('pkmbx-dex-undefeated');
   detail.innerHTML='<div class="pkmbx-hub-hero"><canvas id="pkmbx-dex-hero" width="176" height="176"></canvas>'+
    '<strong>#'+infoDex+' · ???</strong><p>'+L('Chưa phát hiện Pokémon này. Hạ gục trong Khám phá hoặc tiến hóa thành loài này để mở Pokédex và Chiêu mộ.',
     'Not discovered. Defeat it in Explore or evolve into this species to unlock Pokédex and Recruitment.')+'</p></div>';
   draw(detail.querySelector('#pkmbx-dex-hero'),infoDex,false,true,true);
   return;
  }
  detail.classList.remove('pkmbx-dex-undefeated');
  const owned=has(infoDex),from=evoRules().filter(r=>r.to===infoDex),to=evoRules().filter(r=>r.from===infoDex);
  const evos=(label,rules,target)=>'<section class="pkmbx-dex-evo"><h4>'+label+'</h4>'+
   (rules.length?rules.slice(0,15).map(r=>'<button type="button" data-evo-dex="'+r[target]+'" class="btn small">'+
    clean(monName(r[target]))+' (#'+r[target]+') · '+clean(evoLabel(r))+'</button>').join(''):
    '<p>'+L('Không có dữ liệu tiến hóa trong game.','No evolution records for this species.')+'</p>')+'</section>';
  const rarity=['',L('Thường','Common'),L('Khá hiếm','Uncommon'),L('Hiếm','Rare'),L('Sử thi','Epic'),L('Huyền thoại','Legendary')][Math.min(Number(mon.rarity)||1,5)];
  // The Pokédex displays all species abilities and their gameplay benefits.
  // Equipped Nature/Ability/TMs remain available in the individual's PokéBox.
  const possibleAbilities=[...new Set((G.DEX_ABIL?.[infoDex]||[]).filter(Boolean))];
  const abilityRows=possibleAbilities.map(id=>
   '<div class="pkmbx-dex-ability-row"><strong>'+clean(abilityName(id))+'</strong>'+
   '<span>'+clean(abilityBenefit(id,infoDex))+'</span></div>').join('');
  const used=Number(s.pused?.[infoDex]);
  const statLine=Number.isFinite(used)&&used>0?'<p>'+L('Lượt sử dụng: ','Times used: ')+used.toLocaleString(G.I18n?.lang==='en'?'en-US':'vi-VN')+'</p>':'';
  const shinyAvailable=!!s.shiny?.[infoDex];
  if(!shinyAvailable)dexShinyView=false;
  detail.innerHTML='<div class="pkmbx-hub-hero"><canvas id="pkmbx-dex-hero" width="176" height="176"></canvas>'+
   '<div><strong>'+clean(monName(infoDex))+'</strong><div class="pkmbx-dex-badges">'+
    '<span class="pkmbx-dex-badge">#'+infoDex+'</span>'+
    '<span class="pkmbx-dex-badge">'+clean(rarity)+'</span>'+
    (mon.types||[]).map(t=>'<span class="pkmbx-dex-badge">'+clean(typeName(t))+'</span>').join('')+'</div>'+
    '<p>'+(owned?L('✓ Đã khám phá','✓ Discovered'):L('Chưa sở hữu','Not yet owned'))+'</p>'+
    statLine+'</div></div>'+
   '<div class="pkmbx-dex-variants"><button type="button" data-dex-variant="normal" class="'+(!dexShinyView?'active':'')+'">'+L('Bình thường','Normal')+'</button>'+
   '<button type="button" data-dex-variant="shiny" class="'+(dexShinyView?'active':'')+'" '+(!shinyAvailable?'disabled':'')+'>✨ Shiny</button></div>'+
   '<div class="pkmbx-dex-summary"><h4>'+L('Đặc tính','Abilities')+'</h4>'+
   (abilityRows||'<p>'+L('Chưa có dữ liệu','No data')+'</p>')+'</div>'+
   evos(L('Tiến hóa từ','Evolves from'),from,'from')+
   evos(L('Tiến hóa thành','Evolves into'),to,'to');
  draw(detail.querySelector('#pkmbx-dex-hero'),infoDex,dexShinyView,true,!owned);
  for(const variant of detail.querySelectorAll('[data-dex-variant]'))variant.onclick=()=>{
   if(variant.dataset.dexVariant==='shiny'&&!shinyAvailable)return;
   dexShinyView=variant.dataset.dexVariant==='shiny';renderDex();
  };
  for(const button of detail.querySelectorAll('[data-evo-dex]'))button.onclick=()=>{
   infoDex=Number(button.dataset.evoDex);dexQuery='';dexPane.querySelector('#pkmbx-dex-search').value='';dexGen=0;dexStatus='all';
   dexPage=0;dexPane.querySelector('#pkmbx-dex-gen').value='0';dexPane.querySelector('#pkmbx-dex-status').value='all';
   dexRarity=0;dexType='';dexFavorites=false;
   dexPane.querySelector('#pkmbx-dex-rarity').value='0';dexPane.querySelector('#pkmbx-dex-type').value='';
   renderDex();
  };
 }
 function openDex(){
  if(!currentSave())return;
  if(!boxPane?.isConnected){
   dexQuery='';dexPage=0;infoDex=Number(currentSave()?.partner)||1;
   openPC('dex');
  }else showPC('dex');
 }
 function closeDex(){closeBox();}
 function syncMenu(){
  const extra=doc.querySelector('#scr-menu [data-go="dex"]');
  const original=doc.querySelector('#scr-menu #pkmsvv-menu-wiki');
  $('pkmsvv-pokebox-button')?.remove();
  // Keep the original PC that already owns Support, Mega, Berry and the guide.
  // Only remove the newer duplicated launcher, never the real PC.
  if(original&&extra){
    // The Pokémon hub stays Pokémon. "Khám phá" is the separate Play
    // launcher [data-go=play], not the [data-go=dex] collection menu.
    extra.setAttribute('aria-label','Pokémon');
    const label=extra.querySelector('.pkmsvv-menu-label, strong, .menu-label');
    if(label)label.textContent='Pokémon';
   }
  if(extra){
   const sub=extra.querySelector('.pkmsvv-menu-copy small, small');
   if(sub)sub.textContent=L('PokéBox · Pokédex · Nâng cấp','PokéBox · Pokédex · Upgrades');
  }
  if(original){
   const sub=original.querySelector('.pkmsvv-menu-copy small, small');
   if(sub)sub.textContent=L('Pokémon hỗ trợ · Mega · Berry','Support Pokémon · Mega · Berries');
  }
 }
 // The collection is visible even on old saves. A one-click, explicitly
 // requested migration lives here rather than behind a different menu.
 // Never infer historical duplicates: legacy owned[] is per species only.
 function migrateLegacyFromBox(){
  const s=currentSave();
  if(getStored()||!s||G.DB?.guest)return false;
  if(!confirm(L('Tạo bản sao lưu an toàn rồi kích hoạt PokéBox? Các lượt Chiêu mộ cũ không lưu bản trùng sẽ không thể khôi phục.',
   'Back up the current save and enable individual PokéBox? Older duplicates were not recorded and cannot be recovered.')))return false;
  try{
   const backup=G.PKMSVVSaveUI?.backup?.();
   if(typeof backup!=='string'||!backup)throw Error('Save backup is unavailable');
   const session=JSON.parse(localStorage.getItem('ps.session')||'null');
   if(typeof session!=='string'||!/^[a-z0-9_ñáéíóú-]{2,48}$/i.test(session))
    throw Error('Active offline profile not found');
   const key='pkmsvv.prepokebox.'+session;
   if(!localStorage.getItem(key))localStorage.setItem(key,backup);
   if(!localStorage.getItem(key))throw Error('Backup storage failed');
   Box.persistMigration();
   if(!getStored())throw Error('PokéBox migration was not saved');
   onlyRankReady=false;page=0;
   const filter=boxPane?.querySelector('#pkmbx-ready');if(filter)filter.checked=false;
   G.UI?.toast?.(L('Đã kích hoạt PokéBox. Các lượt Chiêu mộ mới sẽ có bản trùng riêng.',
     'PokéBox activated. New Recruitment pulls now track duplicates.'),3600);
   renderBox();return true;
  }catch(error){
   G.UI?.toast?.(L('Chưa chuyển PokéBox: ','Migration stopped: ')+error.message,3800);
   return false;
  }
 }
 // Keep migration in Save Management, never in the regular PokéBox UI.
 // It is explicit and reversible: original JSON is saved under the profile
 // BEFORE converting. If backup persistence fails, conversion is blocked.
 function attachMigrationToSaveManager(){
  const wrap=doc.querySelector('#scr-pkmsvv-save-quick .pkm-backup');
  const s=currentSave();
  if(!wrap||!s||G.DB?.guest||getStored()||wrap.querySelector('#pkmbx-save-migration'))return;
  const section=doc.createElement('details');
  section.id='pkmbx-save-migration';
  section.setAttribute('translate','no');
  section.innerHTML='<summary>'+L('Dữ liệu PokéBox','PokéBox Data')+'</summary>'+
   '<button class="btn small" type="button" id="pkmbx-save-convert">'+
    L('Chuyển dữ liệu','Migrate Collection')+'</button>';
  wrap.appendChild(section);
  section.querySelector('#pkmbx-save-convert').onclick=()=>{
   if(!confirm(L('Chuyển bộ sưu tập sang PokéBox? Bản lưu cũ sẽ được giữ riêng.',
    'Convert this collection to PokéBox? The old save will be kept separately.')))return;
   const button=section.querySelector('#pkmbx-save-convert');button.disabled=true;
   try{
    const text=G.PKMSVVSaveUI?.backup?.();
    if(typeof text!=='string'||!text)throw Error('Save backup unavailable');
    const session=JSON.parse(localStorage.getItem('ps.session')||'null');
    if(typeof session!=='string'||!/^[a-z0-9_ñáéíóú-]{2,48}$/i.test(session))
     throw Error('Active offline profile not found');
    const key='pkmsvv.prepokebox.'+session;
    if(!localStorage.getItem(key))localStorage.setItem(key,text);
    if(!localStorage.getItem(key))throw Error('Could not preserve old save');
    const result=Box.persistMigration();
    if(!result||!Hub.valid(currentSave()))throw Error('PokéBox conversion was not saved');
    G.UI?.toast?.(L('Đã cập nhật PokéBox','PokéBox collection updated'),2300);
    section.remove();
    if(boxPane?.isConnected)renderBox();
   }catch(error){
    alert(L('Không thể chuyển dữ liệu: ','Could not migrate: ')+error.message);
   }finally{button.disabled=false;}
  };
 }
 function installSaveManagerHook(){
  // The original Save UI binds #btn-backup to a closed-over function,
  // so support both direct method calls and the existing toolbar action.
  if(G.PKMSVVSaveUI?.openQuick&&!G.PKMSVVSaveUI._pkmbxMigrationHook){
   const old=G.PKMSVVSaveUI.openQuick;
   G.PKMSVVSaveUI.openQuick=function(...args){
    const result=old.apply(this,args);
    Promise.resolve().then(attachMigrationToSaveManager);
    return result;
   };
   G.PKMSVVSaveUI._pkmbxMigrationHook=true;
  }
  doc.addEventListener('click',event=>{
   if(event.target?.closest?.('#btn-backup'))Promise.resolve().then(attachMigrationToSaveManager);
  },true);
 }
 let menuInitialized=false;
 function init(){
  if(menuInitialized)return;
  menuInitialized=true;
  if(G.Mons)Hub.installMons(G.Mons);
  installSaveManagerHook();
  if(G.MenuUI?.openDex&&!G.MenuUI._pkmbxReadonlyDex){
   G.MenuUI.openDex=openDex;
   G.MenuUI._pkmbxReadonlyDex=true;
  }
  if(/Pok[eé]mon Sinh T[oồ]n/i.test(doc.title))doc.title='Pokémon Chuyển Sinh — Votri Valley';

  // The Stage 2 overlay is retained, but Rank works on the *focused* individual.
  Box.focusedId=()=>focused||currentSave()?.pkmsvvSelectedInstanceId||null;
  Box.open=openBox; // External PokéBox actions still open the Box tab.
  if(G.MenuUI?.open&&!G.MenuUI._pkmbxHubWrapped){
   const old=G.MenuUI.open;
   G.MenuUI.open=function(...args){const ret=old.apply(this,args);syncMenu();return ret;};
   G.MenuUI._pkmbxHubWrapped=true;
  }
  doc.addEventListener('click',e=>{
   const b=e.target?.closest?.('#scr-menu [data-go="dex"], #pkmsvv-pokebox-button, #scr-menu [data-go="bag"]');
   if(!b)return;
   if(b.matches('[data-go="bag"]')){
    e.preventDefault();e.stopImmediatePropagation();
    // Main-menu Bag is the native Kecleon inventory, NOT a PokéBox tab.
    // Preserve its Mint/Capsule/TM/Berry picker and normal controller focus.
    if(typeof G.KecleonUI?.open==='function')G.KecleonUI.open('bag');
    else G.UI?.toast?.(L('Túi đồ đang tải.','Bag is loading.'),2200);
    return;
   }
   e.preventDefault();e.stopImmediatePropagation();
   openBox();
  },true);
  syncMenu();
 }
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 G.PKMSVVBoxHubUI={openBox,openDex,openUpgrades,closeBox,closeDex,renderBox,renderDex,currentTab,cycleTab,PC_TAB_ORDER,
  focus:chooseFocus,focusedId:()=>focused};
})();
