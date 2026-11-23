'use strict';
// Protects all 73 native move kinds; Mewtwo Light Screen ('screen') triggered
// G.PKMSVVBalance.effectiveCooldown -> profiles[screen].floor and Explore crash.
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
const {startServer}=require('../lan-server/server.cjs');
(async()=>{
 const server=await startServer({root:path.resolve(__dirname,'../dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto('http://127.0.0.1:'+server.port+'/game/',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>!!G.Moves?.ALL&&!!G.PKMSVVBalance?.effectiveCooldown&&!!G.PKMSVV3DSStage4Support,null,{timeout:35000});
  const state=await page.evaluate(()=>{
   const all=G.Moves.ALL;
   const native=all.filter(d=>d.pkmsvv3dsNative);
   const results=[];
   for(const def of all){
    const m=G.Moves.instance(def.id),p={cdMul:1};
    const t=G.PKMSVVBalance.effectiveCooldown(p,m);
    if(!Number.isFinite(t)||t<=0)throw Error('Non-finite cooldown '+def.id+': '+t);
    results.push({id:m.id,kind:m.kind,cd:t,native:!!m.pkmsvv3dsNative});
   }
   return {total:all.length,native:native.length,screen:results.filter(x=>x.kind==='screen'),kinds:[...new Set(native.map(x=>x.kind))],minimum:Math.min(...results.map(x=>x.cd))};
  });
  assert.equal(state.total,176,'Native Beta must preserve 103 moves + 73 added moves');
  assert.equal(state.native,73,'Do not overwrite existing 103 moves');
  assert.ok(state.screen.length>0,'Native Light Screen missing: this was the reported Explore crash');
  assert.deepEqual(errors,[],'No unhandled game boot JS errors');
  console.log('BETA_176_ALL_NATIVE_COOLDOWNS_PASS='+JSON.stringify(state));
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
