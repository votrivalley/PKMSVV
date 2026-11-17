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
 assert.equal(lab.config.currency.exchangeToPokeCoins,false);
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
