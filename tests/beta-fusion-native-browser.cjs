'use strict';
// Compiled gameplay test: seed a QA loadout in a genuine Solo Explore run.
// Native autocast/fields/projectiles drive the hit hook; never invoke afterHit,
// Enemy.hurt, or simulated damage to manufacture a successful reaction.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs');
(async()=>{
 const server=await startServer({root:path.resolve(__dirname,'../dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
  await page.goto('http://127.0.0.1:'+server.port+'/game/',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>!!G.DB?.save&&!!G.PKMSVVQuickRegion?.choose&&!!G.PKMSVVFusionPilot?.afterHit,null,{timeout:40000});
  await page.evaluate(()=>{
   Object.assign(G.DB.save,{partner:150,partnerShiny:false,pkmsvvStorySeen:true,pkmsvvNameChosen:true});
   G.MenuUI.open();if(!G.PKMSVVQuickRegion.choose(0))throw Error('Cannot enter Solo Explore');
   window.__fusionKeep=setInterval(()=>{
    [...document.querySelectorAll('.pkmsvv-berry-overlay button')].find(x=>/Không dùng Berry|No Berry/.test(x.textContent))?.click();
    const p=G.Game?.player;if(p&&!p.dead){p.hp=p.maxHp;p.invuln=Math.max(p.invuln||0,2000);}
    if(G.Game?.state==='levelup'&&G.UI?.isOpen?.('scr-levelup'))G.RunUI.pick(0);
   },100);
  });
  await page.waitForFunction(()=>G.Game?.state==='playing',null,{timeout:23000});
  const seeded=await page.evaluate(()=>{
   const p=G.Game.player,api=G.PKMSVVFusionPilot;
   G.EnemyMgr.clear();G.Projectiles.clear();G.Combat.clearFields();G.Hazards.clear();api.reset(p);
   let spot;
   for(let y=-600;y<600&&!spot;y+=48)for(let x=-600;x<600;x+=48)
    if(G.World.isFree(x,y,120)&&G.World.isFree(x+65,y,24)&&G.World.isFree(x+85,y+60,24)){spot={x,y};break;}
   if(!spot)throw Error('No open Fusion QA arena');
   p.x=spot.x;p.y=spot.y;p.aim=0;p.moveAngle=0;
   const max=id=>{
    const m=G.Moves.instance(id),cap=Number(m.def?.maxLvl??G.Moves.BY_ID[id]?.maxLvl);
    if(!Number.isFinite(cap)||cap<1)throw Error('Invalid MAX '+id);
    for(let i=0;i<cap&&m.lvl<cap;i++)G.Moves.levelUp(m);
    if(!api.readyMove(m))throw Error('Cannot train '+id+' to MAX');
    return m;
   };
   const a=max('surf'),b=max('thunder-shock');
   a.t=0;b.t=10000;p.moves=[a,b];p.slots=[[a],[b]];p.active=0;
   const mob=(x,y)=>G.EnemyMgr.add(new G.Enemy({dex:19,hp:100000000,spd:0,dmg:1,xp:1,behavior:'chase'},x,y,{hp:1,spd:1,dmg:1}));
   const e=mob(p.x+65,p.y),other=mob(p.x+85,p.y+60);
   G.EnemyMgr.rebuildGrid();p.target=e;
   const card=api.levelFusionCard(p);
   if(card?.key!=='pkmsvv:resonance:water-electric'||!card.apply(p))throw Error('Fusion card cannot activate');
   window.__fusionQA={hits:[],procs:[],e,other};
   const native=api.afterHit;
   api.afterHit=function(actor,enemy,m,dmg,...rest){
    const q=window.__fusionQA,watch=actor===p&&enemy===e;
    const before=other.hp,targets=native.call(this,actor,enemy,m,dmg,...rest);
    if(actor===p&&(m?.id===a.id||m?.id===b.id))q.hits.push({id:m.id,primary:watch,dmg,at:G.Game.st?.time});
    if(watch&&m?.id===a.id&&dmg>0){a.t=10000;b.t=0;}
    if(actor===p&&targets>0)q.procs.push({id:m?.id,primary:watch,targets,otherBefore:before,otherAfter:other.hp,at:G.Game.st?.time});
    return targets;
   };
   return {ids:p.moves.map(m=>m.id),max:p.moves.every(api.readyMove),native:!!G.Moves.BY_ID.surf.pkmsvv3dsNative,slots:p.slots.length};
  });
  assert.deepEqual(seeded.ids,['surf','thunder-shock']);assert.equal(seeded.max,true);assert.equal(seeded.native,true);assert.equal(seeded.slots,2);
  await page.waitForFunction(()=>window.__fusionQA?.procs.some(x=>x.id==='thunder-shock'&&x.primary&&x.otherAfter<x.otherBefore),null,{timeout:12000});
  const report=await page.evaluate(()=>{const q=window.__fusionQA,p=G.Game.player;return {hits:q.hits,procs:q.procs,moves:p.moves.map(m=>m.id),slots:p.slots.length};});
  assert.ok(report.hits.some(x=>x.id==='surf'&&x.primary&&x.dmg>0),'native Surf must hit primary');
  const proc=report.procs.find(x=>x.id==='thunder-shock'&&x.primary&&x.otherAfter<x.otherBefore);
  assert.ok(proc&&proc.targets<=4,'native Electric attack must deal extra HP damage on nearby enemy');
  assert.deepEqual(report.moves,seeded.ids);assert.equal(report.slots,2);
  assert.deepEqual(errors,[]);
  fs.mkdirSync('dist/fusion-native-qa',{recursive:true});fs.writeFileSync('dist/fusion-native-qa/report.json',JSON.stringify({seeded,...report},null,2));
  console.log('BETA_FUSION_NATIVE_SURF_ELECTRIC_PASS='+JSON.stringify({seeded,proc,hits:report.hits.length}));
 }finally{await page.evaluate(()=>clearInterval(window.__fusionKeep)).catch(()=>{});await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
