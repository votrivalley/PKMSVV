'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const {copyRegionCovers}=require('./copy-region-covers.cjs');
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
 const v3=path.join(lab,'research-v3');
 if(fs.existsSync(v3)){
  // Reject partial or altered approved artwork before copying to the game.
  execFileSync(process.execPath,['-e',"require('./scripts/import-research-v3.cjs').verify(process.argv[1]).catch(e=>{console.error(e);process.exitCode=1})",v3],{cwd:root,stdio:'inherit'});
 }
 if(!fs.existsSync(path.join(lab,'room_base.png')))throw Error('Fossil Lab native room missing');
 fs.cpSync(lab,path.join(images,'coop-lab'),{recursive:true});
 if(process.env.PKMSVV_FOSSIL_NATIVE_QA==='1'){
  if(fs.existsSync(v3))execFileSync(process.execPath,[path.join(root,'scripts/build-research-v3-skins.cjs'),path.join(images,'coop-lab','research-v3','skins')],{cwd:root,stdio:'inherit'});
  const layers=path.join(images,'coop-lab','source-cutouts-qa');
  execFileSync(process.execPath,[path.join(root,'scripts/extract-research-layers.cjs'),layers],
   {cwd:root,stdio:'inherit'});
  for(const name of ['manifest.json','clean-backdrop.png','restoration_chamber.png',
   'support_shelf.png','mega_desk.png','berry_garden.png','companion_pedestal.png',
    'prop-support.png','prop-mega.png','prop-berry.png','prop-companion.png','prop-fossil.png'])
   if(!fs.existsSync(path.join(layers,name)))throw Error('Research QA missing '+name);
 }
 // FOSSIL_CONCEPT_ASSETS_V256: ship approved concept cutouts to real LAN Beta.
 if(process.env.PKMSVV_FOSSIL_NATIVE_QA==='1'){
  execFileSync(process.execPath,[path.join(root,'scripts/build-fossil-concept-sprites.cjs')],
   {cwd:root,stdio:'inherit'});
  const art=path.join(root,'dist/fossil-concept-sprites');
  for(const name of ['approved-fossil-source-atlas.png','approved-fossil-v3-atlas.png','approved-fossil-machine-full-v4.png'])
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
   'pkmsvv-box-hub-ui.js','pkmsvv-dex-defeats-qa.js','pkmsvv-recruitment-qa.js',
   'pkmsvv-quick-region.js',
   // Restore gameplay QA controls omitted by this newer native Beta packaging:
   // 8/MAX auto-level-up, active skill AUTO, speed, controller shortcuts.
   'pkmsvv-runtime-controls-qa.js',
   'pkmsvv-modal-navigation-qa.js',
   // A real in-world Sky Pillar tileset, NOT just the region-menu WebP card.
   'pkmsvv-sky-tower-world-qa.js'
  ];
  const stylesheets=[
   'pkmsvv-box-stage1.css','pkmsvv-box-stage2.css','pkmsvv-box-stage3.css',
   'pkmsvv-box-hub.css','pkmsvv-v20-ui-qa.css','pkmsvv-quick-region.css',
   'pkmsvv-runtime-controls-qa.css',
   'pkmsvv-modal-navigation-qa.css',
   // Restore the full-width held-item comparison styles from the older QA
   // build, with a targeted override after native item modal styles.
   'pkmsvv-held-item-layout-qa.css'
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
   // Inline <script> content is BLOCKED by the native CSP even if the
   // HTML contains its text. A same-origin external file executes reliably.
   // Switches are NEVER copied into PC/Android/production builds or saves.
   const runtimeFlags='window.PKMSVV_PIPPI_COUSIN_QA_100=false;\n'+
    'window.PKMSVV_MEGA_FULL_CATALOG_QA=true;\n'+
    'window.PKMSVV_RESEARCH_V3_QA='+String(fs.existsSync(path.join(v3,'manifest.json')))+';\n'+
    'window.PKMSVV_RESEARCH_SKIN_QA=true;\n'+
    'window.PKMSVV_RESEARCH_ART_QA='+JSON.stringify(require('../data/pkmsvv-coop-lab-catalog.json').roomArt)+';\n';
   const qaConfig='pkmsvv-qa-runtime-config.js';
   const labCatalog=require('../data/pkmsvv-coop-lab-catalog.json');
   const labCore=fs.readFileSync(path.join(root,'src/pkmsvv-coop-lab-core.cjs'),'utf8');
   const configAnchor="require('../data/pkmsvv-coop-lab-catalog.json')";
   if(!labCore.includes(configAnchor))throw Error('Station skin economy config anchor missing');
   const browserCore=labCore.replace(configAnchor,JSON.stringify(labCatalog));
   const skinModule='pkmsvv-research-skin-economy-qa.js';
   const skinBundle='(function(){const module={exports:{}};\n'+browserCore+
    '\nconst E=module.exports;window.PKMSVVStationSkinEconomy=Object.freeze({...E.stationSkinEconomy,registry:E.config.stationSkins});})();\n';
   fs.mkdirSync(path.join(folder,'js/ui'),{recursive:true});
   fs.writeFileSync(path.join(folder,'js/ui',skinModule),skinBundle);
   injectScript.push('<script defer src="js/ui/'+skinModule+'?v='+revision+'"></script>');
   fs.mkdirSync(path.join(folder,'js/ui'),{recursive:true});
   fs.writeFileSync(path.join(folder,'js/ui',qaConfig),runtimeFlags);
   // An earlier Beta may cache the former 100% QA switch.
   // A unique late-loading script guarantees 5/10/15 balance in this Beta.
   const cousinBalance='pkmsvv-pikachu-balance-051015-v2.js';
   fs.writeFileSync(path.join(folder,'js/ui',cousinBalance),
    'window.PKMSVV_PIPPI_COUSIN_QA_100=false;\n');
   html=html.replace('</head>',injectStyle.join('\n')+'\n'+
    '<script src="js/ui/'+qaConfig+'?v='+revision+'"></script>\n</head>');
   html=html.replace('</body>',injectScript.join('\n')+'\n'+
    '<script src="js/ui/'+cousinBalance+'?v='+revision+'"></script>\n</body>');
   // Previous Beta regression: the old QA chooser source exists in GitHub,
   // but wasn't copied into the actual compiled LAN Beta. Restore all ten
   // ORIGINAL Gen covers here; importing a badge save never repairs a missing
   // executable chooser.
   const covers=copyRegionCovers(folder);
   if(covers!==10)throw Error('Beta Explore requires all ten Region covers; got '+covers);
   if(!html.includes('pkmsvv-qa-runtime-config.js?v=')||
      !fs.readFileSync(path.join(folder,'js/ui',qaConfig),'utf8')
       .includes('window.PKMSVV_MEGA_FULL_CATALOG_QA=true;'))
    throw Error('Beta missing CSP-safe Mega runtime switch: '+route);
   for(const token of ['pkmsvv-box-hub-ui.js?v=','pkmsvv-box-hub.css?v=',
    'pkmsvv-v20-ui-qa.css?v=','pkmsvv-box-stage4.js?v=',
    'pkmsvv-quick-region.js?v=','pkmsvv-quick-region.css?v=',
    'pkmsvv-runtime-controls-qa.js?v=','pkmsvv-runtime-controls-qa.css?v=',
    'pkmsvv-held-item-layout-qa.css?v=',
    'pkmsvv-sky-tower-world-qa.js?v='])
    if(!html.includes(token))throw Error('Unified Beta Pokémon bundle incomplete: '+route+'/'+token);
   fs.writeFileSync(entry,html,'utf8');installed++;
  }
  // No forced save migration, no reset or overwriting users' local region
  // progress: this patch restores only the missing in-game choice interface.
  // The same public Beta URL must reload its NEW tabs after an earlier native
  // HTML/icon release. Never clear CacheStorage/localStorage or player saves.
  const headers=path.join(to,'_headers');
  let output=fs.existsSync(headers)?fs.readFileSync(headers,'utf8').trimEnd()+'\n\\n':'';
  for(const route of ['/game','/ai/game']){
   if(!fs.existsSync(path.join(to,route.slice(1),'index.html')))continue;
   for(const name of ['','index.html','js/ui/pkmsvv-qa-runtime-config.js','js/ui/pkmsvv-pikachu-balance-051015-v2.js',
    ...javascripts.map(x=>'js/ui/'+x),
    ...stylesheets.map(x=>'css/'+x)]){
    const url=route+'/'+name;
    output+=url+'\n  Cache-Control: no-store, max-age=0\n';
   }
  }
  fs.writeFileSync(headers,output,'utf8');
  if(!installed)throw Error('Unified Beta PokéBox not installed in any route');
  console.log('PKMSVV_UNIFIED_BETA_POKEMON_255',installed,'route(s), revision',revision);
 }
 // Web Beta has a genuine manual WebRTC Host/Join mode at /ai/game/ when
 // ?pkmsvvWifi=1; previously this path was never packaged and Cloudflare
 // returned an empty page. Use the SAME native 2.5.5 game HTML and assets,
 // with a base href to avoid duplicating 90 MB or changing any player save.
 // This route only exists on standalone-AI Beta; native PC LAN needs /game/.
 if(process.env.PKMSVV_STANDALONE_AI==='1'){
  const gameEntry=path.join(to,'game','index.html');
  const wifiEntry=path.join(to,'ai','game','index.html');
  const html=fs.readFileSync(gameEntry,'utf8');
  if(!/<head(?:\s[^>]*)?>/i.test(html)||!html.includes('app.min.js')||
    !html.includes('pkmsvv-coop'))throw Error('Wi-Fi Host/Join route: native Beta game entry missing');
  const routed=html.replace(/<head(?:\s[^>]*)?>/i,m=>m+'\n<base href="/game/">');
  fs.mkdirSync(path.dirname(wifiEntry),{recursive:true});
  fs.writeFileSync(wifiEntry,routed,'utf8');
  if(!routed.includes('<base href="/game/">')||
    !routed.includes('pkmsvv-box-hub-ui.js?v='))
   throw Error('Wi-Fi Host/Join did not retain the native Beta shell');
  fs.appendFileSync(path.join(to,'_headers'),
   '\n/ai/game\n  Cache-Control: no-store, max-age=0\n'+
   '/ai/game/\n  Cache-Control: no-store, max-age=0\n'+
   '/ai/game/index.html\n  Cache-Control: no-store, max-age=0\n');
  console.log('PKMSVV_BETA_WEBRTC_HOST_JOIN_ROUTE_READY=/ai/game/ -> /game/assets');
 }
 const sw=path.join(to,'sw.js');if(fs.existsSync(sw))fs.rmSync(sw);
if(!fs.existsSync(path.join(to,'game','js','app.min.js')))throw Error('Missing LAN compiled game');
console.log('PKMSVV LAN build ready in dist/lan');
