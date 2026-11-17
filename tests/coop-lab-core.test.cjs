'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const lab=require('../src/pkmsvv-coop-lab-core.cjs');
const item=Object.fromEntries(lab.config.items.map(v=>[v.id,v]));
const receipt=(seq,optionalObjectives=2,other={})=>({mission:'fossil_lab',verified:true,cleared:true,seq,partySize:1,durationSeconds:480,optionalObjectives,...other});
test('fixed 8-slot lab catalog, ten purchasable pieces, one mythical trophy',()=>{
 assert.equal(lab.config.slots.length,8);
 assert.equal(new Set(lab.config.slots.map(x=>x.id)).size,8);
 assert.equal(lab.config.items.length,11);
 assert.equal(lab.config.items.filter(x=>x.price>0).length,9);
 assert.equal(item.gold_pippi_statue.price,null);
 assert.equal(item.gold_pippi_statue.dropChance,.001);
 assert.equal(lab.config.currency.exchangeToPokeCoins,true);
 assert.equal(lab.config.currency.scope,'all-coop-modes-shared-wallet');
 assert.equal(lab.config.shop.sections.length,3);
 for(const x of lab.config.items)
  assert.ok(x.slots.length&&x.slots.every(id=>lab.config.slots.some(s=>s.id===id)));
});
test('unclaimed Kabuto fossil never unlocks restoration machine or store',()=>{
 const save={pkmsvvFossils:{guaranteedKabuto:true,inventory:{dome_fossil:1}}};
 assert.equal(lab.isMachineUnlocked(save),false);
 assert.equal(lab.buy(save,'kabuto_skeleton',()=>true).reason,'locked');
 assert.equal(lab.equip(save,'shelf_left','kabuto_skeleton',()=>true).reason,'locked');
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
test('purchase and equip are atomic, compatible with same specimen in either shelf',()=>{
 const save={};lab.settle(save,receipt(1,2),()=>true);
 assert.equal(save.pkmsvvCoopLab.coopCoins,240);
 assert.equal(lab.buy(save,'kabuto_skeleton',()=>true).reason,'coins');
 lab.settle(save,receipt(2,2),()=>true);
 assert.equal(save.pkmsvvCoopLab.coopCoins,400);
 assert.equal(lab.buy(save,'kabuto_skeleton',()=>false).reason,'save');
 assert.equal(save.pkmsvvCoopLab.coopCoins,400);
 assert.equal(lab.buy(save,'kabuto_skeleton',()=>true).ok,true);
 assert.equal(save.pkmsvvCoopLab.coopCoins,80);
 assert.equal(lab.buy(save,'kabuto_skeleton',()=>true).reason,'owned');
 assert.equal(lab.equip(save,'wall_left','kabuto_skeleton',()=>true).reason,'slot');
 assert.equal(lab.equip(save,'shelf_left','kabuto_skeleton',()=>true).ok,true);
 assert.equal(lab.equip(save,'shelf_right','kabuto_skeleton',()=>true).ok,true);
 assert.equal(lab.equip(save,'center',null,()=>true).reason,'machine-required');
 assert.equal(lab.equip(save,'shelf_left',null,()=>true).ok,true);
});
test('gold Pippi statue cannot be purchased or equipped without drop',()=>{
 const save={};lab.settle(save,receipt(1),()=>true);
 assert.equal(lab.buy(save,'gold_pippi_statue',()=>true).reason,'unavailable');
 assert.equal(lab.equip(save,'trophy','gold_pippi_statue',()=>true).reason,'not-owned');
 assert.equal(lab.settle(save,receipt(2,1),()=>true,()=>0).rare,false);
 assert.equal(lab.settle(save,receipt(3,2),()=>true,()=>.001).rare,false,'boundary excluded');
 assert.equal(lab.settle(save,receipt(4,2),()=>true,()=>.00099).rare,true);
 assert.equal(save.pkmsvvCoopLab.ownedDecor.gold_pippi_statue,true);
 assert.equal(lab.equip(save,'trophy','gold_pippi_statue',()=>true).ok,true);
 assert.equal(lab.settle(save,receipt(5,2),()=>true,()=>0).rare,false,'only one trophy');
});
test('failed save preserves currencies, trophy and unlock; receipts cannot be spoofed as finished',()=>{
 const save={pkmsvvFossils:{inventory:{dome_fossil:1}}};
 assert.equal(lab.settle(save,receipt(1),()=>false).reason,'save');
 assert.equal(save.pkmsvvCoopLab,undefined);
 assert.equal(lab.settle(save,receipt(1,2,{durationSeconds:30}),()=>true).reason,'receipt');
 assert.equal(lab.settle(save,receipt(1,2,{verified:false}),()=>true).reason,'receipt');
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
