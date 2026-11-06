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
 const currentSave=()=>G.DB?.save;
 let boxPane=null,dexPane=null,focused=null,infoDex=1,query='',onlyFavorites=false,onlyShiny=false,
  view='info',page=0,dexQuery='',dexPage=0,
  dexGen=0,dexRarity=0,dexStatus='all',dexType='',dexSort='num',dexFavorites=false;
 const PAGE=30,DEX_PAGE=35;
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
  const prev=listPreview();
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
 function draw(canvas,dex,shiny=false,hero=false,unknown=false){
  if(!canvas||!G.UI?.sprite)return;
  try{G.UI.sprite(canvas,dex,{lively:hero,spin:hero,hero,
    silhouette:unknown,scale:hero?3:2,shiny});}
  catch(_){try{G.UI.sprite(canvas,dex,{scale:2,shiny,silhouette:unknown});}catch(__){}}
 }
 function chooseFocus(id){focused=id;renderBox();}
 function badgeText(x){return '#'+x.dex+(x.shiny?' ✨':'')+' · R'+x.rank;}
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
 function slot(it,selected,pre=false,members){
  const b=doc.createElement('button');b.type='button';
  b.className='pkmbx-slot pkmbx-hub-slot'+(it.id===focused?' focused':'')+
   (it.id===selected?' selected':'');
  const team=(members||new Set(Hub.team(currentSave()))).has(it.id);
  b.innerHTML='<canvas width="76" height="76"></canvas>'+
   '<span class="pkmbx-name">'+clean(monName(it.dex))+'</span>'+
   '<small>'+clean(badgeText(it))+'</small>'+
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
  const abilityData=G.ABIL?.[ability?.id],desc=Array.isArray(abilityData)?
   (typeof abilityData[2]==='string'?abilityData[2]:''):
   (typeof abilityData?.description==='string'?abilityData.description:'');
  const attr={hp:L('Máu','HP'),pa:L('Tấn công','Attack'),sa:L('Đặc công','Sp. Atk'),
   df:L('Phòng thủ','Defense'),sd:L('Đặc thủ','Sp. Def'),spd:L('Tốc độ','Speed')};
  const natureHint=nature?.up&&nature?.down?
   L('Tăng 10% ','+10% ')+attr[nature.up]+L(' · Giảm 10% ',' · −10% ')+attr[nature.down]:
   L('Tính cách trung tính, không tăng/giảm chỉ số.','Neutral Nature: no stat increases or penalties.');
  const statRows=['hp','pa','sa','df','sd','spd'].map(k=>{
   const base=Number(G.DEX_BY?.[it.dex]?.[k]);
   if(!Number.isFinite(base))return '';
   const mult=nature?.up===k?1.1:nature?.down===k?0.9:1;
   const val=base*mult;
   const badge=mult===1?'':('<b class="'+(mult>1?'pkmbx-stat-plus':'pkmbx-stat-minus')+'">'+
    (mult>1?'+10%':'−10%')+'</b>');
   return '<div class="pkmbx-hub-stat"><span>'+attr[k]+'</span><strong>'+
    (Number.isInteger(val)?val.toLocaleString('vi-VN'):val.toFixed(1))+'</strong>'+badge+'</div>';
  }).join('');

  const mon=G.DEX_BY?.[it.dex];
  const types=mon?.types||[];
  const team=Hub.team(currentSave()),member=team.includes(it.id);
  profile.innerHTML='<div class="pkmbx-hub-hero"><canvas id="pkmbx-hero" width="176" height="176"></canvas>'+
    '<div><strong>'+clean(monName(it.dex))+'</strong><p>'+clean(badgeText(it))+'</p>'+
    '<p>'+types.map(typeName).map(clean).join(' · ')+'</p></div></div>'+
    '<div class="pkmbx-hub-info">'+
    '<p><b>'+L('Tính cách','Nature')+':</b> '+clean(natureName(it.natureId))+'</p>'+ 
    '<p class="pkmbx-hint">'+clean(natureHint)+'</p>'+
    '<p><b>'+L('Đặc tính','Ability')+':</b> '+clean(abText)+'</p>'+ 
    (desc?'<p class="pkmbx-hint">'+clean(desc)+'</p>':'')+
    '<p><b>'+L('TM đã học','Learned TMs')+':</b> '+(Hub.learned(currentSave(),it)
      .map(id=>clean(G.Moves?.BY_ID?.[id]?G.T(G.Moves.BY_ID[id].name,'move'):id)).join(', ')||L('Chưa có','None'))+'</p>'+
    '</div><div class="pkmbx-hub-buttons">'+
    '<button class="btn small gold" id="pkmbx-use" '+(G.DB?.guest||isCurrent?'disabled':'')+'>'+
     (isCurrent?L('✓ Đang sử dụng','✓ Active'):L('✓ Chọn ra trận','✓ Set Active'))+'</button>'+
    '<button class="btn small" id="pkmbx-star" '+(G.DB?.guest?'disabled':'')+'>'+
     (it.favorite?L('★ Bỏ yêu thích','★ Unfavorite'):L('☆ Yêu thích','☆ Favorite'))+'</button>'+
    '<button class="btn small" id="pkmbx-team" '+(G.DB?.guest?'disabled':'')+'>'+
     (member?L('− Rút khỏi đội','− Remove from Team'):L('+ Vào đội hình','+ Add to Team'))+'</button>'+
    '</div><div class="pkmbx-hub-tabs">'+
    '<button class="btn small'+(view==='info'?' gold':'')+'" data-box-tab="info">'+L('Thông tin','Details')+'</button>'+
    '<button class="btn small'+(view==='items'?' gold':'')+'" data-box-tab="items">'+L('Vật phẩm / TM','Items / TMs')+'</button>'+
    '<button class="btn small'+(view==='rank'?' gold':'')+'" data-box-tab="rank">⭐ Rank</button></div>'+
    '<div class="pkmbx-hub-tab-content" id="pkmbx-tab-content"></div>';
  draw(profile.querySelector('#pkmbx-hero'),it.dex,it.shiny,true);
  profile.querySelector('#pkmbx-use').onclick=()=>saveAction(()=>{
   if(ready){
    if(!Hub.safeSelect(it.id))throw Error('Could not select this Pokémon');
   }else legacySelect(it);
   G.UI?.toast?.(L('Đã chọn ','Selected ')+monName(it.dex),2400);
  });
  profile.querySelector('#pkmbx-star').onclick=()=>saveAction(()=>ready?Hub.toggleFavorite(it.id):legacyFavorite(it));
  profile.querySelector('#pkmbx-team').onclick=()=>saveAction(()=>Hub.toggleTeam(it.id));
  for(const b of profile.querySelectorAll('[data-box-tab]'))
   b.onclick=()=>{view=b.dataset.boxTab;renderBox();};
  if(view==='items')renderItems(profile.querySelector('#pkmbx-tab-content'),it,ready);
  else if(view==='rank')renderRank(profile.querySelector('#pkmbx-tab-content'),it,ready);
  else{
   const stats=G.PKMSVVBox2?.formatRank(it.rank);
   profile.querySelector('#pkmbx-tab-content').innerHTML='<h3>'+L('Chỉ số Pokémon (theo tính cách)','Pokémon stats (with Nature)')+'</h3>'+ 
    '<div class="pkmbx-hub-stats">'+statRows+'</div>'+ 
    (ready&&it.rank?'<p>'+L('Tăng HP & sát thương: ','HP & damage: ')+'+'+(stats?.hp||0)+'%</p>':'');
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
 function renderRank(host,it,ready){
  const data=G.PKMSVVBox2?.formatRank(it.rank);
  host.innerHTML='<section class="pkmbx-hub-rank"><h3>⭐ Rank '+it.rank+'/5</h3>'+
    '<p>'+L('HP & sát thương: ','HP & damage: ')+'+'+(data?.hp||0)+'%'+
    (it.rank>=4?' · '+L('Hồi chiêu −5%','Cooldown −5%'):'')+'</p>'+
    
    '<button id="pkmbx-rank-direct" class="btn gold" '+(!ready?'disabled':'')+'>'+
     L('⭐ Nâng Rank / Chọn đặc tính','⭐ Rank Up / Choose Trait')+'</button></section>';
  host.querySelector('#pkmbx-rank-direct').onclick=()=>{
   // The Stage 2 Rank panel reads Box.focusedId() rather than forcing the
   // selected active fighter to change merely to work on another individual.
   Rank()?.open?.();
  };
 }
 function ensureBox(){
  if(boxPane?.isConnected)return;
  boxPane=doc.createElement('div');boxPane.id='pkmsvv-pokebox-overlay';
  boxPane.setAttribute('translate','no');
  boxPane.innerHTML='<section class="pkmbx-panel pkmbx-hub-panel" role="dialog" aria-modal="true" aria-label="PokéBox">'+
   '<header class="pkmbx-head"><h2>📦 PokéBox</h2><button class="btn small" id="pkmbx-close">'+L('✕ Đóng','✕ Close')+'</button></header>'+
   '<div class="pkmbx-hub-team-title"><h3>'+L('Đội hình 6 Pokémon sẵn sàng','Ready Team of 6')+'</h3><b id="pkmbx-team-count">0/6</b></div>'+
   '<div id="pkmbx-six" class="pkmbx-team-six"></div>'+
   '<div class="pkmbx-actions pkmbx-hub-tools">'+
   '<input type="search" id="pkmbx-query" autocomplete="off" placeholder="'+L('Tìm Pokémon / #Dex','Search Pokémon / #Dex')+'"/>'+
   '<label><input type="checkbox" id="pkmbx-favorite"/> '+L('★ Yêu thích','★ Favorites')+'</label>'+
   '<label><input type="checkbox" id="pkmbx-shiny"/> Shiny</label></div>'+
   '<div class="pkmbx-hub-main"><div class="pkmbx-hub-left">'+
   '<div class="pkmbx-grid" id="pkmbx-grid"></div><nav class="pkmbx-page">'+
   '<button class="btn small" id="pkmbx-prev">◀</button><span id="pkmbx-pagenum">1/1</span>'+
   '<button class="btn small" id="pkmbx-next">▶</button></nav></div>'+
   '<aside id="pkmbx-profile" class="pkmbx-profile"></aside></div></section>';
  doc.body.appendChild(boxPane);
  boxPane.querySelector('#pkmbx-close').onclick=closeBox;
  boxPane.addEventListener('click',e=>{if(e.target===boxPane)closeBox();});
  boxPane.querySelector('#pkmbx-query').oninput=e=>{query=e.target.value;page=0;renderBox();};
  boxPane.querySelector('#pkmbx-favorite').onchange=e=>{onlyFavorites=e.target.checked;page=0;renderBox();};
  boxPane.querySelector('#pkmbx-shiny').onchange=e=>{onlyShiny=e.target.checked;page=0;renderBox();};
  boxPane.querySelector('#pkmbx-prev').onclick=()=>{page=Math.max(0,page-1);renderBox();};
  boxPane.querySelector('#pkmbx-next').onclick=()=>{page++;renderBox();};
 }
 function renderBox(){
  if(!boxPane?.isConnected)return;
  const s=currentSave(),ready=getStored(),items=listPreview();
  const q=query.trim().toLocaleLowerCase();
  const shown=items.filter(x=>(!onlyFavorites||x.favorite)&&(!onlyShiny||x.shiny)&&
   (!q||monName(x.dex).toLocaleLowerCase().includes(q)||String(x.dex).includes(q)));
  const pages=Math.max(1,Math.ceil(shown.length/PAGE));page=Math.max(0,Math.min(page,pages-1));
  const selected=ready?Hub.active(s)?.id:
   items.find(x=>x.dex===Number(s?.partner)&&x.shiny===!!s?.partnerShiny)?.id;
  const grid=boxPane.querySelector('#pkmbx-grid');grid.replaceChildren();
  const members=new Set(Hub.team(s));
  for(const x of shown.slice(page*PAGE,(page+1)*PAGE))
   grid.appendChild(slot(x,selected,!ready,members));
  if(!focused||!items.some(x=>x.id===focused))focused=selected||items[0]?.id||null;
  boxPane.querySelector('#pkmbx-pagenum').textContent=(page+1)+' / '+pages;
  boxPane.querySelector('#pkmbx-prev').disabled=page===0;
  boxPane.querySelector('#pkmbx-next').disabled=page>=pages-1;
  renderTeam(boxPane,s,items);
  renderStats(boxPane,focusedItem(),ready);
 }
 function openBox(nextView='info'){
  if(!currentSave())return;
  if(boxPane?.isConnected)boxPane.remove();
  boxPane=null;view=['items','rank','info'].includes(nextView)?nextView:'info';
  page=0;query='';onlyFavorites=false;onlyShiny=false;
  const s=currentSave();
  focused=Hub.active(s)?.id||listPreview().find(x=>x.dex===Number(s?.partner)&&x.shiny===!!s?.partnerShiny)?.id||null;
  ensureBox();renderBox();
 }
 function closeBox(){boxPane?.remove();boxPane=null;}
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
  dexPane=doc.createElement('div');dexPane.id='pkmbx-dex-overlay';dexPane.setAttribute('translate','no');
  dexPane.innerHTML='<section class="pkmbx-panel pkmbx-dex-panel" role="dialog" aria-modal="true" aria-label="Pokédex">'+
   '<header class="pkmbx-head"><h2 class="pkmbx-dex-heading">'+pokedexIcon()+' Pokédex</h2><button class="btn small" id="pkmbx-dex-close">'+L('✕ Đóng','✕ Close')+'</button></header>'+
   '<p class="pkmbx-note">'+L('Tra cứu Pokémon, chỉ số và tiến hóa. Chọn ra trận hoặc yêu thích tại PokéBox.','Search species, stats and evolutions. Set a fighter or favorite in PokéBox.')+'</p>'+
   '<div class="pkmbx-dex-toolbar"><input id="pkmbx-dex-search" type="search" autocomplete="off" placeholder="'+L('Tìm tên Pokémon hoặc số Pokédex','Search Pokémon name or Dex number')+'"/>'+
   '<button type="button" class="btn small" id="pkmbx-dex-fav" aria-pressed="false">'+L('☆ Yêu thích','☆ Favorites')+'</button>'+
   '<button type="button" class="btn small" id="pkmbx-dex-sort-toggle" aria-expanded="false">'+L('☷ Sắp xếp / Lọc','☷ Sort / Filter')+'</button></div>'+
   '<div class="pkmbx-dex-filters" id="pkmbx-dex-filters" hidden>'+
   '<label>'+L('Thế hệ','Generation')+'<select id="pkmbx-dex-gen"><option value="0">'+L('Tất cả Gen','All generations')+'</option>'+genOptions+'</select></label>'+
   '<label>'+L('Tình trạng','Collection')+'<select id="pkmbx-dex-status"><option value="all">'+L('Tất cả','All')+'</option>'+
    '<option value="owned">'+L('Đã có','Owned')+'</option><option value="missing">'+L('Chưa có','Missing')+'</option><option value="shiny">Shiny</option></select></label>'+
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
  doc.body.appendChild(dexPane);
  dexPane.querySelector('#pkmbx-dex-close').onclick=closeDex;
  dexPane.addEventListener('click',e=>{if(e.target===dexPane)closeDex();});
  const field=(id,fn)=>{dexPane.querySelector(id).onchange=e=>{fn(e.target.value);dexPage=0;renderDex();};};
  dexPane.querySelector('#pkmbx-dex-search').oninput=e=>{dexQuery=e.target.value;dexPage=0;renderDex();};
  field('#pkmbx-dex-gen',v=>dexGen=Number(v));
  field('#pkmbx-dex-status',v=>dexStatus=v);
  field('#pkmbx-dex-rarity',v=>dexRarity=Number(v));
  field('#pkmbx-dex-type',v=>dexType=v);
  field('#pkmbx-dex-order',v=>dexSort=v);
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
  const has=n=>!!(s.owned?.[n]||s.shiny?.[n]);
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
   b.className='pkmbx-dex-card'+(infoDex===dex?' focused':'');
   b.innerHTML='<canvas width="56" height="56"></canvas><span>#'+dex+(favorites.has(dex)?' ★':'')+'</span><b>'+clean(monName(dex))+'</b>';
   b.onclick=()=>{infoDex=dex;renderDex();};
   host.appendChild(b);draw(b.querySelector('canvas'),dex,false,false,!has(dex));
  }
  dexPane.querySelector('#pkmbx-dex-pages').textContent=(dexPage+1)+' / '+pages;
  dexPane.querySelector('#pkmbx-dex-prev').disabled=dexPage===0;
  dexPane.querySelector('#pkmbx-dex-next').disabled=dexPage>=pages-1;
  dexPane.querySelector('#pkmbx-dex-count').textContent=list.length+' / '+nums.length+' Pokémon';
  const favButton=dexPane.querySelector('#pkmbx-dex-fav');favButton.classList.toggle('gold',dexFavorites);
  favButton.setAttribute('aria-pressed',String(dexFavorites));
  if(!list.includes(infoDex))infoDex=list[0]||null;
  const mon=G.DEX_BY?.[infoDex],detail=dexPane.querySelector('#pkmbx-dex-details');
  if(!mon){detail.innerHTML='<p>'+L('Không có Pokémon phù hợp.','No matching species.')+'</p>';return;}
  const owned=has(infoDex),from=evoRules().filter(r=>r.to===infoDex),to=evoRules().filter(r=>r.from===infoDex);
  const evos=(label,rules,target)=>'<section class="pkmbx-dex-evo"><h4>'+label+'</h4>'+
   (rules.length?rules.slice(0,15).map(r=>'<button type="button" data-evo-dex="'+r[target]+'" class="btn small">'+
    clean(monName(r[target]))+' (#'+r[target]+') · '+clean(evoLabel(r))+'</button>').join(''):
    '<p>'+L('Không có dữ liệu tiến hóa trong game.','No evolution records for this species.')+'</p>')+'</section>';
  const rarity=['',L('Thường','Common'),L('Khá hiếm','Uncommon'),L('Hiếm','Rare'),L('Sử thi','Epic'),L('Huyền thoại','Legendary')][Math.min(Number(mon.rarity)||1,5)];
  detail.innerHTML='<div class="pkmbx-hub-hero"><canvas id="pkmbx-dex-hero" width="176" height="176"></canvas>'+
   '<div><strong>'+clean(monName(infoDex))+'</strong><p>#'+infoDex+' · '+clean((mon.types||[]).map(typeName).join(' / '))+'</p>'+
   '<p>'+clean(rarity)+'</p><p>'+ (owned?L('✓ Đã khám phá','✓ Discovered'):L('Chưa sở hữu','Not yet owned'))+'</p></div></div>'+
   evos(L('Tiến hóa từ','Evolves from'),from,'from')+
   evos(L('Tiến hóa thành','Evolves into'),to,'to');
  draw(detail.querySelector('#pkmbx-dex-hero'),infoDex,false,true,!owned);
  for(const button of detail.querySelectorAll('[data-evo-dex]'))button.onclick=()=>{
   infoDex=Number(button.dataset.evoDex);dexQuery='';dexPane.querySelector('#pkmbx-dex-search').value='';dexGen=0;dexStatus='all';
   dexPage=0;dexPane.querySelector('#pkmbx-dex-gen').value='0';dexPane.querySelector('#pkmbx-dex-status').value='all';
   dexRarity=0;dexType='';dexFavorites=false;
   dexPane.querySelector('#pkmbx-dex-rarity').value='0';dexPane.querySelector('#pkmbx-dex-type').value='';
   renderDex();
  };
 }
 function openDex(){
  closeBox();dexPane?.remove();dexPane=null;dexQuery='';dexPage=0;
  infoDex=Number(currentSave()?.partner)||1;ensureDex();renderDex();
 }
 function closeDex(){dexPane?.remove();dexPane=null;}
 function syncMenu(){
  const dex=doc.querySelector('#scr-menu [data-go="dex"]');
  if(!dex)return;
  // The Stage 1 menu inserts a new PokéBox after the old Pokémon button.
  // Reuse those same positions, now showing PokéBox first and Pokédex second.
  let ref=$('pkmsvv-pokebox-button');
  if(!ref){
   ref=doc.createElement('button');ref.id='pkmsvv-pokebox-button';
   ref.className=dex.className;dex.insertAdjacentElement('afterend',ref);
  }
  dex.setAttribute('translate','no');
  const icon=dex.querySelector('.mi-ico'),label=dex.querySelector('.pkmsvv-menu-label');
  if(icon)icon.textContent='📦';
  if(label)label.textContent='PokéBox';
  else dex.innerHTML='<span class="mi-ico">📦</span><span class="pkmsvv-menu-copy"><span class="pkmsvv-menu-label">PokéBox</span><small>'+L('Cá thể · Team 6 · Rank · TM','Individuals · Team 6 · Rank · TMs')+'</small></span>';
  const sub=dex.querySelector('small');if(sub)sub.textContent=L('Cá thể · Team 6 · Rank · TM','Individuals · Team 6 · Rank · TMs');
  ref.setAttribute('translate','no');
  ref.innerHTML='<span class="mi-ico">'+pokedexIcon()+'</span><span class="pkmsvv-menu-copy">'+
   '<span class="pkmsvv-menu-label">Pokédex</span><small>'+L('Tra cứu · Tiến hóa','Species · Evolutions')+'</small></span>';
  ref.onclick=null;
  // Put Pokédex in the FIRST menu row on PC, ahead of PokéBox.
  // Preserve the original button's event route and responsive classes.
  if(dex.parentNode&&ref.previousElementSibling!==null) dex.parentNode.insertBefore(ref,dex);
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
  Box.open=openBox;
  if(G.MenuUI?.open&&!G.MenuUI._pkmbxHubWrapped){
   const old=G.MenuUI.open;
   G.MenuUI.open=function(...args){const ret=old.apply(this,args);syncMenu();return ret;};
   G.MenuUI._pkmbxHubWrapped=true;
  }
  doc.addEventListener('click',e=>{
   const b=e.target?.closest?.('#scr-menu [data-go="dex"], #pkmsvv-pokebox-button, #scr-menu [data-go="bag"]');
   if(!b)return;
   if(b.matches('[data-go="bag"]')){e.preventDefault();e.stopImmediatePropagation();openBox('items');return;}
   e.preventDefault();e.stopImmediatePropagation();
   if(b.id==='pkmsvv-pokebox-button')openDex();
   else openBox('info');
  },true);
  syncMenu();
 }
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 G.PKMSVVBoxHubUI={openBox,openDex,closeBox,closeDex,renderBox,renderDex,
  focus:id=>{focused=id;renderBox();},focusedId:()=>focused};
})();
