/* PKMSVV Co-op Fossil Lab — transaction core for future verified mission outcomes.
 * Deliberately NOT injected into the game: no playable mission exists yet.
 * The mission adapter must validate session results BEFORE calling settle().
 */
'use strict';
const config=require('../data/pkmsvv-coop-lab-catalog.json');
const byItem=new Map(config.items.map(x=>[x.id,x]));
const bySlot=new Map(config.slots.map(x=>[x.id,x]));
const schema=config.schemaVersion;
const max=Number.MAX_SAFE_INTEGER;
function normal(save){
 const state=save?.pkmsvvCoopLab||{};
 const source=state&&typeof state==='object'&&!Array.isArray(state)?state:{};
 const currency=Number(source.coopCoins);
 return {
  schemaVersion:schema,
  machineUnlocked:source.machineUnlocked===true,
  coopCoins:Number.isSafeInteger(currency)&&currency>=0?currency:0,
  totalCompletions:Number.isSafeInteger(source.totalCompletions)&&source.totalCompletions>=0?source.totalCompletions:0,
  lastSettledSeq:Number.isSafeInteger(source.lastSettledSeq)&&source.lastSettledSeq>=0?source.lastSettledSeq:0,
  ownedDecor:{machine_old:true,...(source.ownedDecor||{})},
  equippedDecorBySlot:{center:'machine_old',...(source.equippedDecorBySlot||{})},
  supplies:{...(source.supplies||{})},
  cosmetics:{...(source.cosmetics||{})},
  lastExchangeWeek:typeof source.lastExchangeWeek==='string'?source.lastExchangeWeek:'',
  weeklyPokeCoins:Number.isSafeInteger(source.weeklyPokeCoins)&&source.weeklyPokeCoins>=0?source.weeklyPokeCoins:0
 };
}
/* One rollback boundary protects wallet AND all Pokémon/save side effects. */
function change(save,mutator,commit,sideEffect){
 if(!save||typeof save!=='object'||typeof commit!=='function')return {ok:false,reason:'save'};
 const keys=['pkmsvvCoopLab','coins','owned','pkmsvvFossils','pkmsvvDefeatedDex'];
 const prior=keys.map(key=>({key,had:Object.prototype.hasOwnProperty.call(save,key),value:save[key]}));
 const rollback=()=>{for(const old of prior){if(old.had)save[old.key]=old.value;else delete save[old.key];}};
 const before=normal(save);
 const draft={...before,ownedDecor:{...before.ownedDecor},equippedDecorBySlot:{...before.equippedDecorBySlot},
  supplies:{...before.supplies},cosmetics:{...before.cosmetics}};
 const result=mutator(draft,before);
 if(!result?.ok)return result||{ok:false,reason:'invalid'};
 try{
  save.pkmsvvCoopLab=draft;
  if(typeof sideEffect==='function')sideEffect(save,draft,result);
  if(commit()===false)throw Error('Save declined');
 }catch(_){rollback();return {ok:false,reason:'save'};}
 return result;
}
function isMachineUnlocked(save){return normal(save).machineUnlocked;}
function buy(save,itemId,commit){
 const item=byItem.get(itemId);
 if(!item||item.price===null||item.starter||!Number.isSafeInteger(item.price)||item.price<0)
  return {ok:false,reason:'unavailable'};
 return change(save,(s)=>{
  if(!s.machineUnlocked)return {ok:false,reason:'locked'};
  if(s.ownedDecor[itemId]===true)return {ok:false,reason:'owned'};
  if(s.coopCoins<item.price)return {ok:false,reason:'coins'};
  s.coopCoins-=item.price;s.ownedDecor[itemId]=true;
  return {ok:true,remaining:s.coopCoins,itemId};
 },commit);
}
function equip(save,slotId,itemId,commit){
 const slot=bySlot.get(slotId),item=itemId===null?null:byItem.get(itemId);
 if(!slot||(itemId!==null&&(!item||!item.slots.includes(slotId))))
  return {ok:false,reason:'slot'};
 return change(save,(s)=>{
  if(!s.machineUnlocked)return {ok:false,reason:'locked'};
  if(item&&s.ownedDecor[itemId]!==true)return {ok:false,reason:'not-owned'};
  if(slotId==='center'&&itemId===null)return {ok:false,reason:'machine-required'};
  if(itemId===null)delete s.equippedDecorBySlot[slotId];
  else s.equippedDecorBySlot[slotId]=itemId;
  return {ok:true,slotId,itemId};
 },commit);
}
/* Only the future native Co-op mission resolver may call settle().
 * A boolean 'verified' on its own is NOT authentication; the caller must verify
 * session identities, objective events, elapsed time and all party members.
 */
