'use strict';
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const server=await startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0}),out=path.resolve('dist/big-update-progression-qa');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.PKMSVV_BROWSER||'/usr/bin/google-chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
  await page.goto('http://127.0.0.1:'+server.port+'/game/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!G.DB?.save&&!!G.PKMSVVCombatTacticsQA,null,{timeout:40000});
  await page.evaluate(async()=>{
   const s=G.DB.save;Object.assign(s,{partner:25,partnerShiny:false,pkmsvvStorySeen:true,pkmsvvNameChosen:true,pkmsvvChapter7Seen:true});
   s.owned={...s.owned,25:{at:1}};G.Flow.goMenu();await G.Social.createRoom('coop','private');
   for(let i=0;i<3;i++)await G.LanBus.request('addBot',{dex:[25,6,9][i]});
   G.LobbyUI.open();
  });
  await page.click('#lobby-start');await page.waitForFunction(()=>G.Game.state==='playing'&&G.Coop.puppets().filter(x=>x.lanBot).length===3,null,{timeout:30000});
  const fixture=await page.evaluate(()=>{
   const host=G.Game.player,bots=G.Coop.puppets().filter(p=>p.lanBot),api=G.PKMSVVCombatTacticsQA;
   let spot;
   for(let y=-600;y<600&&!spot;y+=48)for(let x=-600;x<600;x+=48)if(G.World.isFree(x,y,125,true)&&!G.World.isLiquid(x,y)){spot={x,y};break;}
   if(!spot)throw Error('No clear native test area');
   G.EnemyMgr.clear();G.Projectiles.clear();G.Hazards.clear();G.Combat.clearFields();
   host.x=spot.x;host.y=spot.y+100;host.invuln=100;host.hp=host.maxHp;
   bots.forEach((p,i)=>{p.x=spot.x+(i-1)*80;p.y=spot.y;p.hp=p.maxHp;p.invuln=0;});
   const p=bots[1];const hazard=G.Hazards.add({kind:'zone',x:p.x,y:p.y,r:44,delay:1.25,dmg:25,type:'normal',color:'#ff6666'});
   window.__tactics={spot,host,bots,p,hazard,hp:p.hp,evades:0,frames:0};
   window.__keep=setInterval(()=>{const q=window.__tactics;if(q&&G.LanAI.tacticalState(q.p.uid)?.evading)q.evades++;
    if(G.Game?.state==='levelup'&&G.UI.isOpen('scr-levelup'))G.RunUI.pick(0);
    if(G.UI.isOpen('scr-bond'))G.RunUI.pickBond(0);if(G.UI.isOpen('scr-item'))(document.querySelector('#item-cards .pkmsvv-held-action.is-old')||document.querySelector('#item-cards .card'))?.click();
   },40);
   return {uid:p.uid,hp:p.hp,spd:p.spd};
  });
  await page.waitForFunction(()=>window.__tactics.hazard.hit,null,{timeout:15000});
  const dodge=await page.evaluate(()=>{const q=window.__tactics;return {evades:q.evades,hp:q.p.hp,inside:G.Hazards.inside(q.hazard,q.p.x,q.p.y,q.p.r)};});
  assert.ok(dodge.evades>0);assert.equal(dodge.inside,false);assert.equal(dodge.hp,fixture.hp);
  const assignment=await page.evaluate(()=>{
   const q=window.__tactics,{spot,host,bots}=q;G.EnemyMgr.clear();G.Hazards.clear();G.Projectiles.clear();G.Combat.clearFields();
   host.x=spot.x;host.y=spot.y;host.hp=0;host.dead=true;host.reviveT=0;
   bots.forEach((p,i)=>{p.x=spot.x+25+i*48;p.y=spot.y;p.hp=p.maxHp;p.dead=false;});
   const assigned=G.PKMSVVCombatTacticsQA.assignRescuers(G.Coop.players(),bots);
   q.rescueUid=Array.from(assigned.keys())[0]?.uid;return {size:assigned.size,uid:q.rescueUid};
  });
  assert.equal(assignment.size,1);
  await page.waitForFunction(()=>!G.Game.player.dead&&G.Game.player.hp>0,null,{timeout:18000});
  const rescued=await page.evaluate(()=>({hp:G.Game.player.hp,maxHp:G.Game.player.maxHp,reviveT:G.Game.player.reviveT,uid:window.__tactics.rescueUid}));
  assert.ok(rescued.hp>0&&rescued.hp<=rescued.maxHp);
  const stressStart=await page.evaluate(()=>{
   const q=window.__tactics,p=q.host,spot=q.spot;G.EnemyMgr.clear();G.Hazards.clear();G.Projectiles.clear();G.Combat.clearFields();
   p.x=spot.x;p.y=spot.y;p.hp=p.maxHp;p.invuln=100;p.dead=false;
   const ids=['surf','thunder-shock','whirlpool','flame-wheel','ice-beam','rock-slide','bug-buzz','rapid-spin'];
   p.moves=ids.map(id=>G.Moves.instance(id,G.Moves.BY_ID[id].maxLvl));p.slots=p.moves.map(m=>[m]);p.active=0;
   let created=0;
   for(let i=0;i<200&&created<80;i++){
    const a=i*2.399963,r=45+(i%7)*18,x=spot.x+Math.cos(a)*r,y=spot.y+Math.sin(a)*r;
    if(!G.World.isFree(x,y,12,true)||G.World.isLiquid(x,y))continue;
    G.EnemyMgr.add(new G.Enemy({dex:19,hp:100000000,spd:0,dmg:1,xp:1,behavior:'chase'},x,y,{hp:1,spd:1,dmg:1}));created++;
   }
   G.EnemyMgr.rebuildGrid();G.MatchMetrics?.reset?.();q.start=G.Game.st.time;
   const state=G.PKMSVV3DSStage4Support.data(p);state.rest=1.4;p.slowT=2;
   q.status=G.PKMSVVCombatTacticsQA.status(p).map(x=>x.id);
   return {created,ids,status:q.status,time:q.start};
  });
  assert.equal(stressStart.created,80);assert.ok(stressStart.status.includes('rest')&&stressStart.status.includes('slow'));
  await page.screenshot({path:path.join(out,'combat-status-rest-slow.png')});
  await page.waitForFunction(()=>G.Game.st.time>=window.__tactics.start+5,null,{timeout:40000});
  const stress=await page.evaluate(()=>({time:G.Game.st.time-window.__tactics.start,moves:G.Game.player.moves.length,
   cooldowns:G.Game.player.moves.map(m=>({id:m.id,t:m.t})),metrics:G.MatchMetrics?.snapshot?.()||null,
   fx:G.PKMSVVHordePerformance?.stats||null,status:G.PKMSVVCombatTacticsQA.status(G.Game.player).map(x=>x.id)}));
  assert.ok(stress.time>=5);assert.equal(stress.moves,8);assert.ok(stress.cooldowns.some(m=>Number.isFinite(m.t)&&m.t>0));assert.ok(!stress.status.includes('rest')&&!stress.status.includes('slow'));assert.deepEqual(errors,[]);
  await page.evaluate(()=>clearInterval(window.__keep));await page.screenshot({path:path.join(out,'combat-eight-max-horde.png')});
  const report={fixture,dodge,assignment,rescued,stressStart,stress};fs.writeFileSync(path.join(out,'combat-tactics.json'),JSON.stringify(report,null,2));console.log('NATIVE_COMBAT_TACTICS_PASS='+JSON.stringify(report));
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
