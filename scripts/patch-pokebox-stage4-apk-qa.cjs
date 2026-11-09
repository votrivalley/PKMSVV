'use strict';
/* Patch a previously signed Android FULL LAN APK after apktool decode.
 * QA changes ONLY: assets and Android applicationId. Native classes remain
 * in the original Java namespace; every relative Activity name is expanded.
 * The rebuilt APK MUST be signed again with the existing stable keystore.
 */
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const {copyRegionCovers}=require('./copy-region-covers.cjs');
const {copyFusionIcons}=require('./copy-fusion-icons.cjs');
const decoded=path.resolve(process.argv[2]||'');
if(!decoded||!fs.existsSync(path.join(decoded,'AndroidManifest.xml')))
 throw Error('Usage: node scripts/patch-pokebox-stage4-apk-qa.cjs <apktool-output>');
const prod='com.votrivalley.pkmsvv.fulllan';
const qa='com.votrivalley.pkmsvv.box4qa0';
const manifest=path.join(decoded,'AndroidManifest.xml');
let xml=fs.readFileSync(manifest,'utf8');
if(!xml.includes('package="'+prod+'"'))throw Error('Unexpected signed APK application ID');
xml=xml.replace('package="'+prod+'"','package="'+qa+'"');

/* Each Android ContentProvider's authorities must be globally unique across
 * installed apps. Changing applicationId alone leaves Capacitor's provider
 * authority pointing at the production app and causes INSTALL_FAILED_CONFLICTING_PROVIDER.
 * Only remap authorities: never rewrite Java class names or broad manifest strings. */
