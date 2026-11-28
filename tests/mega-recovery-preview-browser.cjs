'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs');
(async()=>{const server=await startServer({root:path.resolve(__dirname,'../dist/lan'),host:'127.0.0.1',port:0});let browser,page;const errors=[];try{
 browser=await chromium.launch({headless:true,executablePath:process.env.PKMSVV_BROWSER||'/usr/bin/google-chrome'});page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(String(e)));
 const base='http://127.0.0.1:'+server.port;await page.goto(base+'/game/',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>!!window.G?.PKMSVVMegaEntry&&!!G.PKMSVVMegaPhase3&&!!G.PKMSVV_MEGA_RECOVERY_PREVIEW,null,{timeout:40000});
 const rows=await page.evaluate(()=>Object.values(G.PKMSVV_MEGA_RECOVERY_PREVIEW).map(x=>{const f=G.PKMSVV_MEGA_CATALOG.find(f=>f.key===x.key);return {key:x.key,id:x.spriteId,normal:G.PKMSVVMegaEntry.hasSprite(f,'normal'),shiny:G.PKMSVVMegaEntry.hasSprite(f,'shiny'),artReady:f.artReady,battle:G.PKMSVVMegaPhase3.isBattleReady(f),meta:!!G.SPRITE_META[x.spriteId]?.a?.Walk};}));
 assert.equal(rows.length,process.env.PKMSVV_MEGA_RELOADED_PRIVATE_QA==='1'?51:5);for(const f of rows){assert.ok(f.normal&&f.shiny&&f.meta);assert.equal(f.artReady,false);assert.equal(f.battle,false);for(const rel of ['Idle.png','Walk.png','Attack.png','s/Idle.png','s/Walk.png','s/Attack.png']){const res=await page.request.get(base+'/game/assets/pokemon/'+f.id+'/'+rel);assert.equal(res.status(),200,f.key+'/'+rel);assert.ok((await res.body()).subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')));}}
 assert.deepEqual(errors,[]);fs.mkdirSync('dist/mega-recovery-game-qa',{recursive:true});fs.writeFileSync('dist/mega-recovery-game-qa/report.json',JSON.stringify(rows,null,2));console.log('MEGA_RECOVERY_GAME_PASS='+JSON.stringify(rows));
 }finally{try{if(browser)await browser.close();}finally{await server.close();}}})().catch(e=>{console.error(e);process.exitCode=1;});
