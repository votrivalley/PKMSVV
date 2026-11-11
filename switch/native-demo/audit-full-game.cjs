'use strict';
// Inventory ONLY: the signed APK contains the real compiled PKMSVV runtime.
// Native nx.js cannot execute browser DOM APIs. We must port source modules,
// not embed the APK as a slow Brewser/WebView app.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.argv[2]||'');
const out=path.resolve(process.argv[3]||'switch/native-demo/PORTING-INVENTORY.json');
function fail(message){throw Error('PKMSVV native port audit: '+message)}
if(!fs.statSync(root,{throwIfNoEntry:false})?.isDirectory())fail('missing full-game asset directory');
const must=['index.html','js/app.min.js','js/game.js','js/entities/player.js','js/systems/combat.js','js/systems/spawner.js'];
for(const rel of must)if(!fs.statSync(path.join(root,rel),{throwIfNoEntry:false})?.isFile())fail('actual game module missing: '+rel);
const counts={files:0,bytes:0,images:0,scripts:0,audio:0,styles:0,other:0};
const examples={},extensions={},modulePaths=[];
const stack=[root];
while(stack.length){
 const dir=stack.pop();
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory()){stack.push(file);continue}
  if(!entry.isFile())continue;
  const rel=path.relative(root,file).split(path.sep).join('/');
  const ext=path.extname(rel).toLowerCase()||'(none)';
  counts.files++;counts.bytes+=fs.statSync(file).size;
  extensions[ext]=(extensions[ext]||0)+1;
  let kind='other';
  if(['.webp','.png','.jpg','.jpeg','.gif'].includes(ext))kind='images';
  else if(ext==='.js'||ext==='.mjs')kind='scripts';
  else if(['.ogg','.mp3','.wav','.m4a'].includes(ext))kind='audio';
  else if(ext==='.css')kind='styles';
  counts[kind]++;
  if(!examples[kind])examples[kind]=[];
  if(examples[kind].length<12)examples[kind].push(rel);
  if(rel.startsWith('js/')&&ext==='.js')modulePaths.push(rel);
 }
}
if(counts.files<1000||counts.scripts<50||counts.images<1000||counts.bytes<20000000)
 fail('compiled APK too small to represent real full game: '+JSON.stringify(counts));
const portModules={
 'state-and-data':['js/core/db.js','js/core/store.js','js/systems/collection.js','js/systems/evolution.js'],
 'combat-and-skills':['js/systems/combat.js','js/data/moves.js','js/entities/player.js','js/entities/enemy.js'],
 'world-and-spawns':['js/world/world.js','js/world/tiles.js','js/systems/spawner.js'],
 'game-and-input':['js/game.js','js/core/input.js'],
 'ui-and-save':['js/ui/hud.js','js/ui/slots.js','js/systems/save.js'],
};
const browserTokens=[['document','\\bdocument\\.'],['window','\\bwindow\\.'],
 ['DOM','#(?:querySelector|createElement|appendChild|innerHTML|classList)\\b'],
 ['localStorage','\\blocalStorage\\b'],['canvasDOM','\\bgetElementById|\\.getBoundingClientRect\\('],
 ['audio','\\bAudio\\b|\\bAudioContext\\b'],['network','\\bfetch\\(|\\bWebSocket\\b']];
const moduleAudit={};
for(const [group,files] of Object.entries(portModules)){
 moduleAudit[group]=files.map(rel=>{
  const file=path.join(root,rel);
  const exists=fs.existsSync(file);
  const text=exists?fs.readFileSync(file,'utf8'):'';
  const dependsOn=exists?browserTokens.filter(([,expr])=>new RegExp(expr).test(text)).map(([name])=>name):[];
  return {path:rel,present:exists,bytes:Buffer.byteLength(text),browserDependencies:dependsOn};
 });
}
const result={
 kind:'PKMSVV_SWITCH_NATIVE_PORT_AUDIT',
 source:'Real compiled game APK build run 42868942245',
 sourceIsBrowserEngine:true,
 runtimeTarget:'nx.js native (NO Brewser/WebApplet/HTML5 runtime)',
 counts,extensions,moduleAudit,samplePaths:examples,
 blockingFact:'Browser engine uses DOM + browser APIs; native runner cannot be declared feature-complete until systems are individually ported and QA passes on physical Switch.',
 supportPolicy:'No simulated skills or one-feature demo releases as FULL.'
};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log('REAL PKMSVV GAME ENGINE AUDIT',JSON.stringify({counts,groups:Object.fromEntries(
 Object.entries(moduleAudit).map(([k,v])=>[k,{found:v.filter(x=>x.present).length,total:v.length,usesBrowser:v.filter(x=>x.browserDependencies.length).length}])
)},null,2));
console.log('Report: '+out);
for(const rel of ['js/data/moves.js','js/core/db.js','js/systems/spawner.js','js/data/mons.js']){
 const file=path.join(root,rel);
 if(!fs.existsSync(file)){console.log('NATIVE PORT SOURCE NOT FOUND:',rel);continue}
 const code=fs.readFileSync(file,'utf8');
 console.log('NATIVE PORT SOURCE SAMPLE:',rel,'total bytes',Buffer.byteLength(code));
 console.log(code.slice(0,7600));
}
console.log('NATIVE PORT MODULE CANDIDATES:',modulePaths.filter(
 x=>/data|move|pokemon|dex|world|combat|projectile|enemy/i.test(x)).slice(0,65).join(' | '));
