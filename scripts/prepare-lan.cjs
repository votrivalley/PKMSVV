'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const env={...process.env,PKMSVV_WEB_PREVIEW:'1',PKMSVV_LAN_BUILD:'1'};
execFileSync(process.execPath,[path.join(root,'scripts','prepare-web.cjs')],{cwd:root,env,stdio:'inherit'});
const from=path.join(root,'dist','web'),to=path.join(root,'dist','lan');
fs.rmSync(to,{recursive:true,force:true});fs.cpSync(from,to,{recursive:true,force:true});
fs.copyFileSync(path.join(root,'src','lan','index.html'),path.join(to,'index.html'));
fs.copyFileSync(path.join(root,'src','lan','entry.js'),path.join(to,'entry.js'));
for(const file of ['lan-connect.html','lan-connect.js'])
 fs.copyFileSync(path.join(root,'src','ios',file),path.join(to,file));
// The LAN site is built independently of the native dist/game directory.
 // Copy the same local-only art resources as the PC game to avoid empty icons.
 const game=path.join(to,'game'),images=path.join(game,'images');
 function addFile(src,relative){
  if(!fs.existsSync(src))throw Error('Missing pinned local PC asset: '+src);
  const out=path.join(images,relative);
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(src,out);
 }
 addFile(path.join(root,'src/pkmsvv-menu-icons.webp'),'pkmsvv-menu-icons.webp');
 addFile(path.join(root,'assets/research-lab-menu-icon.png'),'pkmsvv-research-lab-icon.png');
 addFile(path.join(root,'assets/research-station-icons.png'),'pkmsvv-research-station-icons.png');
 addFile(path.join(root,'assets/pippi-skill-icons.png'),'pippi/skill-icons.png');
 const pippi=path.join(root,'assets/pippi-pmd');
 if(!fs.existsSync(path.join(pippi,'Walk-Anim.png')))throw Error('Pippi native sprites not fetched');
 fs.mkdirSync(images,{recursive:true});
 fs.cpSync(pippi,path.join(images,'pippi'),{recursive:true});
 const lab=path.join(root,'assets/coop-lab');
 if(!fs.existsSync(path.join(lab,'room_base.png')))throw Error('Fossil Lab native room missing');
 fs.cpSync(lab,path.join(images,'coop-lab'),{recursive:true});
 // FOSSIL_CONCEPT_ASSETS_V256: ship approved concept cutouts to real LAN Beta.
 if(process.env.PKMSVV_FOSSIL_NATIVE_QA==='1'){
  execFileSync(process.execPath,[path.join(root,'scripts/build-fossil-concept-sprites.cjs')],
   {cwd:root,stdio:'inherit'});
  const art=path.join(root,'dist/fossil-concept-sprites');
  for(const name of ['rotom-restorer-concept-atlas.png','fossil-excavation-concept-atlas.png'])
   addFile(path.join(art,name),'coop-lab/'+name);
 }

 for(const rel of ['pkmsvv-menu-icons.webp','pippi/Walk-Anim.png','pippi/portrait/Happy.png',
  'coop-lab/room_base.png','coop-lab/decor/machine_old.png',
  'coop-lab/decor/kabuto_skeleton.png','coop-lab/decor/research_terminal.png']){
  if(!fs.existsSync(path.join(images,rel)))throw Error('LAN packaging missing '+rel);
 }
 // PKMSVV_UNIFIED_BETA_POKEMON_255 — the LAN Beta is NOT the staged V2 Web
 // artifact. Install the complete PokéBox modules into its own native /game/
 // after compiling the native offline engine. Never change Android, PC,
 // production Cloudflare or any saved profile. No silent save migration.
 if(process.env.PKMSVV_FOSSIL_NATIVE_QA==='1'){
  const crypto=require('node:crypto');
  const javascripts=[
   'pkmsvv-box-stage1.js','pkmsvv-box-stage2.js','pkmsvv-box-stage2-ui.js',
   'pkmsvv-box-stage3.js','pkmsvv-box-stage4.js','pkmsvv-box-hub.js',
   'pkmsvv-box-hub-ui.js','pkmsvv-dex-defeats-qa.js','pkmsvv-recruitment-qa.js'
  ];
  const stylesheets=[
   'pkmsvv-box-stage1.css','pkmsvv-box-stage2.css','pkmsvv-box-stage3.css',
   'pkmsvv-box-hub.css','pkmsvv-v20-ui-qa.css'
  ];
  const revision=/^[a-f0-9]{40}$/i.test(String(process.env.GITHUB_SHA||''))?
   process.env.GITHUB_SHA.slice(0,12):crypto.createHash('sha256').update(
    fs.readFileSync(path.join(root,'src/pkmsvv-box-hub-ui.js'))+
    fs.readFileSync(path.join(root,'src/pkmsvv-pc-menu-clean-qa.css')))
    .digest('hex').slice(0,12);
  let installed=0;
  for(const route of ['game','ai/game']){
   const folder=path.join(to,route),entry=path.join(folder,'index.html');
   if(!fs.existsSync(entry)){
    if(route==='game')throw Error('Unified Beta missing native /game/');
    continue; // The LAN build may intentionally omit /ai/game/.
   }
   let html=fs.readFileSync(entry,'utf8');
   if(!html.includes('</head>')||!html.includes('</body>')||
      !html.includes('app.min.js')||html.includes('pkmsvv-box-hub-ui.js'))
    throw Error('Unrecognized or already modified Beta Pokémon entry: '+route);
   const injectStyle=[],injectScript=[];
   for(const name of stylesheets){
    const original=path.join(root,'src',name),destination=path.join(folder,'css',name);
    if(!fs.existsSync(original)||fs.statSync(original).size<100)
     throw Error('Missing source Pokémon style '+name);
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.copyFileSync(original,destination);
    injectStyle.push('<link rel="stylesheet" href="css/'+name+'?v='+revision+'">');
   }
   for(const name of javascripts){
    const original=path.join(root,'src',name),destination=path.join(folder,'js/ui',name);
    if(!fs.existsSync(original)||fs.statSync(original).size<100)
     throw Error('Missing source Pokémon script '+name);
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.copyFileSync(original,destination);
    injectScript.push('<script defer src="js/ui/'+name+'?v='+revision+'"></script>');
   }
   html=html.replace('</head>',injectStyle.join('\n')+'\n</head>');
   html=html.replace('</body>',injectScript.join('\n')+'\n</body>');
   for(const token of ['pkmsvv-box-hub-ui.js?v=','pkmsvv-box-hub.css?v=',
    'pkmsvv-v20-ui-qa.css?v=','pkmsvv-box-stage4.js?v='])
    if(!html.includes(token))throw Error('Unified Beta Pokémon bundle incomplete: '+route+'/'+token);
   fs.writeFileSync(entry,html,'utf8');installed++;
  }
  // The same public Beta URL must reload its NEW tabs after an earlier native
  // HTML/icon release. Never clear CacheStorage/localStorage or player saves.
  const headers=path.join(to,'_headers');
  let output=fs.existsSync(headers)?fs.readFileSync(headers,'utf8').trimEnd()+'\n\\n':'';
  for(const route of ['/game','/ai/game']){
   if(!fs.existsSync(path.join(to,route.slice(1),'index.html')))continue;
   for(const name of ['','index.html',...javascripts.map(x=>'js/ui/'+x),
    ...stylesheets.map(x=>'css/'+x)]){
    const url=route+'/'+name;
    output+=url+'\n  Cache-Control: no-store, max-age=0\n';
   }
  }
  fs.writeFileSync(headers,output,'utf8');
  if(!installed)throw Error('Unified Beta PokéBox not installed in any route');
  console.log('PKMSVV_UNIFIED_BETA_POKEMON_255',installed,'route(s), revision',revision);
 }
 const sw=path.join(to,'sw.js');if(fs.existsSync(sw))fs.rmSync(sw);
if(!fs.existsSync(path.join(to,'game','js','app.min.js')))throw Error('Missing LAN compiled game');
console.log('PKMSVV LAN build ready in dist/lan');
