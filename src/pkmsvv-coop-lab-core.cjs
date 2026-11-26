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
  ...(Object.hasOwn(source,'stationSkins')?{stationSkins:skinState(source.stationSkins)}:{}),
  supplies:{...(source.supplies||{})},
  cosmetics:{...(source.cosmetics||{})},
  lastExchangeWeek:typeof source.lastExchangeWeek==='string'?source.lastExchangeWeek:'',
  weeklyPokeCoins:Number.isSafeInteger(source.weeklyPokeCoins)&&source.weeklyPokeCoins>=0?source.weeklyPokeCoins:0
 };
}
/* One rollback boundary protects wallet AND all Pokémon/save side effects. */
function change(save,mutator,commit,sideEffect){
 if(!save||typeof save!=='object'||typeof commit!=='function')return {ok:false,reason:'save'};
 const keys=['pkmsvvCoopLab','coins','owned','pkmsvvFossils','pkmsvvDefeatedDex','pkmsvvResearchRanks'];
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
 if(!item||item.artReady!==true||item.sceneSwapReady!==true||item.price===null||item.starter||!Number.isSafeInteger(item.price)||item.price<0)
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
 if(!slot||(itemId!==null&&(!item||item.artReady!==true||item.sceneSwapReady!==true||!item.slots.includes(slotId))))
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
  // Gold Pippi is now a 9,999 Coin prestige purchase in a separate trophy
  // slot, never an undisclosed RNG drop from mission results.
  return {ok:true,firstClear:first,reward,rare:false,totalCoins:s.coopCoins,machineUnlocked:true};
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

/* Station skins are separate from legacy furniture. Old profiles retain their
 * shape until the first successful skin transaction. No silent migration.
 * The production catalog is closed; the injectable registry is for tests. */
function skinMap(value){
 return value&&typeof value==='object'&&!Array.isArray(value)?{...value}:{};
}
function skinState(value){
 return {owned:skinMap(value?.owned),equipped:skinMap(value?.equipped)};
}
function createStationSkinEconomy(registry){
 const stations=new Set(['support','mega','berry','companion','fossil']);
 const entries=new Map((registry?.variants||[]).map(x=>[x.id,x]));
 const ready=item=>!!item&&registry?.purchaseEnabled===true&&item.artApproved===true&&
  stations.has(item.station)&&typeof item.spritePath==='string'&&item.spritePath.length>0&&
  Number.isSafeInteger(item.price)&&item.price>0;
 function status(save,station){
  if(!stations.has(station))return null;
  const s=normal(save),state=skinState(s.stationSkins);
  const item=entries.get(state.equipped[station]);
  const equipped=ready(item)&&item.station===station&&state.owned[item.id]===true?item.id:'default';
  return {station,equipped,unlocked:s.machineUnlocked,coins:s.coopCoins,
   variants:[{id:'default',owned:true,available:true,price:0},...[...entries.values()].filter(x=>x.station===station)
    .map(x=>({id:x.id,owned:state.owned[x.id]===true,available:ready(x),price:x.price}))]};
 }
 function buySkin(save,id,commit){
  const item=entries.get(id);
  if(!ready(item))return {ok:false,reason:'unavailable'};
  return change(save,s=>{
   if(!s.machineUnlocked)return {ok:false,reason:'locked'};
   const next=skinState(s.stationSkins);
   if(next.owned[id]===true)return {ok:false,reason:'owned'};
   if(s.coopCoins<item.price)return {ok:false,reason:'coins'};
   s.coopCoins-=item.price;next.owned[id]=true;s.stationSkins=next;
   return {ok:true,itemId:id,remaining:s.coopCoins};
  },commit);
 }
 function equipSkin(save,station,id,commit){
  if(!stations.has(station))return {ok:false,reason:'station'};
  const item=entries.get(id);
  if(id!=='default'&&(!ready(item)||item.station!==station))return {ok:false,reason:'unavailable'};
  if(registry?.purchaseEnabled!==true)return {ok:false,reason:'unavailable'};
  return change(save,s=>{
   if(!s.machineUnlocked)return {ok:false,reason:'locked'};
   const next=skinState(s.stationSkins);
   if(id!=='default'&&next.owned[id]!==true)return {ok:false,reason:'not-owned'};
   if(id==='default'){
    if(!Object.hasOwn(next.equipped,station))return {ok:false,reason:'equipped'};
    delete next.equipped[station];
   }else{
    if(next.equipped[station]===id)return {ok:false,reason:'equipped'};
    next.equipped[station]=id;
   }
   s.stationSkins=next;
   return {ok:true,station,itemId:id};
  },commit);
 }
 return {status,buySkin,equipSkin};
}

/* Actual permanent stats use the same GlobalPower definitions as existing gameplay.
 * Separate absolute target ranks preserve legacy PokéCoin levels without stacking
 * or allowing the old refund ledger to refund Co-op coins as PokéCoins. */
function createMachineUpgradeEconomy(power,registry=config.stationUpgrades){
 const groups=registry?.stations||{},prices=registry?.priceModel||{};
 const active=(id)=>power?.BY?.[id]&&!power.BY[id].retired;
 const purchased=save=>power?.cleanResearch?.(save?.pkmsvvResearchRanks)||{};
 const effective=save=>power?.effectiveLevels?.(save)||{};
 const price=(id,level)=>id==='opening'?prices.opening:id==='reroll'?prices.rerollBase+level*prices.rerollStep:prices.base+level*prices.step;
 function status(save,station){
  if(!Object.hasOwn(groups,station)||!power?.effectiveLevels)return null;
  const s=normal(save),ranks=purchased(save),levels=effective(save);
  return {station,coins:s.coopCoins,unlocked:s.machineUnlocked,upgraded:groups[station].some(id=>(ranks[id]||0)>0),
   stats:groups[station].filter(active).map(id=>{const u=power.BY[id],level=power.rank(levels,id);return {id,level,max:u.max,price:level<u.max?price(id,level):0,vi:u.vi,en:u.en,viUnit:u.viUnit,enUnit:u.enUnit};})};
 }
 function upgrade(save,station,id,commit){
  const view=status(save,station),row=view?.stats.find(x=>x.id===id);
  if(!row)return {ok:false,reason:'stat'};
  if(!view.unlocked)return {ok:false,reason:'locked'};
  if(row.level>=row.max)return {ok:false,reason:'max'};
  if(!Number.isSafeInteger(row.price)||row.price<=0)return {ok:false,reason:'price'};
  return change(save,s=>{
   if(!s.machineUnlocked)return {ok:false,reason:'locked'};
   if(s.coopCoins<row.price)return {ok:false,reason:'coins'};
   s.coopCoins-=row.price;
   return {ok:true,id,station,rank:row.level+1,price:row.price,remaining:s.coopCoins};
  },commit,(player,_,result)=>{player.pkmsvvResearchRanks={...purchased(player),[id]:result.rank};});
 }
 return {status,upgrade};
}

const stationSkinEconomy=createStationSkinEconomy(config.stationSkins);

module.exports={config,normal,isMachineUnlocked,buy,equip,settle,exchange,weekKey,buySupply,stationSkinEconomy,createStationSkinEconomy,createMachineUpgradeEconomy};
