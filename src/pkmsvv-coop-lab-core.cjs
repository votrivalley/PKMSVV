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
  equippedDecorBySlot:{center:'machine_old',...(source.equippedDecorBySlot||{})}
 };
}
function change(save,mutator,commit){
 if(!save||typeof save!=='object'||typeof commit!=='function')return {ok:false,reason:'save'};
 const previous=save.pkmsvvCoopLab,had=Object.prototype.hasOwnProperty.call(save,'pkmsvvCoopLab');
 const before=normal(save),draft={...before,ownedDecor:{...before.ownedDecor},equippedDecorBySlot:{...before.equippedDecorBySlot}};
 const result=mutator(draft,before);
 if(!result?.ok)return result||{ok:false,reason:'invalid'};
 save.pkmsvvCoopLab=draft;
 try{if(commit()===false)throw Error('Save declined');}
 catch(_){if(had)save.pkmsvvCoopLab=previous;else delete save.pkmsvvCoopLab;return {ok:false,reason:'save'};}
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
     s.ownedDecor.gold_pippi_statue!==true&&
     Number(random())<config.trophy.chancePerEligibleReplay){
   rare=true;s.ownedDecor.gold_pippi_statue=true;
  }
  return {ok:true,firstClear:first,reward,rare,totalCoins:s.coopCoins,machineUnlocked:true};
 },commit);
}
module.exports={config,normal,isMachineUnlocked,buy,equip,settle};
