'use strict';
// Real Android packaged HTML5 engine: tests the exact UI path reported by
// users, not just isolated sprite drawing. Also runs against PC standalone AI.
const {chromium}=require('playwright');
const {startServer}=require('../lan-server/server.cjs');
const assert=require('node:assert/strict'),path=require('node:path');

async function main(){
 const android=process.env.PKMSVV_PLATFORM==='android';
 const root=path.resolve(android?'mobile/www':'dist/lan');
 const server=await startServer({root,host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 const origin='http://127.0.0.1:'+server.port,errors=[];
 try{
  const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
  if(android)await context.addInitScript(()=>{
   window.Capacitor={Plugins:{PKMSVVLAN:{open:async()=>({})}}};
  });
  const page=await context.newPage();
  page.setDefaultTimeout(22000);
  page.on('pageerror',e=>errors.push(e.message));

  // Repro: Memories > Chapter 5 > Skip/Back > Memories X
  // used to leave only the walking Pokémon background, hiding scr-menu.
  await page.goto(origin+(android?'/':'/game/'));
  await page.waitForFunction(()=>G?.DB?.save);
  await page.evaluate(()=>{
   Object.assign(G.DB.save,{partner:25,starter:25,pkmsvvStorySeen:true,
    pkmsvvNameChosen:true,pkmsvvChapter1Seen:true,pkmsvvChapter2Seen:true,
    pkmsvvChapter3Seen:true,pkmsvvChapter5Seen:false});
   G.DB.commit(true);G.MenuUI.open();
  });
  await page.evaluate(()=>G.PKMSVVStory.memories());
  await page.locator('.pkmsvv-memory-chooser [data-chapter="chapter5"]').click();
  await page.waitForFunction(()=>G.UI.isOpen('scr-pkmsvv-story'));
  await page.locator('#pkmsvv-story-skip').click();
  await page.locator('.pkmsvv-memory-chooser').waitFor({state:'visible'});
  const during=await page.evaluate(()=>({
   menu:G.UI.isOpen('scr-menu'),
   chrome:!document.getElementById('topbar').classList.contains('hidden'),
   chapterSelector:!!document.querySelector('.pkmsvv-memory-chooser')
  }));
  assert.equal(during.menu,true,'Skipping story must restore underlying menu BEFORE Memories reopens');
  assert.equal(during.chrome,true,'Story skip must restore top bar');
  await page.locator('.pkmsvv-memory-chooser .pkmsvv-memory-close').click();
  const after=await page.evaluate(()=>({
   menu:G.UI.isOpen('scr-menu'),
   chrome:!document.getElementById('topbar').classList.contains('hidden'),
   story:G.UI.isOpen('scr-pkmsvv-story'),
   chooser:!!document.querySelector('.pkmsvv-memory-chooser')
  }));
  assert.equal(after.menu,true,'Closing Memories must never leave background only');
  assert.equal(after.chrome,true);
  assert.equal(after.story,false);
  assert.equal(after.chooser,false);

  // The mode must remain Berry rather than silently becoming ordinary Co-op.
  for(const mode of ['berry','berryeasy']){
   await page.goto(origin+(android?'/':'/game/'));
   await page.waitForFunction(()=>G?.DB?.save);
   await page.evaluate(()=>{
    G.DB.save.partner=25;G.DB.save.pkmsvvStorySeen=true;
    G.DB.save.pkmsvvNameChosen=true;G.DB.commit(true);G.MenuUI.open();
   });
   const entry=page.locator('#scr-menu [data-go="multiplayer"],#scr-menu [data-go="online"]');
   await entry.first().click();
   await page.locator('#pkmsvv-unified-coop').waitFor({state:'visible'});
   await page.locator('#pkmsvv-coop-modes [data-mode="berry"]').click();
   if(mode==='berryeasy')await page.locator('[data-difficulty="berryeasy"]').click();
   await page.locator('#pkmsvv-coop-actions [data-role="ai"]').click();
   await page.waitForFunction(expected=>G?.Social?.room?.mode===expected&&G.Social.room.members.length===4,mode);
   await page.locator('#lobby-start').click();
   await page.waitForFunction(()=>G.Game.state==='playing'&&G.PKMSVVBerryRescue?.active,
    null,{timeout:18000});
   const state=await page.evaluate(()=>({
    mode:G.Social.room.mode,
    berryActive:G.PKMSVVBerryRescue.active,
    easy:G.PKMSVVBerryRescue.easy,
    trees:G.PKMSVVBerryRescue.trees.map(t=>({x:t.x,y:t.y,hp:t.hp})),
    drawables:G.PKMSVVBerryRescue.drawables().length,
    AI:G.Coop.players().filter(p=>p.lanBot).length,
    normalCoop:!G.PKMSVVBerryRescue.active
   }));
   assert.equal(state.mode,mode);
   assert.equal(state.berryActive,true);
   assert.equal(state.easy,mode==='berryeasy');
   assert.equal(state.trees.length,3);
   assert.equal(state.drawables,3);
   assert.equal(state.AI,3);
   assert.equal(state.trees[0].y,state.trees[1].y);
   assert.ok(state.trees[0].x<state.trees[2].x&&state.trees[2].x<state.trees[1].x);
   const atlas=await page.evaluate(async()=>{
    const image=new Image();image.src='assets/berry-trees/berry_trees_3x6.webp';
    await image.decode();return [image.naturalWidth,image.naturalHeight];
   });
   assert.deepEqual(atlas,[1152,576],'All Berry tree HP sprites must be installed on Android');
   console.log('PASS '+(android?'Android':'PC')+' '+mode+': 3 real trees, scene drawables, 3 AI and atlas');
  }
  assert.deepEqual(errors,[],'Browser must not throw while navigating Memories/Berry');
 }finally{await browser.close();await server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
