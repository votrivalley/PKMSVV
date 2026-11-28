'use strict';
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const site=await startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,executablePath:process.env.PKMSVV_BROWSER||'/usr/bin/google-chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});await page.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
  await page.goto('http://127.0.0.1:'+site.port+'/game/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!G.DB?.save&&!!G.PKMSVVEternamaxQA,null,{timeout:40000});
  const inventory=await page.evaluate(async()=>{
   const a=G.PKMSVVEternamaxQA;if(!a.assetsReady())throw Error('No verified form assets');
   const sizes={};for(const name of G.PKMSVV_ETERNAMAX_ASSET.animations){
    const img=new Image();img.src='assets/pokemon/'+a.ID+'/'+name+'.png';await img.decode();sizes[name]=[img.naturalWidth,img.naturalHeight];
   }
   return {sizes,meta:G.SPRITE_META[a.ID],dexEntry:!!G.DEX_BY[a.ID],dexPool:G.DEX.some(x=>x.dex===a.ID)};
  });
  assert.equal(inventory.dexEntry,false);assert.equal(inventory.dexPool,false);assert.equal(Object.keys(inventory.sizes).length,5);
  await page.evaluate(()=>{
   const s=G.DB.save;Object.assign(s,{partner:25,pkmsvvStorySeen:true,pkmsvvNameChosen:true,pkmsvvChapter7Seen:true});
   s.owned={...s.owned,25:{at:1}};s.pkmsvvExploreSeals=Object.fromEntries(['Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola'].map(x=>[x,true]));
   G.Flow.goMenu();if(!G.PKMSVVQuickRegion.choose(7))throw Error('Cannot enter unlocked Galar');
   window.__keep=setInterval(()=>{[...document.querySelectorAll('.pkmsvv-berry-overlay button')].find(x=>/Không dùng Berry|No Berry/.test(x.textContent))?.click();
    if(G.Game.player)G.Game.player.invuln=2000;if(G.UI.isOpen('scr-levelup'))G.RunUI.pick(0);
    if(G.UI.isOpen('scr-item'))(document.querySelector('#item-cards .pkmsvv-held-action.is-old')||document.querySelector('#item-cards .card'))?.click();
    if(G.UI.isOpen('scr-bond'))G.RunUI.pickBond(0);},100);
  });
  await page.waitForFunction(()=>G.Game.state==='playing'&&G.PKMSVVQuickRegion.selectedRegion===7,null,{timeout:28000});
  await page.evaluate(()=>{G.Game.debugTime(902);G.PKMSVVQuickRegion.updateRegionBoss();});
  await page.waitForFunction(()=>!!G.PKMSVVQuickRegion.regionalBoss,null,{timeout:5000});
  await page.evaluate(()=>{const b=G.PKMSVVQuickRegion.regionalBoss;b.hurt(b.hp+b.shield+10);});
  await page.waitForFunction(()=>G.DB.save.pkmsvvExploreSeals.Galar===true,null,{timeout:10000});
  await page.waitForFunction(()=>G.Game.state==='playing');await page.evaluate(()=>{G.Game.debugTime(1803);G.PKMSVVQuickRegion.updateRegionBoss();});
  await page.waitForFunction(()=>!!G.PKMSVVQuickRegion.finalBoss,null,{timeout:8000});
  const phase1=await page.evaluate(()=>{
   const b=G.PKMSVVQuickRegion.finalBoss;window.__boss=b;const p=G.Game.player;p.x=b.x+210;p.y=b.y;
   return {id:b.id,dex:b.dex,maxHp:b.maxHp,bosses:p.bosses,armed:G.PKMSVVEternamaxQA.armed(b),sprite:b.anim.dex};
  });
  assert.equal(phase1.armed,true);assert.equal(phase1.dex,890);assert.equal(phase1.maxHp,160000);
  const phase2=await page.evaluate(()=>{
   const b=window.__boss;b.hurt(b.hp+b.shield+999999);
   const status=G.PKMSVVEternamaxQA.status(b);b.hurt(999999);
   return {id:b.id,dex:b.dex,sprite:b.anim.dex,hp:b.hp,dead:b.dead,bosses:G.Game.player.bosses,phase:status.phase,state:G.Game.state};
  });
  assert.equal(phase2.id,phase1.id);assert.equal(phase2.sprite,90890);assert.equal(phase2.hp,88000);assert.equal(phase2.dead,false);assert.equal(phase2.bosses,phase1.bosses);assert.equal(phase2.phase,2);
  const out=path.resolve('dist/big-update-progression-qa');fs.mkdirSync(out,{recursive:true});
  await page.waitForFunction(()=>G.PKMSVVEternamaxQA.status(window.__boss)?.lock===0,null,{timeout:12000});
  const attack=await page.evaluate(()=>{
   const b=window.__boss,p=G.Game.player;b.bossInit();b.bossStart('beam',p);
   return G.Hazards.all.filter(h=>h.pkmsvvEternamaxOwner===b.id&&h.kind==='beam').map(h=>({w:h.w,delay:h.delay,dmg:h.dmg,type:h.type}));
  });assert.ok(attack.some(h=>h.w===62&&h.delay===1.25&&h.type==='dragon'));
  await page.screenshot({path:path.join(out,'eternamax-galar-phase2.png')});
  await page.evaluate(()=>{const b=window.__boss;b.hurt(b.hp+b.shield+999999);});
  await page.waitForFunction(()=>G.Game.state==='over',null,{timeout:15000});
  const final=await page.evaluate(()=>({dead:window.__boss.dead,dex:window.__boss.dex,completed:G.PKMSVVEternamaxQA.completed(window.__boss),bosses:G.Game.player.bosses,owned:!!G.DB.save.owned[90890]}));
  assert.equal(final.completed,true);assert.equal(final.dead,true);assert.equal(final.bosses,phase1.bosses+1);assert.equal(final.owned,false);
  await page.evaluate(()=>clearInterval(window.__keep));
  fs.writeFileSync(path.join(out,'eternamax.json'),JSON.stringify({inventory,phase1,phase2,attack,final},null,2));console.log('NATIVE_ETERNAMAX_PASS='+JSON.stringify({phase1,phase2,attack,final}));
 }finally{await browser.close();await site.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
