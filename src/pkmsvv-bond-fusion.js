/* Official Fusion: five two-move recipes across all battle modes.
 * Player.fuse owns combat casts and VFX; one use per player per match. */
G.PKMSVVFusionPilot=(()=>{
 const tr=(a,b)=>G.I18n?.lang==='en'?b:a;
 const RECIPES=Object.freeze([
  {id:'ember-quick',ids:['ember','quick-attack'],vi:'Lửa Lướt',en:'Blazing Rush'},
  {id:'water-tackle',ids:['water-gun','tackle'],vi:'Thủy Kích',en:'Tidal Charge'},
  {id:'grass-spin',ids:['vine-whip','rapid-spin'],vi:'Lốc Dây Leo',en:'Vine Cyclone'},
  {id:'spark-quick',ids:['thunder-shock','quick-attack'],vi:'Điện Quang',en:'Thunder Dash'},
  {id:'mind-tackle',ids:['confusion','tackle'],vi:'Tâm Lực',en:'Psychic Impact'}
 ]);
 const ENABLE_PILOT=true; // all modes
 const maxPerRun=1;
 const readyMove=m=>!!(m&&m.evolved===true&&m.def&&
  Number.isFinite(m.lvl)&&m.lvl>=m.def.maxLvl&&G.Moves?.EVO?.[m.id]);
 function pilotEligible(pl){
  if(!ENABLE_PILOT||!pl||pl.remote||pl.lanBot||pl.dead)return false;
  return true;
 }
 function pairFor(pl){
  if(!pilotEligible(pl)||Number(pl._pkmsvvFusionUsed||0)>=maxPerRun||!Array.isArray(pl.slots))return null;
  const loose=pl.slots.filter(slot=>slot.length===1).map(slot=>slot[0]);
  for(const recipe of RECIPES){
   const moves=recipe.ids.map(id=>loose.find(m=>m.id===id&&readyMove(m)));
   if(moves.length===2&&moves.every(Boolean)&&moves[0]!==moves[1])
    return {recipe,moves};
  }
  return null;
 }
 function options(pl){
  const found=pairFor(pl);
  return found?{mode:'pair',group:null,loose:found.moves,pilot:true,
   recipe:found.recipe.id,recipeName:tr(found.recipe.vi,found.recipe.en)}:null;
 }
 function confirm(pl,picked){
  const found=pairFor(pl);
  if(!found||!Array.isArray(picked)||picked.length!==2||
   !picked.every(m=>found.moves.includes(m))||picked[0]===picked[1])return false;
  pl._pkmsvvFusionUsed=(pl._pkmsvvFusionUsed||0)+1;
  return true;
 }
 function progress(pl){
  const slots=pl?.slots||[],loose=slots.filter(s=>s.length===1).map(s=>s[0]);
  return RECIPES.map(r=>{
   const ready=r.ids.map(id=>loose.some(m=>m.id===id&&readyMove(m)));
   const learned=r.ids.map(id=>loose.some(m=>m.id===id));
   return {id:r.id,name:tr(r.vi,r.en),ids:r.ids.slice(),
    learned:learned.filter(Boolean).length,ready:ready.filter(Boolean).length,
    unlocked:ready.every(Boolean),used:!!pl?Number(pl._pkmsvvFusionUsed||0)>=maxPerRun:false};
  });
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
     hint.textContent=tr('🔗 FUSION · Tất cả chế độ · ', '🔗 Fusion · All modes · ')+
       opt.recipeName+tr(' · Đúng 2 chiêu đã tiến hóa tối đa · 1 lần/trận',
        ' · Exactly 2 fully evolved moves · Once per run');
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
      const result=document.createElement('strong');result.textContent=' → '+tr(r.vi,r.en);
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
  function openFusion(){
   const p=G.Game?.player,opt=options(p);
   if(!opt||G.Game?.state!=='playing'||G.UI?.isOpen?.('scr-bond')||
      G.UI?.isOpen?.('scr-levelup'))return false;
   const shared=!!(G.Coop?.active&&!competitive());
   if(shared)G.Coop?.holdStart?.();
   G.RunUI.showBond(opt,picked=>{
    try{
     if(!confirm(p,picked))return;
     p.bonds=Math.max(1,Number(p.bonds)||0); // Player.fuse consumes a bond
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
   action.disabled=used||!ready||!!G.UI?.isOpen?.('scr-levelup')||
     !!G.UI?.isOpen?.('scr-bond')||!!G.UI?.isOpen?.('scr-item');
   action.textContent=used?'FUSION ✓':'🔗 FUSION';
   action.title=used?tr('Đã dùng Fusion trận này','Fusion used this match'):
    ready?tr('Ghép hai skill · chỉ một lần mỗi trận','Fuse two moves once per match'):
    tr('Cần hai skill đúng công thức đã tiến hóa tối đa',
       'Needs two max-evolved recipe moves');
  }
  function mount(){
   if(action||!document.body?.appendChild)return;
   action=document.createElement('button');action.id='pkmsvv-fusion-action';
   action.type='button';action.textContent='🔗 FUSION';action.hidden=true;
   action.addEventListener('click',openFusion);document.body.append(action);
   sync();if(typeof setInterval==='function')setInterval(sync,250);
  }
  install();
  if(document.body?.appendChild)mount();
  else if(typeof document.addEventListener==='function')
   document.addEventListener('DOMContentLoaded',mount,{once:true});
  return {RECIPES,maxPerRun,pilotEligible,readyMove,pairFor,options,confirm,
   progress,install,competitive,openFusion,mount,sync};
})();