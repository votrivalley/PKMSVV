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
  const five=await evaluate('G.PKMSVVBox2.formatRank(5).hp');
  assert.equal(await evaluate('G.PKMSVVBox3.PRICE'),6500);
  assert.equal(await evaluate('G.PKMSVVBox3.PITY'),180);
  assert.equal(await evaluate('G.PKMSVVBox3.RATES.boss'),0.08);
  assert.equal(await evaluate('G.PKMSVVBox4.HIT_PROC'),0.16);
  assert.equal(await evaluate('G.PKMSVVBox4.HYBRID_MAX'),6);
  assert.equal(five,30);
  const pureDex=await evaluate("(()=>{G.PKMSVVBoxHubUI.openDex();return ({overlay:!!document.querySelector('#pkmbx-dex-overlay'),search:!!document.querySelector('#pkmbx-dex-search'),hasEvolutionPane:!!document.querySelector('#pkmbx-dex-details'),itemActions:!!document.querySelector('#pkmbx-dex-overlay [data-hub-tm],#pkmbx-dex-overlay [data-pkmbx-use]'),cards:document.querySelectorAll('#pkmbx-dex-list button').length,insidePC:document.querySelector('#pkmsvv-pokebox-overlay')?.contains(document.querySelector('#pkmbx-dex-overlay')),tabs:[...document.querySelectorAll('#pkmbx-dex-overlay [data-pc-tab]')].map(b=>b.dataset.pcTab),pcHubHidden:document.querySelector('.pkmbx-hub-panel')?.hidden})})()");
  assert.equal(pureDex.overlay,true);
  assert.equal(pureDex.search,true);
  assert.equal(pureDex.hasEvolutionPane,true);
  assert.equal(pureDex.insidePC,true,'Pokédex must be inside in-game PC');
  assert.deepEqual(pureDex.tabs,['box','dex','upgrade'],'Pokémon tabs must be Box → Dex → Upgrades');
  assert.equal(pureDex.pcHubHidden,true,'PokéBox tab hidden while Pokédex is active');
  assert.equal(pureDex.itemActions,false,'Pokédex must remain read-only');
  assert.ok(pureDex.cards>0,'Pokédex must list species');
  const hasEvolution=await evaluate("!!(G.PKMSVV_EVOLUTION_DATA?.rules||[]).some(r=>r.from===1&&r.to===2)");
  assert.equal(hasEvolution,true,'Pokédex must have evolution condition data for Bulbasaur → Ivysaur');
  assert.equal(await evaluate("(()=>{G.PKMSVVBoxHubUI.closeDex();return !!document.querySelector('#pkmbx-dex-overlay')})()"),false);
  const hubScreen=await evaluate("(()=>{const originalDesc=Object.getOwnPropertyDescriptor(G.DB,'save');try{Object.defineProperty(G.DB,'save',{value:G.PKMSVVBox.migrate({owned:{6:{at:1},25:{at:2}},shiny:{},partner:6,partnerShiny:false,created:1,bag:{mint:1,cap:1,caph:1},tms:{'shadow-ball':1},ptm:{6:[]},coins:1000}).save,configurable:true,writable:true});G.PKMSVVBoxHubUI.openBox('items');return {valid:!!G.PKMSVVBoxHub.valid(G.DB.save),boxCount:G.DB.save?.pkmsvvBox?.length||0,status:document.querySelector('#pkmbx-status')?.textContent,saveWritable:!!Object.getOwnPropertyDescriptor(G.DB,'save')?.writable,overlay:!!document.querySelector('#pkmsvv-pokebox-overlay'),teamSlots:document.querySelectorAll('.pkmbx-team-slot').length,cards:document.querySelectorAll('.pkmbx-hub-slot').length,animatedHero:!!document.querySelector('#pkmbx-hero'),natureSelect:!!document.querySelector('#pkmbx-mint-select'),abilityButtons:document.querySelectorAll('[data-hub-ability]').length,rankTab:!!document.querySelector('[data-box-tab=rank]'),readOnlyDexHidden:!document.querySelector('#pkmbx-dex-overlay')};}finally{G.PKMSVVBoxHubUI.closeBox();Object.defineProperty(G.DB,'save',originalDesc);}})()");
  console.log('QA Hub fixture:',JSON.stringify(hubScreen));
  assert.equal(hubScreen.overlay,true);
  assert.equal(hubScreen.teamSlots,6);
  assert.ok(hubScreen.cards>=2);
  assert.equal(hubScreen.animatedHero,true);
  assert.equal(hubScreen.natureSelect,true);
  assert.ok(hubScreen.abilityButtons>=1);
  assert.equal(hubScreen.rankTab,true);
  assert.equal(hubScreen.readOnlyDexHidden,true);
  const menuState=await evaluate("(()=>{const m=document.querySelector('#scr-menu');const news=m.querySelector('#btn-news');const color=getComputedStyle(news).color;const season=G.PKMSVVSeason?.nowActive?.();const bar=m.querySelector('.pkmsvv-save-banner');const pokemon=m.querySelector('[data-go=dex]');const pc=m.querySelector('#pkmsvv-menu-wiki');const nav=[...m.querySelector('.menu-right .menu-list')?.children||[]];const four=nav.map(n=>{const go=n.getAttribute('data-go')||n.querySelector('[data-go]')?.getAttribute('data-go')||'';const label=(n.querySelector('.pkmsvv-menu-label,.menu-label,strong')?.textContent||n.textContent||'').trim();if(go==='dex'||/^Pokémon\\b/i.test(label))return 'Pokémon';if(n.id==='pkmsvv-menu-wiki'||label==='PC')return 'PC';if(/multiplayer|coop|co-op/i.test(go)||/^Co-op\\b/i.test(label))return 'Co-op';if(/arena/i.test(go)||label==='Arena')return 'Arena';return null;}).filter(Boolean);return {navDebug:nav.map(n=>({id:n.id,go:n.getAttribute('data-go'),text:n.textContent?.trim().slice(0,95),label:n.querySelector('.pkmsvv-menu-label,.menu-label,strong')?.textContent?.trim()})),nativePC:!!pc,pcButtons:[...m.querySelectorAll('.menu-right button')].filter(b=>b.querySelector('.pkmsvv-menu-label')?.textContent==='PC').length,duplicate:!!pokemon,outsideUpgrade:!!m.querySelector('[data-go=upgrades]'),banner:bar?.textContent,bannerProtected:bar?.getAttribute('translate')==='no',pokemonDesc:pokemon?.querySelector('small')?.textContent,pcDesc:pc?.querySelector('small')?.textContent,four,saveBanners:m.querySelectorAll('.pkmsvv-save-banner').length,seasonBanners:m.querySelectorAll('.pkmsvv-season-banner').length,event:m.querySelector('.pkmsvv-v15-event span')?.textContent,seasonActive:!!season,newsColor:color,newsEnabled:!news?.disabled,menuClean:!!G.PKMSVVMenuCleanQA}})()");
  assert.equal(menuState.menuClean,true);
  assert.equal(menuState.nativePC,true,'keep original Support/Mega/Berry PC');
  assert.equal(menuState.pcButtons,1,'main menu must contain only ONE PC');
  assert.equal(menuState.duplicate,true,'keep the home Pokémon launcher');
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
  const preplay=await evaluate("(()=>{const play=document.querySelector('#scr-menu [data-go=play]');if(!play)return {missingPlay:true};const before=G.Game?.state;play.click();const overlay=document.querySelector('#pkmsvv-quick-region');const out={missingPlay:false,before,after:G.Game?.state,open:!!overlay&&!overlay.hidden,count:overlay?.querySelectorAll('.pkmsvv-quick-region-card').length,available:overlay?.querySelectorAll('.pkmsvv-quick-region-card:not(:disabled)').length,active:!!G.PKMSVVQuickRegion.active};G.PKMSVVQuickRegion.close();return out})()");
  assert.equal(preplay.missingPlay,false,'the native Chơi ngay button must be found');
  assert.equal(preplay.open,true,'native Chơi ngay click must open Region selection');
  assert.equal(preplay.count,10,'Kanto through Sky Pillar must be shown');
  assert.ok(preplay.available>=1,'Kanto must remain playable for fresh saves');
  assert.equal(preplay.active,false,'viewing regions must NOT start combat');
  assert.equal(preplay.after,preplay.before,'the menu click must NOT start a run before selecting Region');


  const inputQA=await evaluate("(()=>{\n G.PKMSVVWiki?.close?.();const nav=G.PKMSVVModalNavQA;\n if(!nav)return {loaded:false};G.PKMSVVBoxHubUI.openBox();\n const root=nav.active(),team=document.querySelector('.pkmbx-team-slot:not(.active)')||document.querySelector('.pkmbx-team-slot');\n const white=team?getComputedStyle(team).backgroundColor:'';\n const focused=nav.first(root),padInstalled=!!G.Pad?.poll?._pkmsvvModalQA;\n const ev=new KeyboardEvent('keydown',{key:'ArrowDown',code:'ArrowDown',bubbles:true,cancelable:true});\n document.dispatchEvent(ev);\n const keyboard=!!document.activeElement?.classList?.contains('pkmsvv-nav-focus');\n const descriptor=Object.getOwnPropertyDescriptor(navigator,'getGamepads');\n const gamepad={connected:true,axes:[0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};\n let padFocus=false,padBack=false;\n try{\n  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[gamepad]});\n  nav.installPad();gamepad.buttons[13].pressed=true;G.Pad.poll(.016);\n  padFocus=!!document.activeElement?.classList?.contains('pkmsvv-nav-focus');\n  gamepad.buttons[13].pressed=false;G.Pad.poll(.016);\n  gamepad.buttons[1].pressed=true;G.Pad.poll(.016);\n  padBack=!document.querySelector('#pkmsvv-pokebox-overlay');\n }finally{\n  gamepad.buttons[1].pressed=false;\n  if(descriptor)Object.defineProperty(navigator,'getGamepads',descriptor);\n  else delete navigator.getGamepads;\n  G.PKMSVVBoxHubUI.closeBox();\n }\n const region=G.PKMSVVQuickRegion.open(),regionRoot=nav.active();\n const regionFocus=region&&nav.first(regionRoot);\n document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));\n return {loaded:true,white,focused,keyboard,padInstalled,padFocus,padBack,\n  region,regionFocus,regionClosed:document.querySelector('#pkmsvv-quick-region')?.hidden};\n})()");
  assert.equal(inputQA.loaded,true,'QA navigation is bundled');
  assert.equal(inputQA.white,'rgb(247, 250, 246)','six Team tiles have white backgrounds');
  for(const k of ['focused','keyboard','padInstalled','padFocus','padBack','region','regionFocus','regionClosed'])
   assert.equal(inputQA[k],true,'Keyboard/controller modal navigation: '+k);
  console.log('PASS Stage 4 real browser QA:',JSON.stringify({...state,rank5Hp:five,otherExceptions:errors.length}));
 }finally{
  try{ws?.close()}catch(_){}
  child.kill('SIGKILL');srv.close();
  try{fs.rmSync(data,{recursive:true,force:true,maxRetries:5,retryDelay:250})}catch(_){}
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
