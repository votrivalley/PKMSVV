'use strict';
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const site=await startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,executablePath:process.env.PKMSVV_BROWSER||'/usr/bin/google-chrome'});
 try{
  const p=await browser.newPage({viewport:{width:1280,height:800}});await p.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
  await p.goto('http://127.0.0.1:'+site.port+'/game/',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>!!G.DB?.save&&!!G.PKMSVVEggs?.extraCast,null,{timeout:40000});
  const inventory=await p.evaluate(()=>G.PKMSVVEggs.ADDED.map(dex=>({dex,ready:G.PKMSVVEggs.supportReady(dex),name:G.DEX_BY?.[dex]?.name})));
  assert.equal(inventory.length,7);assert.ok(inventory.every(x=>x.ready),JSON.stringify(inventory));
  await p.evaluate(()=>{
   const s=G.DB.save;Object.assign(s,{partner:25,pkmsvvStorySeen:true,pkmsvvNameChosen:true,pkmsvvChapter7Seen:true});s.owned={...s.owned,25:{at:1}};
   G.MenuUI.open();if(!G.PKMSVVQuickRegion.choose(0))throw Error('cannot enter Explore');
   window.__keep=setInterval(()=>{[...document.querySelectorAll('.pkmsvv-berry-overlay button')].find(x=>/Không dùng Berry|No Berry/.test(x.textContent))?.click();if(G.Game?.player)G.Game.player.invuln=2000;if(G.UI?.isOpen?.('scr-levelup'))G.RunUI.pick(0);},100);
  });
  await p.waitForFunction(()=>G.Game.state==='playing',null,{timeout:25000});
  const result=await p.evaluate(()=>{
   const pl=G.Game.player,a=G.PKMSVVEggs,pet={dex:385,statScale:1,shiny:false};
   const speed=pl.spd,def=pl.reduction,atk=pl.atkFor({cat:'physical',type:'normal'}),now=G.Game.st.time;
   a.extraCast(pet,pl,undefined,now,()=>.51);const faster=pl.spd;
   a.extraCast(pet,pl,undefined,now,()=>.76);const guarded=pl.reduction;
   a.extraCast(pet,pl,undefined,now,()=>0);const stronger=pl.atkFor({cat:'physical',type:'normal'});
   return {speed,faster,def,guarded,atk,stronger,noSpeedStack:pl.spd===speed,oneWish:pl.pkmsvvWish.channel};
  });
  assert.ok(result.faster>result.speed);assert.ok(result.guarded>result.def);assert.ok(result.stronger>result.atk);assert.equal(result.noSpeedStack,true);assert.equal(result.oneWish,'physical');
  await p.evaluate(()=>{clearInterval(window.__keep);G.Game.quit();});
  const out=path.resolve('dist/big-update-progression-qa');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'support-expansion.json'),JSON.stringify({inventory,result},null,2));
  console.log('NATIVE_SUPPORT_EXPANSION_PASS='+JSON.stringify({inventory,result}));
 }finally{await browser.close();await site.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
