'use strict';
// Regression for the actual native Beta build: 3 choices at every milestone,
// Solo Forget pauses world/time, keyboard and Gamepad API selection resume.
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const server=await startServer({root:path.resolve(__dirname,'../dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.addInitScript(()=>{
   window.__pkmsvvPippiGuideQABypass=true;
   window.__qaPad={id:'QA standard controller',index:0,connected:true,mapping:'standard',timestamp:0,
    axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false}))};
   Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__qaPad]});
  });
  await page.goto('http://127.0.0.1:'+server.port+'/game/',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>!!window.G?.DB?.save&&!!G.PKMSVVQuickRegion?.choose&&!!G.PKMSVVModalNavQA?.pollModal,null,{timeout:40000});
  await page.evaluate(()=>{
   Object.assign(G.DB.save,{partner:150,partnerShiny:false,pkmsvvStorySeen:true,pkmsvvNameChosen:true});
   G.MenuUI.open();G.PKMSVVQuickRegion.choose(0);
   window.__qaKeep=setInterval(()=>{
    [...document.querySelectorAll('.pkmsvv-berry-overlay button')].find(x=>/Không dùng Berry|No Berry/.test(x.textContent))?.click();
    const p=G.Game?.player;if(p&&!p.dead){p.hp=p.maxHp;p.invuln=Math.max(p.invuln||0,2000);}
   },100);
  });
  await page.waitForFunction(()=>G.Game?.state==='playing',null,{timeout:23000});
  const setup=await page.evaluate(()=>{
   const p=G.Game.player;
   const old=G.DB.upgradesOf.bind(G.DB);G.DB.upgradesOf=(...a)=>({...old(...a),forget:1});
   p.maxMoves=8;
   const ids=['confusion','psybeam','psychic','extrasensory','agility','rest','light-screen','double-team'];
   p.moves=ids.map(id=>G.Moves.instance(id));p.slots=p.moves.map(m=>[m]);p.active=0;
   const offered=[];
   for(const level of [16,25,40]){p.level=level;for(let i=0;i<12;i++)offered.push(G.LevelUp.offer(p,4).length);}
   p._pkmsvvForgetUsed=false;
   const opened=G.PKMSVVForgetSkill.open(p);
   return {opened,offered,time:G.Game.st.time,x:p.x,y:p.y};
  });
  assert.ok(setup.opened,'Solo Forget popup must open');
  assert.ok(setup.offered.every(n=>n<=3&&n>0),'Never offer a fourth card');
  await page.keyboard.down('d');await page.waitForTimeout(650);await page.keyboard.up('d');
  const frozen=await page.evaluate(()=>({time:G.Game.st.time,x:G.Game.player.x,y:G.Game.player.y,blocking:G.PKMSVVForgetSkill.blocksSolo()}));
  assert.equal(frozen.blocking,true);assert.equal(frozen.time,setup.time,'world clock frozen');assert.equal(frozen.x,setup.x);assert.equal(frozen.y,setup.y);
  await page.keyboard.press('2');
  await page.waitForFunction(()=>!G.PKMSVVForgetSkill.current(),null,{timeout:5000});
  const key=await page.evaluate(()=>({length:G.Game.player.moves.length,has:G.Game.player.moves.some(m=>m.id==='psybeam')}));
  assert.deepEqual(key,{length:7,has:false});
  await page.evaluate(()=>{const p=G.Game.player;const m=G.Moves.instance('psybeam');p.moves.push(m);p.slots.push([m]);p._pkmsvvForgetUsed=false;G.PKMSVVForgetSkill.open(p);});
  await page.waitForTimeout(150);
  await page.evaluate(()=>{window.__qaPad.buttons[0]={pressed:true,value:1,touched:true};});
  await page.waitForFunction(()=>G.PKMSVVForgetSkill.current()?.page===1,null,{timeout:5000});
  await page.evaluate(()=>{window.__qaPad.buttons[0]={pressed:false,value:0,touched:false};});
  await page.waitForTimeout(120);
  await page.evaluate(()=>{window.__qaPad.buttons[2]={pressed:true,value:1,touched:true};});
  await page.waitForFunction(()=>!G.PKMSVVForgetSkill.current(),null,{timeout:5000});
  await page.evaluate(()=>{window.__qaPad.buttons[2]={pressed:false,value:0,touched:false};});
  await page.waitForFunction(t=>G.Game.st.time>t,setup.time,{timeout:5000});
  assert.equal(await page.evaluate(()=>G.Game.player.moves.length),7);
  assert.deepEqual(errors,[]);
  console.log('BETA_FORGET_THREE_CARDS_KEY_PAD_PAUSE_PASS');
 }finally{await page.evaluate(()=>clearInterval(window.__qaKeep)).catch(()=>{});await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
