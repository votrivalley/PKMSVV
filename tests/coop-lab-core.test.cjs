'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const lab=require('../src/pkmsvv-coop-lab-core.cjs');
const item=Object.fromEntries(lab.config.items.map(v=>[v.id,v]));
const receipt=(seq,optionalObjectives=2,other={})=>({mission:'fossil_lab',verified:true,cleared:true,seq,partySize:2,durationSeconds:480,optionalObjectives,...other});
test('fixed 8-slot lab catalog, detached art and 9999-coin golden Pippi trophy',()=>{
 assert.equal(lab.config.slots.length,8);
 assert.deepEqual(lab.config.rewards.partySize,{min:2,max:4});
 assert.equal(lab.config.rewards.playerCount.soloHumanWithBotsAllowed,true);
 assert.equal(new Set(lab.config.slots.map(x=>x.id)).size,8);
 assert.equal(lab.config.items.length,11);
 assert.equal(lab.config.items.filter(x=>x.price>0).length,10);
 assert.equal(item.gold_pippi_statue.price,9999);
 assert.equal(item.gold_pippi_statue.dropChance,0);
 assert.equal(item.gold_pippi_statue.artReady,true);
 assert.equal(item.machine_old.visualLayer,'separate-svg');
 assert.equal(lab.config.roomArt.background,'images/coop-lab/room_art_qa_v2.webp');
 assert.equal(lab.config.roomArt.modularDraftBackground,'images/coop-lab/room_empty_modular.svg');
 assert.equal(Object.keys(lab.config.roomArt.slots).length,8);
 assert.equal(lab.config.currency.exchangeToPokeCoins,true);
 assert.equal(lab.config.currency.scope,'all-coop-modes-shared-wallet');
 assert.equal(lab.config.shop.sections.length,3);
 for(const x of lab.config.items)
  assert.ok(x.slots.length&&x.slots.every(id=>lab.config.slots.some(s=>s.id===id)));
});
test('unclaimed Kabuto fossil never unlocks restoration machine or store',()=>{
 const save={pkmsvvFossils:{guaranteedKabuto:true,inventory:{dome_fossil:1}}};
 assert.equal(lab.isMachineUnlocked(save),false);
 assert.equal(lab.buy(save,'gold_pippi_statue',()=>true).reason,'locked');
 assert.equal(lab.equip(save,'trophy','gold_pippi_statue',()=>true).reason,'locked');
 assert.equal(save.pkmsvvCoopLab,undefined);
});
test('first validated Co-op clear unlocks machine and gives equal solo-AI rewards',()=>{
 const save={};
 assert.equal(lab.settle(save,receipt(1,1),()=>true,()=>0).firstClear,true);
 assert.equal(save.pkmsvvCoopLab.machineUnlocked,true);
 assert.equal(save.pkmsvvCoopLab.coopCoins,220);
 assert.equal(save.owned[140].from,'coop-first-clear');
 assert.equal(save.pkmsvvFossils.restored[140],true);
 assert.equal(save.pkmsvvFossils.discovered.dome_fossil,true);
 assert.equal(save.pkmsvvDefeatedDex[140],true);
 assert.equal(save.pkmsvvCoopLab.ownedDecor.gold_pippi_statue,undefined,'never on first clear');
 assert.equal(lab.settle(save,receipt(1),()=>true).reason,'duplicate');
 assert.equal(lab.settle(save,receipt(4),()=>true).reason,'sequence');
 assert.equal(save.pkmsvvCoopLab.coopCoins,220);
});
test('all furnishing pieces baked into the original painting remain non-purchasable',()=>{
 const save={};lab.settle(save,receipt(1,2),()=>true);
 lab.settle(save,receipt(2,2),()=>true);
 assert.equal(save.pkmsvvCoopLab.coopCoins,400);
 assert.equal(lab.buy(save,'kabuto_skeleton',()=>true).reason,'unavailable');
 assert.equal(lab.buy(save,'research_terminal',()=>true).reason,'unavailable');
 assert.equal(lab.equip(save,'shelf_left','kabuto_skeleton',()=>true).reason,'slot');
 assert.equal(lab.equip(save,'desk','research_terminal',()=>true).reason,'slot');
 assert.equal(save.pkmsvvCoopLab.coopCoins,400,'original-scene furniture must never charge coins');
 assert.equal(lab.equip(save,'center',null,()=>true).reason,'machine-required');
 assert.equal(lab.equip(save,'shelf_left',null,()=>true).ok,true);
});
test('golden Pippi trophy costs exactly 9999 shared coins and is a real separate layer',()=>{
 const save={};lab.settle(save,receipt(1),()=>true);
 assert.equal(lab.equip(save,'trophy','gold_pippi_statue',()=>true).reason,'not-owned');
 assert.equal(lab.settle(save,receipt(2,2),()=>true,()=>0).rare,false);
 assert.equal(save.pkmsvvCoopLab.ownedDecor.gold_pippi_statue,undefined,
  'no random trophy drop in Co-op mission');
 save.pkmsvvCoopLab.coopCoins=9998;
 assert.equal(lab.buy(save,'gold_pippi_statue',()=>true).reason,'coins');
 save.pkmsvvCoopLab.coopCoins=9999;
 assert.equal(lab.buy(save,'gold_pippi_statue',()=>false).reason,'save');
 assert.equal(save.pkmsvvCoopLab.coopCoins,9999,'failed commit preserves coins');
 assert.equal(lab.buy(save,'gold_pippi_statue',()=>true).ok,true);
 assert.equal(save.pkmsvvCoopLab.coopCoins,0);
 assert.equal(lab.equip(save,'trophy','gold_pippi_statue',()=>true).ok,true);
 assert.equal(lab.buy(save,'gold_pippi_statue',()=>true).reason,'owned');
});
test('unfinished art cannot be bought, preventing invisible decorations',()=>{
 const save={};lab.settle(save,receipt(1),()=>true);save.pkmsvvCoopLab.coopCoins=5000;
 assert.equal(lab.buy(save,'machine_future',()=>true).reason,'unavailable');
 assert.equal(save.pkmsvvCoopLab.coopCoins,5000);
});
test('failed save preserves currencies, trophy and unlock; receipts cannot be spoofed as finished',()=>{
 const save={pkmsvvFossils:{inventory:{dome_fossil:1}}};
 assert.equal(lab.settle(save,receipt(1),()=>false).reason,'save');
 assert.equal(save.pkmsvvCoopLab,undefined);
 assert.equal(lab.settle(save,receipt(1,2,{durationSeconds:30}),()=>true).reason,'receipt');
 assert.equal(lab.settle(save,receipt(1,2,{verified:false}),()=>true).reason,'receipt');
 assert.equal(lab.settle(save,receipt(1,2,{partySize:1}),()=>true).reason,'receipt');
 assert.equal(lab.settle(save,receipt(1,2,{partySize:5}),()=>true).reason,'receipt');
 assert.equal(lab.settle(save,receipt(1,2,{optionalObjectives:3}),()=>true).reason,'receipt');
 assert.equal(save.pkmsvvFossils.inventory.dome_fossil,1);
});

