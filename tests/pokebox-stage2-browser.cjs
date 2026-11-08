'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),assert=require('node:assert/strict');
const {spawn,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../dist/pokebox-stage4-qa');
const sleep=t=>new Promise(r=>setTimeout(r,t));
async function until(fn,ms=30000){
 const deadline=Date.now()+ms;
 while(Date.now()<deadline){try{const x=await fn();if(x)return x}catch(_){}await sleep(250)}
 throw Error('Timed out loading Stage 2 browser modules');
}
const srv=http.createServer((req,res)=>{
 let file;
 try{const name=new URL(req.url,'http://local').pathname;
  file=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));
  if(!file.startsWith(root+path.sep))throw Error('Unsafe path');
 }catch(_){res.writeHead(403).end();return}
 fs.stat(file,(err,stat)=>{
  if(err||!stat?.isFile()){res.writeHead(404).end();return}
  const ext=path.extname(file),mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
  res.writeHead(200,{'content-type':mime[ext]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
 });
});
async function main(){
 assert.ok(fs.existsSync(path.join(root,'ai/game/index.html')));
 const chrome=process.env.PKMSVV_BROWSER||'google-chrome';
 assert.equal(spawnSync('which',[chrome]).status,0,'Chromium required');
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'pkmbx-stage2-cdp-'));
 const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--no-first-run','--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+data,'about:blank'],{stdio:'ignore'});
 let ws;
 try{
  const portfile=path.join(data,'DevToolsActivePort');
  await until(()=>fs.existsSync(portfile),30000); // CI cold-start and parallel artifact jobs can delay Chromium startup
  const port=Number(fs.readFileSync(portfile,'utf8').split('\n')[0]);
  const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const page=targets.find(x=>x.type==='page');assert.ok(page?.webSocketDebuggerUrl);
  ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{
   ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});
  });
  let seq=0;const waiting=new Map(),errors=[];
  ws.addEventListener('message',evt=>{
   let m;try{m=JSON.parse(String(evt.data))}catch(_){return}
   if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails?.exception?.description||'Browser JS exception');
   const task=waiting.get(m.id);
   if(task){waiting.delete(m.id);m.error?task.reject(Error(m.error.message)):task.resolve(m.result)}
  });
  function cmd(method,params={}){
   return new Promise((resolve,reject)=>{const id=++seq;waiting.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
  }
  const evaluate=async expression=>{
   const data=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
   if(data.exceptionDetails)throw Error(data.exceptionDetails.exception?.description||data.exceptionDetails.text);
   return data.result.value;
  };
  await cmd('Runtime.enable');await cmd('Page.enable');
  await cmd('Page.navigate',{url:'http://127.0.0.1:'+srv.address().port+'/ai/game/'});
  const query="(()=>({stage1:!!window.G?.PKMSVVBox,stage2:!!window.G?.PKMSVVBox2,stage3:!!window.G?.PKMSVVBox3,stage4:!!window.G?.PKMSVVBox4,hub:!!window.G?.PKMSVVBoxHub,hubUI:!!window.G?.PKMSVVBoxHubUI,menuClean:!!window.G?.PKMSVVMenuCleanQA,individualMons:!!window.G?.Mons?._pkmbxIndividualHub,rankCombat:!!window.G?.Player?.prototype?._pkmbxStage4Installed,hooked:!!window.G?.Gacha?._pkmbxStage2Wrapped,traits:!!window.G?.Mons?._pkmbxStage2Traits,rankUi:!!window.G?.PKMSVVBox?._pkmbxRankUiWrapped,enemyHook:!!window.G?.Enemy?.prototype?._pkmsvvReforgeHurtWrapped,shopHook:!!window.G?.KecleonUI?.render?.toString?.().includes('draw()'),title:document.title}))()";
  const state=await until(()=>evaluate(query).then(x=>x?.stage1&&x.stage2&&x.stage3&&x.stage4&&x.hub&&x.hubUI&&x.menuClean&&x.individualMons&&x.rankCombat&&x.hooked&&x.traits&&x.rankUi&&x.enemyHook&&x.shopHook?x:null),45000).catch(async err=>{
   const last=await evaluate(query).catch(e=>({cdpError:e.message}));
   throw Error(err.message+'; last='+JSON.stringify(last)+'; scriptExceptions='+JSON.stringify(errors.slice(-8)));
  });
  // Read-only runtime audit for new defeated-only Dex and evolution QA.
  // Logs only public engine source/definition names; never any user save.
  const runtimeAudit=await evaluate(`(()=>({
   bosses:(G.Enemies?.BOSSES||[]).slice(0,20).map(e=>({dex:e.dex,name:e.name,guard:e.guard,support:e.support})),
   minibosses:Object.keys(G.Enemies||{}).filter(k=>/mini|boss|guard/i.test(k)),
   bossSlots:Array.isArray(G.Enemies?.BOSS_SLOTS)?G.Enemies.BOSS_SLOTS.slice(0,16):G.Enemies?.BOSS_SLOTS,
   spawnBag:(()=>{try{return G.Enemies?.bagAt?.(0)?.slice?.(0,20)||null}catch(e){return String(e)}})(),
   spawnerKeys:Object.keys(G.Spawner||{}).filter(k=>/mini|boss|elite|spawn/i.test(k)),
   eventsKeys:Object.keys(G.Events||{}).filter(k=>/mini|boss|elite|spawn/i.test(k)),
   supportCanonical:(G.PKMSVVBossSupport?.active?.()||[]).slice(0,8).map(x=>({dex:x.dex,role:x.pkmsvvRole})),
   gachaPool:String(G.Gacha?.pool||'').slice(0,2300),
   gachaPull:String(G.Gacha?.pull||'').slice(0,2600),
   enemyDie:String(G.Enemy?.prototype?.die||'').slice(0,1300),
   evolution:String(G.PKMSVVEvo?.tryOpen||'').slice(0,1000),
   royaleActive:!!G.Royale,
   gameKeys:Object.keys(G.Game||{}).slice(0,60),
   playerSkills:G.Game?.player?.moves?.length||0
  }))()`);
  console.log('QA_RUNTIME_AUDIT='+JSON.stringify(runtimeAudit));
  const five=await evaluate('G.PKMSVVBox2.formatRank(5).hp');
  assert.equal(await evaluate('G.PKMSVVBox3.PRICE'),6500);
  assert.equal(await evaluate('G.PKMSVVBox3.PITY'),180);
  assert.equal(await evaluate('G.PKMSVVBox3.RATES.boss'),0.08);
  assert.equal(await evaluate('G.PKMSVVBox4.HIT_PROC'),0.16);
  assert.equal(await evaluate('G.PKMSVVBox4.HYBRID_MAX'),6);
  assert.equal(five,30);
  // Release blocker: the actual compiled v1.5.93 QA artifact, not merely
  // source tests, must contain these newly repaired prebattle systems.
  const liveChoice=await evaluate("(()=>({berry:G.PKMSVVBerry?.SELECT_SECONDS,pvp:G.PKMSVVArenaPvp?.SELECT,champion:G.PKMSVVChampionArena?.entryPickAvailable,solo:G.PKMSVVArenaSolo?.SELECT}))()");
  assert.equal(liveChoice.berry,10,'QA app.min.js still contains the stale 4-second Berry implementation');
  assert.equal(liveChoice.pvp,10,'QA app.min.js still contains the stale Arena PvP implementation');

  // Real compiled Chromium smoke for every uploaded fusion WebP, the
  // auto-casting evolved combat module, source MAX eligibility and slot use.
  const fusionAssets=await evaluate("(async()=>{const ids=G.PKMSVVFusionPilot?.RECIPES?.map(x=>x.id)||[];const result=[];for(const id of ids){const r=await fetch('assets/fusion-icons/'+id+'.webp');const blob=await r.blob();result.push({id,ok:r.ok,bytes:blob.size,mime:r.headers.get('content-type')});}return {num:ids.length,result}})()");
  assert.equal(fusionAssets.num,10,'compiled Fusion pilot must expose exactly ten named recipes');
  for(const f of fusionAssets.result){
   assert.equal(f.ok,true,'Web QA missing Fusion icon '+f.id);
   assert.ok(f.bytes>1000,'empty Fusion image '+f.id);
   assert.match(f.mime,/image\/webp/,'Fusion must load as a WebP image');
  }
  const fusionLive=await evaluate("(()=>{const f=G.PKMSVVFusionEvolved,api=G.PKMSVVFusionPilot;if(!f||!api)return {loaded:false};const a=G.Moves.instance('ember'),b=G.Moves.instance('quick-attack');if(!a||!b)return {loaded:true,instances:false};const pl={x:0,y:0,level:20,atkMul:1,baseAtk:1,moves:[a,b],slots:[[a],[b]],bind:{},active:0,bonds:2,dead:false,remote:false,lanBot:false};while(a.lvl<a.def.maxLvl)G.Moves.levelUp(a);while(b.lvl<b.def.maxLvl)G.Moves.levelUp(b);const ready=api.options(pl)?.recipes?.some(r=>r.id==='ember-quick')===true;const before=pl.moves.length;const oldRing=G.FX?.ring,oldBurst=G.FX?.burst,oldSfx=G.Audio?.sfx;try{if(G.FX){G.FX.ring=()=>{};G.FX.burst=()=>{};}if(G.Audio)G.Audio.sfx=()=>{};const newSkill=f.evolve(pl,'ember-quick');const icon=newSkill&&G.Icons.html('move:'+newSkill.id,32);if(newSkill)G.Player.prototype.cast.call(pl,newSkill);return {loaded:true,instances:true,ready,before,after:pl.moves.length,slots:pl.slots.length,once:pl._pkmsvvFusionUsed,compiledKind:newSkill?.kind,icon:icon?.includes('ember-quick.webp'),max:newSkill?.lvl===newSkill?.def?.maxLvl,second:f.evolve(pl,'ember-quick')===null}}finally{if(G.FX){G.FX.ring=oldRing;G.FX.burst=oldBurst;}if(G.Audio)G.Audio.sfx=oldSfx;}})()");
  for(const k of ['loaded','instances','ready','icon','max','second'])
   assert.equal(fusionLive[k],true,'compiled Fusion check '+k+': '+JSON.stringify(fusionLive));
  assert.equal(fusionLive.before,2);
  assert.equal(fusionLive.after,1,'two MAX skills must become exactly one evolved skill');
  assert.equal(fusionLive.slots,1,'one skill slot must free up after Fusion');
  assert.equal(fusionLive.once,1,'one Fusion per match');
  assert.equal(fusionLive.compiledKind,'projectile','Fusion must use real autocast move kind');
  console.log('Fusion MAX+MAX Chromium QA:',JSON.stringify(fusionLive));
  // Exercise all ten UNIQUE combat effects with actual compiled game modules
  // and disposable actor/enemy objects. No real save, combat or reward writes.
  const effectsLive=await evaluate("(()=>{const f=G.PKMSVVFusionEvolved,pilot=G.PKMSVVFusionPilot,results=[];const oldAll=G.EnemyMgr.all,oldRing=G.FX?.ring,oldBurst=G.FX?.burst,oldSfx=G.Audio?.sfx;try{G.FX.ring=()=>{};G.FX.burst=()=>{};G.Audio.sfx=()=>{};for(const r of pilot.RECIPES){f.reset();let enemy={x:65,y:0,r:12,hp:2500,dead:false,remote:false,hurt(amount){this.hp-=amount},applySlow(v,t){this.slow=v},applyStun(t){this.stun=t}};G.EnemyMgr.all=()=>[enemy];const a=G.Moves.instance(r.ids[0]),b=G.Moves.instance(r.ids[1]);if(!a||!b){results.push({id:r.id,error:'source moves unavailable'});continue;}while(a.lvl<a.def.maxLvl)G.Moves.levelUp(a);while(b.lvl<b.def.maxLvl)G.Moves.levelUp(b);const pl={x:0,y:0,level:28,baseAtk:1,atkMul:1,moves:[a,b],slots:[[a],[b]],bind:{},active:0,dead:false,remote:false,lanBot:false};const m=f.evolve(pl,r.id);if(!m){results.push({id:r.id,error:'not evolved'});continue;}const startingHp=enemy.hp;f.cast(pl,m);for(let i=0;i<14;i++)f.tickZones(pl,.35);results.push({id:r.id,damage:Math.round(startingHp-enemy.hp),ready:pl._pkmsvvFusionUsed===1,move:m.id,icon:!!f.assets[r.id]});}return results;}finally{f.reset();G.EnemyMgr.all=oldAll;G.FX.ring=oldRing;G.FX.burst=oldBurst;G.Audio.sfx=oldSfx;}})()");
  assert.equal(effectsLive.length,10,'all ten Fusion skills need compiled combat verification');
  for(const effect of effectsLive){
   assert.ok(effect.damage>0,'Fusion has no real damage in compiled combat: '+JSON.stringify(effect));
   assert.equal(effect.ready,true,'Fusion did not consume its once-per-run chance: '+effect.id);
   assert.equal(effect.icon,true,'Fusion icon mapping missing: '+effect.id);
  }
  console.log('Ten actual compiled Fusion effects QA:',JSON.stringify(effectsLive));

 
  const wikiFusion=await evaluate("(()=>{G.PKMSVVWiki.open();try{const heading=[...document.querySelectorAll('#pkmsvv-wiki-overlay .pkmsvv-pc-learn>button')].find(x=>x.textContent.includes('Fusion'));const panel=heading?.nextElementSibling;const rows=[...panel?.querySelectorAll('.pkmsvv-fusion-recipe')||[]];return {heading:heading?.textContent,rows:rows.length,icons:rows.filter(x=>x.querySelector('img.pkmsvv-fusion-icon[src$=\".webp\"]')).length,benefits:rows.filter(x=>x.querySelector('.pkmsvv-fusion-benefit')?.textContent?.length>15).length,oldBond:document.querySelector('#pkmsvv-wiki-overlay')?.textContent.includes('Fusion tự do')||false};}finally{G.PKMSVVWiki.close()}})()");
  assert.match(wikiFusion.heading,/Fusion.*Tiến hóa/,'compiled Wiki must use latest Fusion system, not stale free Bond');
  assert.equal(wikiFusion.rows,10,'compiled PC guide displays all ten Fusion recipes');
  assert.equal(wikiFusion.icons,10,'compiled guide uses uploaded WebP icon for each recipe');
  assert.equal(wikiFusion.benefits,10,'compiled guide describes each actual Fusion effect');
  assert.equal(wikiFusion.oldBond,false,'old free-Fusion guide must not remain in compiled game');
  const legacyBoxQA=await evaluate("(()=>{const descriptor=Object.getOwnPropertyDescriptor(G.DB,'save');try{Object.defineProperty(G.DB,'save',{value:{owned:{6:{at:1},25:{at:2}},shiny:{},partner:6,partnerShiny:false,coins:42},configurable:true,writable:true});G.PKMSVVBoxHubUI.openBox('rank');const checkbox=document.querySelector('#pkmbx-ready');checkbox.checked=true;checkbox.dispatchEvent(new Event('change',{bubbles:true}));const banner=document.querySelector('#pkmbx-legacy-migration');const button=document.querySelector('#pkmbx-rank-shortcut');return {banner:!!banner&&!banner.hidden,action:!!banner?.querySelector('#pkmbx-activate-migration'),rankDisabled:!!button?.disabled,rankText:button?.textContent,explanation:document.querySelector('.pkmbx-box-empty')?.textContent};}finally{const checkbox=document.querySelector('#pkmbx-ready');if(checkbox){checkbox.checked=false;checkbox.dispatchEvent(new Event('change',{bubbles:true}));}G.PKMSVVBoxHubUI.closeBox();Object.defineProperty(G.DB,'save',descriptor);}})()");
  assert.equal(legacyBoxQA.banner,true,'legacy save must explain why Rank-ready filter is empty');
  assert.equal(legacyBoxQA.action,true,'safe PokéBox migration action must be directly accessible');
  assert.equal(legacyBoxQA.rankDisabled,true,'legacy Rank is disabled gray without new duplicate ledger');
  assert.match(legacyBoxQA.rankText,/Nâng Rank/,'button always says Nâng Rank, never Activate Box');
  assert.match(legacyBoxQA.explanation,/Save cũ/,'empty Rank filter needs an actionable explanation');
  // Exercise the actual conversion button with a disposable JSON save and
  // temporary storage key; never touch a player's existing session/backup.
  const shinySeparate=await evaluate("(()=>{const desc=Object.getOwnPropertyDescriptor(G.DB,'save'),commit=G.DB.commit;try{const raw={owned:{6:{at:1}},shiny:{6:{at:2}},partner:6,partnerShiny:false,coins:100};const fixture=G.PKMSVVBox.migrate(raw).save;Object.defineProperty(G.DB,'save',{value:fixture,configurable:true,writable:true});G.DB.commit=()=>true;G.PKMSVVBoxHubUI.openBox('rank');const before={badge:document.querySelectorAll('#pkmbx-grid .pkmbx-stack-count').length,rankReady:!!document.querySelector('.pkmbx-hub-slot.rank-ready'),rankEnabled:!document.querySelector('#pkmbx-rank-shortcut')?.disabled,materials:G.PKMSVVBox2.rankMaterials(fixture,'b1-6-n').available};G.PKMSVVBox2.makeOne(fixture,{dex:6,shiny:false});G.PKMSVVBoxHubUI.renderBox();const after={badge:document.querySelector('#pkmbx-grid .pkmbx-stack-count')?.textContent,rankReady:!!document.querySelector('.pkmbx-hub-slot.rank-ready'),rankEnabled:!document.querySelector('#pkmbx-rank-shortcut')?.disabled,materials:G.PKMSVVBox2.rankMaterials(fixture,'b1-6-n').available};document.querySelector('#pkmbx-rank-shortcut')?.click();const final={rank:G.PKMSVVBox2.speciesProgress(fixture,6).rank,shinyKept:fixture.pkmsvvBox.some(x=>x.id==='b1-6-s'),badge:document.querySelector('#pkmbx-grid .pkmbx-stack-count')?.textContent||null};return {before,after,final};}finally{G.PKMSVVBoxHubUI.closeBox();Object.defineProperty(G.DB,'save',desc);G.DB.commit=commit}})()");
  assert.equal(shinySeparate.before.badge,0,'Normal + Shiny may NOT show x2');
  assert.equal(shinySeparate.before.rankReady,false,'Shiny is not Rank material');
  assert.equal(shinySeparate.before.rankEnabled,false,'Shiny cannot activate yellow Rank');
  assert.equal(shinySeparate.before.materials,0);
  assert.equal(shinySeparate.after.badge,'×2','a REAL second ordinary clone must show x2');
  assert.equal(shinySeparate.after.rankReady,true);
  assert.equal(shinySeparate.after.rankEnabled,true);
  assert.equal(shinySeparate.after.materials,1);
  assert.equal(shinySeparate.final.rank,1,'one click consumes exactly one ordinary clone');
  assert.equal(shinySeparate.final.shinyKept,true,'Shiny is never deleted');
  assert.equal(shinySeparate.final.badge,null,'x2 disappears after Rank consumes its clone');
  console.log('Shiny vs ordinary Rank Chromium QA:',JSON.stringify(shinySeparate));
  const autoGachaLegacy=await evaluate("(()=>{const desc=Object.getOwnPropertyDescriptor(G.DB,'save'),commit=G.DB.commit,oldBackup=G.PKMSVVSaveUI.backup,oldProfile=localStorage.getItem('ps.session'),key='pkmsvv.prepokebox.qaautogacha',oldSnapshot=localStorage.getItem(key);try{const old={owned:{6:{at:1}},shiny:{6:{at:2}},partner:6,partnerShiny:false,tickets:{t1:8},coins:110};Object.defineProperty(G.DB,'save',{value:old,configurable:true,writable:true});G.DB.commit=()=>true;G.PKMSVVSaveUI.backup=()=>JSON.stringify({format:'PKMSVV_SAVE',save:old});localStorage.setItem('ps.session','\"qaautogacha\"');localStorage.removeItem(key);const mock={pull(draft,n){draft.tickets.t1-=n;return [{dex:6,shiny:false}]}};G.PKMSVVBox2.wrappedPull(mock,G.DB);const result=mock.pull(old,1,0,'t1');const copies=old.pkmsvvBox.filter(x=>x.dex===6&&!x.shiny);return {result:result.length,boxValid:G.PKMSVVBox.validBox(old),copies:copies.length,shiny:old.pkmsvvBox.filter(x=>x.shiny).length,rankAvailable:G.PKMSVVBox2.rankMaterials(old,'b1-6-n').available,backup:!!localStorage.getItem(key),tickets:old.tickets.t1};}finally{Object.defineProperty(G.DB,'save',desc);G.DB.commit=commit;G.PKMSVVSaveUI.backup=oldBackup;if(oldProfile===null)localStorage.removeItem('ps.session');else localStorage.setItem('ps.session',oldProfile);if(oldSnapshot===null)localStorage.removeItem(key);else localStorage.setItem(key,oldSnapshot)}})()");
  assert.deepEqual([autoGachaLegacy.result,autoGachaLegacy.boxValid,autoGachaLegacy.copies,autoGachaLegacy.shiny,autoGachaLegacy.rankAvailable,autoGachaLegacy.backup,autoGachaLegacy.tickets],
   [1,true,2,1,1,true,7],'new Gacha on old save must create backed-up ledger with real ordinary Rank clone');
  const migrateQA=await evaluate("(()=>{const original=Object.getOwnPropertyDescriptor(G.DB,'save'),commit=G.DB.commit,backupFn=G.PKMSVVSaveUI?.backup,confirmFn=window.confirm,oldSession=localStorage.getItem('ps.session'),key='pkmsvv.prepokebox.boxqa01',oldCopy=localStorage.getItem(key);let committed=0;try{const raw={owned:{6:{at:1},25:{at:2}},shiny:{6:{at:3}},partner:6,partnerShiny:false,coins:123,megaStones:{6:1},pkmsvvBerry:{bag:{oran:2}}};Object.defineProperty(G.DB,'save',{value:raw,configurable:true,writable:true});G.DB.commit=()=>{committed++;return true};G.PKMSVVSaveUI.backup=()=>JSON.stringify(raw);window.confirm=()=>true;localStorage.setItem('ps.session',JSON.stringify('boxqa01'));localStorage.removeItem(key);G.PKMSVVBoxHubUI.openBox('rank');const btn=document.querySelector('#pkmbx-activate-migration');btn?.click();return {activated:G.PKMSVVBoxHub.valid(raw),originalPokemon:raw.pkmsvvBox?.length,duplicateInvented:raw.pkmsvvBox?.filter(x=>x.dex===6).length>2,backedUp:!!localStorage.getItem(key),coins:raw.coins,berry:raw.pkmsvvBerry?.bag?.oran,mega:raw.megaStones?.[6],wrote:committed,legacyActionGone:!!document.querySelector('#pkmbx-legacy-migration')?.hidden};}finally{G.PKMSVVBoxHubUI.closeBox();Object.defineProperty(G.DB,'save',original);G.DB.commit=commit;G.PKMSVVSaveUI.backup=backupFn;window.confirm=confirmFn;if(oldSession===null)localStorage.removeItem('ps.session');else localStorage.setItem('ps.session',oldSession);if(oldCopy===null)localStorage.removeItem(key);else localStorage.setItem(key,oldCopy);}})()");
  assert.equal(migrateQA.activated,true,'in-Box one-click migration must activate the schema');
  assert.equal(migrateQA.backedUp,true,'migration must preserve an original JSON backup BEFORE saving');
  assert.equal(migrateQA.originalPokemon,3,'old normal/Shiny collection is preserved');
  assert.equal(migrateQA.duplicateInvented,false,'no historic duplicate counts may be invented');
  assert.equal(migrateQA.coins,123);
  assert.equal(migrateQA.berry,2);
  assert.equal(migrateQA.mega,1);
  assert.equal(migrateQA.legacyActionGone,true,'migration banner disappears when successful');
  assert.ok(migrateQA.wrote>0,'migration commits once');

  const abilityQA=await evaluate("(()=>{const descriptor=Object.getOwnPropertyDescriptor(G.DB,'save'),id='blaze',mon=G.DEX_BY?.[4];try{const fixture={owned:{4:{at:1}},shiny:{},partner:4,partnerShiny:false,pkmsvvDefeatedDex:{4:true}};Object.defineProperty(G.DB,'save',{value:fixture,writable:true,configurable:true});const text=G.PKMSVVAbilityText?.summary?.(id,mon,G.AbilityFX?.of?.(id,mon),false);G.PKMSVVBoxHubUI.openDex();const row=document.querySelector('#pkmbx-dex-details .pkmbx-dex-ability-row'),span=row?.querySelector('span');return {translated:text,rowBackground:row?getComputedStyle(row).backgroundColor:null,descriptionColor:span?getComputedStyle(span).color:null,abilityRows:document.querySelectorAll('#pkmbx-dex-details .pkmbx-dex-ability-row').length};}finally{G.PKMSVVBoxHubUI.closeDex();Object.defineProperty(G.DB,'save',descriptor)}})()");
  assert.match(abilityQA.translated,/35%|1\/3 HP/,'Ability description must use real game mechanics and Vietnamese');
  assert.ok(abilityQA.abilityRows>0,'Pokédex must render real Ability descriptions');
  assert.notEqual(abilityQA.descriptionColor,abilityQA.rowBackground,
   'Ability text must contrast with the pale background');
  const pureDex=await evaluate("(()=>{G.PKMSVVBoxHubUI.openDex();return ({overlay:!!document.querySelector('#pkmbx-dex-overlay'),search:!!document.querySelector('#pkmbx-dex-search'),hasEvolutionPane:!!document.querySelector('#pkmbx-dex-details'),itemActions:!!document.querySelector('#pkmbx-dex-overlay [data-hub-tm],#pkmbx-dex-overlay [data-pkmbx-use]'),cards:document.querySelectorAll('#pkmbx-dex-list button').length,insidePC:document.querySelector('#pkmsvv-pokebox-overlay')?.contains(document.querySelector('#pkmbx-dex-overlay')),tabs:[...document.querySelectorAll('#pkmbx-dex-overlay [data-pc-tab]')].map(b=>b.dataset.pcTab),pcHubHidden:document.querySelector('.pkmbx-hub-panel')?.hidden,exploreRule:document.querySelector('#pkmbx-dex-rule')?.textContent,exploreRuleVisible:(()=>{const node=document.querySelector('#pkmbx-dex-rule');return !!node&&getComputedStyle(node).display!=='none'&&node.getClientRects().length>0})()})})()");
  assert.equal(pureDex.overlay,true);
  assert.equal(pureDex.search,true);
  assert.match(pureDex.exploreRule,/Chỉ hạ Pokémon trong Khám phá|Only Pokémon defeated in Explore/,'Pokédex must describe Explore-only defeats');
  assert.equal(pureDex.exploreRuleVisible,true,'Explore rule must be visible above filters');
  assert.equal(pureDex.hasEvolutionPane,true);
  assert.equal(pureDex.insidePC,true,'Pokédex must be inside in-game PC');
  assert.deepEqual(pureDex.tabs,['box','dex','upgrade'],'Pokémon tabs must be Box → Dex → Upgrades');
  assert.equal(pureDex.pcHubHidden,true,'PokéBox tab hidden while Pokédex is active');
  assert.equal(pureDex.itemActions,false,'Pokédex must remain read-only');
  assert.ok(pureDex.cards>0,'Pokédex must list species');
  const hasEvolution=await evaluate("!!(G.PKMSVV_EVOLUTION_DATA?.rules||[]).some(r=>r.from===1&&r.to===2)");
  assert.equal(hasEvolution,true,'Pokédex must have evolution condition data for Bulbasaur → Ivysaur');
  assert.equal(await evaluate("(()=>{G.PKMSVVBoxHubUI.closeDex();return !!document.querySelector('#pkmbx-dex-overlay')})()"),false);
  const hubScreen=await evaluate("(()=>{const originalDesc=Object.getOwnPropertyDescriptor(G.DB,'save');try{Object.defineProperty(G.DB,'save',{value:G.PKMSVVBox.migrate({owned:{6:{at:1},25:{at:2}},shiny:{},partner:6,partnerShiny:false,created:1,bag:{mint:1,cap:1,caph:1},tms:{'shadow-ball':1},ptm:{6:[]},coins:1000}).save,configurable:true,writable:true});G.PKMSVVBoxHubUI.openBox('items');return {valid:!!G.PKMSVVBoxHub.valid(G.DB.save),boxCount:G.DB.save?.pkmsvvBox?.length||0,status:document.querySelector('#pkmbx-status')?.textContent,saveWritable:!!Object.getOwnPropertyDescriptor(G.DB,'save')?.writable,overlay:!!document.querySelector('#pkmsvv-pokebox-overlay'),teamSlots:document.querySelectorAll('.pkmbx-team-slot').length,cards:document.querySelectorAll('.pkmbx-hub-slot').length,animatedHero:!!document.querySelector('#pkmbx-hero'),natureSelect:!!document.querySelector('#pkmbx-mint-select'),abilityButtons:document.querySelectorAll('[data-hub-ability]').length,rankTab:!!document.querySelector('[data-box-tab=rank]'),readOnlyDexHidden:!document.querySelector('#pkmbx-dex-overlay'),boxLabel:document.querySelector('#pkmbx-box-label')?.textContent,boxArrows:!!document.querySelector('#pkmbx-prev')&&!!document.querySelector('#pkmbx-next'),pokemonType:document.querySelector('#pkmbx-profile')?.dataset?.pkmType,statBars:document.querySelectorAll('#pkmbx-profile .pkmbx-stat-meter').length,rankButton:!!document.querySelector('#pkmbx-rank-shortcut'),manualShardConversion:!!document.querySelector('[data-pkmbx-convert]')};}finally{G.PKMSVVBoxHubUI.closeBox();Object.defineProperty(G.DB,'save',originalDesc);}})()");
  console.log('QA Hub fixture:',JSON.stringify(hubScreen));
  assert.equal(hubScreen.overlay,true);
  assert.equal(hubScreen.teamSlots,6);
  assert.ok(hubScreen.cards>=2);
  assert.equal(hubScreen.animatedHero,true);
  assert.equal(hubScreen.natureSelect,true);
  assert.ok(hubScreen.abilityButtons>=1);
  assert.equal(hubScreen.rankTab,true);
  assert.equal(hubScreen.readOnlyDexHidden,true);
  assert.match(hubScreen.boxLabel,/BOX 1/,'box carousel heading must appear above the collection');
  assert.equal(hubScreen.boxArrows,true,'both box navigation arrows must be present');
  assert.ok(['fire','water','electric','grass','normal'].includes(hubScreen.pokemonType),
   'detail panel must use a real Pokémon type theme');
  assert.equal(hubScreen.statBars,4,'HP/Damage/Speed/Cooldown must render as four stat bars');
  assert.equal(hubScreen.rankButton,true,'one-click Rank button must exist in the detail panel');
  assert.equal(hubScreen.manualShardConversion,false,'legacy conversion action must not be displayed');
  // Exercise the REAL Rank button in Chromium using a disposable in-memory
  // save fixture. Never write or replace the user's on-disk JSON.
  const directRank=await evaluate(`(()=>{
   const descriptor=Object.getOwnPropertyDescriptor(G.DB,'save');
   const priorCommit=G.DB.commit,priorConfirm=window.confirm;
   let confirmCalls=0;
   try{
    const raw={owned:{6:{at:1}},shiny:{},partner:6,partnerShiny:false,
     coins:10,bag:{},tms:{},ptm:{6:[]}};
    const fixture=G.PKMSVVBox.migrate(raw).save;
    G.PKMSVVBox2.makeOne(fixture,{dex:6,shiny:false},{random:()=>0,natures:[{id:'hardy'}]});
    Object.defineProperty(G.DB,'save',{value:fixture,configurable:true,writable:true});
    G.DB.commit=()=>true;
    window.confirm=()=>{confirmCalls++;return false;};
    G.PKMSVVBoxHubUI.openBox('rank');
    const before=document.querySelector('#pkmbx-rank-shortcut');
    const readyBefore=!before?.disabled;
    const leftReadyBefore=document.querySelectorAll('.pkmbx-hub-slot.rank-ready').length;
    const filter=document.querySelector('#pkmbx-ready');filter.checked=true;
    filter.dispatchEvent(new Event('change',{bubbles:true}));
    const filteredBefore=document.querySelectorAll('.pkmbx-hub-slot').length;
    document.querySelector('#pkmbx-rank-shortcut')?.click();
    const after=document.querySelector('#pkmbx-rank-shortcut');
    const afterRank=G.PKMSVVBox2.speciesProgress(fixture,6).rank;
    const cards=[...document.querySelectorAll('.pkmbx-hub-slot')];
    return {readyBefore,leftReadyBefore,afterRank,afterDisabled:!!after?.disabled,
     afterGray:after?.classList.contains('rank-disabled'),
     tabGray:document.querySelector('[data-box-tab=rank]')?.classList.contains('rank-disabled'),
     leftReadyAfter:cards.filter(el=>el.classList.contains('rank-ready')).length,
     copiesLeft:fixture.pkmsvvBox.filter(x=>x.dex===6).length,confirmCalls,
     filteredBefore,filteredAfter:document.querySelectorAll('.pkmbx-hub-slot').length};
   }finally{
    G.PKMSVVBoxHubUI.closeBox();
    Object.defineProperty(G.DB,'save',descriptor);
    G.DB.commit=priorCommit;window.confirm=priorConfirm;
   }
  })()`);
  assert.equal(directRank.readyBefore,true,'one earned clone enables Rank button');
  assert.equal(directRank.leftReadyBefore,1,'left Box immediately marks eligible species');
  assert.equal(directRank.confirmCalls,0,'Rank cannot spawn a redundant native confirmation popup');
  assert.equal(directRank.afterRank,1,'single click upgrades species Rank immediately');
  assert.equal(directRank.copiesLeft,1,'one ordinary clone is consumed, original survives');
  assert.equal(directRank.afterDisabled,true,'insufficient next-Rank materials disable button');
  assert.equal(directRank.afterGray,true,'Rank button becomes gray after spent copies');
  assert.equal(directRank.tabGray,true,'Rank tab also becomes gray when ineligible');
  assert.equal(directRank.leftReadyAfter,0,'left Box must remove stale rank-ready highlight');
  assert.equal(directRank.filteredBefore,1,'Rank-ready filter must show the eligible Gacha duplicate');
  assert.equal(directRank.filteredAfter,0,'after spending its copy the Rank-ready filter removes the species');
  // Perf regression: opening 200 species should evaluate Rank for only the
  // displayed page. Focusing is read-only and must retain grid DOM/canvases.
  const fastFocus=await evaluate(`(()=>{
   const descriptor=Object.getOwnPropertyDescriptor(G.DB,'save');
   const previousCommit=G.DB.commit,previousRank=G.PKMSVVBoxHub.rankOverview;
   const raw={owned:{},shiny:{},partner:1,partnerShiny:false,bag:{},tms:{}};
   Object.keys(G.DEX_BY).filter(n=>Number(n)>0&&Number(n)<=200).forEach(n=>raw.owned[n]={at:1});
   const fixture=G.PKMSVVBox.migrate(raw).save;
   let commits=0,rankCalls=0;
   try{
    Object.defineProperty(G.DB,'save',{value:fixture,writable:true,configurable:true});
    G.DB.commit=()=>{commits++;return true;};
    G.PKMSVVBoxHub.rankOverview=(...a)=>{rankCalls++;return previousRank(...a);};
    G.PKMSVVBoxHubUI.openBox('info');
    const grid=document.querySelector('#pkmbx-grid');
    const originalTile=grid.firstElementChild;
    const firstCalls=rankCalls;
    G.PKMSVVBoxHubUI.focus('b1-25-n');
    const focusCalls=rankCalls-firstCalls;
    const sameTile=grid.firstElementChild===originalTile;
    const highlighted=!!grid.querySelector('[data-box-id="b1-25-n"].focused');
    const profile=document.querySelector('#pkmbx-profile');
    const border=getComputedStyle(profile.querySelector('.pkmbx-hero-stage>canvas')).borderTopColor;
    const typeColor=getComputedStyle(profile).getPropertyValue('--pkmbx-type').trim();
    G.PKMSVVBoxHubUI.openDex();
    const dexDetail=document.querySelector('#pkmbx-dex-details');
    const dexBorder=getComputedStyle(dexDetail.querySelector('.pkmbx-hub-hero canvas')).borderTopColor;
    const dexType=getComputedStyle(dexDetail).getPropertyValue('--pkmbx-type').trim();
    const abilityHeading=getComputedStyle(dexDetail.querySelector('.pkmbx-dex-summary h4')).color;
    return {count:Object.keys(raw.owned).length,firstCalls,focusCalls,sameTile,highlighted,
     commits,border,typeColor,dexBorder,dexType,abilityHeading};
   }finally{
    G.PKMSVVBoxHubUI.closeBox();
    Object.defineProperty(G.DB,'save',descriptor);
    G.DB.commit=previousCommit;G.PKMSVVBoxHub.rankOverview=previousRank;
   }
  })()`);
  assert.ok(fastFocus.count>=150,'fixture should represent a large owned collection');
  assert.ok(fastFocus.firstCalls<=45,'opening Box must not compute Rank for every species');
  assert.ok(fastFocus.focusCalls<=2,'focus must check Rank only for chosen species');
  assert.equal(fastFocus.sameTile,true,'read-only focus must preserve grid DOM/canvases');
  assert.equal(fastFocus.highlighted,true,'focused card must update visibly');
  assert.equal(fastFocus.commits,0,'viewing/focusing must never write the save');
  const hexToRgb=hex=>{const n=parseInt(hex.replace('#',''),16);return 'rgb('+((n>>>16)&255)+', '+((n>>>8)&255)+', '+(n&255)+')';};
  assert.equal(fastFocus.border.toLowerCase(),hexToRgb(fastFocus.typeColor),'Box portrait border must follow primary type');
  assert.equal(fastFocus.dexBorder.toLowerCase(),hexToRgb(fastFocus.dexType),'Dex portrait border must follow primary type');
  assert.equal(fastFocus.abilityHeading,'rgb(255, 255, 255)','Ability heading needs white text');

  const inputAudit=await evaluate("(()=>({speed:String(G.Game?.debugSpeed).slice(0,900),input:Object.keys(G.Input||{}),tap:String(G.Input?.tap).slice(0,800),game:Object.keys(G.Game||{}),state:Object.keys(G.Game?.st||{}),levelup:Object.keys(G.LevelUp||{}),offer:String(G.LevelUp?.offer).slice(0,700),settings:Object.keys(G.Settings||{}),settingsOpen:String(G.SettingsUI?.open).slice(0,600),combat:Object.keys(G.Combat||{}),cast:String(G.Combat?.cast).slice(0,700),levelupHTML:document.querySelector('#scr-levelup')?.outerHTML.slice(0,1800),settingsHTML:document.querySelector('#scr-settings')?.outerHTML.slice(0,1300)}) )()");
  console.log('QA_GAMEPLAY_INPUT_AUDIT='+JSON.stringify(inputAudit));
  const skillAudit=await evaluate("(()=>({manualDash:String(G.Combat?.manualDash).slice(0,2200),combatTick:String(G.Combat?.tick).slice(0,1200),gameLevel:String(G.Game?.debugLevelUp).slice(0,500),autoLevel:String(G.Settings?.autoLevel).slice(0,450),settingsOn:String(G.Settings?.on).slice(0,500),inputHeld:String(G.Input?.held).slice(0,450),playerProps:Object.keys(G.Game?.player||{}).slice(0,90),controls:Array.from(document.querySelectorAll('#scr-levelup #cards')).map(x=>x.className),hud:document.querySelector('#scr-game')?.outerHTML.slice(0,800)}) )()");
  console.log('QA_SKILL_CONTROL_AUDIT='+JSON.stringify(skillAudit));
  const menuState=await evaluate("(()=>{const m=document.querySelector('#scr-menu');const news=m.querySelector('#btn-news');const color=getComputedStyle(news).color;const season=G.PKMSVVSeason?.nowActive?.();const bar=m.querySelector('.pkmsvv-save-banner');const pokemon=m.querySelector('[data-go=dex]');const pc=m.querySelector('#pkmsvv-menu-wiki');const nav=[...m.querySelector('.menu-right .menu-list')?.children||[]];const four=nav.map(n=>{const go=n.getAttribute('data-go')||n.querySelector('[data-go]')?.getAttribute('data-go')||'';const label=(n.querySelector('.pkmsvv-menu-label,.menu-label,strong')?.textContent||n.textContent||'').trim();if(go==='dex'||/^Pok[eé]mon\\b/i.test(label))return 'Pokémon';if(n.id==='pkmsvv-menu-wiki'||label==='PC')return 'PC';if(/multiplayer|coop|co-op/i.test(go)||/^Co-op\\b/i.test(label))return 'Co-op';if(/arena/i.test(go)||label==='Arena')return 'Arena';return null;}).filter(Boolean);return {navDebug:nav.map(n=>({id:n.id,go:n.getAttribute('data-go'),text:n.textContent?.trim().slice(0,95),label:n.querySelector('.pkmsvv-menu-label,.menu-label,strong')?.textContent?.trim()})),nativePC:!!pc,pcButtons:[...m.querySelectorAll('.menu-right button')].filter(b=>b.querySelector('.pkmsvv-menu-label')?.textContent==='PC').length,duplicate:!!pokemon,outsideUpgrade:!!m.querySelector('[data-go=upgrades]'),banner:bar?.textContent,bannerProtected:bar?.getAttribute('translate')==='no',pokemonDesc:pokemon?.querySelector('small')?.textContent,pcDesc:pc?.querySelector('small')?.textContent,four,saveBanners:m.querySelectorAll('.pkmsvv-save-banner').length,seasonBanners:m.querySelectorAll('.pkmsvv-season-banner').length,event:m.querySelector('.pkmsvv-v15-event span')?.textContent,seasonActive:!!season,newsColor:color,newsEnabled:!news?.disabled,menuClean:!!G.PKMSVVMenuCleanQA}})()");
  console.log('Actual native home menu entries:',JSON.stringify(menuState.navDebug));
  assert.equal(menuState.menuClean,true);
  assert.equal(menuState.nativePC,true,'keep original Support/Mega/Berry PC');
  assert.equal(menuState.pcButtons,1,'main menu must contain only ONE PC');
  assert.equal(menuState.duplicate,true,'keep the home Pokémon launcher');
  const labels=await evaluate("(()=>{const play=document.querySelector('#scr-menu [data-go=play]'),mon=document.querySelector('#scr-menu [data-go=dex]');return {play:play?.getAttribute('aria-label'),playText:play?.textContent,mon:mon?.getAttribute('aria-label'),monText:mon?.textContent}})()");
  assert.equal(labels.play,'Khám phá','Play must be renamed Khám phá');
  assert.match(labels.playText,/Khám phá/,'Explore must appear inside the real Play button');
  assert.equal(labels.mon,'Pokémon','collection launcher remains Pokémon');
  assert.match(labels.monText,/Pokémon/,'Pokémon collection must remain visible');
  assert.doesNotMatch(labels.monText,/Khám phá/,'no stray duplicate Khám phá line under Pokémon');
  assert.equal(menuState.outsideUpgrade,false,'upgrade selection belongs inside Pokémon');
  assert.deepEqual(menuState.four,['Pokémon','PC','Co-op','Arena'],'main menu order');
  assert.match(menuState.pokemonDesc,/PokéBox.*Pokédex.*Nâng cấp|PokéBox.*Pokédex.*Upgrades/);
  assert.match(menuState.pcDesc,/hỗ trợ.*Mega.*Berry|Support.*Mega.*Berries/i);
  assert.match(menuState.banner,/sao lưu thường xuyên|back up regularly/i,'natural backup reminder');
  assert.doesNotMatch(menuState.banner,/Normal xuyên/i,'no stray machine-translated Vietnamese');
  assert.equal(menuState.bannerProtected,true,'home backup warning must opt out of auto translation');
  assert.equal(menuState.saveBanners,1);
  assert.equal(menuState.seasonBanners,0,'season goes into Event card');
  if(menuState.seasonActive)assert.match(menuState.event,/Sương Ký Ức|Memory Mist/);
  assert.equal(menuState.newsEnabled,true);
  assert.match(menuState.newsColor,/rgb\(25[0-5],\s*2[0-5]\d,\s*1\d\d\)/,'News text must contrast with its background');
  const unifiedPc=await evaluate("(async()=>{document.querySelector('#pkmsvv-menu-wiki')?.click();await Promise.resolve();const p=document.querySelector('#pkmsvv-wiki-overlay');const grid=p?.querySelector('.pkmsvv-pc-grid');return {exists:!!p,cardCount:grid?.children.length,firstThree:[...grid?.children||[]].slice(0,3).map(x=>x.id),events:[...p?.querySelectorAll('.pkmsvv-pc-learn button')||[]].filter(b=>/Sương Ký Ức|Memory Mist|Season/.test(b.textContent)).length,hint:!!p?.querySelector('.pkmsvv-pc-hint'),support:!!p?.textContent.includes('Pokémon hỗ trợ'),mega:!!p?.textContent.includes('Mega'),berry:!!p?.textContent.includes('Berry')}})()");
  assert.equal(unifiedPc.exists,true);
  assert.equal(unifiedPc.cardCount,3,'PC should contain only its three existing utilities');
  assert.ok(unifiedPc.firstThree.every(id=>!['pkmsvv-pc-box','pkmsvv-pc-dex','pkmsvv-pc-upgrades'].includes(id)),'do not duplicate Pokémon tabs in PC');
  assert.equal(unifiedPc.events,0,'remove seasonal event from PC knowledge');
  assert.equal(unifiedPc.hint,false,'no redundant navigation hint');
  assert.ok(unifiedPc.support&&unifiedPc.mega&&unifiedPc.berry);
  const doneKnowledge=await evaluate("(()=>{const panel=document.querySelector('#pkmsvv-wiki-overlay .pkmsvv-pc-learn'),save=G.DB.save; if(!panel||!save||!G.PKMSVVSkillTrack)return {mounted:false};const old=save.pkmsvvSkillMarks;const skill=document.createElement('button');skill.textContent='Skill Awakening';const seasonal=document.createElement('button');seasonal.textContent='Sương Ký Ức · Sự kiện mùa';try{save.pkmsvvSkillMarks={k50:true,k100:true,k200:true,u10:true,u20:true};panel.append(skill,seasonal);G.PKMSVVMenuCleanQA.mountPC();return {mounted:true,skillHidden:!skill.isConnected,seasonHidden:!seasonal.isConnected,slots:G.PKMSVVSkillTrack.progress(save).count};}finally{if(old===undefined)delete save.pkmsvvSkillMarks;else save.pkmsvvSkillMarks=old;skill.remove();seasonal.remove()}})()");
  assert.equal(doneKnowledge.mounted,true,'PC knowledge panel and Skill Track must be present');
  assert.equal(doneKnowledge.slots,8);
  assert.equal(doneKnowledge.skillHidden,true,'completed Skill Awakening row must be removed');
  assert.equal(doneKnowledge.seasonHidden,true,'redundant seasonal last row must be removed');

  const shortcuts=await evaluate("(()=>{document.querySelector('#scr-menu [data-go=dex]').click();const box=!!document.querySelector('#pkmbx-grid');document.querySelector('#pkmsvv-pokebox-overlay [data-pc-tab=dex]')?.click();const dex=!!document.querySelector('#pkmbx-dex-details');G.PKMSVVBoxHubUI.closeBox();return {dex,box}})()");
  assert.equal(shortcuts.dex,true,'Pokémon → Pokédex must open the encyclopedia');
  assert.equal(shortcuts.box,true,'Pokémon launcher must open PokéBox');
   const upgradeTab=await evaluate("(()=>{G.PKMSVVBoxHubUI.openUpgrades();const overlay=document.querySelector('#pkmbx-upgrade-overlay');const result={visible:!!overlay&&!overlay.hidden,buttons:!!overlay?.querySelector('#pkmbx-upgrade-single')&&!!overlay?.querySelector('#pkmbx-upgrade-team'),tabs:[...overlay?.querySelectorAll('[data-pc-tab]')||[]].map(x=>x.dataset.pcTab)};G.PKMSVVBoxHubUI.closeBox();return result})()");
   assert.equal(upgradeTab.visible,true,'Nâng cấp must open inside Pokémon');
   assert.equal(upgradeTab.buttons,true,'Both legacy upgrade paths must exist');
   assert.deepEqual(upgradeTab.tabs,['box','dex','upgrade']);

  const restored=await evaluate("(()=>{const descriptor=Object.getOwnPropertyDescriptor(G.DB,'save');const original=['#menu-partner-name','#menu-partner-info','#menu-stats'].map(q=>document.querySelector(q)?.textContent);try{Object.defineProperty(G.DB,'save',{value:{partner:6,partnerShiny:false,stats:{runs:50,bestTime:626,bestLevel:35,kills:9684}},writable:true,configurable:true});for(const q of ['#menu-partner-name','#menu-partner-info','#menu-stats'])document.querySelector(q).textContent='';G.PKMSVVMenuCleanQA.restorePartner();return {name:document.querySelector('#menu-partner-name').textContent,info:document.querySelector('#menu-partner-info').textContent,stats:document.querySelector('#menu-stats').textContent,types:document.querySelectorAll('#pkmsvv-home-types .pkmsvv-home-type-chip').length}}finally{Object.defineProperty(G.DB,'save',descriptor);['#menu-partner-name','#menu-partner-info','#menu-stats'].forEach((q,i)=>document.querySelector(q).textContent=original[i]||'');document.querySelector('#pkmsvv-home-types')?.remove()}})()");
  assert.ok(restored.name.length>0);
  assert.match(restored.info,/50/);
  assert.match(restored.info,/10:26/);
  assert.match(restored.stats,/35/);
  assert.match(restored.stats,/9\.684|9,684/);
  assert.ok(restored.types>=1,'restore the Pokémon type badges');
  assert.equal(await evaluate("!!G.PKMSVVQuickRegion"),true,'QuickRegion module must load');
  // Inspect the REAL compiled Tiles engine, not the mock biome dictionary.
  // All nine Gen battlefields (and the Sky bonus) require distinct terrain IDs.
  const exploreMaps=await evaluate("(()=>{const q=G.PKMSVVQuickRegion,ids=Array.from({length:10},(_,i)=>q.targetBiome(i));q.open();const instruction=document.querySelector('#pkmsvv-quick-region .region-heading p')?.textContent||'';q.close();return {seconds:q.SEAL_SECONDS,ids,unique:q.distinctMapBiomes(),kanto:q.targetBiome(0),paldea:q.targetBiome(8),fire:G.Tiles.arenaBiome('fire'),instruction}})()");
  console.log('Actual compiled Explore battlefield IDs:',JSON.stringify(exploreMaps));
  assert.equal(exploreMaps.seconds,900,'15 minutes required to earn each new Seal');
  assert.equal(exploreMaps.unique,true,'actual native engine reused terrain for two Explore regions');
  assert.equal(new Set(exploreMaps.ids.slice(0,9)).size,9,'nine Gen maps must use nine different native biomes');
  assert.equal(exploreMaps.kanto,0,'Kanto remains native beginner terrain');
  assert.equal(exploreMaps.paldea,exploreMaps.fire,'late Paldea receives the Fire biome');
  assert.match(exploreMaps.instruction,/Phút 15|15 min/,'in-game 15-minute instruction is localized and visible');
  assert.match(exploreMaps.instruction,/Boss|boss/,'the player must understand a boss appears at minute 15');
  assert.match(exploreMaps.instruction,/Huy hiệu|Badge/,'the player must understand a Badge requires defeating the boss');
  assert.equal(await evaluate("typeof G.PKMSVVQuickRegion.spawnRegionBoss"),'function',
   'actual browser game must bundle the new Region Boss actor, not just menu text');



  const instantHome=await evaluate("(()=>{const out=[];const saved=Object.getOwnPropertyDescriptor(G.DB,'save'),commit=G.DB.commit,previous=G.Game?.state;const menu=document.querySelector('#scr-menu');try{for(const migrated of [true,false]){const raw={owned:{6:{at:1},25:{at:2}},shiny:{},partner:6,partnerShiny:false,stats:{runs:7},coins:500};const fixture=migrated?G.PKMSVVBox.migrate(raw).save:raw;Object.defineProperty(G.DB,'save',{value:fixture,configurable:true,writable:true});G.DB.commit=()=>true;G.PKMSVVMenuCleanQA.restorePartner();const before=menu.querySelector('#menu-partner-name')?.textContent;G.PKMSVVBoxHubUI.openBox('info');G.PKMSVVBoxHubUI.focus(migrated?'b1-25-n':'b1-25-n');const btn=document.querySelector('#pkmbx-use');const enabled=!!btn&&!btn.disabled;btn?.click();const hero=menu.querySelector('#menu-partner');out.push({migrated,enabled,partner:fixture.partner,shiny:fixture.partnerShiny,portraitKey:hero?.dataset.pkmsvvPortraitKey,name:menu.querySelector('#menu-partner-name')?.textContent,before,overlayOpen:!!document.querySelector('#pkmsvv-pokebox-overlay'),gameUnchanged:G.Game?.state===previous});G.PKMSVVBoxHubUI.closeBox();}return out;}finally{G.PKMSVVBoxHubUI.closeBox();Object.defineProperty(G.DB,'save',saved);G.DB.commit=commit;G.PKMSVVMenuCleanQA.restorePartner();}})()");
  assert.equal(instantHome.length,2,'both migrated and old-save selection must redraw home');
  for(const result of instantHome){
   assert.equal(result.enabled,true,'Select to battle should be clickable for a new fighter');
   assert.equal(result.partner,25,'selected partner changes without launching a match');
   assert.equal(result.portraitKey,'25:false','home sprite must update while PokéBox overlay remains open');
   assert.match(result.name,/Pikachu/i,'home name must update with selected sprite immediately');
   assert.equal(result.overlayOpen,true,'selection should not require returning from gameplay');
   assert.equal(result.gameUnchanged,true,'selecting a Pokémon must not start a match');
  }
  const integratedIcons=await evaluate("(async()=>{const menu=document.getElementById('scr-menu');G.PKMSVVMenuCleanQA?.syncHome?.();const defs=[['pc','#pkmsvv-menu-wiki'],['coop','[data-go=multiplayer]'],['arena','#pkmsvv-champion-entry,[data-go=arena]']];const out=defs.map(([name,selector])=>{const el=menu?.querySelector(selector)||(name==='arena'?[...menu?.querySelector('.menu-right .menu-list')?.children||[]].find(n=>(/arena/i.test(n.getAttribute('data-go')||n.querySelector('[data-go]')?.getAttribute('data-go')||'')||n.textContent?.trim()?.toLowerCase().startsWith('arena'))):null),art=el?.querySelector(':scope > .pkmsvv-new-menu-icon'),style=art?getComputedStyle(art):null;return {name,button:!!el,art:!!art,webp:!!style?.backgroundImage?.includes('pkmsvv-menu-icons.webp')}});const image=new Image;const loaded=await new Promise(resolve=>{image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src='images/pkmsvv-menu-icons.webp';});return {out,loaded,width:image.naturalWidth,height:image.naturalHeight}})()");
  console.log('Native in-game pixel art PC / Co-op / Arena icons:',JSON.stringify(integratedIcons));
  assert.equal(integratedIcons.loaded,true,'3-icon WEBP must exist inside actual compiled game');
  assert.equal(integratedIcons.width,108);
  assert.equal(integratedIcons.height,36);
  for(const icon of integratedIcons.out)
   for(const k of ['button','art','webp'])assert.equal(icon[k],true,icon.name+' should use newly embedded pixel art: '+k);
  const menuIconDomRegression=await evaluate("(()=>{\n const menu=document.querySelector('#scr-menu'),get=(name)=>{\n  if(name==='pc')return menu.querySelector('#pkmsvv-menu-wiki');\n  if(name==='coop')return menu.querySelector('[data-go=\"multiplayer\"],[data-go=\"coop\"],[data-go=\"co-op\"]');\n  return menu.querySelector('#pkmsvv-champion-entry')||menu.querySelector('[data-go=\"arena\"]')||[...menu.querySelector('.menu-right .menu-list')?.children]\n   .find(el=>(/arena/i.test(el.getAttribute('data-go')||el.querySelector('[data-go]')?.getAttribute('data-go')||'')||el.textContent?.trim()?.toLowerCase().startsWith('arena')));\n };\n const types=['pc','coop','arena'];\n const entries=types.map(name=>{\n  const node=get(name);\n  return {name,node,icon:node?.querySelector(':scope > .pkmsvv-new-menu-icon'),\n   action:node?.getAttribute('data-go')||'',tabIndex:node?.tabIndex,\n   label:node?.textContent?.trim()||''};\n });\n const list=menu.querySelector('.menu-right .menu-list');\n const order=list?[...list.children]:[];\n const dexIcon=menu.querySelector('[data-go=\"dex\"] .mi-ico');\n G.PKMSVVMenuCleanQA.syncHome();\n G.PKMSVVMenuCleanQA.syncHome();\n return {\n  counts:menu.querySelectorAll('.pkmsvv-new-menu-icon').length,\n  stableOrder:!list||order.length===[...list.children].length&&order.every((e,i)=>list.children[i]===e),\n  preservedDexIcon:!dexIcon||menu.querySelector('[data-go=\"dex\"] .mi-ico')===dexIcon,\n  icons:entries.map(x=>{\n   const node=get(x.name),art=node?.querySelector(':scope > .pkmsvv-new-menu-icon'),style=art?getComputedStyle(art):null;\n   return {name:x.name,preservedButton:node===x.node,preservedArt:art===x.icon,\n    childCount:node?.querySelectorAll('.pkmsvv-new-menu-icon').length||0,\n    preservedAction:(node?.getAttribute('data-go')||'')===x.action,\n    preservedTabIndex:node?.tabIndex===x.tabIndex,\n    preservedLabel:node?.textContent?.trim()===x.label,validSemanticLabel:({pc:/PC/i,coop:/Co-op/i,arena:/Arena/i}[x.name]).test(node?.textContent||''),\n    hiddenFromScreenReaders:art?.getAttribute('aria-hidden')==='true',\n    pixelated:style?.imageRendering==='pixelated',\n    width:style?.width,height:style?.height};\n  })\n };\n})()");
  assert.equal(menuIconDomRegression.counts,3,'exactly three custom icons after repeated menu renders');
  assert.equal(menuIconDomRegression.stableOrder,true,'repeat sync must not reorder native menu controls');
  assert.equal(menuIconDomRegression.preservedDexIcon,true,'Pokémon native menu art remains unchanged');
  for(const icon of menuIconDomRegression.icons){
   for(const key of ['preservedButton','preservedArt','preservedAction','preservedTabIndex',
    'validSemanticLabel','hiddenFromScreenReaders','pixelated'])
    assert.equal(icon[key],true,'DOM icon '+icon.name+' violated '+key);
   assert.equal(icon.childCount,1,'duplicate menu icon for '+icon.name);
   assert.equal(icon.width,'42px','incorrect native menu icon width');
   assert.equal(icon.height,'42px','incorrect native menu icon height');
  }
  console.log('DOM menu icon rerender/keyboard/semantics QA:',JSON.stringify(menuIconDomRegression));
  const supportSkillQa=await evaluate("(()=>{const save=G.DB?.save; if(!save)return {missingSave:true}; const old=save.pkmsvvSupportBond,ids=[447,173,360,174,440]; try{save.pkmsvvSupportBond={...(old||{}),447:1,173:1,360:1,174:1,440:1};G.PKMSVVSupportCatalog?.open?.();const root=document.querySelector('#pkmsvv-support-catalog'),heading=root?.querySelector('#pkmsvv-support-heading');const result=ids.map(id=>{root?.querySelector('[data-support-dex=\\\"'+id+'\\\"]')?.click();const detail=root?.querySelector('#pkmsvv-support-detail');return {id,skill:detail?.querySelector('.pkmsvv-support-skill-title')?.textContent,desc:detail?.querySelector('.pkmsvv-support-skill-description')?.textContent,canvas:!!detail?.querySelector('canvas')};});return {missingSave:false,result,headingColor:heading&&getComputedStyle(heading).color,heading:heading?.textContent,autoControls:!!G.PKMSVVRuntimeControlsQA,speedButton:!!document.getElementById('pkmsvv-speed-button'),arenaTrophyHidden:getComputedStyle(document.querySelector('#pkmsvv-champion-entry .pkmsvv-champion-menu-icon')).display==='none'};}finally{G.PKMSVVSupportCatalog?.close?.();if(old===undefined)delete save.pkmsvvSupportBond;else save.pkmsvvSupportBond=old;}})()");
  console.log('QA_SUPPORT_SKILLS_AND_GAMEPLAY_CONTROLS='+JSON.stringify(supportSkillQa));
  assert.equal(supportSkillQa.missingSave,false);
  for(const info of supportSkillQa.result){
   assert.ok(info.skill&&info.desc&&info.canvas,'Support '+info.id+' must show its skill and sprite');
  }
  assert.match(supportSkillQa.heading,/Pokémon hỗ trợ|Support Pokémon/);
  assert.notEqual(supportSkillQa.headingColor,'rgb(23, 66, 83)','Support title must be legible gold');
  assert.equal(supportSkillQa.autoControls,true,'QA runtime controls must load in actual compiled browser');
  assert.equal(supportSkillQa.speedButton,true,'1.5x speed button must exist in actual game');
  assert.equal(supportSkillQa.arenaTrophyHidden,true,'new Arena icon replaces old trophy, not duplicates it');
  const liveEvoBrowser=await evaluate("(()=>{\n const evo=G.PKMSVVEvo,mon=G.DEX_BY?.[5],from=G.DEX_BY?.[4];\n if(!evo||!mon||!from)return {loaded:false};\n const pool=G.Moves?.poolFor?.(mon)||[];\n const ids=pool.map(x=>typeof x==='string'?x:x?.id).filter(x=>G.Moves.BY_ID?.[x]);\n if(ids.length<4)return {loaded:true,tooFew:ids.length};\n const old={id:ids[0],lvl:3,cd:5,t:2};\n const pl={mon,dex:5,moves:[old],slots:[[old]],bind:{},pkmEvoSwapAvailable:true,\n  pkmEvoFromMon:from,pkmEvoHistory:[{}],dead:false};\n const state=G.Game?.state;let done=0;\n try{\n  evo.showSkillSwap(pl,()=>done++);\n  const root=document.querySelector('.pkmsvv-evo-skill.pkmsvv-evo-live'),\n   panel=root?.querySelector('.pkmsvv-evo-panel'),\n   cards=root?.querySelector('.pkmsvv-evo-live-cards');\n  const initial=cards?.querySelectorAll('.pkmsvv-evo-live-card').length||0;\n  const rootStyle=root?getComputedStyle(root):null,panelStyle=panel?getComputedStyle(panel):null;\n  const rootPointer=rootStyle?.pointerEvents,panelPointer=panelStyle?.pointerEvents,\n   panelRight=panelStyle?.right;\n  cards?.querySelector('.pkmsvv-evo-live-card')?.click();\n  const replacement=cards?.querySelectorAll('.pkmsvv-evo-live-card').length||0;\n  root?.querySelector('.pkmsvv-evo-skip')?.click();\n  return {loaded:true,tooFew:0,initial,replacement,stage:cards?.dataset.stage,live:!!root,\n   nonBlocking:rootPointer==='none'&&panelPointer==='auto',rootPointer,panelPointer,\n   rightCorner:panelRight!=='auto',gameUnchanged:G.Game?.state===state,\n   done,skippedNoSpend:pl.pkmEvoSwapAvailable};\n }finally{document.querySelectorAll('.pkmsvv-evo-skill').forEach(x=>x.remove())}\n})()");
  console.log('REALTIME_EVOLUTION_CARDS='+JSON.stringify(liveEvoBrowser));
  assert.equal(liveEvoBrowser.loaded,true,'compiled Evolution module must be available');
  assert.equal(liveEvoBrowser.tooFew,0,'evolved species needs enough legal moves');
  assert.ok(liveEvoBrowser.initial>=1,'current moves must be selectable');
  assert.equal(liveEvoBrowser.replacement,3,'exactly three evolved-move replacement cards');
  assert.equal(liveEvoBrowser.stage,'replacement');
  assert.equal(liveEvoBrowser.nonBlocking,true,'live HUD must not absorb movement outside cards');
  assert.equal(liveEvoBrowser.rightCorner,true,'Evolution cards stay in a corner');
  assert.equal(liveEvoBrowser.gameUnchanged,true,'selection must not pause gameplay');
  assert.equal(liveEvoBrowser.done,1,'skip concludes overlay exactly once');
  assert.equal(liveEvoBrowser.skippedNoSpend,true,'skip leaves current skill intact');
  const speedCorner=await evaluate("(()=>{const b=document.getElementById('pkmsvv-speed-button'),c=b?getComputedStyle(b):null;return {found:!!b,position:c?.position,left:c?.left,bottom:c?.bottom,top:c?.top,right:c?.right,canSpeed:typeof G.PKMSVVRuntimeControlsQA?.canSpeed==='function'}})()");
  assert.equal(speedCorner.found,true);
  assert.equal(speedCorner.position,'fixed');
  assert.notEqual(speedCorner.left,'auto');
  assert.notEqual(speedCorner.bottom,'auto');
  assert.equal(speedCorner.canSpeed,true);
  console.log('AI_ONLY_SPEED_BOTTOM_LEFT='+JSON.stringify(speedCorner));
  const prismCardSmoke=await evaluate("(()=>{\n const s=G.DB?.save,shop=G.KecleonUI;\n if(!s||typeof shop?.open!=='function')return {missing:true};\n const old=s.pkmsvvReforgePrisms,oldOwned=s.owned,oldPartner=s.partner;\n try{\n  const dex=Number(Object.keys(G.DEX_BY||{}).find(x=>G.DEX_BY[x]));\n  s.owned={...(oldOwned||{}),[dex]:{at:1}};s.partner=dex;\n  s.pkmsvvReforgePrisms=1;\n  shop.open('bag');\n  const card=document.querySelector('#scr-kecleon #pkmbx-prism-store');\n  const desc=card?.querySelectorAll('.pkmk-product-copy small');\n  const btn=card?.querySelector('.pkmbx-prism-use');\n  const snapshot={\n   missing:false,found:!!card,prismCount:G.PKMSVVBox3?.count?.(s),nativeList:document.querySelector('#pkmk-list')?.textContent?.slice(0,500),nativeHtml:document.querySelector('#pkmk-list')?.innerHTML?.slice(0,600),tabBag:document.querySelector('#pkmk-tab-bag')?.className,hasShopHook:!!G.KecleonUI?.render,profileOwned:Object.keys(s.owned||{}).length,descriptionCount:desc?.length||0,\n   description:desc?.[0]?.textContent||'',\n   useButton:btn?.textContent||'',oldShopButton:!!card?.querySelector('.pkmbx-prism-buy'),\n   cardWidth:card?.getBoundingClientRect().width||0,\n   style:card?getComputedStyle(card).backgroundImage:null\n  };\n  btn?.click();\n  snapshot.rankOpen=!!document.querySelector('#pkmsvv-pokebox-overlay .pkmbx-hub-panel:not([hidden])');\n  snapshot.countUnchanged=s.pkmsvvReforgePrisms===1;\n  return snapshot;\n }finally{\n  G.PKMSVVBoxHubUI?.closeBox?.();G.UI?.hide?.('scr-kecleon');\n  if(old===undefined)delete s.pkmsvvReforgePrisms;else s.pkmsvvReforgePrisms=old;\n  if(oldOwned===undefined)delete s.owned;else s.owned=oldOwned;\n  if(oldPartner===undefined)delete s.partner;else s.partner=oldPartner;\n }\n})()");
  console.log('QA_PRISM_NORMAL_ITEM='+JSON.stringify(prismCardSmoke));
  assert.equal(prismCardSmoke.missing,false,'Kecleon UI must be available in QA browser');
  assert.equal(prismCardSmoke.found,true,'Reforge Prism must be a native inventory item');
  assert.equal(prismCardSmoke.descriptionCount,1,'Prism should have one short description like Mint');
  assert.match(prismCardSmoke.description,/Đổi nhánh Rank|Change Rank branch/);
  assert.match(prismCardSmoke.useButton,/Sử dụng|Use/);
  assert.equal(prismCardSmoke.oldShopButton,false,'Bag must not show another shop-buy action');
  assert.equal(prismCardSmoke.rankOpen,true,'Use must open PokéBox Rank tab');
  assert.equal(prismCardSmoke.countUnchanged,true,'Opening Rank must not consume a Prism');
  const coverMascots=await evaluate("(()=>{const q=G.PKMSVVQuickRegion,ids=[150,249,385,488,646,718,800,890,1024,384];q.open();const covers=[...document.querySelectorAll('#pkmsvv-quick-region-grid .region-art')];const sprites=covers.map(x=>x.querySelector('canvas.region-sprite'));const result={mascots:[...q.mascots],covers:covers.length,spriteCanvases:sprites.filter(Boolean).length,missingDex:ids.filter(id=>!G.DEX_BY?.[id]),missingSpriteMeta:ids.filter(id=>!G.SPRITE_META?.[id]),noSpawnsChanged:!q.active};q.close();return result})()");
  assert.deepEqual(coverMascots.mascots,[150,249,385,488,646,718,800,890,1024,384],
   'each Gen 1–9 has the exact requested mascot, mixed Sky Pillar unchanged');
  assert.equal(coverMascots.covers,10);
  console.log('Explore exact mascot canvas and sprite coverage QA:',JSON.stringify(coverMascots));
  assert.deepEqual(coverMascots.missingDex,[],'mascots must exist in the real game Dex');
  assert.deepEqual(coverMascots.missingSpriteMeta,[],'every chosen legendary must have a real compiled sprite, not just an empty canvas');
  assert.equal(coverMascots.spriteCanvases,10,'every actual cover must render its mascot canvas');
  assert.equal(coverMascots.noSpawnsChanged,true,'only cover art changed, not regional combat');
  const preplay=await evaluate("(()=>{const play=document.querySelector('#scr-menu [data-go=play]');if(!play)return {missingPlay:true};const before=G.Game?.state;play.click();const overlay=document.querySelector('#pkmsvv-quick-region');const out={missingPlay:false,before,after:G.Game?.state,open:!!overlay&&!overlay.hidden,count:overlay?.querySelectorAll('.pkmsvv-quick-region-card').length,available:overlay?.querySelectorAll('.pkmsvv-quick-region-card:not(:disabled)').length,active:!!G.PKMSVVQuickRegion.active};G.PKMSVVQuickRegion.close();return out})()");
  assert.equal(preplay.missingPlay,false,'the native Chơi ngay button must be found');
  assert.equal(preplay.open,true,'native Chơi ngay click must open Region selection');
  assert.equal(preplay.count,10,'Kanto through Sky Pillar must be shown');
  assert.ok(preplay.available>=1,'Kanto must remain playable for fresh saves');
  assert.equal(preplay.active,false,'viewing regions must NOT start combat');
  assert.equal(preplay.after,preplay.before,'the menu click must NOT start a run before selecting Region');
  const nativeHooks=await evaluate("(()=>({gameKeys:Object.keys(G.Game||{}),pickupKeys:Object.keys(G.Pickups||{}),drop:String(G.Pickups?.drop||'').slice(0,1400),dropXp:String(G.Pickups?.dropXp||'').slice(0,1400),rarityKeys:Object.keys(G.Spawner||{}),endFns:Object.fromEntries(Object.entries(G.Game||{}).filter(([k,v])=>typeof v==='function').map(([k])=>[k,true]))}))()");
  console.log('REAL engine hooks for Orb and finishing Region:',JSON.stringify(nativeHooks));
  const combatInspect=await evaluate("(()=>({keys:Object.keys(G.Combat||{}),impls:Object.fromEntries(Object.entries(G.Combat||{}).filter(([,v])=>typeof v==='function').map(([k,v])=>[k,String(v).slice(0,900)])),playerKeys:Object.keys(G.Game?.player||{}).filter(k=>/atk|special|sa|physical|mul/i.test(k))}))()");
  console.log('REAL compiled combat entrypoints:',JSON.stringify(combatInspect));

  const nativeFunctions=await evaluate("(()=>({quit:String(G.Game?.quit||'').slice(0,1700),toUI:String(G.Game?.toUI||'').slice(0,1700),levelOffer:String(G.LevelUp?.offer||'').slice(0,600),endScreenKeys:Object.keys(G.RunUI||{})}))()");
  console.log('REAL victory entrypoints:',JSON.stringify(nativeFunctions));
  const nativeOrbSnippets=await evaluate("(async()=>{const src=await fetch('js/app.min.js').then(r=>r.text());const needle='G.Orbs.roll';let at=0,out=[];while((at=src.indexOf(needle,at))>=0&&out.length<7){out.push(src.slice(Math.max(0,at-320),Math.min(src.length,at+180)));at+=needle.length;}return {count:out.length,out}})()");
  console.log('REAL compiled Orb probability fragments:',JSON.stringify(nativeOrbSnippets));
  const rateSource=nativeOrbSnippets.out.join(' ');
  assert.ok(rateSource.includes('Math.random()<.02'),'boss Orb chance in real compiled game must be 2%');
  assert.equal((rateSource.match(/Math\.random\(\)<\.02/g)||[]).length>=2,true,'both native Orb rolls must be 2%');
  assert.ok(rateSource.includes('*150&&Math.random'),'Orb cap cannot run out too early after Fusion');
  const legendaryPacing=await evaluate("(()=>({checkpoints:G.PKMSVV14?.checkpoints?.map(c=>({at:c.at,hp:c.hp,rarity:c.bossRarity,legendChance:c.legendChance})),judgment:typeof G.Judgment?.update==='function'}))()");
  console.log('Real compiled Legendary milestones:',JSON.stringify(legendaryPacing));
  assert.deepEqual(legendaryPacing.checkpoints,[{at:900,hp:44000,rarity:4,legendChance:.30}],
   'only the 15m Legendary Trial; one separate Judgment boss at 30m');
  assert.equal(legendaryPacing.judgment,true);
  const endFlow=await evaluate("(async()=>{const js=await fetch('js/app.min.js').then(r=>r.text()),from=js.indexOf('G.Game='),game=js.slice(from,from+30000),keys=['showOver(','.showOver(', 'quit:', 'toUI:', 'finish:', 'end:', 'gameOver'];return {from,occurrences:keys.map(k=>{let i=game.indexOf(k);return {key:k,index:i,near:i<0?'':game.slice(Math.max(0,i-230),i+360)}}),runui:js.includes('G.RunUI.showOver')}})()");
  console.log('REAL compiled game-end anchors:',JSON.stringify(endFlow));


  // Exercise the REAL compiled Gacha roster + Region patch under Chromium,
  // not only the isolated Node harness which uses simplified Enemy mocks.
  const epicCatalog=await evaluate("(()=>{const q=G.PKMSVVQuickRegion;return Array.from({length:9},(_,i)=>({region:i+1,epic:G.DEX.filter(p=>p.rarity===4&&!p.leg&&G.SPRITE_META?.[p.dex]&&q.isAllowed(p.dex,i)).length,legend:G.DEX.filter(p=>p.leg&&G.SPRITE_META?.[p.dex]&&q.isAllowed(p.dex,i)).length}))})()");
  console.log('Actual per-Gen 15-minute Epic/Legend availability:',JSON.stringify(epicCatalog));
  assert.ok(epicCatalog.every(p=>p.epic>0),'every Gen needs a real sprite-backed Epic for 70% boss roll');
  const realKanto=await evaluate("(()=>{const q=G.PKMSVVQuickRegion;const all=G.DEX.filter(p=>p.gen===1&&G.SPRITE_META?.[p.dex]);const foreign=G.DEX.find(p=>p.gen===2&&G.SPRITE_META?.[p.dex]);if(!foreign||!all.length)return {catalogue:false};let entered=false;try{entered=q.beginRun(0);const source={dex:foreign.dex,hp:952,spd:98,boss:true};const mapped=q.regionEnemyDefinition(source,0);const badge=document.getElementById('pkmsvv-region-gen-badge');const badgeText=badge?.textContent;const badgeVisible=!!badge&&!badge.hidden;const phantom={dex:foreign.dex,def:source,hp:952,maxHp:952,boss:true};const corrected=q.enforceLiveEnemy(phantom,0);const target=all.some(p=>p.dex===phantom.dex);return {catalogue:true,entered,active:q.active,selectedRegion:q.selectedRegion,mappedInKanto:all.some(p=>p.dex===mapped.dex),corrected,target,keptHp:phantom.hp===952,keptBoss:phantom.boss,sourceUnchanged:source.dex===foreign.dex,badgeText,badgeVisible,genChecks:[q.nationalGen(1),q.nationalGen(151),q.nationalGen(152),q.nationalGen(251),q.nationalGen(252),q.nationalGen(1025)]};}finally{if(entered)q.endRun()}})()");
  assert.equal(realKanto.catalogue,true,'real Gacha must include Kanto and Johto candidates');
  for(const key of ['entered','active','mappedInKanto','corrected','target','keptHp','keptBoss','sourceUnchanged'])
   assert.equal(realKanto[key],true,'compiled Region / Gacha QA: '+key+' '+JSON.stringify(realKanto));
  assert.equal(realKanto.selectedRegion,0,'Kanto is exactly Gen 1 in compiled game');
  // Real compiled engine: spawn the 15-minute Region Boss in a disposable
  // in-memory solo fixture; no user/localStorage save can be modified.
  const badgeBoss=await evaluate("(()=>{const q=G.PKMSVVQuickRegion,game=G.Game,db=G.DB;const saved={dbSave:Object.getOwnPropertyDescriptor(db,'save'),dbCommit:Object.getOwnPropertyDescriptor(db,'commit'),player:Object.getOwnPropertyDescriptor(game,'player'),state:Object.getOwnPropertyDescriptor(game,'state'),st:Object.getOwnPropertyDescriptor(game,'st')};const ephemeral={owned:{150:{at:1}},partner:150,arenas:{pkmChampion:{seals:{}}},pkmsvvExploreSeals:{}};const set=(obj,key,value)=>Object.defineProperty(obj,key,{value,configurable:true,writable:true,enumerable:true});let entered=false;try{set(db,'save',ephemeral);set(db,'commit',()=>true);set(game,'player',{x:1600,y:1600,maxHp:350,hp:350,dead:false});set(game,'state','playing');set(game,'st',{time:0});entered=q.beginRun(0);if(!entered)return {entered:false};q.updateRegionBoss();game.st.time=899;q.updateRegionBoss();const early=!!q.regionalBoss;game.st.time=900;q.updateRegionBoss();const boss=q.regionalBoss;if(!boss)return {entered,early,spawned:false};const pending=!q.unlocked(1),dex=boss.dex,realBoss=!!boss.boss,hp=boss.hp;boss.dead=true;boss.hp=0;const claimed=q.tryEarnSeal();const badge=ephemeral.pkmsvvExploreSeals.Kanto===true,continued=game.state==='playing';game.st.time=1800;q.updateRegionBoss();const last=q.finalBoss;return {entered,early,spawned:true,dex,rarity:G.DEX_BY?.[dex]?.rarity,realBoss,hp,pending,claimed,badge,unlocked:q.unlocked(1),continued,finalSpawned:!!last,finalDex:last?.dex,finalHP:last?.hp};}finally{if(entered)q.endRun();G.EnemyMgr?.clear?.();for(const [obj,key,descriptor] of [[db,'save',saved.dbSave],[db,'commit',saved.dbCommit],[game,'player',saved.player],[game,'state',saved.state],[game,'st',saved.st]]){if(descriptor)Object.defineProperty(obj,key,descriptor);else delete obj[key];}}})()");
  console.log('Real compiled 15m Mewtwo Region Boss and Badge QA:',JSON.stringify(badgeBoss));
  for(const key of ['entered','spawned','realBoss','pending','claimed','badge','unlocked'])
   assert.equal(badgeBoss[key],true,'compiled Region Boss/Badge: '+key+' '+JSON.stringify(badgeBoss));
  assert.equal(badgeBoss.early,false,'cannot spawn Region Boss at 14:59');
  assert.ok(badgeBoss.rarity===4||badgeBoss.rarity===5,'15m boss is epic or legendary');
  assert.equal(badgeBoss.continued,true,'15m Badge must not end the run');
  assert.equal(badgeBoss.finalSpawned,true,'30m creates the separate final boss');
  assert.equal(badgeBoss.finalDex,150,'30m boss is guaranteed Gen1 Mewtwo');
  assert.ok(badgeBoss.finalHP>badgeBoss.hp,'30m legendary should have more HP');
  assert.ok(badgeBoss.hp>1000,'real Region Boss has combat HP, not a cosmetic popup');
  const genAudit=await evaluate("(()=>{const mismatch=G.DEX.filter(p=>p&&G.PKMSVVQuickRegion.nationalGen(p.dex)!==Number(p.gen));return {count:mismatch.length,examples:mismatch.slice(0,12).map(p=>({dex:p.dex,name:p.name,gen:p.gen,expected:G.PKMSVVQuickRegion.nationalGen(p.dex)}))}})()");
  assert.equal(genAudit.count,0,'Gacha internal Gen tags must agree with the official National Pokédex: '+JSON.stringify(genAudit));
  assert.equal(realKanto.badgeVisible,false,'Gen debug badge should not appear in combat');
  const graduated=await evaluate("(()=>{const q=G.PKMSVVQuickRegion;const beginner=q.progressivePool(0,0),late=q.progressivePool(0,780);return {beginnerCount:beginner.length,lateCount:late.length,earlyGyarados:beginner.includes(130),earlyKangaskhan:beginner.includes(115),earlyMewtwo:beginner.includes(150),earlyBase:beginner.some(d=>q.pokemonStrength(d).total<=355),evolutionData:!!G.PKMSVV_EVOLUTION_DATA?.rules?.length}})()");
  console.log('Progressive Kanto roster QA:',JSON.stringify(graduated));
  assert.ok(graduated.beginnerCount>0,'opening Kanto wave must have weak Pokémon');
  assert.equal(graduated.earlyGyarados,false,'opening Kanto must NOT include Gyarados');
  assert.equal(graduated.earlyKangaskhan,false,'opening Kanto must NOT include Kangaskhan');
  assert.equal(graduated.earlyMewtwo,false,'opening Kanto must NOT include Mewtwo');
  assert.equal(graduated.earlyBase,true,'opening Kanto should include low-base-stat Pokémon');
  assert.ok(graduated.lateCount>=graduated.beginnerCount,'later waves unlock more Pokémon');
  assert.deepEqual(realKanto.genChecks,[1,1,2,2,3,9],
   'the compiled game must use the official National Dex Gen boundaries');


  const inputQA=await evaluate("(()=>{\n G.PKMSVVWiki?.close?.();const nav=G.PKMSVVModalNavQA;\n if(!nav)return {loaded:false};G.PKMSVVBoxHubUI.openBox();\n const root=nav.active(),team=document.querySelector('.pkmbx-team-slot:not(.active)')||document.querySelector('.pkmbx-team-slot');\n const white=team?getComputedStyle(team).backgroundColor:'';\n const focused=nav.first(root),padInstalled=!!G.Pad?.poll?._pkmsvvModalQA;\n const ev=new KeyboardEvent('keydown',{key:'ArrowDown',code:'ArrowDown',bubbles:true,cancelable:true});\n document.dispatchEvent(ev);\n const keyboard=!!document.activeElement?.classList?.contains('pkmsvv-nav-focus');\n const descriptor=Object.getOwnPropertyDescriptor(navigator,'getGamepads');\n const gamepad={connected:true,axes:[0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};\n let padFocus=false,padBack=false;\n try{\n  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[gamepad]});\n  nav.installPad();gamepad.buttons[13].pressed=true;G.Pad.poll(.016);\n  padFocus=!!document.activeElement?.classList?.contains('pkmsvv-nav-focus');\n  gamepad.buttons[13].pressed=false;G.Pad.poll(.016);\n  gamepad.buttons[1].pressed=true;G.Pad.poll(.016);\n  padBack=!document.querySelector('#pkmsvv-pokebox-overlay');\n }finally{\n  gamepad.buttons[1].pressed=false;\n  if(descriptor)Object.defineProperty(navigator,'getGamepads',descriptor);\n  else delete navigator.getGamepads;\n  G.PKMSVVBoxHubUI.closeBox();\n }\n const region=G.PKMSVVQuickRegion.open(),regionRoot=nav.active();\n const regionFocus=region&&nav.first(regionRoot);\n const escEvent=new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true});document.dispatchEvent(escEvent);\n return {loaded:true,white,focused,keyboard,padInstalled,padFocus,padBack,\n  region,regionFocus,regionClosed:document.querySelector('#pkmsvv-quick-region')?.hidden,escapePrevented:escEvent.defaultPrevented,activeAfterEscape:nav.active()?.id,focusedAfterEscape:document.activeElement?.id};\n})()");
  assert.equal(inputQA.loaded,true,'QA navigation is bundled');
  assert.equal(inputQA.white,'rgb(247, 250, 246)','six Team tiles have white backgrounds');
  for(const k of ['focused','keyboard','padInstalled','padFocus','padBack','region','regionFocus','regionClosed'])
   assert.equal(inputQA[k],true,'Keyboard/controller modal navigation: '+k+' | '+JSON.stringify(inputQA));
  const itemTwo=await evaluate("(()=>{\n const scr=document.querySelector('#scr-item'),cards=document.querySelector('#item-cards');\n if(!scr||!cards)return {present:false};\n const hidden=scr.hidden,klass=scr.className,style=scr.getAttribute('style'),cardsClass=cards.className;\n const picked=[];\n const columns=document.createElement('div');columns.className='pkmsvv-held-columns';\n for(let i=0;i<2;i++){\n  const btn=document.createElement('button');btn.type='button';btn.className='pkmsvv-held-comparison pkmsvv-held-action '+(i===0?'is-old':'is-new');\n  btn.textContent=String(i+1);btn.onclick=()=>picked.push(i);columns.append(btn);\n }\n try{\n  scr.hidden=false;scr.classList.remove('hidden');scr.style.display='block';scr.style.zIndex='25000';\n  cards.classList.add('pkmsvv-held-choices');cards.append(columns);\n  document.dispatchEvent(new KeyboardEvent('keydown',{key:'1',code:'Digit1',bubbles:true,cancelable:true}));\n  document.dispatchEvent(new KeyboardEvent('keydown',{key:'2',code:'Numpad2',bubbles:true,cancelable:true}));\n  return {present:true,picked,active:G.PKMSVVModalNavQA.active()?.id};\n }finally{\n  columns.remove();scr.hidden=hidden;scr.className=klass;cards.className=cardsClass;\n  if(style===null)scr.removeAttribute('style');else scr.setAttribute('style',style);\n }\n})()");
  assert.equal(itemTwo.present,true,'real game has item-choice UI');
  assert.equal(itemTwo.active,'scr-item','item choice takes focus over underlying game');
  assert.deepEqual(itemTwo.picked,[0,1],'Both keyboard shortcuts select the two item cards');
  // User's large collection: inspect browser response times without changing
  // any persistent profile or requiring high-end desktop hardware.
  const largeBoxTiming=await evaluate(`(()=>{
   const descriptor=Object.getOwnPropertyDescriptor(G.DB,'save'),priorCommit=G.DB.commit;
   const species=Object.keys(G.DEX_BY||{}).map(Number).filter(n=>n>=1&&n<=1025&&G.DEX_BY[n]).slice(0,966);
   const owned=Object.fromEntries(species.map(n=>[n,{at:1}]));
   const fixture=G.PKMSVVBox.migrate({owned,shiny:{},partner:species[0],partnerShiny:false,coins:200}).save;
   let commits=0;
   try{
    Object.defineProperty(G.DB,'save',{value:fixture,configurable:true,writable:true});
    G.DB.commit=()=>{commits++;return true;};
    const a=performance.now();G.PKMSVVBoxHubUI.openBox('info');const openMs=performance.now()-a;
    const grid=document.querySelector('#pkmbx-grid'),first=grid.firstElementChild;
    const chosen='b1-'+(species[18]||species[0])+'-n';
    const b=performance.now();G.PKMSVVBoxHubUI.focus(chosen);
    const focusMs=performance.now()-b;
    return {species:species.length,openMs,focusMs,keptGrid:first===grid.firstElementChild,commits,
      selected:G.PKMSVVBoxHubUI.focusedId()===chosen};
   }finally{
    G.PKMSVVBoxHubUI.closeBox();
    Object.defineProperty(G.DB,'save',descriptor);G.DB.commit=priorCommit;
   }
  })()`);
  console.log('QA_LARGE_POKEBOX_TIMING='+JSON.stringify(largeBoxTiming));
  assert.ok(largeBoxTiming.species>=900,'large Box fixture must exercise the long collection');
  assert.equal(largeBoxTiming.commits,0,'viewing and focusing must not save');
  assert.equal(largeBoxTiming.keptGrid,true,'focus must not rebuild large Box');
  assert.equal(largeBoxTiming.selected,true,'focus still selects exact Pokémon');
  assert.ok(largeBoxTiming.openMs<2000&&largeBoxTiming.focusMs<200,
   'large Box should not freeze browser; '+JSON.stringify(largeBoxTiming));

  const evolutionNav=await evaluate(`(()=>{
   const nav=G.PKMSVVModalNavQA;
   const modal=document.createElement('div');modal.className='scr pkmsvv-evo';
   modal.style.cssText='position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.3)';
   const choices=document.createElement('div');choices.className='pkmsvv-evo-panel';
   choices.style.cssText='position:absolute;top:20%;left:30%';
   const picked=[];
   for(let i=0;i<2;i++){
    const b=document.createElement('button');b.type='button';b.className='pkmsvv-evo-option';
    b.textContent='Evolution '+i;b.onclick=()=>picked.push(i);choices.append(b);
   }
   const cancel=document.createElement('button');cancel.className='pkmsvv-evo-skip';
   cancel.textContent='Keep';cancel.onclick=()=>picked.push(-1);choices.append(cancel);modal.append(choices);
   document.body.append(modal);
   try{
    const active=nav.active()===modal;
    const first=nav.first(modal)&&document.activeElement===choices.children[0];
    nav.move('down');const second=document.activeElement===choices.children[1];
    const event=new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,cancelable:true});
    document.dispatchEvent(event);
    return {active,first,second,picked};
   }finally{modal.remove();}
  })()`);
  assert.equal(evolutionNav.active,true,'evolution must own modal focus');
  assert.equal(evolutionNav.first,true,'evolution must focus first unlocked route');
  assert.equal(evolutionNav.second,true,'D-pad navigation must reach second route');
  assert.deepEqual(evolutionNav.picked,[1],'confirm activates focused evolution');

  console.log('PASS Stage 4 real browser QA:',JSON.stringify({...state,rank5Hp:five,otherExceptions:errors.length}));
 }finally{
  try{ws?.close()}catch(_){}
  child.kill('SIGKILL');srv.close();
  try{fs.rmSync(data,{recursive:true,force:true,maxRetries:5,retryDelay:250})}catch(_){}
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
