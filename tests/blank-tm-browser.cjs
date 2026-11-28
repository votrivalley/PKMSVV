'use strict';
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const server=await startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,executablePath:process.env.PKMSVV_BROWSER||'/usr/bin/google-chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});await page.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
  await page.goto('http://127.0.0.1:'+server.port+'/game/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!G.DB?.save&&!!G.PKMSVVWisdomQA&&!!G.PKMSVVBoxHubUI,null,{timeout:40000});
  const seed=await page.evaluate(()=>{
   const s=G.DB.save;Object.assign(s,{partner:25,partnerShiny:false,pkmsvvStorySeen:true,pkmsvvNameChosen:true,pkmsvvChapter7Seen:true,coins:10000,bag:{},ptm:{},pban:{},pstart:{},pbind:{}});
   s.owned={...s.owned,25:{at:1}};const move=G.TM_OF(25).find(id=>G.Moves.BY_ID[id]&&!G.Mons.natural(25,id));if(!move)throw Error('No Pikachu TM');
   s.ptm[25]=[move];s.pban[25]=[move];s.pstart[25]=move;s.pbind[25]=[move,null,null,null];
   if(!G.DB.commit(true))throw Error('fixture save');G.Flow.goMenu();G.KecleonUI.open('shop');return {move};
  });
  const price=await page.evaluate(()=>({coins:G.DB.save.coins,price:G.Shop.ITEMS.blankTm.price}));assert.equal(price.price,500);
  await page.locator('[data-pkmk-buy="blankTm"]').click();
  assert.equal(await page.evaluate(()=>G.Shop.count('blankTm')),1);assert.equal(await page.evaluate(()=>G.DB.save.coins),price.coins-500);
  const outcome=await page.evaluate(move=>{
   const s=G.DB.save;
   // Migrate the actual native legacy collection in the fresh test profile.
   if(!G.PKMSVVBox.validBox(s))G.PKMSVVBox.persistMigration();
   const before=JSON.stringify(s),key='ps.save.'+JSON.parse(localStorage.getItem('ps.session')),disk=localStorage.getItem(key),write=Storage.prototype.setItem;
   Storage.prototype.setItem=function(k,v){if(k===key)throw Error('QA storage fail');return write.call(this,k,v);};
   try{try{G.PKMSVVBoxHub.eraseTM('b1-25-n',move);}catch(_){}}
   finally{Storage.prototype.setItem=write;}
   return {rollback:before===JSON.stringify(s)&&disk===localStorage.getItem(key),move,learned:G.PKMSVVBoxHub.learned(s,G.PKMSVVBoxHub.item(s,'b1-25-n'))};
  },seed.move);
  assert.equal(outcome.rollback,true);assert.ok(outcome.learned.includes(seed.move));
  await page.evaluate(()=>{G.UI.hide('scr-kecleon');G.PKMSVVBoxHubUI.openBox();});
  await page.locator('#pkmbx-profile [data-box-tab="info"]').click();
  await page.locator('#pkmbx-profile [data-pkmbx-action="erase"]').click();
  await page.locator('.pkmbx-confirm-tm').selectOption(seed.move);await page.locator('[data-confirm-apply]').click();
  await page.waitForFunction(move=>!G.PKMSVVBoxHub.learned(G.DB.save,G.PKMSVVBoxHub.item(G.DB.save,'b1-25-n')).includes(move),seed.move);
  const saved=await page.evaluate(move=>({stock:G.Shop.count('blankTm'),ptm:G.DB.save.ptm[25],veto:G.DB.save.pban[25],start:G.DB.save.pstart[25]||null,bind:G.DB.save.pbind[25],edit:G.DB.save.pkmsvvTMEdits.at(-1)}),seed.move);
  assert.equal(saved.stock,0);assert.ok(!saved.ptm.includes(seed.move)&&!saved.veto.includes(seed.move));assert.equal(saved.start,null);assert.equal(saved.bind[0],null);assert.equal(saved.edit.action,'erase');
  const out=path.resolve('dist/big-update-progression-qa');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'blank-tm-box.png')});
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!G.DB?.save&&!!G.PKMSVVWisdomQA&&!!G.PKMSVVBoxHub,null,{timeout:40000});
  assert.equal(await page.evaluate(move=>G.PKMSVVBoxHub.learned(G.DB.save,G.PKMSVVBoxHub.item(G.DB.save,'b1-25-n')).includes(move),seed.move),false);
  await page.evaluate(()=>{
   G.Flow.goMenu();if(!G.PKMSVVQuickRegion.choose(0))throw Error('Explore');
   window.__keep=setInterval(()=>{[...document.querySelectorAll('.pkmsvv-berry-overlay button')].find(x=>/Không dùng Berry|No Berry/.test(x.textContent))?.click();},100);
  });
  await page.waitForFunction(()=>G.Game.state==='playing',null,{timeout:25000});
  const wisdom=await page.evaluate(()=>{
   clearInterval(window.__keep);const p=G.Game.player,old=p.xpMul;let card=null,n=0;
   for(;n<300&&!card;n++){const cards=G.LevelUp.offer(p);if(cards.length>3)throw Error('More than three cards');card=cards.find(c=>c.key==='stat:wisdom');}
   if(!card)throw Error('Wisdom not offered by actual native pool');
   const initial=p.xp;card.apply(p);const after=p.xpMul;card.apply(p);const twice=p.xpMul;
   // Real XP handler, not a synthetic stat total.
   p.xp=0;p.xpNext=10000000;p.gainXp(10);
   return {old,after,twice,gain:p.xp,taken:p.statsTaken.wisdom,offeredAgain:Array.from({length:40},()=>G.LevelUp.offer(p)).flat().some(c=>c.key==='stat:wisdom')};
  });
  assert.ok(Math.abs(wisdom.after-wisdom.old*1.15)<1e-8);assert.equal(wisdom.twice,wisdom.after);assert.ok(Math.abs(wisdom.gain-10*wisdom.after)<1e-8);assert.equal(wisdom.taken,1);assert.equal(wisdom.offeredAgain,false);
  fs.writeFileSync(path.join(out,'blank-tm-wisdom.json'),JSON.stringify({saved,wisdom},null,2));console.log('NATIVE_BLANK_TM_WISDOM_PASS='+JSON.stringify({saved,wisdom}));
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