test('first clear free Kabuto is atomic even if save commit fails',()=>{
 const save={coins:500,pkmsvvFossils:{inventory:{dome_fossil:2},restored:{}}};
 const previous=JSON.stringify(save);
 assert.equal(lab.settle(save,receipt(1),()=>false).reason,'save');
 assert.equal(JSON.stringify(save),previous,'fossil, Pokédex and wallet must all roll back');
 assert.equal(lab.settle(save,receipt(1),()=>true).ok,true);
 assert.equal(save.pkmsvvFossils.inventory.dome_fossil,2,'free Kabuto must not consume fossil');
 assert.equal(save.owned[140].from,'coop-first-clear');
});
test('weekly PokéCoin exchange caps at 2000 and protects both wallets on failed save',()=>{
 const save={coins:1000};
 lab.settle(save,receipt(1,2),()=>true);
 // 240 first-clear + 7 x 160 = 1360 Co-op coins, enough for 8 exchanges.
 for(let i=2;i<=8;i++)lab.settle(save,receipt(i,2),()=>true);
 const before=JSON.stringify(save);
 const week='2026-11-17T04:00:00Z';
 assert.equal(lab.exchange(save,()=>false,week).reason,'save');
 assert.equal(JSON.stringify(save),before);
 for(let i=0;i<8;i++)assert.equal(lab.exchange(save,()=>true,week).awarded,250);
 assert.equal(save.coins,3000);
 assert.equal(lab.exchange(save,()=>true,week).reason,'weekly-limit');
 assert.equal(save.pkmsvvCoopLab.weeklyPokeCoins,2000);
 assert.equal(lab.exchange(save,()=>true,'2026-11-10T04:00:00Z').reason,'clock');
 assert.equal(lab.exchange(save,()=>true,'2026-11-24T04:00:00Z').ok,true);
 assert.equal(save.coins,3250);
});
test('items without playable missions cannot take paid coins in QA',()=>{
 const save={coins:3000};
 lab.settle(save,receipt(1,2),()=>true);
 assert.equal(lab.buySupply(save,'fossil_scanner',()=>true).reason,'not-live');
 assert.equal(lab.buySupply(save,'challenge_voucher',()=>true).reason,'not-live');
 assert.equal(save.pkmsvvCoopLab.coopCoins,240);
});