let remappedAuthorities=0;
xml=xml.replace(/android:authorities="([^"]+)"/g,(full,authorities)=>{
 if(!authorities.includes(prod))return full;
 const remapped=authorities.split(';').map(a=>a.startsWith(prod)?qa+a.slice(prod.length):a).join(';');
 if(remapped!==authorities)remappedAuthorities++;
 return 'android:authorities="'+remapped+'"';
});
if(!remappedAuthorities)throw Error('Baseline APK ContentProvider authority missing: review manifest before QA install');
if((xml.match(/android:authorities="[^"]+"/g)||[]).some(authority=>authority.includes(prod)))
 throw Error('Production ContentProvider authority remains in QA APK');

// Android Activity class names are compiled in the original Java namespace.
// Only resource/application ID changes, to give the app a separate save sandbox.
xml=xml.replace(/(android:name=")\.([a-zA-Z_$][\w.$]*")/g,(_,a,b)=>a+prod+'.'+b);
if(!xml.includes(prod+'.MainActivity')||!xml.includes(qa))throw Error('Android entry class did not resolve');
fs.writeFileSync(manifest,xml);
const strings=path.join(decoded,'res/values/strings.xml');
if(!fs.existsSync(strings))throw Error('Decoded Android strings missing');
let txt=fs.readFileSync(strings,'utf8');
txt=txt.replace(/(<string name="app_name">)[^<]*(<\/string>)/,'$1PokeBox Stage4 QA$2');
txt=txt.replace(/(<string name="title_activity_main">)[^<]*(<\/string>)/,'$1PokeBox Stage4 QA$2');
if(!txt.includes('PokeBox Stage4 QA'))throw Error('QA label not patched');
fs.writeFileSync(strings,txt);
const web=path.join(decoded,'assets/public');
const index=path.join(web,'index.html');
if(!fs.existsSync(index))throw Error('Baseline APK missing FULL LAN game assets');
let html=fs.readFileSync(index,'utf8');
if(!html.includes('app.min.js')||!html.includes('</head>')||!html.includes('</body>'))
 throw Error('Baseline game HTML changed; refusing injection');
for(const filename of ['pkmsvv-box-stage1.js','pkmsvv-box-stage2.js','pkmsvv-box-stage2-ui.js',
 'pkmsvv-box-stage3.js','pkmsvv-box-stage4.js','pkmsvv-box-hub.js','pkmsvv-box-hub-ui.js','pkmsvv-quick-region.js','pkmsvv-encounter-rarity-qa.js','pkmsvv-pc-menu-clean-qa.js','pkmsvv-modal-navigation-qa.js','pkmsvv-runtime-controls-qa.js','pkmsvv-dex-defeats-qa.js','pkmsvv-recruitment-qa.js','pkmsvv-v20-ui-qa.js','pkmsvv-changelog-v20-qa.js']){
 const dest=path.join(web,'js/ui',filename);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.copyFileSync(path.join(root,'src',filename),dest);
 if(!html.includes(filename))html=html.replace('</body>','<script defer src="js/ui/'+filename+'"></script>\n</body>');
}
for(const filename of ['pkmsvv-box-stage1.css','pkmsvv-box-stage2.css','pkmsvv-box-stage3.css','pkmsvv-box-hub.css','pkmsvv-quick-region.css','pkmsvv-pc-menu-clean-qa.css','pkmsvv-modal-navigation-qa.css','pkmsvv-support-scroll-fix.css','pkmsvv-runtime-controls-qa.css','pkmsvv-v20-ui-qa.css']){
 const dest=path.join(web,'css',filename);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.copyFileSync(path.join(root,'src',filename),dest);
 if(!html.includes(filename))html=html.replace('</head>','<link rel="stylesheet" href="css/'+filename+'">\n</head>');
}
copyRegionCovers(web);
copyFusionIcons(web);
fs.mkdirSync(path.join(web,'images'),{recursive:true});
fs.copyFileSync(path.join(root,'src/pkmsvv-menu-icons.webp'),path.join(web,'images/pkmsvv-menu-icons.webp'));
// Keep the same illustrated story and compact layout in Android WebView.
const storyCssName='pkmsvv-story-ui-fix.css';
fs.copyFileSync(path.join(root,'src/pkmsvv-story.css'),path.join(web,'css',storyCssName));
if(!html.includes(storyCssName))html=html.replace('</head>',
 '<link rel="stylesheet" href="css/'+storyCssName+'">\\n</head>');
const nativeStory=path.join(web,'js/ui/pkmsvv-story.js');
if(fs.existsSync(nativeStory))fs.copyFileSync(path.join(root,'src/pkmsvv-story.js'),nativeStory);
const wikiQA=path.join(web,'js/ui/pkmsvv-wiki-qa.js');
fs.copyFileSync(path.join(root,'src/pkmsvv-wiki.js'),wikiQA);
if(!html.includes('pkmsvv-wiki-qa.js'))
 html=html.replace('</body>','<script defer src="js/ui/pkmsvv-wiki-qa.js"></script>\n</body>');
const hordeName='pkmsvv-horde-performance.js';
fs.copyFileSync(path.join(root,'src',hordeName),path.join(web,'js/ui',hordeName));
if(!html.includes(hordeName))
 html=html.replace('</body>','<script defer src="js/ui/'+hordeName+'"></script>\n</body>');
const evolvedJS=path.join(web,'js/ui/pkmsvv-fusion-evolved.js');
fs.copyFileSync(path.join(root,'src/pkmsvv-fusion-evolved.js'),evolvedJS);
fs.copyFileSync(path.join(root,'src/pkmsvv-fusion-evolved.css'),path.join(web,'css/pkmsvv-fusion-evolved.css'));
if(!html.includes('pkmsvv-fusion-evolved.css'))
 html=html.replace('</head>','<link rel="stylesheet" href="css/pkmsvv-fusion-evolved.css">\n</head>');
if(!html.includes('pkmsvv-fusion-evolved.js'))
 html=html.replace('</body>','<script defer src="js/ui/pkmsvv-fusion-evolved.js"></script>\n</body>');
const style=path.join(web,'css/pkmsvv-prebattle-qa.css');
fs.copyFileSync(path.join(root,'src/pkmsvv-prebattle-qa.css'),style);
if(!html.includes('pkmsvv-prebattle-qa.css'))
 html=html.replace('</head>','<link rel="stylesheet" href="css/pkmsvv-prebattle-qa.css">\n</head>');
const compiledBundle=path.join(web,'js/app.min.js');
if(fs.existsSync(compiledBundle)){
 execFileSync(process.execPath,[path.join(root,'scripts/patch-qa-compiled-modules.cjs'),
  compiledBundle],{stdio:'inherit'});
 require('./patch-v20-story-bundle.cjs').patchFile(compiledBundle);
}else if(!/^pkmbx-apk-manifest-/.test(path.basename(decoded))){
 throw Error('Real QA Android package lacks compiled app.min.js; refusing incomplete game');
}
// Only the isolated manifest unit fixture omits the compiled game.

html=html.replace(/<title>[^<]*<\/title>/,'<title>PokeBox QA — Not Production</title>');
if(!html.includes('pkmsvv-story-ui-fix.css'))throw Error('Story split stylesheet missing');
fs.writeFileSync(index,html);
fs.writeFileSync(path.join(web,'POKEBOX-QA-ONLY.txt'),
 'QA-only Android package com.votrivalley.pkmsvv.box4qa0. Never install over production. Import only a backup copy of JSON save.');
// Capacitor config is informational but must not point back to production package.
const config=path.join(decoded,'assets/capacitor.config.json');
if(fs.existsSync(config)){
 let text=fs.readFileSync(config,'utf8').replaceAll(prod,qa);
 fs.writeFileSync(config,text);
}
console.log('Patched PokéBox QA package',qa,'and remapped',remappedAuthorities,'ContentProvider authorities');
