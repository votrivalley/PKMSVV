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
   const fusion=G.PKMSVVFusionPilot;if(!fusion?.RECIPES||fusion.RECIPES.length!==5)throw Error('Fusion resonance module missing from compiled Beta');
   const resonanceCatalog=fusion.RECIPES.map(r=>{const a=all.filter(m=>r.a(m)&&fusion.damages(m)&&Number(m.dmg)>0),b=all.filter(m=>r.b(m)&&fusion.damages(m)&&Number(m.dmg)>0);return {id:r.id,a:a.map(x=>x.id),b:b.map(x=>x.id),nativeA:a.filter(x=>x.pkmsvv3dsNative).map(x=>x.id),nativeB:b.filter(x=>x.pkmsvv3dsNative).map(x=>x.id)};});
   const movement=all.filter(d=>G.PKMSVVDash.isActive(d)).map(d=>d.id).sort();
   const dex=Object.values(G.DEX_BY||{}).filter(d=>d&&Number.isInteger(Number(d.dex)));
   const byDex=new Map(dex.map(d=>[Number(d.dex),d]));
   const species=Array.from({length:1025},(_,i)=>i+1).filter(i=>byDex.has(i));
   const missing=Array.from({length:1025},(_,i)=>i+1).filter(i=>!byDex.has(i));
   const sprites=G.SPRITE_META||{};
   const art=species.filter(i=>!!sprites[i]?.a?.Idle&&!!sprites[i]?.a?.Walk);
   const shiny=species.filter(i=>G.Sprites?.hasShiny?.(i)===true);
   const mega=(G.PKMSVV_MEGA_CATALOG||[]).map(f=>({dex:f.dex,name:f.name,spriteId:f.spriteId,artReady:!!f.artReady,actualIdle:!!sprites[f.spriteId]?.a?.Idle}));
   const catalog={speciesCount:species.length,missingSpecies:missing,baseIdleWalk:art.length,shinyCount:shiny.length,mega,moveIds:all.map(d=>d.id).sort(),nativeMoveIds:native.map(d=>d.id).sort(),tmIds:Object.keys(G.TM_MOVES||{}).sort(),note:'Presence only; not proof of eight directions, animation completeness or permission.'};
   return {catalog,resonanceCatalog,movement,total:all.length,native:native.length,screen:results.filter(x=>x.kind==='screen'),kinds:[...new Set(native.map(x=>x.kind))],minimum:Math.min(...results.map(x=>x.cd))};
  });
  const fs=require('node:fs');fs.mkdirSync('dist/big-update-inventory',{recursive:true});
  fs.writeFileSync('dist/big-update-inventory/catalog.json',JSON.stringify(state.catalog,null,2));
  console.log('PKMSVV_BIG_UPDATE_INVENTORY='+JSON.stringify({species:state.catalog.speciesCount,missing:state.catalog.missingSpecies,baseIdleWalk:state.catalog.baseIdleWalk,shiny:state.catalog.shinyCount,mega:state.catalog.mega.length,actualMegaIdle:state.catalog.mega.filter(x=>x.actualIdle&&x.artReady).length,tm:state.catalog.tmIds.length}));
  for(const r of state.resonanceCatalog){assert.ok(r.a.some(a=>r.b.some(b=>a!==b)),'No distinct compatible moves for '+r.id);}
  console.log('BETA_RESONANCE_CATALOG='+JSON.stringify(state.resonanceCatalog));
  assert.equal(state.total,176,'Native Beta must preserve 103 moves + 73 added moves');
  assert.equal(state.native,73,'Do not overwrite existing 103 moves');
  const expected=['quick-attack','aerial-ace','flame-charge','u-turn','extreme-speed','megahorn','volt-tackle','dragon-ascent','meteor-assault','sunsteel-strike','acrobatics','shadow-force'];
  for(const id of expected)assert.ok(state.movement.includes(id),'Missing active movement '+id);
  assert.ok(!state.movement.includes('surf')&&!state.movement.includes('waterfall'));
  console.log('BETA_ACTIVE_MOVEMENT_CATALOG='+JSON.stringify(state.movement));
  assert.ok(state.screen.length>0,'Native Light Screen missing: this was the reported Explore crash');
  assert.deepEqual(errors,[],'No unhandled game boot JS errors');
  console.log('BETA_176_ALL_NATIVE_COOLDOWNS_PASS='+JSON.stringify(state));
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
