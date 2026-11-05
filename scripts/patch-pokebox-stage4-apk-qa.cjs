'use strict';
/* Patch a previously signed Android FULL LAN APK after apktool decode.
 * QA changes ONLY: assets and Android applicationId. Native classes remain
 * in the original Java namespace; every relative Activity name is expanded.
 * The rebuilt APK MUST be signed again with the existing stable keystore.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const decoded=path.resolve(process.argv[2]||'');
if(!decoded||!fs.existsSync(path.join(decoded,'AndroidManifest.xml')))
 throw Error('Usage: node scripts/patch-pokebox-stage4-apk-qa.cjs <apktool-output>');
const prod='com.votrivalley.pkmsvv.fulllan';
const qa='com.votrivalley.pkmsvv.box4qa0';
const manifest=path.join(decoded,'AndroidManifest.xml');
let xml=fs.readFileSync(manifest,'utf8');
if(!xml.includes('package="'+prod+'"'))throw Error('Unexpected signed APK application ID');
xml=xml.replace('package="'+prod+'"','package="'+qa+'"');
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
 'pkmsvv-box-stage3.js','pkmsvv-box-stage4.js']){
 const dest=path.join(web,'js/ui',filename);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.copyFileSync(path.join(root,'src',filename),dest);
 if(!html.includes(filename))html=html.replace('</body>','<script defer src="js/ui/'+filename+'"></script>\n</body>');
}
for(const filename of ['pkmsvv-box-stage1.css','pkmsvv-box-stage2.css','pkmsvv-box-stage3.css']){
 const dest=path.join(web,'css',filename);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.copyFileSync(path.join(root,'src',filename),dest);
 if(!html.includes(filename))html=html.replace('</head>','<link rel="stylesheet" href="css/'+filename+'">\n</head>');
}
html=html.replace(/<title>[^<]*<\/title>/,'<title>PokeBox QA — Not Production</title>');
fs.writeFileSync(index,html);
fs.writeFileSync(path.join(web,'POKEBOX-QA-ONLY.txt'),
 'QA-only Android package com.votrivalley.pkmsvv.box4qa0. Never install over production. Import only a backup copy of JSON save.');
// Capacitor config is informational but must not point back to production package.
const config=path.join(decoded,'assets/capacitor.config.json');
if(fs.existsSync(config)){
 let text=fs.readFileSync(config,'utf8').replaceAll(prod,qa);
 fs.writeFileSync(config,text);
}
console.log('Patched four PokéBox phases into isolated Android QA package',qa);
