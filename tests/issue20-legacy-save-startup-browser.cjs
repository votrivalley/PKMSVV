'use strict';
/* Issue #20: normal Solo must remain responsive after importing mature legacy saves.
 * This test generates a SYNTHETIC save. Never commit or log real player saves.
 * Run against prebuilt dist/cloudflare or mobile/www, after prepare/QA steps.
 */
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const {startServer}=require('../lan-server/server.cjs');
async function main(){
 const platform=process.env.PKMSVV_PLATFORM||'cloudflare';
 assert.ok(['cloudflare','android','lan'].includes(platform));
 const root=path.resolve(platform==='android'?'mobile/www':platform==='lan'?'dist/lan':'dist/cloudflare');
 const server=await startServer({root,host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 try{
  for(const mature of [false,true]){
   const context=await browser.newContext({viewport:{width:980,height:580}});
   const page=await context.newPage(),errors=[],messages=[];
   page.setDefaultTimeout(14000);
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',msg=>{if(msg.type()==='error')messages.push(msg.text().slice(0,250));});
   try{
    const url='http://127.0.0.1:'+server.port+(platform==='android'?'/':'/game/');
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.G?.DB?.save&&!!G.Game?.startRun&&!!G.PKMSVVBerry?.offer);
    const seeded=await page.evaluate(mature=>{
     const s=G.DB.save;
     const now=Date.now();
     s.name='Synthetic QA';
     s.starter=722;s.partner=722;s.partnerShiny=false;
     Object.assign(s,{pkmsvvStorySeen:true,pkmsvvNameChosen:true,
      pkmsvvChapter1Seen:true,pkmsvvChapter2Seen:true,pkmsvvChapter3Seen:true});
     s.owned=s.owned||{};s.owned[722]={at:now,from:'starter'};
     if(mature){
      const available=G.DEX.filter(x=>!!G.SPRITE_META[x.dex]);
      const pick=available.slice(0,540);
      s.owned=Object.fromEntries(pick.map(x=>[x.dex,{at:now,from:'gacha'}]));
      s.owned[722]={at:now,from:'starter'};s.owned[150]={at:now,from:'gacha'};
      const shiny=pick.filter(x=>G.Sprites.hasShiny(x.dex)).slice(0,18);
      s.shiny=Object.fromEntries(shiny.map(x=>[x.dex,{at:now,from:'gacha'}]));
      s.stats={...s.stats,runs:39,bestTime:1096,bestLevel:72,
       totalKills:20981,pulls:900,bossesTotal:129,riftWins:75,
       evolutions:59,groupRuns:3,pkmsvvEggsHatched:41};
      s.pkmsvvChapter5Seen=true;
      s.pkmsvvChapter6Seen=false; // still requires Berry progression
      s.pkmsvvMultiplayerDone={coop:true,royale:true};
      s.pkmsvvBerry={bag:{oran:1,liechi:1},used:{},last:[],rescueWins:0};
      s.pkmsvvBerryIntroSeen=true;
      s.pkmsvvSupportBond={35:1,132:4,151:2,172:8,173:1,174:3,
       175:3,360:4,438:10,447:5};
      s.pupg=s.pupg||{};
      s.pupg[722]={spd:8,xp:5,magnet:4,cd:4,def:4,hp:5,atk:4,
       crit:3,regen:4,coins:3,ban:3};
      s.pban={722:['harden','substitute','rapid-spin']};
     }
     G.DB.commit(true);
     G.MenuUI.open();
     return {owned:Object.keys(s.owned).length,berries:Object.keys(s.pkmsvvBerry?.bag||{}).length};
    },mature);
    if(mature)assert.ok(seeded.owned>=540);
    // Full reload exercises save migration/restore boot, not just in-memory edits.
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.G?.DB?.save&&!!G.Game?.startRun);
    const persisted=await page.evaluate(()=>({owned:Object.keys(G.DB.save.owned||{}).length,
      coop:G.DB.save.pkmsvvMultiplayerDone?.coop,
      royale:G.DB.save.pkmsvvMultiplayerDone?.royale}));
    if(mature){assert.ok(persisted.owned>=540,'reload lost synthetic collection');
      assert.equal(persisted.coop,true);assert.equal(persisted.royale,true);}
    await page.evaluate(()=>G.MenuUI.open());
    // Use actual wrapped launch path, including 4-second pre-run Berry choice.
    await page.evaluate(()=>G.Game.startRun(null));
    await page.waitForFunction(()=>G.Game?.state==='playing'&&!!G.Game?.player,
     null,{timeout:14000});
    const first=await page.evaluate(()=>({
     state:G.Game.state,playerDex:G.Game.player?.dex,
     choosing:G.PKMSVVBerry?.choosing,playerHP:G.Game.player?.hp
    }));
    assert.equal(first.state,'playing');
    assert.equal(first.playerDex,722);
    assert.equal(first.choosing,false);
    assert.ok(Number.isFinite(first.playerHP)&&first.playerHP>0);
    await page.waitForTimeout(500);
    await page.evaluate(()=>G.MenuUI.open());
    assert.deepEqual(errors,[],'uncaught page errors: '+JSON.stringify({platform,mature,messages}));
    console.log('PASS '+platform+' '+(mature?'synthetic mature save':'fresh control')+
     ' Solo launch / Berry picker / player ready. '+JSON.stringify(seeded));
   }catch(e){
    throw new Error('Issue #20 '+platform+' '+(mature?'mature save':'fresh control')+
      ': '+String(e)+'; pageerrors='+JSON.stringify(errors)+
      '; consoleerrors='+JSON.stringify(messages));
   }finally{await context.close().catch(()=>{});}
  }
 }finally{await browser.close().catch(()=>{});await server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
