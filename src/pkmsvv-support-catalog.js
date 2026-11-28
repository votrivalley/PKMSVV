/* Pokémon Chuyển sinh — Support Pokédex in Upgrades.
 * Uses exactly the main Pokédex renderer: owned sprites in color, others silhouette.
 * Support discoveries are separate from owned / Shiny player Pokémon.
 */
G.PKMSVVSupportCatalog=(()=>{
 const $=id=>document.getElementById(id);
 const t=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const roles={
  attack:['Tấn công','Attack','Tấn công đối thủ gần nhất.','Attacks the nearest enemy.'],
  physical:['Tăng công vật lý','Physical boost','Riolu tăng sát thương chiêu Vật lý trong 8 giây.','Riolu increases Physical move damage for 8 seconds.'],
  special:['Tăng công đặc biệt','Special boost','Wynaut tăng sát thương chiêu Đặc biệt trong 8 giây.','Wynaut increases Special move damage for 8 seconds.'],
  sleep:['Gây ngủ','Sleep','Igglybuff khiến kẻ địch xung quanh ngủ trong thời gian ngắn.','Igglybuff briefly puts nearby enemies to sleep.'],
  paralyze:['Tê liệt','Paralysis','Pichu gây tê liệt tối đa 4 quái trong vùng 95, 1,1 giây; hồi chiêu 10 giây. Boss chỉ 0,35 giây.','Pichu stuns up to 4 foes in a 95-radius area for 1.1s every 10s; bosses for 0.35s.'],
  heal:['Hồi phục','Healing','Hồi máu cho Pokémon chính và tất cả đồng hành còn sống của chính mình.','Heals your lead Pokémon and all your living companions.'],
  shield:['Bảo vệ','Shield','Tạo khiên cho Pokémon chính và tất cả đồng hành của mình; tối đa 25% HP từng mục tiêu.','Shields your own lead Pokémon and companions, capped at 25% of each max HP.'],
  magnet:['Thu hút','Magnet','Thu hút vật phẩm trong tầm.','Attracts nearby pickups.'],
  slow:['Làm chậm','Slow','Cleffa làm chậm nhiều kẻ địch xung quanh.','Cleffa slows several nearby enemies.'],
  ditto:['Biến hình','Transform','Biến thành Pokémon chính và sao chép kỹ năng, sau đó trở lại Ditto để hồi sức.','Copies your lead Pokémon and its moves, then returns to Ditto to recover.'],
  mew:['Sức mạnh tâm linh','Psychic Burst','Liên tục sử dụng đòn đánh diện rộng ngẫu nhiên.','Continuously casts random area attacks.']
 };
 const rarity=dex=>Number(dex)===151?['Siêu hiếm','Super Rare']:Number(dex)===132?['Hiếm','Rare']:['Thường','Common'];
 const seen=dex=>G.PKMSVVEggs?.affinityFor?.(dex)>0;
 const shinySeen=dex=>!!G.DB?.save?.pkmsvvSupportShiny?.[dex]&&seen(dex);
 let selected=null,showShiny=false,fromResearchLab=false,stationTab='support';
 const scroller=()=>$('pkmsvv-support-catalog')?.querySelector('.pkmsvv-support-modal');
 function close(){
  const backToLab=fromResearchLab;fromResearchLab=false;
  const box=$('pkmsvv-support-catalog');if(box)box.hidden=true;
  document.body?.classList?.remove('pkmsvv-support-open');
  if(backToLab)G.PKMSVVWiki?.open?.();
 }
 function ensure(){
  const back=$('pkmsvv-upgrade-back');
  if(back&&!$('pkmsvv-support-entry')){
   const button=document.createElement('button');
   button.type='button';button.id='pkmsvv-support-entry';
   button.className='btn small pkmsvv-support-entry-btn';
   button.textContent=t('✦ Pokémon hỗ trợ','✦ Support Pokémon');
   button.addEventListener('click',open);
   back.parentElement.insertBefore(button,back);
  }
  if($('pkmsvv-support-catalog'))return;
  const wrap=document.createElement('div');
  wrap.id='pkmsvv-support-catalog';wrap.className='pkmsvv-support-overlay';wrap.hidden=true;
  wrap.setAttribute('translate','no'); // all strings already have explicit VI/EN pairs
  const frame=document.createElement('div');frame.className='pkmsvv-support-modal';
  const head=document.createElement('div');head.className='pkmsvv-support-modal-head';
  const title=document.createElement('h2');title.id='pkmsvv-support-heading';
  const x=document.createElement('button');x.type='button';x.className='btn small ghost';
  x.textContent=t('Đóng','Close');x.addEventListener('click',close);
  head.append(title,x);
  const intro=document.createElement('p');intro.id='pkmsvv-support-description';
  const split=document.createElement('div');split.className='pkmsvv-support-layout';
  const grid=document.createElement('div');grid.id='pkmsvv-support-entries';
  const detail=document.createElement('div');detail.id='pkmsvv-support-detail';
  const tabs=document.createElement('div');tabs.id='pkmsvv-support-station-tabs';tabs.setAttribute('role','group');tabs.style.cssText='display:none;gap:8px;flex-wrap:wrap;margin:8px 0';
  for(const kind of ['support','incubator']){
   const b=document.createElement('button');b.type='button';b.className='btn small';b.dataset.supportStationTab=kind;
   b.style.cssText='flex:1 1 135px;white-space:normal;min-height:40px';b.onclick=()=>selectStation(kind,true);tabs.append(b);
  }
  split.append(grid,detail);frame.append(head,tabs,intro,split);wrap.append(frame);
  wrap.addEventListener('click',e=>{if(e.target===wrap)close();});
  document.body.append(wrap);
 }
 function renderDetails(){
  const area=$('pkmsvv-support-detail');if(!area)return;
  area.replaceChildren();
  const m=(G.PKMSVVEggs?.SPECIES||[]).find(x=>x.dex===selected);
  if(!m)return;
  const owned=seen(m.dex),shinyUnlocked=shinySeen(m.dex);
  if(!shinyUnlocked)showShiny=false;
  const title=document.createElement('h3');
  title.textContent=owned?(G.DEX_BY?.[m.dex]?.name||'Pokémon'):'???';
  const rar=document.createElement('span');rar.className='pkmsvv-support-rarity '+(m.dex===151?'super':m.dex===132?'rare':'common');
  rar.textContent=t(...rarity(m.dex));
  // Use canonical species ID even with an outdated/partial cached role object.
  // Show the actual skill BEFORE the art so short/mobile detail panes do not
  // accidentally clip every new support's description below a large canvas.
  const correctedRole=({447:'physical',360:'special',173:'slow',174:'sleep',440:'heal'})[m.dex]||m.role;
  const skillText=roles[correctedRole]||roles.attack;
  if(owned){
   const skill=document.createElement('h4');
   skill.className='pkmsvv-support-skill-title';
   skill.textContent=t(...skillText.slice(0,2));
   const description=document.createElement('p');
   description.className='pkmsvv-support-skill-description';
   description.textContent=t(...skillText.slice(2,4));
   area.append(skill,description);
  }
  const art=document.createElement('canvas');
  art.width=220;art.height=185;art.className='stage pkmsvv-support-stage';
  art.style.setProperty('--stage-c',owned?'#367b87':'#304553');
  area.prepend(title,rar);
  area.append(art);
  // Drawing bugs must never suppress the actual support skill description.
  try{G.UI?.sprite?.(art,m.dex,{
   lively:owned,spin:owned,silhouette:!owned,scale:3,hero:true,
   shiny:owned&&showShiny&&shinyUnlocked
  });}catch(error){console.warn('[Support art]',m.dex,error);}
  if(shinyUnlocked&&showShiny){
   const note=document.createElement('p');
   note.className='pkmsvv-shiny-support-bonus';
   note.textContent=t('✦ Shiny: Hiệu quả hỗ trợ ×2 · Hồi chiêu nhanh',
    '✦ Shiny: Double effect · Faster cooldowns');
   area.append(note);
  }
  if(shinyUnlocked){
   const tabs=document.createElement('div');tabs.className='pkmsvv-support-shiny-tabs';
   for(const variant of [false,true]){
    const b=document.createElement('button');b.type='button';
    b.className='btn small'+(showShiny===variant?' on':'');
    b.textContent=variant?'✦ Shiny':t('Thường','Normal');
    b.addEventListener('click',()=>{showShiny=variant;renderDetails();renderGrid(true);});
    tabs.append(b);
   }
   area.append(tabs);
  }
  if(!owned){
   const lock=document.createElement('p');lock.className='pkmsvv-support-locked-note';
   lock.textContent=t('Chưa khám phá — hãy ấp nở Pokémon này để mở khóa.','Undiscovered — hatch this Pokémon to reveal it.');
   area.append(lock);return;
  }
  const bond=document.createElement('div');bond.className='pkmsvv-support-bond';
  const label=document.createElement('strong');label.textContent=t('Thân thiết','Friendship');
  const track=document.createElement('div');track.className='pkmsvv-bond-track';
  const fill=document.createElement('div');fill.style.width=G.PKMSVVEggs.affinityPercent(m.dex)+'%';
  track.append(fill);bond.append(label,track);
  if(G.PKMSVVEggs.maxAffinity(m.dex)){
   const max=document.createElement('small');max.className='pkmsvv-support-bond-max';
   max.textContent=t('Thân thiết tối đa ★','Maximum friendship ★');bond.append(max);
  }
  const note=document.createElement('small');note.className='pkmsvv-support-bond-note';
  note.textContent=t('Càng thân thiết, hiệu quả càng cao và hồi chiêu càng ngắn.',
   'More friendship boosts potency and shortens cooldowns.');
  area.append(bond,note);
 }
 function choose(dex){
  if(selected===dex)return;
  selected=dex;showShiny=false;
  const grid=$('pkmsvv-support-entries');
  for(const cell of grid?.children||[]){
   const active=Number(cell.dataset?.supportDex)===dex;
   cell.classList.toggle('on',active);
   cell.setAttribute('aria-pressed',String(active));
  }
  // Do not recreate the scrolled grid or refocus the first card on touch.
  renderDetails();
 }
 function renderGrid(keep=false){
  const grid=$('pkmsvv-support-entries');if(!grid)return;
  const panel=scroller(),before=panel?.scrollTop;
  grid.replaceChildren();
  for(const mon of G.PKMSVVEggs?.SPECIES||[]){
   const owned=seen(mon.dex);
   const cell=document.createElement('button');cell.type='button';cell.dataset.supportDex=String(mon.dex);
   cell.className='pkmsvv-support-cell'+(owned?'':' locked')+(selected===mon.dex?' on':'');
   cell.setAttribute('aria-label',t('Pokémon hỗ trợ','Support Pokémon')+' #'+mon.dex);
   cell.setAttribute('aria-pressed',String(selected===mon.dex));
   const badge=document.createElement('span');
   badge.className='pkmsvv-support-rarity '+(mon.dex===151?'super':mon.dex===132?'rare':'common');
   badge.textContent=t(...rarity(mon.dex));
   const sprite=G.UI?.spriteCanvas?.(mon.dex,92,80,{
    scale:2,silhouette:!owned,shadow:owned,shiny:owned&&showShiny&&shinySeen(mon.dex)
   });
   if(sprite)cell.append(sprite);
   const name=document.createElement('strong');name.textContent=owned?(G.DEX_BY?.[mon.dex]?.name||'Pokémon'):'???';
   cell.append(name,badge);
   cell.addEventListener('click',()=>choose(mon.dex));
   grid.append(cell);
  }
  if(keep&&panel&&Number.isFinite(before))panel.scrollTop=before;
 }
 function selectStation(kind,guide=false){
  const wrap=$('pkmsvv-support-catalog'),tabs=$('pkmsvv-support-station-tabs');
  if(!wrap||!tabs)return;
  const hasIncubator=fromResearchLab&&!!G.PKMSVVBigUpdateQA;
  stationTab=hasIncubator&&kind==='incubator'?'incubator':'support';
  const eggView=stationTab==='incubator';
  tabs.style.display=hasIncubator?'flex':'none';
  tabs.setAttribute('aria-label',t('Chức năng máy hỗ trợ','Support station functions'));
  for(const button of tabs.querySelectorAll('[data-support-station-tab]')){
   const on=button.dataset.supportStationTab===stationTab;
   button.textContent=button.dataset.supportStationTab==='incubator'?t('Trứng thu phục','Recruitment eggs'):t('Pokémon hỗ trợ','Support Pokémon');
   button.classList.toggle('gold',on);button.setAttribute('aria-pressed',String(on));
  }
  const intro=$('pkmsvv-support-description'),layout=wrap.querySelector('.pkmsvv-support-layout');
  // Explicit display override prevents existing mobile flex/grid rules from showing the wrong panel.
  intro.hidden=eggView;intro.style.display=eggView?'none':'';
  layout.hidden=eggView;layout.style.display=eggView?'none':'';
  $('pkmsvv-support-heading').textContent=eggView?t('Máy ấp trứng thu phục','Recruitment egg incubator'):t('✦ Pokémon hỗ trợ','✦ Support Pokémon');
  G.PKMSVVBigUpdateQA?.renderIncubator(scroller(),eggView);
  if(!eggView){renderGrid();renderDetails();}
  const panel=scroller();if(panel)panel.scrollTop=0;
  if(guide&&eggView&&!G.DB?.guest){
   try{if(Object.keys(G.PKMSVVBigUpdateQA.incubator(G.DB?.save).eggs).length)G.PKMSVVPippiGuide?.openFeature?.('incubator');}catch(_){}
  }
 }
 function open(options){
  ensure();const wrap=$('pkmsvv-support-catalog');if(!wrap)return;
  fromResearchLab=options?.fromResearchLab===true;
  const entry=$('pkmsvv-support-entry');if(entry)entry.textContent=t('✦ Pokémon hỗ trợ','✦ Support Pokémon');
  const closer=wrap.querySelector('.pkmsvv-support-modal-head button');
  if(closer)closer.textContent=fromResearchLab?t('← Phòng nghiên cứu','← Research Lab'):t('Đóng','Close');
  $('pkmsvv-support-heading').textContent=t('✦ Pokémon hỗ trợ','✦ Support Pokémon');
  $('pkmsvv-support-description').textContent=t(
   'Khám phá Pokémon hỗ trợ bằng cách ấp trứng. Pokémon chưa khám phá sẽ ẩn màu; khi tìm được Shiny mới mở lựa chọn Thường / Shiny.',
   'Discover companions by hatching eggs. Undiscovered Pokémon stay silhouetted; Normal / Shiny is available only after discovering a Shiny.');
  const list=G.PKMSVVEggs?.SPECIES||[];
  if(!list.some(x=>x.dex===selected))selected=list[0]?.dex||null;
  showShiny=false;wrap.hidden=false;
  document.body?.classList?.add('pkmsvv-support-open');
  selectStation('support');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});
 else ensure();
 return {open,close,ensure,rarity,shinySeen};
})();
