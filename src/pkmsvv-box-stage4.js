/* PokéBox Stage 4 QA — live Solo PvE Rank traits, Rank 4 cooldown.
 * Deliberately never grants PvP/Co-op/Champion rank advantage before full balancing.
 * Rank traits decorate the player's OWN Ability object; never modify G.AbilityFX.FX.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.G)root.G.PKMSVVBox4=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const HIT_PROC=.16,HIT_LOCK_MS=3500,HYBRID_LOCK_MS=12000,HYBRID_MAX=6;
 const COLORS={fire:'#ff8d4e',water:'#62bfff',grass:'#7edf83',electric:'#fff07b',
  flying:'#a5d9ee',ghost:'#b7a2f6',poison:'#ce82dc',steel:'#b2bccb',
  dragon:'#d591fa',psychic:'#f08bbd',ice:'#9fe5fa',fairy:'#ffb5db',
  fighting:'#f5ae78',ground:'#bf975e',rock:'#e0c18a',bug:'#b4da74',
  dark:'#a1a1bb',normal:'#f3e1ac',offense:'#ffca7b',defense:'#b6dbf1'};
 const ST={fire:'burn',poison:'poison',bug:'poison',dark:'poison',
  grass:'slow',water:'slow',ice:'slow',psychic:'slow',ground:'slow',
  steel:'guard',rock:'guard',defense:'guard',ghost:'evade',flying:'evade',
  electric:'strike',dragon:'strike',fighting:'strike',normal:'strike',
  offense:'strike',fairy:'heal'};
 const nowMs=()=>Date.now();
 const box=()=>typeof G==='undefined'?null:G.PKMSVVBox2;
 const getSave=()=>typeof G==='undefined'?null:G.DB?.save;
 const typeOf=(item)=>item?.rankBranch||null;
 function eligibleMode(){
  if(typeof G==='undefined')return true;
  return !(G.Coop?.active||G.Arena?.active||G.Royale?.active||
   G.PKMSVVArenaPvp?.active||G.PKMSVVChampionArena?.active||
   G.PKMSVVChampion?.active||G.PKMSVVBerryRescue?.active||
   G.Rift?.inArena);
 }
 function forPlayer(pl,db){
  const item=box()?.selected?.(db?.save);
  const dex=Number(pl?.mon?.dex??pl?.dex);
  return item&&dex===item.dex&&eligibleMode()?item:null;
 }
 function rankProperties(item){
  if(!item||item.rank<3||!typeOf(item))return null;
  const branch=typeOf(item),effects=ST[branch]||'strike';
  return {branch,effects,rank:item.rank,color:COLORS[branch]||'#d9cbff',
   hybrid:item.rank>=5,hitChance:HIT_PROC,hitCooldownMs:HIT_LOCK_MS,
   hybridCooldownMs:HYBRID_LOCK_MS};
 }
 function applyStatus(e,kind,pl,rank,random=Math.random){
  if(!e||e.dead||e.remote||e.arceus)return false;
  if(kind==='burn'){e.applyBurn?.(1);return true;}
  if(kind==='poison'){e.applyPoison?.(1);return true;}
  if(kind==='slow'){e.applySlow?.(e.boss?.9:.72,e.boss?1.25:2.8);return true;}
  if(kind==='heal'){if(pl?.heal&&Number.isFinite(pl.maxHp))pl.heal(Math.max(1,pl.maxHp*.015));return true;}
  if(kind==='guard'||kind==='evade')return true; // passive in defensive Ability hooks
  const power=Math.min(75,7+(Number(pl?.level)||1)*1.3)*(e.boss?.4:1);
  const dx=(e.x||0)-(pl?.x||0),dy=(e.y||0)-(pl?.y||0);
  e.hurt?.(power,'#d7b4fa',dx,dy,e.boss?0:30);
  return true;
 }
 function hybridHit(pl,e,traits,atMs=nowMs()){
  if(!traits?.hybrid||!e||e.dead||!eligibleMode())return 0;
  if(atMs<(pl._pkmbxHybridNext||0))return 0;
  const around=typeof G!=='undefined'&&G.EnemyMgr?.queryCircle?.(e.x,e.y,140);
  if(!Array.isArray(around))return 0;
  pl._pkmbxHybridNext=atMs+HYBRID_LOCK_MS;
  const myTypes=(typeof G!=='undefined'?G.DEX_BY?.[pl.mon?.dex]?.types:null)||[];
  const other=Array.isArray(myTypes)?myTypes.find(t=>t!==traits.branch):null;
  let affected=0;
  for(const target of around){
   if(affected>=HYBRID_MAX)break;
   if(!target||target.dead||target.remote||target.arceus||target===e||target._pkmsvvBossSupport)continue;
   const power=Math.min(100,8+(Number(pl?.level)||1)*1.5)*(target.boss?.35:1);
   target.hurt?.(power,traits.color);
   if(other)applyStatus(target,ST[other]||'strike',pl,traits.rank);
   else applyStatus(target,ST[traits.branch]||'strike',pl,traits.rank);
   affected++;
  }
  if(affected>0&&typeof G!=='undefined')G.FX?.ring?.(e.x,e.y,15,105,traits.color,.35,2);
  return affected;
 }
 function procHit(pl,e,move,traits,random=Math.random,atMs=nowMs()){
  if(!traits||!pl||!e||e.dead||!eligibleMode()||e.remote)return {proc:false,hybrid:0};
  let proc=false;
  if(atMs>=(pl._pkmbxRankHitNext||0)&&random()<HIT_PROC){
   pl._pkmbxRankHitNext=atMs+HIT_LOCK_MS;
   proc=applyStatus(e,traits.effects,pl,traits.rank,random);
  }
  const hybrid=hybridHit(pl,e,traits,atMs);
  return {proc,hybrid};
 }
 function decorateAbility(pl,item,random=Math.random){
  if(!pl||!item||!eligibleMode())return false;
  if(!pl.abil)pl.abil={};
  if(pl._pkmbxAbilityAugmented)return false;
  const rank=item.rank,traits=rankProperties(item);
  if(!rank)return false;
  // Never mutate G.AbilityFX.FX objects, which are shared among same-Ability species.
  const abil=Object.assign({},pl.abil);
  const oldHit=abil.hit,oldDodge=abil.dodge,oldInMul=abil.inMul;
  pl._pkmbxRankId=item.id;
  pl._pkmbxRankTraits=traits;
  pl._pkmbxRankHitNext=0;pl._pkmbxHybridNext=0;
  if(rank>=4&&Number.isFinite(pl.cdMul)&&pl.cdMul>0){
   pl.cdMul*=.95;pl._pkmbxRankCdApplied=true;
  }
  if(traits){
   abil.hit=function(self,e,move){
    if(oldHit)oldHit.call(this,self,e,move);
    if(self===pl&&forPlayer(pl,G.DB)?.id===item.id)procHit(pl,e,move,traits,random);
   };
   if(traits.effects==='evade'){
    abil.dodge=function(self,type,cls){
     const base=oldDodge?oldDodge.call(this,self,type,cls):0;
     return Math.max(base,rank>=5?.12:.08);
    };
   }
   if(traits.effects==='guard'){
    abil.inMul=function(self,type,cls){
     const base=oldInMul?oldInMul.call(this,self,type,cls):1;
     return base*(rank>=5?.90:.94);
    };
   }
  }
  pl.abil=abil;pl._pkmbxAbilityAugmented=true;
  return true;
 }
 function install(Player,db){
  if(!Player?.prototype||typeof Player.prototype.setAbility!=='function')return false;
  if(Player.prototype._pkmbxStage4Installed)return true;
  const original=Player.prototype.setAbility;
  Player.prototype.setAbility=function(...args){
   const ret=original.apply(this,args);
   // setAbility is run setup. If called a second time, recompose fresh traits
   // without stacking another cooldown multiplier on an existing player.
   const priorCd=this._pkmbxRankCdApplied;
   if(priorCd&&Number.isFinite(this.cdMul))this.cdMul/=0.95;
   this._pkmbxAbilityAugmented=false;this._pkmbxRankCdApplied=false;
   const item=forPlayer(this,db);
   if(item)decorateAbility(this,item);
   return ret;
  };
  Player.prototype._pkmbxStage4Installed=true;
  return true;
 }
 function init(){
  if(typeof window==='undefined'||!window.G)return;
  const hook=()=>{try{install(G.Player,G.DB);}catch(e){console.warn('[PokéBox Rank combat]',e.message);}};
  hook();
  if(typeof document!=='undefined'){
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook,{once:true});
   else hook();
  }
 }
 return {HIT_PROC,HIT_LOCK_MS,HYBRID_LOCK_MS,HYBRID_MAX,ST,COLORS,
  eligibleMode,forPlayer,rankProperties,applyStatus,hybridHit,procHit,decorateAbility,install,init};
});
if(typeof window!=='undefined'&&window.G)window.G.PKMSVVBox4?.init?.();
