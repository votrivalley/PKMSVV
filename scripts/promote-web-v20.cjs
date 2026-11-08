'use strict';
/* Promote the Chromium-tested Web QA snapshot to the separately staged
 * public Pokémon Chuyển Sinh 2.0 website, without rebuilding the game or
 * modifying any player's save. Source artifact: Actions run 42520192007,
 * head 81a1101a948be0fb2944ce302c8781eace1f21fa.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
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
 const html=read(prefix+'/index.html');
 for(const name of ['pkmsvv-changelog-v20-qa.js','pkmsvv-v20-ui-qa.js','pkmsvv-box-stage1.js','pkmsvv-box-stage2.js','pkmsvv-box-stage3.js','pkmsvv-box-stage4.js','pkmsvv-box-hub-ui.js','pkmsvv-dex-defeats-qa.js']){
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
const sw=path.join(to,'sw.js');assert(file('sw.js'),'PWA service worker missing');
const oldSW=fs.readFileSync(sw,'utf8');
const oldKey='pkmsvv-cloudflare-v1529-1',newKey='pkmsvv-cloudflare-v20-20261109-mobile-hotfix-2';
assert(oldSW.includes(oldKey),'existing service worker revision differs');
fs.writeFileSync(sw,oldSW.replace(oldKey,newKey));
// A new worker cache namespace ensures the published version refreshes reliably.
// No localStorage, IndexedDB, saved JSON or user's offline profiles are touched.
const info=JSON.parse(read('build-info.json'));
assert(info.localSave===true,'existing browser-save architecture changed');
Object.assign(info,{version:'2.0',displayVersion:'Pokémon Chuyển Sinh 2.0',
 releaseDate:'2026-11-09',releaseSourceRevision:EXPECTED_SHA,
 releaseQAWorkflowRun:42520192007,releaseType:'public-web',mobileUiHotfix:'android-landscape-scroll-and-l1-r1',saveMode:'existing-browser-local',
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
