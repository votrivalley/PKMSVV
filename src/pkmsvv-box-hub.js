/* Pokémon Chuyển Sinh — PokéBox Hub: individual collection, team of six and items.
 * QA ONLY. The existing Pokédex becomes a read-only reference in the companion UI.
 * All mutations are atomic with the original G.DB.save object and reject old saves
 * until the player explicitly exports a backup and migrates PokéBox.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.G)root.G.PKMSVVBoxHub=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const TEAM_MAX=6;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
 const save=()=>typeof G!=='undefined'?G.DB?.save:null;
 const box=()=>typeof G!=='undefined'?G.PKMSVVBox:null;
 function valid(s){return !!(s&&box()?.validBox?.(s)&&Array.isArray(s.pkmsvvBox));}
 function item(s,id){return valid(s)?s.pkmsvvBox.find(x=>x.id===id)||null:null;}
 function active(s=save()){
  return valid(s)?item(s,s.pkmsvvSelectedInstanceId):null;
 }
 // Old saves can assemble a ready-to-play team without migrating to the
 // individual schema. This is NOT a favorites list; no starred state changes.
 function legacyTeam(s){
  if(!s||s.pkmsvvBoxSchema!==undefined||!box()?.listLegacy)return [];
  let available;
  try{available=box().listLegacy(s)}catch(_){return [];}
  const ids=new Set(available.map(x=>x.id));
  const selected=available.find(x=>x.dex===Number(s.partner)&&x.shiny===!!s.partnerShiny)?.id||
   available.find(x=>x.dex===Number(s.partner))?.id||null;
  const incoming=Array.isArray(s.pkmsvvLegacyReady6)?s.pkmsvvLegacyReady6:(selected?[selected]:[]);
  const seen=new Set();
  return incoming.filter(id=>{
   if(typeof id!=='string'||!ids.has(id)||seen.has(id))return false;
   seen.add(id);return true;
  }).slice(0,TEAM_MAX);
 }
 function team(s=save()){
  if(!valid(s))return legacyTeam(s);
  const incoming=Array.isArray(s.pkmsvvTeam6)?s.pkmsvvTeam6:
    s.pkmsvvSelectedInstanceId?[s.pkmsvvSelectedInstanceId]:[];
  const seen=new Set();
  return incoming.filter(id=>{
   if(typeof id!=='string'||seen.has(id)||!item(s,id))return false;
   seen.add(id);return true;
  }).slice(0,TEAM_MAX);
 }
 // Arena selection is ALWAYS scoped to the 1–6 explicit Ready Team slots.
 // Keep instance IDs and Shiny skins distinct: two copies of a species are
 // two different eligible cards. Neither favorites nor the full Box qualify.
 function arenaReady(s=save()){
  if(!s)return [];
  let available=[];
  try{available=valid(s)?s.pkmsvvBox:(box()?.listLegacy?.(s)||[]);}
  catch(_){return [];}
  const items=new Map(available.filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x]));
  return team(s).map(id=>items.get(id)).filter(x=>x&&Number.isInteger(Number(x.dex))&&
   Number(x.dex)>0&&!!(typeof G!=='undefined'&&G.DEX_BY?.[Number(x.dex)]))
   .map(x=>({id:x.id,dex:Number(x.dex),shiny:!!x.shiny}));
 }
 function isMember(s,id){return team(s).includes(id);}
 function atomic(s,change){
  if(!valid(s)||!G?.DB?.commit)throw Error('Create PokéBox from a backup before editing');
  const before=clone(s),draft=clone(s);
  const receipt=change(draft);
  if(!valid(draft))throw Error('Invalid PokéBox operation');
  if(JSON.stringify(draft).length>(G.PKMSVVBox2?.MAX_SAVE_CHARS||1400000))
   throw Error('Save too large for safe update');
  try{
   for(const key of Object.keys(s))delete s[key];
   Object.assign(s,draft);
   if(G.DB.commit(true)===false)throw Error('Could not save Pokémon changes');
   return receipt;
  }catch(error){
   for(const key of Object.keys(s))delete s[key];
   Object.assign(s,before);
   throw error;
  }
 }
 function toggleFavorite(id,s=save()){
  return atomic(s,draft=>{
   const x=speciesBase(draft,item(draft,id));if(!x)throw Error('Pokémon not found');
   x.favorite=!x.favorite;
   return {id,favorite:x.favorite};
  });
 }
 function toggleTeam(id,s=save()){
  if(!valid(s)){
   if(!s||s.pkmsvvBoxSchema!==undefined||!G?.DB?.commit)
    throw Error('Invalid PokéBox schema; ready team unchanged');
   let allowed;
   try{allowed=box()?.listLegacy?.(s).some(x=>x.id===id);}catch(_){allowed=false;}
   if(!allowed)throw Error('Pokémon is not owned');
   const original=clone(s),draft=clone(s),ready=legacyTeam(draft),index=ready.indexOf(id);
   if(index>=0)ready.splice(index,1);
   else{
    if(ready.length>=TEAM_MAX)throw Error('Team of six is full');
    ready.push(id);
   }
   draft.pkmsvvLegacyReady6=ready;
   if(JSON.stringify(draft).length>(G.PKMSVVBox2?.MAX_SAVE_CHARS||1400000))
    throw Error('Save too large for safe update');
   try{
    for(const key of Object.keys(s))delete s[key];
    Object.assign(s,draft);
    if(G.DB.commit(true)===false)throw Error('Could not save ready team');
    return {team:ready.slice(),added:index<0};
   }catch(e){
    for(const key of Object.keys(s))delete s[key];
    Object.assign(s,original);throw e;
   }
  }
  return atomic(s,draft=>{
   const x=item(draft,id);if(!x)throw Error('Pokémon not found');
   const list=team(draft),idx=list.indexOf(id);
   if(idx>=0)list.splice(idx,1);
   else{
    if(list.length>=TEAM_MAX)throw Error('Team of six is full');
    list.push(id); // Team membership is separate from Favorite
   }
   draft.pkmsvvTeam6=list;
   return {team:list.slice(),added:idx<0};
  });
 }
 function reorderTeam(ids,s=save()){
  return atomic(s,draft=>{
   const current=team(draft);
   if(!Array.isArray(ids)||ids.length!==current.length||new Set(ids).size!==current.length||
    !ids.every(id=>current.includes(id)))throw Error('Team reorder must retain the same six slots');
   draft.pkmsvvTeam6=ids.slice();
   return ids.slice();
  });
 }
 // Shared species traits live on the earliest original Normal carrier when present.
 // Old Shiny save data is retained for rollback; selecting a skin never resets traits.
 function speciesBase(s,x){
  if(!x||!x.shiny)return x;
  const same=Array.isArray(s?.pkmsvvBox)?s.pkmsvvBox.filter(v=>v.dex===x.dex):[];
  return same.find(v=>v.id==='b1-'+x.dex+'-n')||
   same.find(v=>!v.shiny&&v.rank>0)||same.find(v=>!v.shiny)||x;
 }
 function nature(s,x){
  const base=speciesBase(s,x);
  return base&&typeof G!=='undefined'?G.NATURE_BY?.[base.natureId]||null:null;
 }
 function ability(s,x){
  const base=speciesBase(s,x);if(!base)return null;
  const slots=typeof G!=='undefined'?G.DEX_ABIL?.[base.dex]||[0,0,0]:[0,0,0];
  const slot=Number.isInteger(base.abilitySlot)&&slots[base.abilitySlot]?base.abilitySlot:0;
  return {slot,id:slots[slot]||0};
 }
 function learned(s,x){
  const base=speciesBase(s,x);if(!base)return [];
  const arr=Array.isArray(base.taughtMoves)?base.taughtMoves:
    base.id.startsWith('b1-')?(s?.ptm?.[base.dex]||[]):[];
  return [...new Set(arr)].filter(id=>typeof id==='string');
 }
 function activeForDex(dex,s=save()){
  const x=active(s);
  return x&&x.dex===Number(dex)?x:null;
 }
 // Nature Mint and normal Ability Capsule are true rerolls: no requested
 // target can be passed by UI, controller or another caller. Inject RNG only
 // in tests; the real game always supplies Math.random.
 function pickRandom(candidates,random){
  if(!candidates.length)return null;
  const r=Number(random());
  if(!Number.isFinite(r)||r<0||r>=1)throw Error('Invalid random draw');
  return candidates[Math.floor(r*candidates.length)];
 }
 function useMint(id,s=save(),random=Math.random){
  return atomic(s,draft=>{
   const x=speciesBase(draft,item(draft,id));
   if(!x)throw Error('Pokémon not found');
   if(!(draft.bag?.mint>0))throw Error('No Nature Mint in Bag');
   const choices=(typeof G==='undefined'?[]:G.NATURES||[])
    .filter(n=>n&&G.NATURE_BY?.[n.id]&&n.id!==x.natureId);
   const chosen=pickRandom(choices,random);
   if(!chosen)throw Error('No alternative Nature is available');
   const before=x.natureId;
   draft.bag.mint--;if(!draft.bag.mint)delete draft.bag.mint;
   x.natureId=chosen.id;
   return {id,from:before,natureId:chosen.id,left:draft.bag.mint||0};
  });
 }
 // Base 5% Hidden rate mirrors natural rolls; the event-grade Hidden
 // Capsule triples only that probability (15%), never guarantees a Hidden.
 // Both items can roll standard abilities; no chosen target is accepted.
 const HIDDEN_RATE=0.05;
 function abilityAlternatives(abilities,current){
  return [0,1,2].filter(slot=>abilities?.[slot]&&slot!==current&&
    ![0,1].some(other=>other!==slot&&abilities[other]===abilities[slot]));
 }
 function rollAbilitySlot(abilities,current,kind='cap',random=Math.random){
  if(kind!=='cap'&&kind!=='caph')throw Error('Unknown Capsule kind');
  const alternatives=abilityAlternatives(abilities,current);
  const hiddenAvailable=alternatives.includes(2);
  const chance=HIDDEN_RATE*(kind==='caph'?3:1);
  const roll=Number(random());
  if(!Number.isFinite(roll)||roll<0||roll>=1)throw Error('Invalid random draw');
  if(hiddenAvailable&&roll<chance)return 2;
  const standard=alternatives.filter(x=>x<2);
  if(!standard.length)return null; // no item spent on a failed reroll
  return pickRandom(standard,random);
 }
 function useCapsule(id,kind='cap',s=save(),random=Math.random){
  return atomic(s,draft=>{
   const x=speciesBase(draft,item(draft,id));
   if(!x)throw Error('Pokémon not found');
   if(kind!=='cap'&&kind!=='caph')throw Error('Unknown Capsule kind');
   if(!(draft.bag?.[kind]>0))throw Error('No Capsule in Bag');
   const arr=typeof G==='undefined'?[]:G.DEX_ABIL?.[x.dex]||[];
   const slot=rollAbilitySlot(arr,x.abilitySlot,kind,random);
   if(slot===null)throw Error('No alternative Ability rolled; Capsule not consumed');
   const before=x.abilitySlot;
   draft.bag[kind]--;if(!draft.bag[kind])delete draft.bag[kind];
   x.abilitySlot=slot;
   return {id,kind,from:before,slot,hidden:slot===2,
    chance:HIDDEN_RATE*(kind==='caph'?3:1),
    abilityId:arr[slot],left:draft.bag[kind]||0};
  });
 }
 function canTeach(s,x,moveId){
  if(!x||typeof G==='undefined'||!G.Moves?.BY_ID?.[moveId]||!(s?.tms?.[moveId]>0))return false;
  if(!G.TM_OF?.(x.dex)?.includes(moveId))return false;
  if(learned(s,x).includes(moveId))return false;
  if(G.Mons?.natural?.(x.dex,moveId))return false;
  return true;
 }
 function teach(id,moveId,s=save()){
  return atomic(s,draft=>{
   const x=speciesBase(draft,item(draft,id));
   if(!canTeach(draft,x,moveId))throw Error('TM is unavailable or already learned');
   const old=learned(draft,x);
   draft.tms[moveId]--;if(!draft.tms[moveId])delete draft.tms[moveId];
   x.taughtMoves=old.concat([moveId]);
   return {id,moveId,left:draft.tms[moveId]||0};
  });
 }
 function installMons(mons){
  if(!mons||mons._pkmbxIndividualHub)return false;
  if(!mons.natureOf||!mons.abilityOf||!mons.monFor||!mons.taught)return false;
  const originalNature=mons.natureOf,originalAbility=mons.abilityOf;
  const originalMonFor=mons.monFor,originalTaught=mons.taught;
  mons.natureOf=function(dex,...args){
   const x=activeForDex(dex),n=nature(save(),x);
   return n||originalNature.call(this,dex,...args);
  };
  mons.abilityOf=function(dex,...args){
   const x=activeForDex(dex),a=ability(save(),x);
   return a||originalAbility.call(this,dex,...args);
  };
  mons.taught=function(dex,...args){
   const x=activeForDex(dex);
   return x?learned(save(),x).filter(id=>G.Moves?.BY_ID?.[id]):originalTaught.call(this,dex,...args);
  };
  mons.monFor=function(dex,...args){
   const result=originalMonFor.call(this,dex,...args),x=activeForDex(dex);
   if(!result||!x)return result;
   const n=nature(save(),x),old=originalNature.call(this,dex);
   if(!n||!old)return result;
   // Stage 2 has already applied Rank to the clone. Change only Nature's
   // ratio so the same Rank bonus isn't applied twice and base stats survive.
   for(const stat of ['pa','sa','df','sd','spd']){
    if(typeof result[stat]!=='number')continue;
    const before=(old.up===stat?1.1:old.down===stat ? .9 : 1);
    const after=(n.up===stat?1.1:n.down===stat ? .9 : 1);
    result[stat]=result[stat]*after/before;
   }
   if(typeof result.pa==='number'&&typeof result.sa==='number')
    result.atk=Math.max(result.pa,result.sa);
   result.nature=n.id;
   return result;
  };
  mons._pkmbxIndividualHub=true;
  return true;
 }
 // Read-only status from Stage 2's existing rules; never alter or consume save.
 function rankOverview(s,x){
  const max=5,api=typeof G!=='undefined'?G.PKMSVVBox2:null;
  const species=x&&api?.speciesProgress?.(s,x.dex);
  const rank=Math.max(0,Math.min(max,species?.rank??(Number.isInteger(x?.rank)?x.rank:0)));
  // Rank step N requires N matching copies (1, 2, 3, 4, then 5).
  const cost=rank===max?0:rank+1;
  const enabled=!!(x&&valid(s)&&api?.valid?.(s)&&
   typeof api.candidateList==='function'&&typeof api.shards==='function');
  // All source counts come from the SAME deterministic automatic upgrade
  // plan, so Box ×N and the Rank button never disagree about eligibility.
  const plan=enabled&&cost?api.rankMaterials?.(s,x.id):null;
  const copies=plan?.copies?.length||0,fragments=plan?.fragments||0;
  const protectedForms=plan?.credits?.length||0;
  const available=enabled?Math.min(cost,copies+fragments+protectedForms):0;
  return {rank,max,cost,copies,fragments,protectedForms,available,missing:Math.max(0,cost-available),
   enabled,canRank:enabled&&cost>0&&available>=cost};
 }
 function safeSelect(id){
  return !!box()?.selectInstance?.(id);
 }
 return {TEAM_MAX,valid,item,active,activeForDex,team,legacyTeam,arenaReady,isMember,toggleFavorite,toggleTeam,
  reorderTeam,speciesBase,nature,ability,learned,useMint,useCapsule,
  rollAbilitySlot,abilityAlternatives,HIDDEN_RATE,canTeach,teach,installMons,rankOverview,safeSelect};
});
