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

test('Specialized proposal: exact price, 1-coin-short denial, no Copper sale, and full collection at zero',()=>{
 const {prices,total,pricedSpecializedFixture}=require('./fixtures/research-royal-pricing.cjs');
 assert.equal(total,2160);
 const registry=pricedSpecializedFixture(lab.config.stationSkins);
 const E=lab.createStationSkinEconomy(registry);
 const s=save(total);
 assert.equal(lab.config.stationSkins.purchaseEnabled,false);
 for(const [id,price] of Object.entries(prices)){
  const station=id.replace(/_advanced$/,'');
  const poor=save(price-1),before=snapshot(poor);
  assert.equal(E.buySkin(poor,id,ok).reason,'coins');assert.equal(snapshot(poor),before);
  const exact=save(price);
  assert.equal(E.buySkin(exact,id,ok).remaining,0);
  assert.equal(E.equipSkin(exact,station,id,ok).ok,true);
  assert.equal(E.equipSkin(exact,station,'default',ok).ok,true);
  assert.equal(E.status(exact,station).variants.find(x=>x.id===id).owned,true);
  assert.equal(E.buySkin(exact,id,ok).reason,'owned');
  assert.equal(E.buySkin(s,station+'_copper',ok).reason,'unavailable');
  assert.equal(E.buySkin(s,id,ok).ok,true);
  assert.equal(E.equipSkin(s,station,id,ok).ok,true);
 }
 assert.equal(s.pkmsvvCoopLab.coopCoins,0);
 assert.equal(Object.keys(s.pkmsvvCoopLab.stationSkins.owned).length,5);
 assert.equal(s.pkmsvvCoopLab.equippedDecorBySlot.trophy,'gold_pippi_statue');
 assert.equal(s.coins,555);
 const restored=JSON.parse(snapshot(s));
 for(const id of Object.keys(prices)){
  const station=id.replace(/_advanced$/,'');
  assert.equal(E.status(restored,station).equipped,id);
  assert.equal(E.equipSkin(restored,station,'default',ok).ok,true);
  assert.equal(E.equipSkin(restored,station,id,ok).ok,true);
 }
 assert.equal(restored.pkmsvvCoopLab.coopCoins,0);
});
test('Specialized proposal farming estimate uses configured fossil rewards, not an invented live payout',()=>{
 const {total}=require('./fixtures/research-royal-pricing.cjs');
 const cfg=lab.config.rewards;
 assert.equal(cfg.firstClear,200);assert.equal(cfg.replay,120);
 assert.equal(cfg.optionalObjectiveReward,20);assert.equal(cfg.maxOptionalObjectives,2);
 const clears=(bonus)=>1+Math.ceil(Math.max(0,total-(cfg.firstClear+bonus))/(cfg.replay+bonus));
 assert.equal(clears(0),18);assert.equal(clears(40),13);
 assert.equal(cfg.expectedDurationMinutes[0],8);
});

test('Basic default is free and no previous QA ownership is granted',()=>{
 const registry=lab.config.stationSkins;assert.equal(registry.defaults.length,5);assert.equal(registry.variants.length,5);
 const s=save(0),before=snapshot(s);
 for(const station of registry.stations){const v=lab.stationSkinEconomy.status(s,station);assert.equal(v.equipped,'default');assert.deepEqual(v.variants.map(x=>[x.id,x.owned,x.price]),[['default',true,0],[station+'_advanced',false,null]]);}
 assert.equal(snapshot(s),before);
});

test('research machine ranks spend only Co-op Coins and use the actual GlobalPower formulas',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ctx={G:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/pkmsvv-global-power.js'),'utf8'),ctx);
 const P=ctx.G.GlobalPower,M=lab.createMachineUpgradeEconomy(P);
 const all=Object.values(lab.config.stationUpgrades.stations).flat();
 assert.equal(all.length,12);assert.equal(new Set(all).size,12);
 assert.deepEqual([...all].sort(),Array.from(P.LIST.filter(x=>!x.retired),x=>x.id).sort());
 const s=save(1000);s.globalUpgrades={power:2};s.globalSpent={power:690};
 const before=snapshot(s);
 assert.equal(M.status(s,'mega').upgraded,false);
 assert.equal(M.status(s,'mega').stats.find(x=>x.id==='power').level,2);
 assert.equal(M.upgrade(s,'berry','power',ok).reason,'stat');
 assert.equal(M.upgrade(s,'mega','power',()=>false).reason,'save');assert.equal(snapshot(s),before);
 const locked=save(1000,false);assert.equal(M.upgrade(locked,'mega','power',ok).reason,'locked');
 const poor=save(79);assert.equal(M.upgrade(poor,'mega','power',ok).reason,'coins');
 const result=M.upgrade(s,'mega','power',ok);
 assert.equal(result.ok,true);assert.equal(result.price,160);assert.equal(s.pkmsvvCoopLab.coopCoins,840);
 assert.equal(s.coins,555);assert.equal(s.globalSpent.power,690);assert.equal(s.globalUpgrades.power,2);
 assert.equal(s.pkmsvvResearchRanks.power,3);assert.equal(M.status(s,'mega').upgraded,true);assert.equal(M.status(s,'berry').upgraded,false);
 assert.ok(Math.abs(P.combine({},P.effectiveLevels(s)).atkMul-1.36)<1e-9);
 const reload=JSON.parse(snapshot(s));assert.equal(M.status(reload,'mega').upgraded,true);
 assert.equal(M.upgrade(reload,'companion','opening',ok).ok,true);
 assert.equal(P.combine({},P.effectiveLevels(reload)).startMoves,2);
 assert.equal(M.upgrade(reload,'companion','opening',ok).reason,'max');
 assert.equal(M.upgrade(reload,'companion','revive',ok).reason,'stat');
 assert.equal(P.refundable(reload),690);
});
