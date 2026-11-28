'use strict';
// Real compiled offline profile, real Shop UI and storage failure injection.
// Never run on an existing player profile: new Chromium context + test server.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs');
const OUT=path.resolve('dist/big-update-progression-qa');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const server=await startServer({root:path.resolve(__dirname,'../dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,executablePath:process.env.PKMSVV_BROWSER||'/usr/bin/google-chrome'});
 const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
  const url='http://127.0.0.1:'+server.port+'/game/';
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>!!G.DB?.save&&!!G.Shop?.transaction&&!!G.PKMSVVMegaGacha,null,{timeout:40000});
  await page.evaluate(()=>{
   const s=G.DB.save;Object.assign(s,{partner:25,pkmsvvStorySeen:true,pkmsvvNameChosen:true,pkmsvvChapter7Seen:true,pkmsvvChapter9MegaDone:true,coins:12000,bag:{mint:1,cap:2},arenaGacha:{points:500,pity:0,pulls:0,championPaid:{},trophyPaid:{}},megaStones:{}});
   s.owned={...s.owned,25:{at:1}};
   if(G.DB.commit(true)!==true)throw Error('Fixture commit failed');
   G.MenuUI.open();G.KecleonUI.open('shop');
  });
  const buy=page.locator('[data-pkmk-buy="mint"]');
  // Menu opening can legitimately credit old story rewards, and native
  // balance patches may change the price. Read the live pre-click balance
  // and actual registry instead of assuming the fixture's initial amount.
  const baseline=await page.evaluate(()=>({coins:G.DB.save.coins,mint:G.Shop.count('mint'),price:G.Shop.ITEMS.mint.price}));
  await buy.click();
  const first=await page.evaluate(()=>({coins:G.DB.save.coins,mint:G.Shop.count('mint')}));
  assert.deepEqual(first,{coins:baseline.coins-baseline.price,mint:baseline.mint+1});
  const failed=await page.evaluate(()=>{
   const key='ps.save.'+JSON.parse(localStorage.getItem('ps.session'));
   const before=JSON.stringify(G.DB.save),disk=localStorage.getItem(key),proto=Storage.prototype,original=proto.setItem;
   proto.setItem=function(k,v){if(k===key)throw new DOMException('Injected write failure','QuotaExceededError');return original.call(this,k,v);};
   try{
    const buy=G.Shop.buy('mint'),mega=G.PKMSVVMegaGacha.pull(G.DB.save,()=>.5);
    const legacy=G.Shop.transaction('bag-nature',s=>{if(!G.Shop.take('mint'))return false;s.pnat={25:['bold',2]};return true;});
    return {buy:buy.ok,mega,legacy,same:JSON.stringify(G.DB.save)===before,disk:localStorage.getItem(key)===disk};
   }finally{proto.setItem=original;}
  });
  assert.deepEqual(failed,{buy:false,mega:null,legacy:null,same:true,disk:true});
  await buy.click();
  const saved=await page.evaluate(()=>{
   const s=G.DB.save,r=G.PKMSVVMegaGacha.pull(s,()=>.5);if(!r)throw Error('Expected committed Mega award');
   const key='ps.save.'+JSON.parse(localStorage.getItem('ps.session')),disk=localStorage.getItem(key),before=JSON.stringify(s);
   // Simulate a different window completing a write before this tab buys.
   const newer=JSON.parse(disk);newer.coins+=17;localStorage.setItem(key,JSON.stringify(newer));
   let rejected;
   try{rejected=G.Shop.buy('mint').ok===false&&G.PKMSVVMegaGacha.pull(s,()=>.5)===null&&JSON.stringify(s)===before&&JSON.parse(localStorage.getItem(key)).coins===newer.coins;}
   finally{localStorage.setItem(key,disk);}
   return {coins:s.coins,mint:G.Shop.count('mint'),points:s.arenaGacha.points,pulls:s.arenaGacha.pulls,stone:r.stoneKey,staleRejected:rejected};
  });
  assert.equal(saved.coins,baseline.coins-2*baseline.price);assert.equal(saved.mint,baseline.mint+2);assert.equal(saved.points,400);assert.equal(saved.pulls,1);assert.equal(saved.staleRejected,true);
  await page.screenshot({path:path.join(OUT,'p0-shop-native.png')});
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!G.DB?.save&&!!G.Shop?.transaction,null,{timeout:40000});
  const reloaded=await page.evaluate(stone=>({coins:G.DB.save.coins,mint:G.Shop.count('mint'),points:G.DB.save.arenaGacha.points,pulls:G.DB.save.arenaGacha.pulls,stone:G.DB.save.megaStones[stone]}),saved.stone);
  assert.deepEqual(reloaded,{coins:saved.coins,mint:saved.mint,points:saved.points,pulls:saved.pulls,stone:1});
  assert.deepEqual(errors,[]);
  const result={baseline,first,failed,saved,reloaded};fs.writeFileSync(path.join(OUT,'p0-transactions.json'),JSON.stringify(result,null,2));console.log('P0_TRANSACTION_NATIVE_PASS='+JSON.stringify(result));
 }finally{await browser.close();await server.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
