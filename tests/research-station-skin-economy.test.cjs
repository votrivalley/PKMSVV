'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const lab=require('../src/pkmsvv-coop-lab-core.cjs');
const fixture={purchaseEnabled:true,variants:['support','mega','berry','companion','fossil'].map(station=>({id:station+'_test',station,price:100,artApproved:true,spritePath:'fixture/'+station+'.png'}))};
const E=lab.createStationSkinEconomy(fixture);
const save=(coins=400,unlocked=true)=>({coins:555,owned:{25:{at:1}},pkmsvvFossils:{inventory:{dome_fossil:2}},pkmsvvCoopLab:{machineUnlocked:unlocked,coopCoins:coins,ownedDecor:{machine_old:true,gold_pippi_statue:true},equippedDecorBySlot:{center:'machine_old',trophy:'gold_pippi_statue'},supplies:{fossil_scanner:3},cosmetics:{pippi_crown:true}}});
const ok=()=>true, snapshot=s=>JSON.stringify(s);
test('live catalog remains locked; no approved prices or hidden purchases',()=>{
 const s=save(),before=snapshot(s);
 for(const x of lab.config.stationSkins.variants){
  assert.equal(x.price,null);assert.equal(x.artApproved,false);
  assert.equal(lab.stationSkinEconomy.buySkin(s,x.id,ok).reason,'unavailable');
  assert.equal(lab.stationSkinEconomy.equipSkin(s,x.station,x.id,ok).reason,'unavailable');
 }
 assert.equal(lab.stationSkinEconomy.status(s,'mega').equipped,'default');
 assert.equal(snapshot(s),before);
});
test('opening status does not migrate a legacy profile or charge coins',()=>{
 const s=save(),before=snapshot(s);
 for(const station of fixture.variants.map(x=>x.station))assert.equal(E.status(s,station).equipped,'default');
 assert.equal(E.status(s,'wrong'),null);assert.equal(snapshot(s),before);
 assert.equal(Object.hasOwn(lab.normal(s),'stationSkins'),false);
});
test('buy once; own independently; equip only own correct station; reset free',()=>{
 const s=save();let commits=0;const commit=()=>{commits++;return true};
 assert.equal(E.equipSkin(s,'mega','mega_test',commit).reason,'not-owned');
 assert.equal(E.buySkin(s,'mega_test',commit).ok,true);
 assert.equal(s.pkmsvvCoopLab.coopCoins,300);
 assert.equal(E.buySkin(s,'mega_test',commit).reason,'owned');
 assert.equal(E.status(s,'mega').equipped,'default');
 assert.equal(E.equipSkin(s,'berry','mega_test',commit).reason,'unavailable');
 assert.equal(E.equipSkin(s,'mega','mega_test',commit).ok,true);
 assert.equal(E.equipSkin(s,'mega','mega_test',commit).reason,'equipped');
 assert.equal(E.status(s,'mega').equipped,'mega_test');
 assert.equal(E.status(s,'berry').equipped,'default');
 assert.equal(E.buySkin(s,'berry_test',commit).ok,true);
 assert.equal(E.equipSkin(s,'berry','berry_test',commit).ok,true);
 assert.equal(E.equipSkin(s,'mega','default',commit).ok,true);
 assert.equal(E.status(s,'mega').equipped,'default');
 assert.equal(E.status(s,'berry').equipped,'berry_test');
 assert.equal(E.equipSkin(s,'mega','mega_test',commit).ok,true);
 assert.equal(s.pkmsvvCoopLab.coopCoins,200);assert.equal(commits,6);
 assert.equal(s.coins,555);assert.equal(s.pkmsvvCoopLab.equippedDecorBySlot.trophy,'gold_pippi_statue');
 assert.deepEqual(s.owned,{25:{at:1}});assert.equal(s.pkmsvvFossils.inventory.dome_fossil,2);
});
test('locked, insufficient funds, unknown item, or failed commit cannot change save',()=>{
 for(const [s,id,reason] of [[save(400,false),'mega_test','locked'],[save(99),'mega_test','coins'],[save(),'missing','unavailable']]){
  const before=snapshot(s);assert.equal(E.buySkin(s,id,ok).reason,reason);assert.equal(snapshot(s),before);
 }
 const s=save(),before=snapshot(s);assert.equal(E.buySkin(s,'mega_test',()=>false).reason,'save');assert.equal(snapshot(s),before);
 E.buySkin(s,'mega_test',ok);const bought=snapshot(s);
 assert.equal(E.equipSkin(s,'mega','mega_test',()=>{throw Error('disk')}).reason,'save');assert.equal(snapshot(s),bought);
});
test('reload, existing coin exchange and legacy equip retain independent skins',()=>{
 const s=save();E.buySkin(s,'support_test',ok);E.equipSkin(s,'support','support_test',ok);
 const reloaded=JSON.parse(snapshot(s));assert.equal(E.status(reloaded,'support').equipped,'support_test');
 assert.equal(lab.exchange(reloaded,ok,'2026-11-25T03:00:00Z').ok,true);
 assert.equal(lab.equip(reloaded,'trophy','gold_pippi_statue',ok).ok,true);
 assert.equal(E.status(reloaded,'support').equipped,'support_test');
 assert.equal(reloaded.pkmsvvCoopLab.coopCoins,200);
 assert.equal(reloaded.pkmsvvCoopLab.supplies.fossil_scanner,3);
 assert.equal(reloaded.pkmsvvCoopLab.cosmetics.pippi_crown,true);
});
test('an equipped unknown or retired skin falls back without erasing ownership',()=>{
 const s=save();s.pkmsvvCoopLab.stationSkins={owned:{mega_test:true},equipped:{mega:'mega_test',berry:'mega_test'}};
 assert.equal(E.status(s,'berry').equipped,'default');
 const retired=lab.createStationSkinEconomy({...fixture,variants:fixture.variants.map(x=>({...x,artApproved:false}))});
 assert.equal(retired.status(s,'mega').equipped,'default');
 assert.equal(s.pkmsvvCoopLab.stationSkins.owned.mega_test,true);
});
