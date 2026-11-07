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
 function useMint(id,natureId,s=save()){
  if(typeof G==='undefined'||!G.NATURE_BY?.[natureId])throw Error('Invalid Nature');
  return atomic(s,draft=>{
   const x=speciesBase(draft,item(draft,id));
   if(!x||x.natureId===natureId)throw Error('Select a different Nature');
   if(!(draft.bag?.mint>0))throw Error('No Nature Mint in Bag');
   draft.bag.mint--;if(!draft.bag.mint)delete draft.bag.mint;
   x.natureId=natureId;
   return {id,natureId,left:draft.bag.mint||0};
  });
 }
 function useCapsule(id,slot,hidden=false,s=save()){
  return atomic(s,draft=>{
   const x=item(draft,id);if(!x)throw Error('Pokémon not found');
   const arr=typeof G!=='undefined'?G.DEX_ABIL?.[x.dex]||[]:[];
   if(!Number.isInteger(slot)||slot<0||slot>2||!arr[slot]||slot===x.abilitySlot||
    (slot===1&&arr[1]===arr[0])||(slot===2&&!hidden))
    throw Error('Ability slot is unavailable');
   const key=hidden?'caph':'cap';
   if(!(draft.bag?.[key]>0))throw Error('No Ability Capsule in Bag');
   draft.bag[key]--;if(!draft.bag[key])delete draft.bag[key];
   x.abilitySlot=slot;
   return {id,slot,left:draft.bag[key]||0};
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
  // One same-species extra individual or shard per step, not 1+2+3+4+5.
  const cost=rank===max?0:1;
  const enabled=!!(x&&valid(s)&&api?.valid?.(s)&&
   typeof api.candidateList==='function'&&typeof api.shards==='function');
  let copies=0,fragments=0,protectedForms=0;
  if(enabled&&cost){
   // Rank is species-shared: prefer the Normal carrier for safely using a
   // duplicate Shiny's one-time credit even while its Shiny skin is focused.
   const carrier=x.shiny?(s.pkmsvvBox.find(v=>v.dex===x.dex&&!v.shiny)||x):x;
   copies=api.candidateList(s,carrier.id).length;
   fragments=api.shards(s,x.dex);
   protectedForms=api.shinyCreditList?.(s,carrier.id)?.length||0;
  }
  const available=enabled?Math.min(cost,copies+fragments+protectedForms):0;
  return {rank,max,cost,copies,fragments,protectedForms,available,missing:Math.max(0,cost-available),
   enabled,canRank:enabled&&cost>0&&available>=cost};
 }
 function safeSelect(id){
  return !!box()?.selectInstance?.(id);
 }
 return {TEAM_MAX,valid,item,active,activeForDex,team,legacyTeam,isMember,toggleFavorite,toggleTeam,
  reorderTeam,speciesBase,nature,ability,learned,useMint,useCapsule,canTeach,teach,installMons,rankOverview,safeSelect};
});
