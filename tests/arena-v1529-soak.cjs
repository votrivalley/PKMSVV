'use strict';
// Load fixture: keeps trainers alive to measure ten minutes with all slots active.
// This is a performance soak, not a claim that real trainers cannot be defeated.
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sleep=t=>new Promise(r=>setTimeout(r,t));
(async()=>{
 const platform=process.env.PKMSVV_PLATFORM||'pc',root=process.env.PKMSVV_SOAK_ROOT||
  (platform==='android'?'mobile/www':platform==='web'?'dist/cloudflare':'dist/lan');
 const server=await startServer({root:path.resolve(root),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding'],...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 const duration=Number(process.env.PKMSVV_SOAK_MS||600000),url='http://127.0.0.1:'+server.port+(platform==='pc'?'/game/':'/ai/game/');
 const reports=[];
 try{
  for(const count of [2,4,10]){
   const context=await browser.newContext({viewport:platform==='android'?{width:844,height:390}:{width:1280,height:800}});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error'&&m.text().includes('[Game]'))errors.push(m.text());});
   await page.goto(url);await page.waitForFunction(()=>G.DB?.save);
   await page.evaluate(async count=>{
    Object.assign(G.DB.save,{partner:251,pkmsvvStorySeen:true,pkmsvvNameChosen:true,pkmsvvChapter1Seen:true,pkmsvvChapter2Seen:true,pkmsvvChapter3Seen:true});G.MenuUI.open();
    await G.Social.createRoom('royale','private');
    G.LobbyUI.open();const run=G.Game.startRun;G.Game.startRun=function(cfg){cfg.seed=1529;return run.call(this,cfg);};
    const check=G.Royale.check;G.Royale.check=function(players,t,cb){
     for(const p of players){if(p.dead)p.revive(1);p.hp=p.maxHp;p.invuln=1;}return check(players,t,cb);
    };
   },count);
   let guest;
   if(platform==='pc'){
    guest=await context.newPage();guest.on('pageerror',e=>errors.push(e.message));
    await guest.goto(url);await guest.waitForFunction(()=>G.DB?.save);
    const id=await page.evaluate(()=>G.Social.room.id);
    await guest.evaluate(async id=>{
     Object.assign(G.DB.save,{partner:25,pkmsvvStorySeen:true,pkmsvvNameChosen:true});G.MenuUI.open();
     const r=await G.Social.joinRoom(id);if(!r.ok)throw Error(r.error);G.LobbyUI.open();
     const update=G.Player.prototype.update;G.Player.prototype.update=function(dt){if(this===G.Game.player){if(this.dead)this.revive(1);this.hp=this.maxHp;this.invuln=1;}return update.call(this,dt);};
    },id);
   }
   await page.evaluate(async n=>{for(let i=0;i<n;i++)await G.LanBus.request('addBot',{dex:[25,1,7,4,133,387,393,390,447][i]});G.LobbyUI.open();},count-(guest?2:1));
   await page.click('#lobby-start');await page.waitForFunction(()=>G.Game.state==='playing');
   const start=Date.now(),limit=count===10?duration:Math.min(30000,duration),samples=[];let next=0;
   while(Date.now()-start<limit){
    if(guest)await guest.evaluate(()=>{if(G.Game.state==='levelup')G.RunUI.pick(0);});
    const sample=await page.evaluate(()=>{
     if(G.Game.state==='levelup')G.RunUI.pick(0);
     return {time:G.Game.st.time,state:G.Game.state,zone:G.Arena.snapshot(),radius:G.Arena.radius,...G.MatchMetrics.snapshot(),saveTickets:[G.DB.save.tickets,G.DB.save.tickets10]};
    });
    assert.notEqual(sample.state,'over','load fixture must retain all trainers');assert.ok(sample.activeNests<=6);assert.ok(sample.totalPets<=count*2);
    assert.ok(sample.enemies<=80);assert.ok(!sample.chunks||sample.chunks.data<=400&&sample.chunks.images<=48);
    if(Date.now()-start>=next){samples.push({...sample,wallSeconds:(Date.now()-start)/1000});console.log(platform,count,JSON.stringify(samples.at(-1)));next+=30000;}
    await sleep(250);
   }
   const final=await page.evaluate(()=>({time:G.Game.st.time,...G.MatchMetrics.snapshot()}));
   assert.deepEqual(errors,[]);reports.push({platform,participants:count,humans:guest?2:1,bots:count-(guest?2:1),wallMs:Date.now()-start,fixture:'QA keepalive: revives/heals trainers before Royale elimination; normal spawn, zone, eggs, combat and AI continue',samples,final,errors});
   fs.mkdirSync('dist/qa',{recursive:true});fs.writeFileSync('dist/qa/v1529-soak-'+platform+'.json',JSON.stringify(reports,null,2));
   await page.screenshot({path:'dist/qa/v1529-soak-'+platform+'-'+count+'.png'});await context.close();
  }
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
