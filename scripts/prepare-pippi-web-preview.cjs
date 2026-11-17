'use strict';
/* Safe QA-only overlay on a pinned, previously Chromium-tested Web 2.0
 * snapshot. NEVER touch production Cloudflare branch or browser save data.
 * Run AFTER scripts/promote-web-v20.cjs and fetch-pippi-pmd.cjs.
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const site=path.join(root,'dist','cloudflare-v20-release');
const {installModule}=require('./patch-v20-items-bundle.cjs');
const {PORTRAITS}=require('./fetch-pippi-pmd.cjs');
const marker='PKMSVV_PIPPI_COUSIN_PREVIEW_20261115';
const crypto=require('node:crypto');
const revision=/^[a-f0-9]{40}$/i.test(String(process.env.GITHUB_SHA||''))?
 process.env.GITHUB_SHA.slice(0,12):crypto.createHash('sha256').update(
  fs.readFileSync(path.join(root,'src/pkmsvv-pippi.js'))+
  fs.readFileSync(path.join(root,'src/pkmsvv-wiki.js'))+
  fs.readFileSync(path.join(root,'src/pkmsvv-pc-menu-clean-qa.css'))+
  fs.readFileSync(path.join(root,'src/pkmsvv-pippi-guide.js'))+
  fs.readFileSync(path.join(root,'src/pkmsvv-global-power.js'))+
  fs.readFileSync(path.join(root,'src/pkmsvv-runtime-controls-qa.js'))).digest('hex').slice(0,12);

function present(p){if(!fs.existsSync(p)||!fs.statSync(p).size)throw Error('QA preview asset missing: '+p);return p;}
function source(rel){return fs.readFileSync(present(path.join(root,rel)),'utf8');}
function write(dest,text){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,text,'utf8');}
present(path.join(site,'ai/game/index.html'));present(path.join(site,'game/index.html'));
for(const prefix of ['game','ai/game']){
 const dest=path.join(site,prefix);
 // BOTH game entries are previewed. Keep the original vanilla account/save
 // storage intact: no login, localStorage or ID-key migration is performed.
 const compiled=present(path.join(dest,'js/app.min.js'));
 let bundle=fs.readFileSync(compiled,'utf8');
 // Pinned Web Spawner still uses the previous 1/2048 wild Shiny odds.
 // Change only the unique Spawner-local rate; do not touch Orb/item drops.
 const spawner=bundle.indexOf('G.Spawner=');
 if(spawner<0||bundle.indexOf('G.Spawner=',spawner+10)>=0)
  throw Error('Spawner module not unique in pinned QA bundle');
 const region=bundle.slice(spawner,spawner+6000);
 const wild=/^(G\.Spawner=\(\(\)=>\{const [a-zA-Z_$][\w$]*=)1\/(2048|4096);/;
 const parsed=region.match(wild);
 if(!parsed)throw Error('Native wild Shiny source drift '+prefix+': '+region.slice(0,180));
 if(parsed[2]==='2048'){
  const before=parsed[0],after=parsed[1]+'1/4096;';
  bundle=bundle.slice(0,spawner)+region.replace(before,after)+bundle.slice(spawner+region.length);
 }
 // The pinned QA bundle still has 1% Legend, 0.9% Shiny, 100 pity.
 // Patch ONLY the validated G.Gacha lexical module; no changes to 100x
 // batching or the 10x guaranteed 4-star rule.
 function replaceGachaOnce(from,to){
  const anchor=bundle.indexOf('G.Gacha=');
  if(anchor<0||bundle.indexOf('G.Gacha=',anchor+8)>=0)
   throw Error('Expected exactly one Gacha module in pinned Web QA');
  const region=bundle.slice(anchor,anchor+11000);
  if(region.split(from).length!==2)throw Error('Gacha QA source drift: '+from);
  const at=anchor+region.indexOf(from);
  bundle=bundle.slice(0,at)+to+bundle.slice(at+from.length);
 }
 replaceGachaOnce('[[1,45.5],[2,30],[3,17],[4,6.5],[5,1]]',
  '[[1,46],[2,30],[3,17],[4,6.5],[5,.5]]');
 const gachaStart=bundle.indexOf('G.Gacha=');
 const gachaChunk=bundle.slice(gachaStart,gachaStart+11000);
 const shinyGacha=gachaChunk.match(/([a-zA-Z_$][\w$]*)=\.9\/100/);
 if(!shinyGacha||gachaChunk.match(/([a-zA-Z_$][\w$]*)=\.9\/100/g)?.length!==1)
  throw Error('Base Gacha Shiny source drift '+prefix);
 replaceGachaOnce(shinyGacha[0],shinyGacha[1]+'=.45/100');
 replaceGachaOnce('PITY_5:100','PITY_5:150');
 const pityChunk=bundle.slice(bundle.indexOf('G.Gacha='),bundle.indexOf('G.Gacha=')+11000);
 const pityExpr=pityChunk.match(/([a-zA-Z_$][\w$]*\.pity\[[a-zA-Z_$][\w$]*\]>=)100\?5/);
 if(!pityExpr||pityChunk.match(/([a-zA-Z_$][\w$]*\.pity\[[a-zA-Z_$][\w$]*\]>=)100\?5/g)?.length!==1)
  throw Error('Gacha hard-pity source drift '+prefix);
 replaceGachaOnce(pityExpr[0],pityExpr[1]+'150?5');
 for(const [label,rel] of [
   ['GlobalPower','src/pkmsvv-global-power.js'],
   ['GlobalPowerUI','src/pkmsvv-global-power-ui.js'],
   ['PKMSVVEggs','src/v15/eggs.js'],
   ['PKMSVV14','src/v14/milestones.js'],
   ['Shop','src/kecleon/upstream/data/shop.js'],
   ['KecleonUI','src/kecleon/pkmsvv-kecleon-ui.js']
 ]){
  let src=source(rel);
  src=src.replace(new RegExp('G\\.'+label+'\\s*=\\s*'),'G.'+label+'=');
  bundle=installModule(bundle,label,src);
 }
 const gachaQA=bundle.slice(bundle.indexOf('G.Gacha='),bundle.indexOf('G.Gacha=')+11000);
 const wildQA=bundle.slice(bundle.indexOf('G.Spawner='),bundle.indexOf('G.Spawner=')+180);
 if(!gachaQA.includes('PITY_5:150')||!gachaQA.includes('[[1,46],[2,30],[3,17],[4,6.5],[5,.5]]')||
     !/[a-zA-Z_$][\w$]*\.pity\[[a-zA-Z_$][\w$]*\]>=150\?5/.test(gachaQA)||
     !/[a-zA-Z_$][\w$]*=\.45\/100/.test(gachaQA)||
     !/G\.Spawner=\(\(\)=>\{const [a-zA-Z_$][\w$]*=1\/4096;/.test(wildQA)||
     !bundle.includes('const SHINY_CHANCE=.015')||
     !bundle.includes("const ORDER = ['mint', 'cap', 'caph', 'pippiReset']")||
     !bundle.includes('legendChance:.15'))
  throw Error('Legend/Shiny/Pity rarity patch absent: '+prefix);
 new vm.Script(bundle,{filename:'pippi-qa-'+prefix.replace('/','-')+'.js'});
 write(compiled,bundle);
 for(const filename of [
   'pkmsvv-box-stage3.js','pkmsvv-pc-menu-clean-qa.js','pkmsvv-wiki.js',
   'pkmsvv-pippi.js','pkmsvv-pippi-guide.js','pkmsvv-fossil-system.js'
 ]){
  const target=filename==='pkmsvv-wiki.js'?'pkmsvv-wiki-qa.js':filename;
  write(path.join(dest,'js/ui',target),source('src/'+filename));
 }
 for(const filename of ['pkmsvv-v20-ui-qa.css','pkmsvv-pc-menu-clean-qa.css','pkmsvv-pippi.css','pkmsvv-pippi-guide.css']){
  write(path.join(dest,'css',filename),source('src/'+filename));
 }
 const labOut=path.join(dest,'images/coop-lab');
 for(const asset of ['room_base.png','room_art_qa_v2.webp','decor/machine_old.png','decor/kabuto_skeleton.png','decor/research_terminal.png']){
  const input=present(path.join(root,'assets/coop-lab',asset)),output=path.join(labOut,asset);
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.copyFileSync(input,output);
 }
 const imageDir=path.join(dest,'images/pippi');
 fs.mkdirSync(path.join(imageDir,'portrait'),{recursive:true});
 for(const name of ['Walk-Anim.png','Idle-Anim.png','Sleep-Anim.png']){
  fs.copyFileSync(present(path.join(root,'assets/pippi-pmd',name)),path.join(imageDir,name));
 }
 for(const name of Object.keys(PORTRAITS)){
  fs.copyFileSync(present(path.join(root,'assets/pippi-pmd/portrait',name)),
    path.join(imageDir,'portrait',name));
 }
 fs.copyFileSync(present(path.join(root,'assets/pippi-pmd/portrait/atlas.png')),
   path.join(imageDir,'portrait/atlas.png'));
 fs.copyFileSync(present(path.join(root,'assets/pippi-skill-icons.png')),
   path.join(imageDir,'skill-icons.png'));
 if(fs.statSync(path.join(imageDir,'skill-icons.png')).size>25000)throw Error('Pippi icons too large for mobile QA');
 let html=source(path.relative(root,path.join(dest,'index.html')));
 if(!html.includes('pkmsvv-box-stage3.js'))throw Error('Not the validated Web 2.0 snapshot: '+prefix);
 for(const name of ['pkmsvv-pippi.js','pkmsvv-pippi-guide.js','pkmsvv-fossil-system.js']){
  if(!html.includes(name))html=html.replace('</body>','<script defer src="js/ui/'+name+'"></script>\n</body>');
 }
 if(!html.includes('pkmsvv-pippi.css'))html=html.replace('</head>',
  '<link rel="stylesheet" href="css/pkmsvv-pippi.css">\n</head>');
 if(!html.includes('pkmsvv-pippi-guide.css'))html=html.replace('</head>',
  '<link rel="stylesheet" href="css/pkmsvv-pippi-guide.css">\n</head>');
 // CSP may prohibit inline scripts. Ship a same-origin deferred identity
 // module BEFORE the PC module so the fourth tile and build identity agree.
 const identity='js/ui/pkmsvv-pippi-qa-identity.js';
 write(path.join(dest,identity), 'window.__PKMSVV_PIPPI_QA='+JSON.stringify(revision)+';\n');
 html=html.replace('</head>','<script defer src="'+identity+'?v='+revision+'"></script>\n<meta name="robots" content="noindex,nofollow"><!-- '+marker+' -->\n</head>');
 // A stable Pages URL must not leave old PC / Pippi assets in existing caches.
 for(const name of ['pkmsvv-wiki-qa.js','pkmsvv-pippi.js','pkmsvv-pippi-guide.js','pkmsvv-fossil-system.js','pkmsvv-pc-menu-clean-qa.js','pkmsvv-quick-region.js']){
  html=html.replace('src="js/ui/'+name+'"','src="js/ui/'+name+'?v='+revision+'"');
 }
 for(const name of ['pkmsvv-pippi.css','pkmsvv-pippi-guide.css','pkmsvv-pc-menu-clean-qa.css']){
  html=html.replace('href="css/'+name+'"','href="css/'+name+'?v='+revision+'"');
 }
 write(path.join(dest,'index.html'),html);
 if(!html.includes(marker)||!html.includes('pkmsvv-pippi.js')||!html.includes('pkmsvv-fossil-system.js'))throw Error('Preview fossil injection incomplete');
 // Test the actual staged source, not just repo strings.
 for(const token of ['COUSIN_CHANCES=Object.freeze([0,.04,.06,.08])','rollCousinOnHit']){
  if(!source(path.relative(root,path.join(dest,'js/ui/pkmsvv-pippi.js'))).includes(token))
   throw Error('Pikachu live skill missing in '+prefix+': '+token);
 }
 if(!fs.existsSync(path.join(dest,'images/pippi/skill-icons.png')))
  throw Error('Pippi icon sprite missing from active game route: '+prefix);
 if(!source(path.relative(root,path.join(dest,'js/ui/pkmsvv-fossil-system.js'))).includes('guaranteedKabuto'))
  throw Error('Fossil native rock hook missing in '+prefix);
 if(!source(path.relative(root,path.join(dest,'js/ui/pkmsvv-wiki-qa.js'))).includes('Bạn đồng hành'))
  throw Error('Renamed Companion PC hub absent in '+prefix);
 if(!source(path.relative(root,path.join(dest,'js/ui/pkmsvv-box-stage3.js'))).includes('normal:.002'))
  throw Error('Half-rate prism source missing in '+prefix);
 if(!source(path.relative(root,path.join(dest,'js/ui/pkmsvv-quick-region.js'))).includes("const inRift=!!"))
  throw Error('Native Grieta biome exception missing from active Region script: '+prefix);
 if(!bundle.includes('mint:.008/3'))throw Error('Half-rate Mint/Capsule compiled bundle missing');
}
const meta=JSON.parse(source('dist/cloudflare-v20-release/build-info.json'));
Object.assign(meta,{releaseType:'qa-preview-only',pippiCousinQA:marker,
 previewBranch:'pippi-cousin-qa',version:'2.0.4-Pippi-Fossil-QA',
 description:'Isolated browser-only test; production pkmsvv-web.pages.dev unchanged'});
write(path.join(site,'build-info.json'),JSON.stringify(meta,null,2)+'\n');
// QA-only cache policy: browsers must revalidate the HTML and the two UI
// modules whose stale versions showed a 3-tile PC and no Pippi. This never
// clears CacheStorage/localStorage or the player's JSON save.
const headersPath=path.join(site,'_headers');
const previousHeaders=fs.existsSync(headersPath)?fs.readFileSync(headersPath,'utf8'):'';
const urls=['/game/','/game/index.html','/ai/game/','/ai/game/index.html',
 '/game/js/ui/pkmsvv-wiki-qa.js','/ai/game/js/ui/pkmsvv-wiki-qa.js',
 '/game/js/ui/pkmsvv-pippi.js','/ai/game/js/ui/pkmsvv-pippi.js',
 '/game/js/ui/pkmsvv-pippi-guide.js','/ai/game/js/ui/pkmsvv-pippi-guide.js',
 '/game/js/ui/pkmsvv-pippi-qa-identity.js','/ai/game/js/ui/pkmsvv-pippi-qa-identity.js',
 '/game/css/pkmsvv-pippi.css','/ai/game/css/pkmsvv-pippi.css',
 '/game/css/pkmsvv-pippi-guide.css','/ai/game/css/pkmsvv-pippi-guide.css',
 '/build-info.json'];
const noStore=urls.map(u=>u+'\n  Cache-Control: no-store, max-age=0').join('\n');
write(headersPath,previousHeaders.trimEnd()+'\n\n'+noStore+'\n');
// Unique SW key ensures QA does not reuse the public revision.
const swPath=present(path.join(site,'sw.js'));
const oldSW=fs.readFileSync(swPath,'utf8');
const revised=oldSW.replace('pkmsvv-cloudflare-v20-20261114-story-icons-auto-v37',
 'pkmsvv-pippi-cousin-qa-'+revision);
if(revised===oldSW)throw Error('QA service worker cache marker missing');
write(swPath,revised);
console.log(marker,'revision',revision,'stage complete at',site);