function settle(save,receipt,commit,random=Math.random){
 const cfg=config.rewards;
 if(!receipt||receipt.mission!==cfg.mission||receipt.verified!==true||
    receipt.cleared!==true||!Number.isSafeInteger(receipt.seq)||receipt.seq<1||
    !Number.isFinite(receipt.durationSeconds)||receipt.durationSeconds<cfg.minDurationSeconds||
    !Number.isInteger(receipt.optionalObjectives)||receipt.optionalObjectives<0||
    receipt.optionalObjectives>cfg.maxOptionalObjectives||!Number.isInteger(receipt.partySize)||
    receipt.partySize<cfg.partySize.min||receipt.partySize>cfg.partySize.max)
  return {ok:false,reason:'receipt'};
 return change(save,(s)=>{
  if(receipt.seq<=s.lastSettledSeq)return {ok:false,reason:'duplicate'};
  if(receipt.seq!==s.lastSettledSeq+1)return {ok:false,reason:'sequence'};
  const first=!s.machineUnlocked,reward=(first?cfg.firstClear:cfg.replay)+
   cfg.optionalObjectiveReward*receipt.optionalObjectives;
  if(s.coopCoins>max-reward)return {ok:false,reason:'overflow'};
  s.coopCoins+=reward;s.machineUnlocked=true;s.totalCompletions++;
  s.lastSettledSeq=receipt.seq;
  let rare=false;
  if(!first&&receipt.optionalObjectives===cfg.maxOptionalObjectives&&
     s.ownedDecor.gold_pippi_statue!==true){
   const roll=Number(random());
   if(roll>=0&&roll<config.trophy.chancePerEligibleReplay){
    rare=true;s.ownedDecor.gold_pippi_statue=true;
   }
  }
  return {ok:true,firstClear:first,reward,rare,totalCoins:s.coopCoins,machineUnlocked:true};
 },commit,(s,_,result)=>{
  if(!result.firstClear)return;
  // First VALIDATED fossil-lab clear: permanent machine access AND free
  // Kabuto revival in the same save transaction. Never consume Dome Fossils.
  const previous=s.pkmsvvFossils&&typeof s.pkmsvvFossils==='object'?s.pkmsvvFossils:{};
  s.pkmsvvFossils={...previous,schemaVersion:1,
   inventory:{...(previous.inventory||{})},
   discovered:{...(previous.discovered||{}),dome_fossil:true},
   restored:{...(previous.restored||{}),140:true}};
  s.owned={...(s.owned||{}),140:s.owned?.[140]||{at:Date.now(),from:'coop-first-clear'}};
  s.pkmsvvDefeatedDex={...(s.pkmsvvDefeatedDex||{}),140:true};
 });
}
const SUPPLIES=new Map(config.shop.sections.flatMap(section=>section.items||[]).filter(x=>x.type==='consumable').map(x=>[x.id,x]));
/* Keep inventory transactions ready for native missions. A not-yet-playable
 * item is NOT sold by the QA UI, so no player pays for inert promises. */
function buySupply(save,itemId,commit){
 const item=SUPPLIES.get(itemId);
 if(!item||item.activeInGame!==true)return {ok:false,reason:'not-live'};
 return change(save,s=>{
  if(s.coopCoins<item.price)return {ok:false,reason:'coins'};
  const n=s.supplies[itemId]||0;
  if(!Number.isSafeInteger(n)||n<0||n>=999)return {ok:false,reason:'limit'};
  s.supplies[itemId]=n+1;s.coopCoins-=item.price;
  return {ok:true,itemId,remaining:s.coopCoins,count:n+1};
 },commit);
}
/* Weekly wallet exchange. This is offline; clock tampering cannot be made
 * cheat-proof without a trusted server, so reject backwards week rolls. */
function weekKey(now){
 const d=new Date(now);
 if(!Number.isFinite(d.getTime()))return null;
 const local=new Date(d.getTime()+7*60*60*1000);
 const weekday=(local.getUTCDay()+6)%7;
 local.setUTCDate(local.getUTCDate()-weekday);
 return local.toISOString().slice(0,10);
}
function exchange(save,commit,now=Date.now()){
 const cfg=config.currency.exchange,key=weekKey(now);
 if(!cfg||!key)return {ok:false,reason:'date'};
 if(!Number.isSafeInteger(save?.coins)||save.coins<0)return {ok:false,reason:'coins-save'};
 return change(save,(s)=>{
  if(s.lastExchangeWeek&&key<s.lastExchangeWeek)return {ok:false,reason:'clock'};
  if(s.lastExchangeWeek!==key){s.lastExchangeWeek=key;s.weeklyPokeCoins=0;}
  if(s.weeklyPokeCoins+cfg.earnPokeCoins>cfg.weeklyPokeCoinCap)
   return {ok:false,reason:'weekly-limit'};
  if(s.coopCoins<cfg.costCoopCoins)return {ok:false,reason:'coins'};
  if(save.coins>max-cfg.earnPokeCoins)return {ok:false,reason:'overflow'};
  s.coopCoins-=cfg.costCoopCoins;s.weeklyPokeCoins+=cfg.earnPokeCoins;
  return {ok:true,remaining:s.coopCoins,awarded:cfg.earnPokeCoins,
   weeklyUsed:s.weeklyPokeCoins,week:key};
 },commit,(player,_,result)=>{player.coins+=result.awarded;});
}
module.exports={config,normal,isMachineUnlocked,buy,equip,settle,exchange,weekKey,buySupply};
