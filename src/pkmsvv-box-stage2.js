/* PokéBox Stage 2 QA — individual gacha, same-species A+C rank, PvE stats.
 * Never injected into production. Keep the unchanged legacy collection as a
 * compatibility view until the full four-stage release is validated.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.G)root.G.PKMSVVBox2=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const MAX_RANK=5,MAX_SAVE_CHARS=1400000;
 const has=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
 const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const deep=x=>JSON.parse(JSON.stringify(x));
 const number=n=>Number.isSafeInteger(n)&&n>=0;
 const toDex=n=>Number.isInteger(Number(n))&&Number(n)>0&&Number(n)<=1025?Number(n):null;
 const stage1=()=>typeof G==='undefined'?null:G.PKMSVVBox;
 const save=()=>typeof G==='undefined'?null:G.DB?.save;
 const formatRank=n=>({rank:n,hp:Math.round(n*6),damage:Math.round(n*6),cooldown:n>=4?5:0,trait:n>=3,ascended:n>=5});
 function valid(s){
  if(!stage1()?.validBox?.(s))return false;
  if(s.pkmsvvBoxNextId!==undefined&&!number(s.pkmsvvBoxNextId))return false;
  if(s.pkmsvvRankFragments!==undefined&&!obj(s.pkmsvvRankFragments))return false;
  for(const [dex,qty] of Object.entries(s.pkmsvvRankFragments||{}))
   if(!toDex(dex)||!number(qty))return false;
  return true;
 }
 function get(s,id){return s?.pkmsvvBox?.find(x=>x.id===id)||null;}
 function shards(s,dex){return s?.pkmsvvRankFragments?.[String(dex)]||0;}
 // Shared progress is derived from all saved individuals: no save migration needed.
 // Only the highest ranked carrier grants a species-wide Rank/branch.
 function speciesProgress(s,dex){
  const same=Array.isArray(s?.pkmsvvBox)?s.pkmsvvBox.filter(x=>x.dex===Number(dex)):[];
  const owner=same.reduce((best,x)=>!best||x.rank>best.rank?x:best,null);
  const branchOwner=same.find(x=>x.rankBranch&&x.rank>=3);
  return {rank:owner?.rank||0,rankBranch:branchOwner?.rankBranch||owner?.rankBranch||null,
   ownerId:owner?.id||null};
 }
 function skinTraits(s,item){
  if(!item)return null;
  const same=s?.pkmsvvBox?.filter(x=>x.dex===item.dex)||[];
  const base=same.find(x=>x.id==='b1-'+item.dex+'-n')||
   same.find(x=>!x.shiny&&x.rank>0)||same.find(x=>!x.shiny)||item;
  return {...item,natureId:base.natureId,abilitySlot:base.abilitySlot,
   taughtMoves:base.taughtMoves||item.taughtMoves};
 }
 function eligible(s,item,validated=false,speciesCount=null){
  if(!item||(!validated&&!valid(s))||item.id===s.pkmsvvSelectedInstanceId||
     (Array.isArray(s.pkmsvvTeam6)&&s.pkmsvvTeam6.includes(item.id))||item.locked||item.favorite||
     item.shiny||item.rank!==0||item.upgraded||item.personalUpgrades) return false;
  if(item.id.startsWith('b1-'))return false; // migrated originals are never fodder
  const copies=speciesCount===null?s.pkmsvvBox.filter(x=>x.dex===item.dex).length:speciesCount;
  if(copies<=1)return false;
  const mon=typeof G==='undefined'?null:G.DEX_BY?.[item.dex];
  if(mon&&(mon.rarity>=5||mon.leg||mon.legendary))return false;
  return true;
 }
 function candidateList(s,id){
  if(!valid(s))return [];
  const target=get(s,id);if(!target)return [];
  const same=s.pkmsvvBox.filter(x=>x.dex===target.dex);
  return same.filter(x=>x.id!==id&&eligible(s,x,true,same.length));
 }
 function validateMutation(before,after){
  if(!valid(after))throw Error('Invalid PokéBox after operation');
  if(JSON.stringify(after).length>MAX_SAVE_CHARS)throw Error('PokéBox save storage guard: too large to commit safely');
  if(!after.pkmsvvBox.some(x=>x.id===after.pkmsvvSelectedInstanceId))throw Error('Selected Pokémon lost');
  // Never regress Pokedex ownership or purchased inventory.
  if(JSON.stringify(before.owned)!==JSON.stringify(after.owned)||
     JSON.stringify(before.shiny)!==JSON.stringify(after.shiny)){
   // Gacha legitimately adds owned/shiny; leave assertion to operation-specific checks.
  }
 }
 function commitDraft(original,draft){
  validateMutation(original,draft);
  const old=deep(original);
  const oldKeys=Object.keys(original);
  try{
   for(const k of oldKeys)delete original[k];
   Object.assign(original,draft);
   if(typeof G!=='undefined'&&G.DB?.save===original&&G.DB.commit?.(true)===false)
    throw Error('Persistence failed');
   return true;
  }catch(e){
   for(const k of Object.keys(original))delete original[k];
   Object.assign(original,old);
   throw e;
  }
 }
 function makeOne(s,roll,lookup={}){
  if(!valid(s))throw Error('Migrate PokéBox first');
  const dex=toDex(roll?.dex);
  if(!dex)throw Error('Invalid Gacha Pokémon ID');
  let seq=number(s.pkmsvvBoxNextId)?s.pkmsvvBoxNextId:1;
  const ids=new Set(s.pkmsvvBox.map(x=>x.id));
  while(ids.has('b2-'+seq))seq++;
  const id='b2-'+seq;s.pkmsvvBoxNextId=seq+1;
  const naturals=lookup.natures||((typeof G!=='undefined'&&G.NATURES)||[]);
  const rollRandom=lookup.random||Math.random;
  const natural=naturals.length?naturals[Math.floor(rollRandom()*naturals.length)]?.id:'hardy';
  const abils=lookup.abilities?.[dex]||((typeof G!=='undefined'&&G.DEX_ABIL?.[dex])||[]);
  const available=[0,1].filter(i=>abils[i]&&(!i||abils[1]!==abils[0]));
  let abilitySlot=available.length?available[Math.floor(rollRandom()*available.length)]:0;
  if(abils[2]&&rollRandom()<0.05)abilitySlot=2;
  const item={id,dex,shiny:!!roll.shiny,natureId:natural||'hardy',
   abilitySlot,rank:0,locked:false,favorite:false,rankBranch:null};
  s.pkmsvvBox.push(item);
  return item;
 }
 function applyRolls(s,results,lookup){
  if(!Array.isArray(results))throw Error('Gacha did not yield an array');
  const instances=results.map(r=>makeOne(s,r,lookup));
  results.forEach((r,i)=>r.instanceId=instances[i].id);
  return instances;
 }
 function wrappedPull(gacha,db){
  if(!gacha||typeof gacha.pull!=='function')throw Error('Gacha.pull unavailable');
  if(gacha._pkmbxStage2Wrapped)return true;
  const original=gacha.pull;
  gacha.pull=function(s,n,gen,use){
   if(!valid(s))return original.apply(this,arguments); // not yet migrated; old behavior untouched
   if(db?.save!==s) return original.apply(this,arguments); // never rewrite a guest/foreign profile
   const draft=deep(s);
   const result=original.call(this,draft,n,gen,use);
   if(!result)return result;
   if(!Array.isArray(result)||result.length!==n)throw Error('Gacha result mismatch; no tickets spent');
   applyRolls(draft,result);
   // All draws, pity, coins, owned/shiny and box changes commit as one save.
   commitDraft(s,draft);
   return result;
  };
  gacha._pkmbxStage2Wrapped=true;
  return true;
 }
 function mutate(s,fn){
  if(!valid(s))throw Error('Migrate PokéBox first');
  const draft=deep(s);
  const result=fn(draft);
  commitDraft(s,draft);
  return result;
 }
 function toFragments(id,s=save()){
  return mutate(s,draft=>{
   const item=get(draft,id);
   if(!eligible(draft,item))throw Error('Pokémon protected or unavailable for conversion');
   draft.pkmsvvBox=draft.pkmsvvBox.filter(x=>x.id!==id);
   draft.pkmsvvRankFragments=draft.pkmsvvRankFragments||{};
   draft.pkmsvvRankFragments[item.dex]=shards(draft,item.dex)+1;
   record(draft,'shard',item.dex,id,1);
   return {dex:item.dex,fragments:draft.pkmsvvRankFragments[item.dex]};
  });
 }
 function rankUp(id,materials=[],fragmentQty=0,s=save()){
  return mutate(s,draft=>{
   const item=get(draft,id),progress=speciesProgress(draft,item?.dex);
   if(!item||progress.rank>=MAX_RANK)throw Error('Pokémon already Rank 5 or missing');
   if(!Array.isArray(materials)||!number(fragmentQty)||fragmentQty>shards(draft,item.dex))throw Error('Invalid materials');
   if(new Set(materials).size!==materials.length)throw Error('Duplicate material ID');
   const cost=progress.rank+1;
   if(materials.length+fragmentQty!==cost)throw Error('Rank requires exactly '+cost+' same-species materials');
   for(const mid of materials){
    const material=get(draft,mid);
    if(!material||material.dex!==item.dex||mid===id||!eligible(draft,material))
     throw Error('Only unprotected duplicates of the same species can be consumed');
   }
   const oldRank=progress.rank;
   draft.pkmsvvBox=draft.pkmsvvBox.filter(x=>!materials.includes(x.id));
   draft.pkmsvvRankFragments=draft.pkmsvvRankFragments||{};
   draft.pkmsvvRankFragments[item.dex]=shards(draft,item.dex)-fragmentQty;
   item.rank=cost;
   if(progress.rankBranch)item.rankBranch=progress.rankBranch;
   record(draft,'rank',item.dex,id,item.rank);
   return {id:item.id,from:oldRank,to:item.rank,consumed:materials.length,fragments:fragmentQty};
  });
 }
 function record(s,kind,dex,id,value){
  const logs=Array.isArray(s.pkmsvvBoxLog)?s.pkmsvvBoxLog:[];
  logs.push({kind,dex,id,value,at:Date.now()});s.pkmsvvBoxLog=logs.slice(-30);
 }
 function branches(dex){
  const types=(typeof G!=='undefined'?G.DEX_BY?.[dex]?.types:null)||[];
  const list=Array.isArray(types)?types.filter(x=>typeof x==='string'):[];
  return list.length>=2?[...new Set(list)].slice(0,2):['offense','defense'];
 }
 function chooseBranch(id,branch,s=save()){
  return mutate(s,draft=>{
   const x=get(draft,id);
   const progress=speciesProgress(draft,x?.dex);
   if(!x||progress.rank<3)throw Error('Rank 3 is required');
   if(progress.rankBranch)throw Error('Branch already chosen; Stage 3 reset item required');
   if(!branches(x.dex).includes(branch))throw Error('Invalid branch');
   const owner=get(draft,progress.ownerId)||x;
   owner.rankBranch=branch;record(draft,'branch',x.dex,owner.id,branch);return {id,branch};
  });
 }
 function selected(s=save()){
  if(!valid(s))return null;
  const item=get(s,s.pkmsvvSelectedInstanceId);
  if(!item||item.dex!==Number(s.partner)||!!item.shiny!==!!s.partnerShiny)return null;
  const progress=speciesProgress(s,item.dex),visual=skinTraits(s,item);
  return {...visual,rank:progress.rank,rankBranch:progress.rankBranch};
 }
 function statBonus(mon,item){
  if(!mon||!item||!item.rank)return mon;
  const factor=1+item.rank*0.06,copyMon={...mon};
  for(const k of ['hp','pa','sa'])if(typeof copyMon[k]==='number')copyMon[k]=Math.round(copyMon[k]*factor*100)/100;
  if(typeof copyMon.pa==='number'&&typeof copyMon.sa==='number')copyMon.atk=Math.max(copyMon.pa,copyMon.sa);
  else if(typeof copyMon.atk==='number')copyMon.atk*=factor;
  return copyMon;
 }

 function hookIndividualTraits(mons,db){
  if(!mons||mons._pkmbxStage2Traits||typeof mons.natureOf!=='function'||typeof mons.abilityOf!=='function')return false;
  const oldNature=mons.natureOf,oldAbility=mons.abilityOf;
  mons.natureOf=function(dex,...args){
   const x=selected(db?.save);
   if(x&&x.dex===Number(dex)){
    const nature=G.NATURE_BY?.[x.natureId];
    if(nature)return nature;
   }
   return oldNature.call(this,dex,...args);
  };
  mons.abilityOf=function(dex,...args){
   const x=selected(db?.save),abilities=G.DEX_ABIL?.[dex];
   if(x&&x.dex===Number(dex)&&abilities?.[x.abilitySlot])
    return {slot:x.abilitySlot,id:abilities[x.abilitySlot]};
   return oldAbility.call(this,dex,...args);
  };
  mons._pkmbxStage2Traits=true;return true;
 }
 function withIndividualNature(mon,dex,item){
  const nature=G.NATURE_BY?.[item.natureId],base=G.DEX_BY?.[dex];
  if(!nature||!base||mon.nature===nature.id)return mon;
  const adjusted={...mon};
  for(const k of ['pa','sa','df','sd','spd']){
   if(typeof base[k]!=='number')continue;
   adjusted[k]=base[k]*(nature.up===k?1.1:nature.down===k?0.9:1);
  }
  if(typeof adjusted.pa==='number'&&typeof adjusted.sa==='number')adjusted.atk=Math.max(adjusted.pa,adjusted.sa);
  adjusted.nature=nature.id;
  return adjusted;
 }
 function hookPveStats(mons,db){
  if(!mons||typeof mons.monFor!=='function'||mons._pkmbxStage2Stats)return false;
  const original=mons.monFor;
  mons.monFor=function(dex,...args){
   const result=original.call(this,dex,...args),s=db?.save,x=selected(s);
   // No raw Rank advantage in PvP or multiplayer. Champion balancing is Stage 4.
   if(!x||x.dex!==Number(dex)||typeof G!=='undefined'&&(G.Coop?.active||G.Arena?.active||G.Royale?.active||
    G.PKMSVVArenaPvp?.active||G.PKMSVVChampionArena?.active||G.PKMSVVChampion?.active||
    G.PKMSVVBerryRescue?.active||G.Rift?.inArena))return result;
   return statBonus(withIndividualNature(result,dex,x),x);
  };
  mons._pkmbxStage2Stats=true;return true;
 }
 function init(){
  if(typeof window==='undefined'||!window.G)return;
  // Late-loaded QA injection: run after the compiled engine registered Gacha and Mons.
  function install(){
   try{wrappedPull(G.Gacha,G.DB);}catch(_){}
   try{hookIndividualTraits(G.Mons,G.DB);}catch(_){}
   try{hookPveStats(G.Mons,G.DB);}catch(_){}
  }
  install();
  if(typeof document!=='undefined'){
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
   else install();
  }
 }
 return {MAX_RANK,MAX_SAVE_CHARS,formatRank,valid,get,shards,eligible,candidateList,makeOne,applyRolls,wrappedPull,
  toFragments,rankUp,branches,chooseBranch,speciesProgress,skinTraits,selected,statBonus,hookIndividualTraits,withIndividualNature,hookPveStats,init};
});
if(typeof window!=='undefined'&&window.G)window.G.PKMSVVBox2?.init?.();
