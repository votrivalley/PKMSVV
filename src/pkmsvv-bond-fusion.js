/* D — Five explicitly curated 2-move Bond recipes. The engine already
 * fuses actual move instances and owns cast/VFX: reuse it without stat changes.
 * Pilot enabled ONLY for a human, offline solo PvE Pokémon; other modes keep
 * their original Bond behavior until network verification and balancing. */
G.PKMSVVFusionPilot=(()=>{
 const tr=(a,b)=>G.I18n?.lang==='en'?b:a;
 const RECIPES=Object.freeze([
  {id:'ember-quick',ids:['ember','quick-attack'],vi:'Lửa Lướt',en:'Blazing Rush'},
  {id:'water-tackle',ids:['water-gun','tackle'],vi:'Thủy Kích',en:'Tidal Charge'},
  {id:'grass-spin',ids:['vine-whip','rapid-spin'],vi:'Lốc Dây Leo',en:'Vine Cyclone'},
  {id:'spark-quick',ids:['thunder-shock','quick-attack'],vi:'Điện Quang',en:'Thunder Dash'},
  {id:'mind-tackle',ids:['confusion','tackle'],vi:'Tâm Lực',en:'Psychic Impact'}
 ]);
 const ENABLE_PILOT=true; // full online/AI/competitive must not accidentally use it
 const maxPerRun=1;
 const readyMove=m=>!!(m&&m.evolved===true&&m.def&&
  Number.isFinite(m.lvl)&&m.lvl>=m.def.maxLvl&&G.Moves?.EVO?.[m.id]);
 function pilotEligible(pl){
  if(!ENABLE_PILOT||!pl||pl.remote||pl.uid||G.Coop?.active||
   G.Royale?.active||G.EggRush?.active||G.PKMSVVBerryRescue?.active||
   G.PKMSVVArenaSolo?.active||G.PKMSVVChampionArena?.active||
   G.Judgment?.cinematic||G.Rift?.inArena)return false;
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
     hint.textContent=tr('🔗 FUSION thử nghiệm (solo PvE) · ', '🔗 Fusion Pilot (solo PvE) · ')+
       opt.recipeName+tr(' · Đúng 2 chiêu đã tiến hóa tối đa · 1 lần/trận',
        ' · Exactly 2 fully evolved moves · Once per run');
     hint.hidden=false;
    }
   }else{
    document.querySelector('.pkmsvv-fusion-pilot-hint')?.setAttribute('hidden','');
   }
   return result;
  };
  show._pkmsvvFusion=true;G.RunUI.showBond=show;return true;
 }
 install();
 return {RECIPES,maxPerRun,pilotEligible,readyMove,pairFor,options,confirm,progress,install};
})();