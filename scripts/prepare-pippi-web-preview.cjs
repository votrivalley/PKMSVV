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
  fs.readFileSync(path.join(root,'src/pkmsvv-pc-menu-clean-qa.css'))).digest('hex').slice(0,12);

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
 for(const [label,rel] of [
   ['GlobalPower','src/pkmsvv-global-power.js'],
   ['GlobalPowerUI','src/pkmsvv-global-power-ui.js']
 ]){
  let src=source(rel);
  src=src.replace(new RegExp('G\\.'+label+'\\s*=\\s*'),'G.'+label+'=');
  bundle=installModule(bundle,label,src);
 }
 new vm.Script(bundle,{filename:'pippi-qa-'+prefix.replace('/','-')+'.js'});
 write(compiled,bundle);
 for(const filename of [
   'pkmsvv-box-stage3.js','pkmsvv-pc-menu-clean-qa.js','pkmsvv-wiki.js',
   'pkmsvv-pippi.js'
 ]){
  const target=filename==='pkmsvv-wiki.js'?'pkmsvv-wiki-qa.js':filename;
  write(path.join(dest,'js/ui',target),source('src/'+filename));
 }
 for(const filename of ['pkmsvv-v20-ui-qa.css','pkmsvv-pc-menu-clean-qa.css','pkmsvv-pippi.css']){
  write(path.join(dest,'css',filename),source('src/'+filename));
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
 let html=source(path.relative(root,path.join(dest,'index.html')));
 if(!html.includes('pkmsvv-box-stage3.js'))throw Error('Not the validated Web 2.0 snapshot: '+prefix);
 for(const name of ['pkmsvv-pippi.js']){
  if(!html.includes(name))html=html.replace('</body>','<script defer src="js/ui/'+name+'"></script>\n</body>');
 }
 if(!html.includes('pkmsvv-pippi.css'))html=html.replace('</head>',
  '<link rel="stylesheet" href="css/pkmsvv-pippi.css">\n</head>');
 // CSP may prohibit inline scripts. Ship a same-origin deferred identity
 // module BEFORE the PC module so the fourth tile and build identity agree.
 const identity='js/ui/pkmsvv-pippi-qa-identity.js';
 write(path.join(dest,identity), 'window.__PKMSVV_PIPPI_QA='+JSON.stringify(revision)+';\n');
 html=html.replace('</head>','<script defer src="'+identity+'?v='+revision+'"></script>\n<meta name="robots" content="noindex,nofollow"><!-- '+marker+' -->\n</head>');
 // A stable Pages URL must not leave old PC / Pippi assets in existing caches.
 for(const name of ['pkmsvv-wiki-qa.js','pkmsvv-pippi.js','pkmsvv-pc-menu-clean-qa.js','pkmsvv-quick-region.js']){
  html=html.replace('src="js/ui/'+name+'"','src="js/ui/'+name+'?v='+revision+'"');
 }
 for(const name of ['pkmsvv-pippi.css','pkmsvv-pc-menu-clean-qa.css']){
  html=html.replace('href="css/'+name+'"','href="css/'+name+'?v='+revision+'"');
 }
 write(path.join(dest,'index.html'),html);
 if(!html.includes(marker)||!html.includes('pkmsvv-pippi.js'))throw Error('Preview injection incomplete');
 // Test the actual staged source, not just repo strings.
 for(const token of ['COUSIN_CHANCES=Object.freeze([0,.03,.045,.06])','rollCousinOnHit']){
  if(!source(path.relative(root,path.join(dest,'js/ui/pkmsvv-pippi.js'))).includes(token))
   throw Error('Pikachu live skill missing in '+prefix+': '+token);
 }
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
 previewBranch:'pippi-cousin-qa',version:'2.0.1-Pippi-QA',
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
 '/game/js/ui/pkmsvv-pippi-qa-identity.js','/ai/game/js/ui/pkmsvv-pippi-qa-identity.js',
 '/game/css/pkmsvv-pippi.css','/ai/game/css/pkmsvv-pippi.css',
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
