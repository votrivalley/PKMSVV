'use strict';
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const server=await startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,executablePath:process.env.PKMSVV_BROWSER||'/usr/bin/google-chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));await page.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
  await page.goto('http://127.0.0.1:'+server.port+'/game/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!G.DB?.save&&!!G.PKMSVVBigUpdateQA?.gachaStatus&&G.Gacha?._pkmbxStage2Wrapped,null,{timeout:40000});
  const initial=await page.evaluate(()=>{
   const s=G.DB.save;Object.assign(s,{partner:25,partnerShiny:false,pkmsvvStorySeen:true,pkmsvvNameChosen:true,pkmsvvChapter7Seen:true});
   s.owned={...s.owned,25:{at:1}};delete s.owned[19];s.pkmsvvDefeatedDex={...s.pkmsvvDefeatedDex,25:true,19:true};s.tickets={t1:210,t10:1};s.stats.pulls=543;
   s.pkmsvvIncubator={serial:5,active:null,eggs:{'egg-1':{dex:19,kills:500,region:0,from:'region-boss'},'egg-2':{dex:172,kills:0,region:9,from:'baby-egg'},'egg-3':{dex:173,kills:0,region:9,from:'baby-egg'},'egg-4':{dex:174,kills:0,region:9,from:'baby-egg'},'egg-5':{dex:298,kills:0,region:9,from:'baby-egg'}},hatched:{}};
   if(!G.DB.commit(true))throw Error('Fixture commit failed');G.Flow.goMenu();G.GachaUI.open();G.PKMSVVRecruitmentQA.sync();
   return G.PKMSVVBigUpdateQA.gachaStatus();
  });assert.equal(initial.total,0);
  const first=await page.evaluate(()=>{
   const s=G.DB.save,res=G.Gacha.pull(s,100,1,'t1');
   return {length:res?.length,ids:new Set(res?.map(r=>r.instanceId)).size,tickets:s.tickets.t1,lifetime:s.stats.pulls,status:G.PKMSVVBigUpdateQA.gachaStatus(),eggs:Object.values(s.pkmsvvIncubator.eggs).filter(e=>e.from==='gacha-baby')};
  });
  assert.equal(first.length,100);assert.equal(first.ids,100);assert.equal(first.tickets,110);assert.equal(first.lifetime,643);assert.equal(first.status.total,100);assert.equal(first.eggs.length,1);
  assert.equal(first.eggs[0].gachaMilestone,100);assert.ok(GOALS().includes(first.eggs[0].goal));
  const failed=await page.evaluate(()=>{
   const s=G.DB.save,key='ps.save.'+JSON.parse(localStorage.getItem('ps.session')),disk=localStorage.getItem(key),before=JSON.stringify(s),proto=Object.getPrototypeOf(localStorage),write=proto.setItem;
   proto.setItem=function(k,v){if(k===key)throw Error('QA storage failure');return write.call(this,k,v);};
   let res;try{res=G.Gacha.pull(s,100,1,'t1');}catch(_){res=null;}finally{proto.setItem=write;}
   return {failed:!res,same:JSON.stringify(s)===before,disk:localStorage.getItem(key)===disk};
  });
  assert.deepEqual(failed,{failed:true,same:true,disk:true});
  const second=await page.evaluate(()=>{
   const s=G.DB.save,charges=[],lengths=[];
   for(const [n,use] of [[100,'t1'],[10,'t10'],[1,'t1']]){
    const before={...s.tickets},cost=G.Gacha.costOf(s,n,use),res=G.Gacha.pull(s,n,1,use),after={...s.tickets};
    charges.push({n,use,cost,before,after});lengths.push(res?.length);
   }
   return {n:lengths,charges,tickets:s.tickets,status:G.PKMSVVBigUpdateQA.gachaStatus(),eggs:Object.keys(s.pkmsvvIncubator.eggs).length,boxes:s.pkmsvvBox.length};
  });
  console.log('NATIVE_RECRUITMENT_CHARGES='+JSON.stringify(second));
  assert.deepEqual(second.n,[100,10,1]);
  // Other native achievements may award tickets BETWEEN browser tasks.
  // Verify each actual ticket deduction synchronously instead of
  // assuming the starting wallet remains unchanged for the entire test.
  for(const c of second.charges){
   assert.ok(c.cost);
   assert.equal(c.before.t1-c.after.t1,c.cost.t1);
   assert.equal(c.before.t10-c.after.t10,c.cost.t10);
  }
  assert.equal(second.charges[1].cost.t10,1);
  assert.equal(second.status.total,211);assert.equal(second.status.progress,11);assert.equal(second.status.pending,1);assert.equal(second.eggs,6);
  assert.equal(await page.locator('#pkmsvv-gacha-egg-progress progress').getAttribute('value'),'11');
  const out=path.resolve('dist/big-update-progression-qa');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'recruitment-egg-progress.png')});
  await page.evaluate(()=>{G.Flow.goMenu();G.PKMSVVWiki.open();});
  await page.locator('[data-research-hotspot="support"]').click();
  await page.locator('[data-support-station-tab="incubator"]').click();
  const panel=page.locator('[data-recruit-egg-panel]'),claim=panel.locator('[data-recruit-prizes]');
  assert.equal(await claim.isDisabled(),true);await panel.locator('[data-recruit-egg="egg-1"]').click();
  await page.waitForFunction(()=>G.DB.save.pkmsvvIncubator.hatched['egg-1']===19);
  await claim.click();await page.waitForFunction(()=>G.PKMSVVBigUpdateQA.gachaStatus().pending===0);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!G.DB?.save&&!!G.PKMSVVBigUpdateQA?.gachaStatus,null,{timeout:40000});
  const persisted=await page.evaluate(()=>({tickets:G.DB.save.tickets,status:G.PKMSVVBigUpdateQA.gachaStatus(),milestones:Object.values(G.DB.save.pkmsvvIncubator.eggs).filter(e=>e.from==='gacha-baby').map(e=>e.gachaMilestone),boxes:G.DB.save.pkmsvvBox.length}));
  assert.deepEqual(persisted.status,{total:211,progress:11,goal:100,pending:0,earned:2});assert.deepEqual(persisted.milestones,[100,200]);assert.ok(persisted.tickets.t1>=second.tickets.t1);assert.ok(persisted.tickets.t10>=second.tickets.t10);assert.equal(persisted.boxes,second.boxes+1);assert.deepEqual(errors,[]);
  const result={first,failed,second,persisted};fs.writeFileSync(path.join(out,'recruitment-egg.json'),JSON.stringify(result,null,2));console.log('NATIVE_RECRUITMENT_EGG_PASS='+JSON.stringify({first:first.status,second:second.status,persisted}));
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
function GOALS(){return [500,750,1000];}
