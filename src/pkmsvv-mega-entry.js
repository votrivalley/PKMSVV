'use strict';
/* Phase 2 Mega encyclopedia — read-only, never grants stones, quests or species. */
G.PKMSVVMegaEntry=(()=>{
 const $=id=>document.getElementById(id),tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const PAGE=12;let page=0,filter='all',selected=null;
 const catalog=()=>Array.isArray(G.PKMSVV_MEGA_CATALOG)?G.PKMSVV_MEGA_CATALOG:[];
 const save=()=>G.DB?.save||{};
 function isUnlocked(f){
  if(!f)return false;
  if(G.PKMSVVMegaPhase3?.isUnlocked)return G.PKMSVVMegaPhase3.isUnlocked(f);
  const s=save();
  if(f.storyLocked&&s.megaStoryCleared?.[f.key]!==true)return false;
  if(f.sharedStone&&s.megaForms?.[f.key]!==true)return false;
  if(!f.stoneKey)return !!f.storyLocked&&s.megaStoryCleared?.[f.key]===true;
  const value=s.megaStones?.[f.stoneKey];
  return value===true||value===1||!!(value&&typeof value==='object'&&value.unlocked===true);
 }
 const displayName=f=>{
  const [head,end]=f.name.split('-Mega');
  return 'Mega '+head.replace(/-/g,' ')+(end?' '+end.replace(/^-/, ''):'');
 };
 const list=()=>catalog().filter(f=>filter==='all'||(filter==='unlocked'?isUnlocked(f):!isUnlocked(f)));
 const art=f=>{const ok=!!(f.artReady&&G.SPRITE_META?.[f.spriteId]?.a?.Idle);
  return {dex:ok?f.spriteId:f.dex,ready:ok};};
 const el=(tag,id,cls)=>{const n=document.createElement(tag);if(id)n.id=id;if(cls)n.className=cls;return n;};
 function close(){const box=$('pkmsvv-mega-phase1');if(box)box.hidden=true;$('pkmsvv-mega-entry')?.focus?.();}
 function ensure(){
  const back=$('pkmsvv-upgrade-back');if(!back?.parentElement)return false;
  G.PKMSVVSupportCatalog?.ensure?.();
  let btn=$('pkmsvv-mega-entry');
  if(!btn){btn=el('button','pkmsvv-mega-entry','btn small pkmsvv-mega-entry-btn');
   btn.type='button';btn.addEventListener('click',open);}
  const support=$('pkmsvv-support-entry');
  back.parentElement.insertBefore(btn,support?.parentElement===back.parentElement?support.nextSibling||back:back);
  btn.textContent=tr('✧ Tiến hóa Mega','✧ Mega Evolution');
  btn.setAttribute('aria-haspopup','dialog');btn.setAttribute('aria-controls','pkmsvv-mega-phase1');
  return true;
 }
 function build(){
  let box=$('pkmsvv-mega-phase1');if(box)return box;
  box=el('div','pkmsvv-mega-phase1','pkmsvv-mega-phase1-overlay');box.hidden=true;
  const panel=el('section',null,'pkmsvv-mega-phase1-dialog');
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
  panel.setAttribute('aria-labelledby','pkmsvv-mega-phase1-title');
  const head=el('header',null,'pkmsvv-mega-phase1-head'),title=el('h2','pkmsvv-mega-phase1-title');
  const exit=el('button',null,'btn small ghost');exit.type='button';
  exit.setAttribute('data-mega-close','');exit.addEventListener('click',close);
  head.append(title,exit);
  const detail=el('div','pkmsvv-mega-detail','pkmsvv-mega-phase1-locked');
  const unknown=el('strong');unknown.textContent='???';
  const lock=el('small','pkmsvv-mega-phase1-lock');detail.append(unknown,lock);
  const note=el('p','pkmsvv-mega-phase1-note');
  const roster=el('div','pkmsvv-mega-roster','pkmsvv-mega-roster');
  const tools=el('div',null,'pkmsvv-mega-tools'),count=el('strong','pkmsvv-mega-count');
  const filters=el('div',null,'pkmsvv-mega-filters');
  for(const mode of ['all','unlocked','locked']){
   const b=el('button',null,'btn small pkmsvv-mega-filter');b.type='button';
   b.setAttribute('data-mega-filter',mode);
   b.addEventListener('click',()=>{filter=mode;page=0;selected=null;render();});
   filters.append(b);
  }
  tools.append(count,filters);
  const grid=el('div','pkmsvv-mega-grid','pkmsvv-mega-grid');
  const paging=el('div',null,'pkmsvv-mega-pager');
  const prev=el('button','pkmsvv-mega-prev','btn small ghost');
  const progress=el('span','pkmsvv-mega-page');
  const next=el('button','pkmsvv-mega-next','btn small ghost');
  prev.type='button';next.type='button';
  prev.addEventListener('click',()=>{page=Math.max(0,page-1);selected=null;render();});
  next.addEventListener('click',()=>{page++;selected=null;render();});
  paging.append(prev,progress,next);roster.append(tools,grid,paging);
  // Retain Phase 1's detail as panel.children[1] for existing integration tests.
  panel.append(head,detail,note,roster);box.append(panel);
  box.addEventListener('click',e=>{if(e.target===box)close();});
  document.body.append(box);return box;
 }
 function detailView(f){
  const area=$('pkmsvv-mega-detail');if(!area)return;
  area.replaceChildren();
  const opened=!!f&&isUnlocked(f);
  area.className='pkmsvv-mega-phase1-locked'+(opened?' is-unlocked':'');
  if(!opened){
   const unknown=el('strong');unknown.textContent='???';
   const lock=el('small','pkmsvv-mega-phase1-lock');lock.textContent=tr('Chưa mở khóa','Not unlocked');
   area.append(unknown,lock);
   if(f&&G.UI?.spriteCanvas){
    const v=art(f),cv=G.UI.spriteCanvas(v.dex,180,155,{scale:2,hero:true,silhouette:true,shadow:false});
    cv.className='pkmsvv-mega-detail-art is-hidden';area.append(cv);
   }
   const tip=el('p');tip.textContent=tr(
    'Cần sở hữu Pokémon, đúng Mega Stone và hoàn thành cốt truyện. Huyền thoại có nhiệm vụ riêng.',
    'Own the Pokémon, obtain its Mega Stone and meet story requirements. Legendaries have separate quests.');
   area.append(tip);return;
  }
  const title=el('h3');title.textContent=displayName(f);area.append(title);
  const visual=art(f);
  if(visual.ready&&G.UI?.spriteCanvas){
   const cv=G.UI.spriteCanvas(visual.dex,200,165,{scale:2,hero:true,spin:true,lively:true});
   cv.className='pkmsvv-mega-detail-art';area.append(cv);
  }else{
   const missing=el('div',null,'pkmsvv-mega-art-missing');
   missing.textContent=tr('Hình Mega đang hoàn thiện','Mega sprite in preparation');area.append(missing);
  }
  const stone=el('p',null,'pkmsvv-mega-detail-item');
  stone.textContent='Mega Stone: '+(f.stone||tr('Không cần đá — mở bằng cốt truyện','Story unlock — no stone'));
  const ability=el('p');ability.textContent=tr('Đặc tính: ','Ability: ')+f.ability;
  const label=el('h4');label.textContent=tr('Chỉ số Mega gốc','Mega base stats');
  const stats=el('div',null,'pkmsvv-mega-stats');
  for(const [key,name] of [['hp','HP'],['atk','ATK'],['def','DEF'],['spa','Sp.ATK'],['spd','Sp.DEF'],['spe','SPEED']]){
   const c=el('div'),tag=el('span'),value=el('b');
   tag.textContent=name;value.textContent=String(f.stats[key]);c.append(tag,value);stats.append(c);
  }
  const note=el('p',null,'pkmsvv-mega-runtime-note');
  note.textContent=G.PKMSVVMegaPhase3?.isBattleReady?.(f)?tr(
   'Đã sẵn sàng trong solo: 30 giây · Hồi chiêu -30%.',
   'Ready in solo: 30 seconds · Cooldown -30%.'):
   tr('Đã khám phá nhưng đang chờ sprite hoặc tuyến truyện chiến đấu.',
   'Discovered; battle art or storyline support is pending.');
  area.append(stone,ability,label,stats,note);
 }
 function render(){
  if(!$('pkmsvv-mega-phase1'))return;
  const forms=list(),last=Math.max(0,Math.ceil(forms.length/PAGE)-1);
  page=Math.min(last,Math.max(0,page));
  const shown=forms.slice(page*PAGE,(page+1)*PAGE);
  if(!shown.some(f=>f.key===selected))selected=shown[0]?.key||null;
  $('pkmsvv-mega-count').textContent=tr('Đã mở: ','Unlocked: ')+catalog().filter(isUnlocked).length+'/'+catalog().length;
  for(const [mode,label] of [['all',tr('Tất cả','All')],['unlocked',tr('Đã mở','Unlocked')],['locked',tr('Chưa mở','Locked')]]){
   const b=$('pkmsvv-mega-roster')?.querySelector?.('[data-mega-filter="'+mode+'"]');
   if(b){b.textContent=label;b.setAttribute('aria-pressed',String(filter===mode));}
  }
  const grid=$('pkmsvv-mega-grid');grid.replaceChildren();
  for(const [i,f] of shown.entries()){
   const yes=isUnlocked(f),v=art(f),card=el('button',null,'pkmsvv-mega-cell '+(yes?'is-open':'is-locked')+(selected===f.key?' on':''));
   card.type='button';
   card.setAttribute('aria-label',yes?displayName(f):tr('Mega chưa khám phá','Undiscovered Mega')+' '+(page*PAGE+i+1));
   card.setAttribute('aria-pressed',String(selected===f.key));
   if(G.UI?.spriteCanvas){
    const cv=G.UI.spriteCanvas(v.dex,92,80,{scale:2,silhouette:!yes||!v.ready,shadow:yes&&v.ready});
    cv.className='pkmsvv-mega-cell-art';card.append(cv);
   }else{const icon=el('span');icon.textContent='✦';card.append(icon);}
   const label=el('strong');label.textContent=yes?displayName(f):'???';
   const state=el('small');state.textContent=yes?tr('Đã mở','Unlocked'):tr('Chưa mở','Locked');
   card.append(label,state);
   card.addEventListener('click',()=>{selected=f.key;render();});
   grid.append(card);
  }
  detailView(forms.find(f=>f.key===selected));
  $('pkmsvv-mega-prev').textContent=tr('‹ Trước','‹ Prev');
  $('pkmsvv-mega-next').textContent=tr('Sau ›','Next ›');
  $('pkmsvv-mega-prev').disabled=page===0;$('pkmsvv-mega-next').disabled=page>=last;
  $('pkmsvv-mega-page').textContent=tr('Trang ','Page ')+(page+1)+'/'+(last+1);
  $('pkmsvv-mega-phase1-note').textContent=tr(
   'Danh tính và chỉ số chỉ hiện sau khi mở khóa. Xem danh sách không tốn vé hoặc thay đổi save.',
   'Identity and stats appear only after unlocking. Viewing does not modify saves.');
 }
 function open(){
  if(!ensure())return false;
  const box=build();
  $('pkmsvv-mega-phase1-title').textContent=tr('Tiến hóa Mega','Mega Evolution');
  box.querySelector('[data-mega-close]').textContent=tr('Đóng','Close');
  render();box.hidden=false;box.querySelector('[data-mega-close]').focus?.();
  return true;
 }
 const previous=G.PKMSVVUpgradeChooser?.open;
 if(typeof previous==='function')G.PKMSVVUpgradeChooser.open=function(...args){
  const out=previous.apply(this,args);ensure();return out;
 };
 document.addEventListener('keydown',event=>{
  const box=$('pkmsvv-mega-phase1');
  if(box&&!box.hidden&&event.key==='Escape'){
   close();event.preventDefault();event.stopPropagation();
  }
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});
 else ensure();
 return {open,close,ensure,render,isUnlocked,displayName,get page(){return page},get filter(){return filter}};
})();
