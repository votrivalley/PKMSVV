'use strict';
/* Promote the Chromium-tested Web QA snapshot to the separately staged
 * public Pokémon Chuyển Sinh 2.0 website, without rebuilding the game or
 * modifying any player's save. Source artifact: Actions run 42520192007,
 * head 81a1101a948be0fb2944ce302c8781eace1f21fa.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {patchFile:patchStoryFile}=require('./patch-v20-story-bundle.cjs');
const {patchFile:patchItemsFile}=require('./patch-v20-items-bundle.cjs');
const {patchFile:patchPickupFile}=require('./patch-v20-pickup-drops.cjs');
const {patchFile:patchBerryFile}=require('./patch-v20-berry-runtime.cjs');
const root=path.resolve(__dirname,'..');
const from=path.join(root,'dist/pokebox-stage4-qa');
const to=path.join(root,'dist/cloudflare-v20-release');
const EXPECTED_SHA='81a1101a948be0fb2944ce302c8781eace1f21fa';
const assert=(ok,msg)=>{if(!ok)throw Error('2.0 release blocked: '+msg);};
const read=rel=>fs.readFileSync(path.join(to,rel),'utf8');
const file=rel=>fs.statSync(path.join(to,rel)).size>0;
assert(fs.existsSync(path.join(from,'POKEBOX-STAGE1-QA.txt')),
 'input must be the original isolated QA artifact, not an unknown website');
assert(fs.existsSync(path.join(from,'game/index.html'))&&fs.existsSync(path.join(from,'ai/game/index.html')),
 'both public game routes must exist');
fs.rmSync(to,{recursive:true,force:true});fs.cpSync(from,to,{recursive:true});
// Remove the QA-only deployment warning, leaving all tested runtime assets intact.
fs.rmSync(path.join(to,'POKEBOX-STAGE1-QA.txt'),{force:true});
for(const prefix of ['game','ai/game']){
 let html=read(prefix+'/index.html');
 for(const name of ['pkmsvv-changelog-v20-qa.js','pkmsvv-v20-ui-qa.js','pkmsvv-box-stage1.js','pkmsvv-box-stage2.js','pkmsvv-box-stage3.js','pkmsvv-box-stage4.js','pkmsvv-box-hub-ui.js','pkmsvv-dex-defeats-qa.js','pkmsvv-runtime-controls-qa.js']){
  assert(file(prefix+'/js/ui/'+name),'missing '+prefix+'/'+name);
  assert(html.includes(name),'2.0 script not injected in '+prefix+': '+name);
 }
 for(const name of ['pkmsvv-v20-ui-qa.css','pkmsvv-box-hub.css','pkmsvv-box-stage3.css']){
  assert(file(prefix+'/css/'+name),'missing stylesheet '+prefix+'/'+name);
  assert(html.includes(name),'2.0 stylesheet not injected: '+prefix+'/'+name);
 }
 assert(file(prefix+'/images/pkmsvv-menu-icons.webp'),'missing actual menu artwork '+prefix);
 assert(file(prefix+'/js/app.min.js'),'missing game engine '+prefix);
 const notes=read(prefix+'/js/ui/pkmsvv-changelog-v20-qa.js');
 assert(notes.includes('Pokémon Chuyển Sinh 2.0'),'unapproved changelog '+prefix);
 assert(notes.includes('2026-11-09'),'wrong release note date '+prefix);
 const shopBundle=read(prefix+'/js/app.min.js');
 assert(shopBundle.includes('unavailableInShop'),'hidden capsule restriction missing from compiled '+prefix);
 assert(shopBundle.includes('dropFromEnemy'),'2.0 enemy item drops not compiled in '+prefix);
}
// Copy the reviewed mobile two-column CSS into BOTH promoted routes.
// The pinned QA artifact is immutable; without this step source CSS hotfixes
// would never reach the public game despite a successful release workflow.
const mobileCss=fs.readFileSync(path.join(root,'src/pkmsvv-v20-ui-qa.css'),'utf8');
assert(mobileCss.includes('PKMSVV_COLLECTION_FIRST_V22'),'collection-first mobile layout patch missing');
assert(mobileCss.includes('PKMSVV_POKEMON_HEADER_V24'),'one-row Pokémon header patch missing');
for(const prefix of ['game','ai/game']){
 let html=read(prefix+'/index.html');
 fs.writeFileSync(path.join(to,prefix+'/css/pkmsvv-v20-ui-qa.css'),mobileCss);
 assert(read(prefix+'/css/pkmsvv-v20-ui-qa.css').includes('PKMSVV_COLLECTION_FIRST_V22'),
  'stale mobile CSS in '+prefix);
 // Pinned source artifact is immutable; promote VERIFIED source-only JS fixes
 // into BOTH actual game routes (the app.min.js engine is unchanged).
 for(const name of ['pkmsvv-changelog-v20-qa.js','pkmsvv-box-hub-ui.js',
  'pkmsvv-dex-defeats-qa.js','pkmsvv-runtime-controls-qa.js',
  'pkmsvv-quick-region.js','pkmsvv-pc-menu-clean-qa.js','pkmsvv-fusion-evolved.js',
  'pkmsvv-box-hub.js','pkmsvv-recruitment-qa.js',
  'pkmsvv-modal-navigation-qa.js']){
  const fresh=fs.readFileSync(path.join(root,'src',name),'utf8');
  assert(fresh.length>100,'empty promoted script: '+name);
  fs.writeFileSync(path.join(to,prefix+'/js/ui/'+name),fresh);
 }
 assert(read(prefix+'/js/ui/pkmsvv-box-hub-ui.js').includes('pkmbx-dex-discovered'),
  'new discovered button missing from '+prefix);
 assert(read(prefix+'/js/ui/pkmsvv-dex-defeats-qa.js').includes('markEvolved'),
  'evolution unlock missing from '+prefix);
 const hordePerfName='pkmsvv-horde-performance.js';
 fs.writeFileSync(path.join(to,prefix+'/js/ui/'+hordePerfName),
  fs.readFileSync(path.join(root,'src/'+hordePerfName),'utf8'));
 if(!html.includes(hordePerfName))
  html=html.replace('</body>','<script defer src="js/ui/'+hordePerfName+'"></script>\n</body>');
 assert(html.includes(hordePerfName),'missing native non-Fusion FX guard in '+prefix);
 assert(read(prefix+'/js/ui/'+hordePerfName).includes('MIN_ENEMIES=8'),
  'Lv20/low-crowd FX budget was not promoted '+prefix);
 assert(read(prefix+'/js/ui/pkmsvv-fusion-evolved.js').includes('installVisualBudget'),
  'hotfix Fusion horde performance missing in '+prefix);
 assert(read(prefix+'/js/ui/pkmsvv-runtime-controls-qa.js').includes('input.axis=()=>aim'),
  'AUTO must direct the native Input.axis() call in '+prefix);
 assert(read(prefix+'/js/ui/pkmsvv-runtime-controls-qa.js').includes('installTouchAuto'),
  'native touchscreen 2-second AUTO cast patch missing from '+prefix);
 assert(read(prefix+'/js/ui/pkmsvv-runtime-controls-qa.js').includes('riftPassage'),
  'Rift speed patch missing from '+prefix);
 // Promote actual UI scripts and styles. Add Story styling AFTER baseline CSS.
 fs.writeFileSync(path.join(to,prefix+'/js/ui/pkmsvv-wiki-qa.js'),
  fs.readFileSync(path.join(root,'src/pkmsvv-wiki.js'),'utf8'));
 for(const name of ['pkmsvv-runtime-controls-qa.css','pkmsvv-pc-menu-clean-qa.css','pkmsvv-box-hub.css'])
  fs.writeFileSync(path.join(to,prefix+'/css/'+name),
   fs.readFileSync(path.join(root,'src',name),'utf8'));
 const recruitCss='pkmsvv-recruitment-qa.css';
 fs.writeFileSync(path.join(to,prefix+'/css/'+recruitCss),
  fs.readFileSync(path.join(root,'src/'+recruitCss),'utf8'));
 if(!html.includes(recruitCss))
  html=html.replace('</head>','<link rel="stylesheet" href="css/'+recruitCss+'">\n</head>');
 const cssName='pkmsvv-story-ui-fix.css';
 fs.writeFileSync(path.join(to,prefix+'/css/'+cssName),
  fs.readFileSync(path.join(root,'src/pkmsvv-story.css'),'utf8'));
 if(!html.includes(cssName))html=html.replace('</head>',
  '<link rel="stylesheet" href="css/'+cssName+'">\\n</head>');
 assert(html.includes(cssName),'Story layout not linked into '+prefix);
 fs.writeFileSync(path.join(to,prefix+'/index.html'),html);
 const storyFile=path.join(to,prefix+'/js/ui/pkmsvv-story.js');
 if(fs.existsSync(storyFile))fs.writeFileSync(storyFile,
  fs.readFileSync(path.join(root,'src/pkmsvv-story.js'),'utf8'));
 // The source QA game embeds a Story IIFE in app.min.js. Replace that EXACT
 // assignment, not a duplicate script that could cause old dialogue to win.
 patchStoryFile(path.join(to,prefix+'/js/app.min.js'));
 patchItemsFile(path.join(to,prefix+'/js/app.min.js'));
 patchPickupFile(path.join(to,prefix+'/js/app.min.js'));
 patchBerryFile(path.join(to,prefix+'/js/app.min.js'));
 // Always bundle exact offline Tranh Trứng music in BOTH public routes.
 const bgm=path.join(root,'custom-music/eggrush.ogg');
 const audioDir=path.join(to,prefix+'/assets/music-custom');
 assert(fs.existsSync(bgm)&&fs.statSync(bgm).size>100000,
  'real Egg Rush OGG is missing');
 fs.mkdirSync(audioDir,{recursive:true});
 fs.copyFileSync(bgm,path.join(audioDir,'eggrush.ogg'));
 assert(file(prefix+'/assets/music-custom/eggrush.ogg'),
  'Berry/Egg Rush OGG missing from '+prefix);
 assert(read(prefix+'/js/ui/pkmsvv-box-hub.js').includes('pickRandom'),
  'old direct-choice PokéBox still in '+prefix);
 assert(read(prefix+'/js/app.min.js').includes("const ORDER = ['mint', 'cap', 'caph']"),
  'event Hidden Capsule missing in compiled Bag '+prefix);
 assert(read(prefix+'/js/app.min.js').includes('Math.random()<.0016666666666666668'),
  'ordinary item drop adjustment missing from '+prefix);
 // Cloudflare standalone client does not ship host-only G.LanAI; the signed
 // desktop/Android HOST builds replace that module directly.
 assert(read(prefix+'/js/app.min.js').includes('function rewardBerry('),
  'guaranteed three-tree Berry reward missing from '+prefix);
 assert(read(prefix+'/js/app.min.js').includes('Math.round((w-202)/2)'),
  'centered Berry objective HUD missing from '+prefix);
 assert(read(prefix+'/js/ui/pkmsvv-box-hub-ui.js').includes('pkmbx-action-dialog'),
  'in-Details confirmation missing from '+prefix);
 assert(read(prefix+'/js/ui/pkmsvv-dex-defeats-qa.js').includes('selectedGen'),
  'regional Recruitment lock missing from '+prefix);
 assert(read(prefix+'/js/ui/pkmsvv-modal-navigation-qa.js').includes('G.RunUI.pick(index)'),
  'native controller level-up selection missing from '+prefix);
 assert(read(prefix+'/js/ui/pkmsvv-modal-navigation-qa.js').includes('function scanActive()'),
  'gamepad modal cache optimization missing from '+prefix);
 assert(read(prefix+'/css/pkmsvv-box-hub.css').includes('pkmbx-dex-type-pill'),
  'colored Pokédex type badges missing from '+prefix);
 assert(read(prefix+'/js/ui/pkmsvv-runtime-controls-qa.js').includes('installHoverWater'),
  'hovering Reshiram speed correction missing from '+prefix);
 assert(read(prefix+'/js/ui/pkmsvv-wiki-qa.js').includes('pkmsvv-orb-guide-icon'),
  'real Orb guide artwork missing from '+prefix);
 assert(read(prefix+'/js/app.min.js').includes('Fusion là dung hợp hai kỹ năng đã luyện MAX'),
  'Story still stale in compiled '+prefix);
 assert(read(prefix+'/js/ui/pkmsvv-wiki-qa.js').includes('pkmsvv-awakening-milestones'),
  'Beginner Skill Awakening guide missing from '+prefix);
}
const sw=path.join(to,'sw.js');assert(file('sw.js'),'PWA service worker missing');
const oldSW=fs.readFileSync(sw,'utf8');
const oldKey='pkmsvv-cloudflare-v1529-1',newKey='pkmsvv-cloudflare-v20-20261109-berry-freeze-reward-music-v32';
assert(oldSW.includes(oldKey),'existing service worker revision differs');
fs.writeFileSync(sw,oldSW.replace(oldKey,newKey));
// A new worker cache namespace ensures the published version refreshes reliably.
// No localStorage, IndexedDB, saved JSON or user's offline profiles are touched.
const info=JSON.parse(read('build-info.json'));
assert(info.localSave===true,'existing browser-save architecture changed');
Object.assign(info,{version:'2.0',displayVersion:'Pokémon Chuyển Sinh 2.0',
 releaseDate:'2026-11-09',releaseSourceRevision:EXPECTED_SHA,
 releaseQAWorkflowRun:42520192007,releaseType:'public-web',mobileUiHotfix:'one-row-tabs-five-box-cards-touch-auto-v24',combatHotfix:'berry-ai-steering-guaranteed-berry-audio-header-v32',saveMode:'existing-browser-local',
 rollbackSourceArtifact:'PKMSVV-PokeBox-Stage4-Web-QA-ONLY'});
fs.writeFileSync(path.join(to,'build-info.json'),JSON.stringify(info,null,2)+'\n');
const maxBytes=25*1024*1024;let files=0,bytes=0,largest=0;
function scan(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,entry.name);
  if(entry.isDirectory()){scan(p);continue;}
  assert(entry.isFile(),'unsupported non-file deploy object '+p);
  const n=fs.statSync(p).size;files++;bytes+=n;largest=Math.max(largest,n);
  assert(n<=maxBytes,'Cloudflare 25 MiB/file limit: '+path.relative(to,p));
  assert(!/\.(?:zip|7z|apk|exe)$/i.test(entry.name),'binary archive inside Pages output');
 }
}
scan(to);assert(files<20000&&files>1000,'unexpected Cloudflare file count: '+files);
const hash=crypto.createHash('sha256').update(read('game/index.html')).digest('hex');
console.log('Pokémon Chuyển Sinh 2.0 release candidate validated',JSON.stringify({
 files,totalMiB:+(bytes/1048576).toFixed(2),largestMiB:+(largest/1048576).toFixed(2),
 htmlSHA256:hash,version:info.version,source:EXPECTED_SHA,release:to
}));
