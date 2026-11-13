'use strict';
/* Production update CANDIDATE: overlay the already tested 2.0 game assets
 * into a signed original-package APK; keep the app ID and save sandbox.
 * This never deploys automatically. Sign again with the original keystore. */
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const {copyRegionCovers}=require('./copy-region-covers.cjs');
const {copyFusionIcons}=require('./copy-fusion-icons.cjs');
const decoded=path.resolve(process.argv[2]||'');
if(!decoded||!fs.existsSync(path.join(decoded,'AndroidManifest.xml')))
 throw Error('Usage: node scripts/patch-v20-android-production.cjs <apktool-output>');
const prod='com.votrivalley.pkmsvv.fulllan';
const manifest=path.join(decoded,'AndroidManifest.xml');
let xml=fs.readFileSync(manifest,'utf8');
if(!xml.includes('package="'+prod+'"'))throw Error('Unexpected original Android package');
// Apktool 3 stores versionCode under apktool.yml/versionInfo on many APKs,
// not inside the decoded AndroidManifest. Update both locations when present.
const toolMeta=path.join(decoded,'apktool.yml');
if(!fs.existsSync(toolMeta))throw Error('Apktool metadata missing');
let yaml=fs.readFileSync(toolMeta,'utf8');
const manifestCode=xml.match(/android:versionCode="(\d+)"/);
const metaCode=yaml.match(/^(\s*versionCode:\s*)['"]?(\d+)['"]?\s*$/m);
if(!manifestCode&&!metaCode)throw Error('Original Android versionCode missing from manifest AND apktool.yml');
const oldCode=Number(manifestCode?.[1]||metaCode?.[2]);
const nextCode=Math.max(250001,oldCode+1);
if(!Number.isSafeInteger(nextCode)||nextCode>=2100000000)
 throw Error('Unsafe Android versionCode');
if(manifestCode)xml=xml.replace(manifestCode[0],'android:versionCode="'+nextCode+'"');
if(metaCode)yaml=yaml.replace(metaCode[0],metaCode[1]+String(nextCode));
yaml=yaml.replace(/^(\s*versionName:\s*)['"]?[^\n'"]+['"]?\s*$/m,(_,prefix)=>prefix+"'2.0.1'");
fs.writeFileSync(toolMeta,yaml);
if(/android:versionName="[^"]+"/.test(xml))
 xml=xml.replace(/android:versionName="[^"]+"/,'android:versionName="2.0.1"');
// Keep exact production application ID and ContentProvider authorities.
if(xml.includes('com.votrivalley.pkmsvv.box4qa0'))throw Error('QA identity found in original');
xml=xml.replace(/(android:name=")\.([a-zA-Z_$][\w.$]*")/g,(_,a,b)=>a+prod+'.'+b);
if(!xml.includes(prod+'.MainActivity'))throw Error('Original Android Activity not resolved');
fs.writeFileSync(manifest,xml);
const strings=path.join(decoded,'res/values/strings.xml');
if(!fs.existsSync(strings))throw Error('Decoded Android strings missing');
let txt=fs.readFileSync(strings,'utf8');
txt=txt.replace(/(<string name="app_name">)[^<]*(<\/string>)/,'$1Pokémon Chuyển Sinh 2.0$2');
txt=txt.replace(/(<string name="title_activity_main">)[^<]*(<\/string>)/,'$1Pokémon Chuyển Sinh 2.0$2');
if(!txt.includes('Pokémon Chuyển Sinh 2.0'))throw Error('Android production title not patched');
fs.writeFileSync(strings,txt);
const web=path.join(decoded,'assets/public');
const index=path.join(web,'index.html');
if(!fs.existsSync(index))throw Error('Baseline APK missing FULL LAN game assets');
let html=fs.readFileSync(index,'utf8');
if(!html.includes('app.min.js')||!html.includes('</head>')||!html.includes('</body>'))
 throw Error('Baseline game HTML changed; refusing injection');
for(const filename of ['pkmsvv-box-stage1.js','pkmsvv-box-stage2.js','pkmsvv-box-stage2-ui.js',
 'pkmsvv-box-stage3.js','pkmsvv-box-stage4.js','pkmsvv-box-hub.js','pkmsvv-box-hub-ui.js','pkmsvv-quick-region.js','pkmsvv-forget-skill.js','pkmsvv-encounter-rarity-qa.js','pkmsvv-pc-menu-clean-qa.js','pkmsvv-modal-navigation-qa.js','pkmsvv-runtime-controls-qa.js','pkmsvv-dex-defeats-qa.js','pkmsvv-recruitment-qa.js','pkmsvv-v20-ui-qa.js','pkmsvv-changelog-v20-qa.js']){
 const dest=path.join(web,'js/ui',filename);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.copyFileSync(path.join(root,'src',filename),dest);
 if(!html.includes(filename))html=html.replace('</body>','<script defer src="js/ui/'+filename+'"></script>\n</body>');
}
for(const filename of ['pkmsvv-box-stage1.css','pkmsvv-box-stage2.css','pkmsvv-box-stage3.css','pkmsvv-box-hub.css','pkmsvv-quick-region.css','pkmsvv-pc-menu-clean-qa.css','pkmsvv-modal-navigation-qa.css','pkmsvv-support-scroll-fix.css','pkmsvv-runtime-controls-qa.css','pkmsvv-v20-ui-qa.css','pkmsvv-recruitment-qa.css']){
 const dest=path.join(web,'css',filename);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.copyFileSync(path.join(root,'src',filename),dest);
 if(!html.includes(filename))html=html.replace('</head>','<link rel="stylesheet" href="css/'+filename+'">\n</head>');
}
copyRegionCovers(web);
copyFusionIcons(web);
const eggMusic=path.join(root,'custom-music/eggrush.ogg');
if(!fs.existsSync(eggMusic)||fs.statSync(eggMusic).size<100000)
 throw Error('Berry release needs real Tranh Trứng OGG');
fs.mkdirSync(path.join(web,'assets/music-custom'),{recursive:true});
fs.copyFileSync(eggMusic,path.join(web,'assets/music-custom/eggrush.ogg'));
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
}else{
 throw Error('Production update requires compiled app.min.js');
}

html=html.replace(/<title>[^<]*<\/title>/,'<title>Pokémon Chuyển Sinh 2.0</title>');
if(!html.includes('pkmsvv-story-ui-fix.css'))throw Error('Story split stylesheet missing');
fs.writeFileSync(index,html);
fs.writeFileSync(path.join(web,'PKMSVV-PRODUCTION-CANDIDATE.txt'),
 'Pokémon Chuyển Sinh 2.0 — Android in-place update candidate. Back up your save before installing. Original package and signature retained.\\n');
const config=path.join(decoded,'assets/capacitor.config.json');
if(fs.existsSync(config)){
 const data=fs.readFileSync(config,'utf8');
 if(data.includes('com.votrivalley.pkmsvv.box4qa0'))throw Error('QA app ID in Capacitor config');
 if(!data.includes(prod))throw Error('Capacitor production package missing');
}
console.log('Patched original Android package',prod,'versionCode',nextCode);