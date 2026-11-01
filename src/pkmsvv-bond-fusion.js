/* Unlimited source-compatible Bond pairing: any two learned distinct moves,
 * regardless of level/evolution. Ten named pairs are suggestions, not gates.
 * One complimentary Fusion per run; Rift Bonds remain earnable independently.
 * All groups use original Player.fuse (4 moves per group, no fake skills).
 */
G.PKMSVVFusionPilot=(()=>{
 const tr=(a,b)=>G.I18n?.lang==='en'?b:a;
 const RECIPES=Object.freeze([
  {id:'ember-quick',ids:['ember','quick-attack'],vi:'Lướt Lửa',en:'Blazing Rush'},
  {id:'water-tackle',ids:['water-gun','tackle'],vi:'Húc Sóng',en:'Tidal Charge'},
  {id:'grass-spin',ids:['vine-whip','rapid-spin'],vi:'Dây Leo Xoáy',en:'Vine Cyclone'},
  {id:'spark-quick',ids:['thunder-shock','quick-attack'],vi:'Lướt Điện',en:'Thunder Dash'},
  {id:'mind-tackle',ids:['confusion','tackle'],vi:'Húc Tâm Linh',en:'Psychic Impact'},
  {id:'fire-gust',ids:['flamethrower','gust'],vi:'Lốc Lửa',en:'Flame Gale'},
  {id:'bubble-ice',ids:['bubble-beam','ice-shard'],vi:'Bong Bóng Băng',en:'Frost Tide'},
  {id:'leaf-rock',ids:['razor-leaf','rock-tomb'],vi:'Lá Sắc Đá Rơi',en:'Stoneleaf Trap'},
  {id:'shadow-mind',ids:['shadow-ball','psychic'],vi:'Bóng Ma Siêu Năng',en:'Mindshade'},
  {id:'thunder-claw',ids:['thunderbolt','metal-claw'],vi:'Vuốt Sét',en:'Thunder Claw'}
 ]);
 const ENABLE_PILOT=true; // all modes
 const maxPerRun=1; // free Fusion, Rift Bonds are separate and not capped here
 const maxGroup=4;
 const readyMove=m=>!!(m&&typeof m.id==='string'&&m.id.length>0);
 function pilotEligible(pl){
  return !!(ENABLE_PILOT&&pl&&!pl.remote&&!pl.lanBot&&!pl.dead);
 }
 const looseMoves=pl=>Array.isArray(pl?.slots)?
  pl.slots.filter(s=>Array.isArray(s)&&s.length===1).map(s=>s[0]).filter(readyMove):[];
 const learnedCount=()=>Array.isArray(G.Moves?.ALL)?G.Moves.ALL.length:0;
 const potentialPairs=()=>{const n=learnedCount();return n*(n-1)/2;};
 function pairFor(pl){
  if(!pilotEligible(pl)||Number(pl._pkmsvvFusionUsed||0)>=maxPerRun)return null;
  const base=typeof pl.bondOptions==='function'?pl.bondOptions():null;
  if(!base||!Array.isArray(base.loose))return null;
  if(base.mode==='pair'&&base.loose.length>=2)return base;
  if(base.mode==='add'&&Array.isArray(base.group)&&base.group.length>=2&&
     base.group.length<maxGroup&&base.loose.length)return base;
  return null;
 }
 function options(pl){
  const opt=pairFor(pl);
  return opt?{...opt,pilot:true,recipe:'all-moves',
    recipeName:tr('Liên Kết Tự Do','Free Bond')}:null;
 }
 function confirm(pl,picked){
  const opt=options(pl);
  if(!opt||!Array.isArray(picked))return false;
  if(opt.mode==='pair'){
   if(picked.length!==2||picked[0]===picked[1]||
      !picked.every(m=>opt.loose.includes(m)))return false;
  }else if(opt.mode==='add'){
   if(picked.length!==1||!opt.loose.includes(picked[0])||
      opt.group.includes(picked[0]))return false;
  }else return false;
  pl._pkmsvvFusionUsed=(Number(pl._pkmsvvFusionUsed)||0)+1;
  return true;
 }
 function progress(pl){
  const loose=looseMoves(pl);
  return RECIPES.map(r=>{
   const learned=r.ids.map(id=>loose.some(m=>m.id===id));
   return {id:r.id,name:tr(r.vi,r.en),ids:r.ids.slice(),
    learned:learned.filter(Boolean).length,ready:learned.filter(Boolean).length,
    unlocked:learned.every(Boolean),used:!!pl?Number(pl._pkmsvvFusionUsed||0)>=maxPerRun:false};
  });
 }

 // Nonintrusive level-up hints: decorate the genuine cards produced by
 // G.LevelUp.offer (also used on reroll and in LAN). Never alter card weights.
 const learnedIds=pl=>{
  const list=Array.isArray(pl?.moves)?pl.moves:
   (pl?.slots||[]).flat().filter(Boolean);
  return new Set(list.map(m=>m?.id).filter(Boolean));
 };
 const moveLabel=id=>{
  const m=G.Moves?.BY_ID?.[id],name=m?.name||id;
  return G.T?.(name,'move')||name;
 };
 const escapeText=s=>String(s).replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 }[c]));
 function offerHint(pl,id,offered=[]){
  if(!id||!pilotEligible(pl))return null;
  const known=learnedIds(pl);
  const recipes=RECIPES.filter(r=>r.ids.includes(id));
  const completed=recipes.find(r=>r.ids.some(other=>other!==id&&known.has(other)));
  if(completed){
   return {kind:'ready',recipe:completed,
    partner:completed.ids.find(other=>other!==id)};
  }
  const cooffered=recipes.find(r=>r.ids.some(other=>other!==id&&offered.includes(other)));
  if(cooffered){
   return {kind:'offered',recipe:cooffered,
    partner:cooffered.ids.find(other=>other!==id)};
  }
  if(known.size>0&&!known.has(id))return {kind:'free'};
  return null;
 }
 function notifyLearned(pl,id,before){
  if(!pl||pl.remote||pl.lanBot||pl.dead||G.Game?.player!==pl)return false;
  const after=learnedIds(pl);
  if(before.has(id)||!after.has(id)||after.size<2)return false;
  // A used free Fusion alone is not enough: preserve real earned Bond rules.
  if(!options(pl)&&!(Number(pl.bonds)>0&&pl.bondOptions?.()))return false;
  const named=RECIPES.filter(r=>r.ids.includes(id)&&r.ids.some(other=>other!==id&&before.has(other)));
  let message='';
  if(named.length){
   const seen=pl._pkmsvvFusionNoticeIds||(pl._pkmsvvFusionNoticeIds=new Set());
   const unnotified=named.filter(r=>!seen.has(r.id));
   for(const r of unnotified)seen.add(r.id);
   if(unnotified.length&&Number(pl._pkmsvvFusionNoticeCount||0)<2){
    const first=unnotified[0];
    message=tr('🔗 FUSION SẴN SÀNG: '+moveLabel(first.ids[0])+' + '+
      moveLabel(first.ids[1])+' · '+first.vi+'! Nhấn FUSION để ghép.',
     '🔗 FUSION READY: '+moveLabel(first.ids[0])+' + '+
      moveLabel(first.ids[1])+' · '+first.en+'! Tap FUSION.');
   }
  }else if(!pl._pkmsvvFusionFirstReadyNotified&&before.size===1){
   pl._pkmsvvFusionFirstReadyNotified=true;
   message=tr('🔗 Có 2 skill rồi! Bấm FUSION để liên kết tự do (1 lần miễn phí/trận).',
    '🔗 Two moves learned! Tap FUSION to link them (one free use per match).');
  }
  if(!message)return false;
  pl._pkmsvvFusionNoticeCount=(Number(pl._pkmsvvFusionNoticeCount)||0)+1;
  pl._pkmsvvFusionHintUntil=Date.now()+10000;
  G.UI?.toast?.(message,3600);
  sync();return true;
 }
 function decorateOffers(pl,list){
  if(!pilotEligible(pl)||!Array.isArray(list))return list;
  const offered=list.filter(c=>c?.type==='new'&&typeof c.key==='string'&&c.key.startsWith('new:'))
   .map(c=>c.key.slice(4));
  for(const c of list){
   if(c?.type!=='new'||!c.key?.startsWith('new:')||c._pkmsvvFusionDecorated)continue;
   c._pkmsvvFusionDecorated=true;
   const id=c.key.slice(4),hint=offerHint(pl,id,offered);
   if(hint){
    c._pkmsvvFusionHint=hint.kind;
    let label='';
    if(hint.kind==='ready'){
     label=tr('🔗 FUSION GỢI Ý · Đã có '+moveLabel(hint.partner)+' → '+
        hint.recipe.vi, '🔗 FUSION PAIR · You own '+moveLabel(hint.partner)+
        ' → '+hint.recipe.en);
    }else if(hint.kind==='offered'){
     label=tr('✨ CẶP TIỀM NĂNG · '+moveLabel(hint.partner)+
      ' cũng xuất hiện (chọn 1, học chiêu kia sau)',
      '✨ PAIR IDEA · '+moveLabel(hint.partner)+
      ' is also offered (choose one, learn the other later)');
    }else{
     label=tr('🔗 Có thể Fusion với skill đã học',
      '🔗 Can fuse with a learned move');
    }
    c.desc=(c.desc||'')+
     '<span class="pkmsvv-fusion-card-hint is-'+hint.kind+'">'+escapeText(label)+'</span>';
   }
   const original=c.apply;
   if(typeof original==='function')c.apply=function(p){
    const before=learnedIds(p),result=original.call(this,p);
    notifyLearned(p,id,before);return result;
   };
  }
  return list;
 }
 function installSkillHints(){
  if(!G.LevelUp||typeof G.LevelUp.offer!=='function')return false;
  if(G.LevelUp.offer._pkmsvvFusionHint)return true;
  const original=G.LevelUp.offer;
  const patched=function(pl,...args){
   return decorateOffers(pl,original.call(this,pl,...args));
  };
  patched._pkmsvvFusionHint=true;G.LevelUp.offer=patched;
  return true;
 }
 function install(){
  if(!G.RunUI||typeof G.RunUI.showBond!=='function')return false;
  if(G.RunUI.showBond._pkmsvvFusion)return true;
  const orig=G.RunUI.showBond;
  const show=function(opt,cb){
   const result=orig.call(this,opt,cb);
   if(opt?.pilot){
    const root=document.getElementById('scr-bond'),list=document.getElementById('bond-cards');
    if(root&&list){
     let hint=root.querySelector('.pkmsvv-fusion-pilot-hint');
     if(!hint){hint=document.createElement('p');hint.className='pkmsvv-fusion-pilot-hint';list.before(hint);}
     hint.textContent=tr('🔗 FUSION TỰ DO · Ghép hai chiêu đã học, hoặc thêm chiêu vào nhóm đang ghép (tối đa 4).',
       '🔗 FREE FUSION · Link two learned moves or add to a group of up to four.');
     hint.hidden=false;
     let recipes=root.querySelector('.pkmsvv-fusion-recipes');
     if(!recipes){recipes=document.createElement('div');recipes.className='pkmsvv-fusion-recipes';hint.after(recipes);}
     recipes.hidden=false;recipes.replaceChildren();
     for(const r of RECIPES){
      const line=document.createElement('div');line.className='pkmsvv-fusion-recipe';
      for(let i=0;i<r.ids.length;i++){
       if(i){const plus=document.createElement('b');plus.textContent=' + ';line.append(plus);}
       const id=r.ids[i],m=G.Moves?.BY_ID?.[id];
       const move=document.createElement('span');move.className='pkmsvv-fusion-move';
       const icon=document.createElement('span');icon.innerHTML=G.Icons?.html?.('move:'+id,20)||'✦';
       const label=document.createElement('span');label.textContent=G.T?.(m?.name||id,'move')||m?.name||id;
       move.append(icon,label);line.append(move);
      }
      const result=document.createElement('strong');result.textContent=' · '+tr(r.vi,r.en);
      line.append(result);recipes.append(line);
     }
    }
   }else{
    document.querySelector('.pkmsvv-fusion-pilot-hint')?.setAttribute('hidden','');
    document.querySelector('.pkmsvv-fusion-recipes')?.setAttribute('hidden','');
   }
   return result;
  };
  show._pkmsvvFusion=true;G.RunUI.showBond=show;return true;
 }
  // Battle HUD action above Mystery Orb; competitive modes keep running.
  let action=null;
  const competitive=()=>!!(G.Royale?.active||G.EggRush?.active||
   G.PKMSVVArenaSolo?.active||G.PKMSVVChampionArena?.active||
   G.PKMSVVBerryRescue?.active);
  function showGuide(p){
   document.getElementById('pkmsvv-fusion-guide')?.remove?.();
   const overlay=document.createElement('div');
   overlay.id='pkmsvv-fusion-guide';overlay.className='pkmsvv-fusion-guide';
   overlay.setAttribute('role','dialog');
   overlay.setAttribute('aria-label',tr('Công thức Fusion','Fusion recipes'));
   const box=document.createElement('section');box.className='pkmsvv-fusion-guide-panel';
   const h=document.createElement('h2');h.textContent=tr('🔗 FUSION · LIÊN KẾT TỰ DO','🔗 FUSION · FREE BONDS');
   const note=document.createElement('p');
   note.textContent=tr('Bản gốc có '+learnedCount()+' chiêu, tương đương '+potentialPairs()+' cặp khác nhau. Học ít nhất hai chiêu bất kỳ để ghép miễn phí một lần/trận; hạ huyền thoại trong khe nứt để kiếm thêm Bond. Nhóm tối đa 4 chiêu, mỗi chiêu vẫn tự đánh và giữ hồi chiêu riêng.',
    'The original has '+learnedCount()+' moves and '+potentialPairs()+' possible pairs. Link any two learned moves free once per match; Rift legendaries award more Bonds. Each group holds up to four moves with their own cooldowns.');
   const close=document.createElement('button');close.type='button';close.className='btn small';
   close.textContent=tr('Đóng','Close');close.onclick=()=>overlay.remove();
   box.append(h,note);
   const sub=document.createElement('h3');
   sub.textContent=tr('10 cặp gợi ý (không bắt buộc)','Ten optional pairing ideas');
   box.append(sub);
   for(const recipe of RECIPES){
    const row=document.createElement('div');row.className='pkmsvv-fusion-guide-row';
    const prog=progress(p).find(x=>x.id===recipe.id);
    const pair=document.createElement('div');pair.className='pkmsvv-fusion-guide-pair';
    recipe.ids.forEach((id,index)=>{
     if(index){const plus=document.createElement('strong');plus.textContent='+';pair.append(plus);}
     const item=document.createElement('span');item.className='pkmsvv-fusion-guide-move';
     const icon=document.createElement('span');icon.innerHTML=G.Icons?.html?.('move:'+id,24)||'✦';
     const move=G.Moves?.BY_ID?.[id];
     const label=document.createElement('span');label.textContent=G.T?.(move?.name||id,'move')||move?.name||id;
     item.append(icon,label);pair.append(item);
    });
    const outcome=document.createElement('b');outcome.textContent='→ '+tr(recipe.vi,recipe.en);
    const status=document.createElement('small');
    status.textContent=prog?.unlocked?tr('✅ Có thể ghép','✅ Ready'):
     tr('Đã học '+(prog?.ready||0)+'/2 chiêu','Learned '+(prog?.ready||0)+'/2 moves');
    row.append(pair,outcome,status);box.append(row);
   }
   const owned=looseMoves(p),num=owned.length;
   const subAll=document.createElement('h3');
   subAll.textContent=tr('Tất cả cặp skill đã học ('+(num*(num-1)/2)+')',
                         'All learned pairs ('+(num*(num-1)/2)+')');
   box.append(subAll);
   const pairs=document.createElement('div');pairs.className='pkmsvv-fusion-all-pairs';
   if(num<2){
    const msg=document.createElement('p');
    msg.textContent=tr('Hãy học ít nhất hai kỹ năng khác nhau trong trận.',
      'Learn at least two different moves during the run.');pairs.append(msg);
   }
   for(let i=0;i<num;i++)for(let j=i+1;j<num;j++){
    const row=document.createElement('div');row.className='pkmsvv-fusion-guide-pair';
    for(const [k,m] of [owned[i],owned[j]].entries()){
     if(k){const plus=document.createElement('b');plus.textContent='+';row.append(plus);}
     const cell=document.createElement('span');cell.className='pkmsvv-fusion-guide-move';
     const ico=document.createElement('span');
     ico.innerHTML=G.Icons?.html?.('move:'+m.id,20)||'✦';
     const name=document.createElement('span');name.textContent=G.T?.(m.name,'move')||m.name||m.id;
     cell.append(ico,name);row.append(cell);
    }
    pairs.append(row);
   }
   box.append(pairs);
   const existing=(p?.slots||[]).find(slot=>slot.length>1&&slot.length<maxGroup);
   if(existing){
    const msg=document.createElement('p');
    msg.textContent=tr('Nhóm đang có '+existing.length+'/4 chiêu. Có thể nối thêm một chiêu lẻ bằng Bond.',
      'Existing group: '+existing.length+'/4 moves. A Bond may add another loose move.');
    box.append(msg);
   }
   box.append(close);overlay.append(box);
   overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
   document.body.append(overlay);
   return true;
  }
  function openFusion(){
   const p=G.Game?.player,opt=options(p);
   if(!p||G.Game?.state!=='playing'||G.UI?.isOpen?.('scr-bond')||
      G.UI?.isOpen?.('scr-levelup'))return false;
   if(!opt||Number(p._pkmsvvFusionUsed||0)>=maxPerRun)return showGuide(p);
   const shared=!!(G.Coop?.active&&!competitive());
   if(shared)G.Coop?.holdStart?.();
   G.RunUI.showBond(opt,picked=>{
    try{
     if(!confirm(p,picked))return;
     p.bonds=(Number(p.bonds)||0)+1; // Free-use token: preserve Rift Bonds
     const group=p.fuse(picked,opt.group);
     G.Audio?.sfx?.('legend');G.FX?.ring?.(p.x,p.y,8,130,'#ff8ad8',.8,6);
     G.UI?.toast?.(tr('🔗 Đã ghép '+group.length+' skill · 1 lần/trận',
      '🔗 '+group.length+' moves fused · once per match'),2000);
    }finally{
     if(shared)G.Coop?.holdEnd?.();
     sync();
    }
   });
   return true;
  }
  function sync(){
   if(!action)return;
   const p=G.Game?.player;
   const visible=!!(p&&!p.dead&&G.Game?.state==='playing'&&
     !G.UI?.isOpen?.('scr-pause')&&!G.UI?.isOpen?.('scr-menu'));
   action.hidden=!visible;
   if(!visible)return;
   const used=Number(p._pkmsvvFusionUsed||0)>=maxPerRun,ready=!!options(p);
   action.disabled=!!G.UI?.isOpen?.('scr-levelup')||
     !!G.UI?.isOpen?.('scr-bond')||!!G.UI?.isOpen?.('scr-item');
   const alert=Date.now()<(Number(p._pkmsvvFusionHintUntil)||0);
   action.classList?.toggle?.('has-new-match',alert&&!used&&ready);
   action.textContent=used?'FUSION ✓':alert&&ready?'🔗 FUSION!':'🔗 FUSION';
   action.title=used?tr('Đã dùng lượt Fusion miễn phí; vẫn có thể kiếm Bond ở khe nứt',
    'Free Fusion used; Rift Bonds remain earnable'):
    ready?tr('Ghép bất kỳ hai chiêu đã học, miễn phí một lần/trận',
     'Link any learned moves free once per match'):
    tr('Xem tất cả cặp skill · Học hai chiêu để bắt đầu',
       'View every skill pair · Learn two moves to start');
  }
  function mount(){
   if(action||!document.body?.appendChild)return;
   action=document.createElement('button');action.id='pkmsvv-fusion-action';
   action.type='button';action.textContent='🔗 FUSION';action.hidden=true;
   action.addEventListener('click',openFusion);document.body.append(action);
   sync();if(typeof setInterval==='function')setInterval(sync,250);
  }
  install();installSkillHints();
  if(document.body?.appendChild)mount();
  else if(typeof document.addEventListener==='function')
   document.addEventListener('DOMContentLoaded',mount,{once:true});
  return {RECIPES,maxPerRun,maxGroup,pilotEligible,readyMove,looseMoves,learnedCount,potentialPairs,pairFor,options,confirm,
   progress,learnedIds,offerHint,decorateOffers,notifyLearned,installSkillHints,
   install,competitive,openFusion,showGuide,mount,sync};
})();