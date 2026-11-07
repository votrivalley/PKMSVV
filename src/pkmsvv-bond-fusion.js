/* Ten evolved Fusion skills. Each recipe requires two source moves at MAX.
 * One evolved Fusion per run, replacing both moves with one MAX special move.
 * Original Rift Bonds remain the game's separate earned link system.
 */
G.PKMSVVFusionPilot=(()=>{
 'use strict';
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
 const maxPerRun=1,maxGroup=4;
 const readyMove=m=>G.PKMSVVFusionEvolved?.maxed(m)||false;
 const pilotEligible=pl=>!!(pl&&!pl.remote&&!pl.lanBot&&!pl.dead);
 const looseMoves=pl=>(pl?.slots||[]).filter(s=>s.length===1).map(s=>s[0]);
 const learnedCount=()=>G.Moves?.ALL?.length||0;
 const potentialPairs=()=>10; // exactly ten named special recipes
 const learnedIds=pl=>new Set((pl?.moves||pl?.slots?.flat()||[]).map(m=>m?.id).filter(Boolean));
 const moveLabel=id=>{
  const m=G.Moves?.BY_ID?.[id];
  return G.T?.(m?.name||id,'move')||m?.name||id;
 };
 const pairFor=pl=>options(pl);
 function options(pl){
  if(!pilotEligible(pl)||Number(pl._pkmsvvFusionUsed||0)>=maxPerRun)return null;
  const choices=G.PKMSVVFusionEvolved?.choices(pl)||[];
  return choices.length?{mode:'evolved',pilot:true,recipes:choices}:null;
 }
 function confirm(pl,picked){
  if(!Array.isArray(picked)||picked.length!==1)return false;
  const id=typeof picked[0]==='string'?picked[0]:picked[0]?.id;
  return !!G.PKMSVVFusionEvolved?.evolve(pl,id);
 }
 function progress(pl){
  const moves=pl?.moves||pl?.slots?.flat()||[];
  return RECIPES.map(r=>{
   const known=r.ids.map(id=>moves.find(m=>m?.id===id));
   const max=known.map(m=>readyMove(m)),learned=known.filter(Boolean).length;
   return {id:r.id,name:tr(r.vi,r.en),ids:r.ids.slice(),learned,
    maxed:max.filter(Boolean).length,ready:max.filter(Boolean).length,
    unlocked:max.every(Boolean)&&max.length===2,
    used:!!pl&&Number(pl._pkmsvvFusionUsed||0)>=maxPerRun};
  });
 }
 // Skill level-up cards can hint at a future recipe, but must never claim
 // Fusion is ready before BOTH independent skills have reached MAX.
 const escapeText=s=>String(s).replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 }[c]));
 function offerHint(pl,id,offered=[]){
  if(!pilotEligible(pl)||!id)return null;
  const known=learnedIds(pl);
  const matched=RECIPES.find(r=>r.ids.includes(id)&&
   r.ids.some(x=>x!==id&&(known.has(x)||offered.includes(x))));
  if(!matched)return null;
  const partner=matched.ids.find(x=>x!==id);
  return {kind:'offered',recipe:matched,partner};
 }
 function decorateOffers(pl,cards){
  if(!pilotEligible(pl)||!Array.isArray(cards))return cards;
  for(const card of cards){
   if(card?.type!=='new'||!card.key?.startsWith('new:')||card._pkmsvvFusionDecorated)continue;
   card._pkmsvvFusionDecorated=true;
   const id=card.key.slice(4),hint=offerHint(pl,id);
   if(!hint)continue;
   card._pkmsvvFusionHint='offered';
   card.desc=(card.desc||'')+'<span class="pkmsvv-fusion-card-hint is-offered">'+
    escapeText(tr('🔗 FUSION TIỀM NĂNG · '+moveLabel(hint.partner)+
     ' + '+moveLabel(id)+' · Cả 2 phải MAX',
     '🔗 FUSION RECIPE · '+moveLabel(hint.partner)+' + '+moveLabel(id)+
     ' · Both need MAX'))+'</span>';
  }
  return cards;
 }
 function notifyLearned(pl){
  if(!pilotEligible(pl)||pl!==G.Game?.player)return false;
  if(!options(pl))return false;
  if(pl._pkmsvvFusionReadyNotified)return false;
  pl._pkmsvvFusionReadyNotified=true;
  G.UI?.toast?.(tr('✨ FUSION SẴN SÀNG · Hai kỹ năng đã MAX!',
   '✨ FUSION READY · Both source skills are MAX!'),3000);
  sync();return true;
 }
 function installSkillHints(){
  if(typeof G.LevelUp?.offer==='function'&&!G.LevelUp.offer._pkmsvvFusionHint){
   const old=G.LevelUp.offer;
   const wrapped=function(pl,...args){
    return decorateOffers(pl,old.call(this,pl,...args));
   };
   wrapped._pkmsvvFusionHint=true;G.LevelUp.offer=wrapped;
  }
  if(typeof G.Moves?.levelUp==='function'&&!G.Moves.levelUp._pkmsvvFusionHint){
   const old=G.Moves.levelUp;
   const wrapped=function(...args){
    const result=old.apply(this,args);
    notifyLearned(G.Game?.player);
    return result;
   };
   wrapped._pkmsvvFusionHint=true;G.Moves.levelUp=wrapped;
  }
  return true;
 }
 const icons=id=>'assets/fusion-icons/'+id+'.webp';
 let action=null,dialog=null;
 function closeGuide(){
  dialog?.remove?.();dialog=null;
 }
 function showGuide(pl){
  if(!document?.createElement||!document.body?.append)return false;
  closeGuide();
  const used=Number(pl?._pkmsvvFusionUsed||0)>=maxPerRun;
  const shade=document.createElement('div');
  shade.id='pkmsvv-fusion-guide';shade.className='pkmsvv-fusion-guide';
  shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');
  shade.setAttribute('aria-label',tr('Tiến hóa kỹ năng Fusion','Fusion Skill Evolution'));
  const panel=document.createElement('section');
  panel.className='pkmsvv-fusion-guide-panel';
  const heading=document.createElement('h2');
  heading.textContent=tr('✨ 10 TUYỆT KỸ FUSION','✨ 10 EVOLVED FUSION SKILLS');
  const note=document.createElement('p');
  note.textContent=used?tr('Đã dùng Fusion trong trận này.','Your one Fusion has been used this match.'):
   tr('Hai chiêu đều MAX → Ghép thành 1 tuyệt kỹ mới và trống 1 ô kỹ năng. Chỉ một lần mỗi trận.',
      'Both moves MAX → One new skill, one freed slot. Once per match.');
  const list=document.createElement('div');list.className='pkmsvv-fusion-recipe-grid';
  const status=progress(pl);
  for(const [i,r] of RECIPES.entries()){
   const prog=status[i];
   const button=document.createElement('button');button.type='button';
   button.className='pkmsvv-fusion-recipe-choice'+(prog.unlocked&&!used?' is-ready':'');
   const ready=!used&&prog.unlocked&&pilotEligible(pl);
   button.disabled=!ready;
   const icon=document.createElement('img');icon.src=icons(r.id);
   icon.alt='';icon.width=50;icon.height=50;icon.loading='lazy';
   const body=document.createElement('span');body.className='pkmsvv-fusion-recipe-body';
   const name=document.createElement('strong');name.textContent=tr(r.vi,r.en);
   const formula=document.createElement('small');
   formula.textContent=moveLabel(r.ids[0])+' + '+moveLabel(r.ids[1]);
   const pill=document.createElement('b');pill.className='pkmsvv-fusion-recipe-status';
   pill.textContent=used?tr('Đã dùng Fusion','Used'):
    ready?tr('✓ FUSION NGAY','✓ FUSE NOW'):
    prog.learned<2?tr('Đã học '+prog.learned+'/2','Learned '+prog.learned+'/2'):
    tr('Đã MAX '+prog.maxed+'/2','MAX '+prog.maxed+'/2');
   body.append(name,formula,pill);button.append(icon,body);
   button.onclick=()=>{
    if(!G.PKMSVVFusionEvolved?.evolve(pl,r.id))return;
    G.UI?.toast?.(tr('✨ Tuyệt kỹ '+r.vi+' đã kích hoạt!',
      '✨ '+r.en+' activated!'),2600);
    closeGuide();
    if(G.Game?.state==='paused')G.Game?.togglePause?.();
    else G.UI?.hide?.('scr-pause');
    sync();
   };
   list.append(button);
  }
  const footer=document.createElement('button');footer.type='button';footer.className='btn small';
  footer.textContent=tr('Đóng','Close');footer.onclick=closeGuide;
  panel.append(heading,note,list,footer);shade.append(panel);
  shade.addEventListener?.('click',e=>{if(e.target===shade)closeGuide();});
  // Full keyboard/controller-style focus on the native button grid.
  shade.addEventListener?.('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();closeGuide();return;}
   if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
   const buttons=[...list.querySelectorAll('button:not(:disabled)'),footer];
   const index=buttons.indexOf(document.activeElement),step=e.key==='ArrowUp'?-2:
     e.key==='ArrowDown'?2:e.key==='ArrowLeft'?-1:1;
   buttons[(index+step+buttons.length)%buttons.length]?.focus?.();
   e.preventDefault();
  });
  document.body.append(shade);dialog=shade;
  (list.querySelector('button:not(:disabled)')||footer).focus?.();
  return true;
 }
 function openFusion(){return showGuide(G.Game?.player);}
 function openFromPause(){
  const pl=G.Game?.player;
  if(!pilotEligible(pl)||!G.UI?.isOpen?.('scr-pause'))return false;
  if(!['playing','paused'].includes(G.Game?.state))return false;
  return showGuide(pl);
 }
 function sync(){
  if(!action)return;
  const pl=G.Game?.player,state=G.Game?.state;
  action.hidden=!pl||pl.dead||!['playing','paused'].includes(state);
  if(action.hidden)return;
  const used=Number(pl._pkmsvvFusionUsed||0)>=maxPerRun,ready=!!options(pl);
  action.disabled=!!G.UI?.isOpen?.('scr-levelup')||!!G.UI?.isOpen?.('scr-item');
  action.classList?.toggle?.('has-new-match',ready&&!used);
  action.textContent=used?'✨ FUSION ✓':ready?'✨ FUSION SẴN SÀNG':'✨ FUSION';
  action.title=used?tr('Đã dùng Fusion; xem 10 công thức','Fusion used; view recipes'):
   ready?tr('Hai kỹ năng MAX. Chọn tuyệt kỹ!','Both skills MAX. Choose fusion!'):
    tr('Hai kỹ năng cùng MAX mới ghép được','Both skills must reach MAX');
 }
 function mount(){
  if(action||!document.body?.appendChild)return;
  const pause=document.getElementById('scr-pause');
  const row=pause?.querySelector?.('.pause-box .row')||pause?.querySelector?.('.row');
  if(!row)return;
  action=document.createElement('button');action.id='pkmsvv-pause-fusion';
  action.className='btn pkmsvv-pause-fusion';action.type='button';
  action.addEventListener('click',openFromPause);
  const settings=document.getElementById('btn-pause-settings');
  row.insertBefore(action,settings?.parentElement===row?settings:null);
  sync();
  if(typeof setInterval==='function')setInterval(sync,250);
 }
 // Compatibility for existing tests and older Wiki: legacy Bonds still exist,
 // but are separate from Fusion; do not hijack RunUI.showBond().
 const install=()=>true;
 const competitive=()=>!!(G.Royale?.active||G.EggRush?.active||
  G.PKMSVVArenaSolo?.active||G.PKMSVVChampionArena?.active);
 installSkillHints();
 if(document.body?.appendChild)mount();
 else document.addEventListener?.('DOMContentLoaded',mount,{once:true});
 return {RECIPES,maxPerRun,maxGroup,readyMove,pilotEligible,looseMoves,learnedCount,
  potentialPairs,pairFor,options,confirm,progress,learnedIds,offerHint,decorateOffers,
  notifyLearned,installSkillHints,install,competitive,openFusion,openFromPause,
  showGuide,mount,sync};
})();
