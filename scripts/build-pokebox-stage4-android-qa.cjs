'use strict';
/* Isolated Android PokéBox QA. Never mutate the production APK or update package.
 * Called after prepare:android:full-lan, before npx cap sync android.
 * With --isolate-android-project: called AFTER configure-android-stable-signing.cjs.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const {copyRegionCovers}=require('./copy-region-covers.cjs');
const QA_ID='com.votrivalley.pkmsvv.pokeboxqa';
const PROD_ID='com.votrivalley.pkmsvv.fulllan';
const web=path.join(root,'mobile/www');
function inject(){
 const htmlFile=path.join(web,'index.html');
 if(!fs.existsSync(htmlFile))throw Error('Build FULL Android LAN game before PokéBox QA overlay');
 let html=fs.readFileSync(htmlFile,'utf8');
 if(!html.includes('app.min.js')||!html.includes('</body>')||!html.includes('</head>'))
  throw Error('FULL Android game HTML anchor missing; refusing QA overlay');
 const scripts=['pkmsvv-box-stage1.js','pkmsvv-box-stage2.js',
  'pkmsvv-box-stage2-ui.js','pkmsvv-box-stage3.js','pkmsvv-box-stage4.js','pkmsvv-box-hub.js','pkmsvv-box-hub-ui.js','pkmsvv-quick-region.js','pkmsvv-pc-menu-clean-qa.js','pkmsvv-modal-navigation-qa.js','pkmsvv-v20-ui-qa.js','pkmsvv-changelog-v20-qa.js'];
 const css=['pkmsvv-box-stage1.css','pkmsvv-box-stage2.css','pkmsvv-box-stage3.css','pkmsvv-box-hub.css','pkmsvv-quick-region.css','pkmsvv-pc-menu-clean-qa.css','pkmsvv-modal-navigation-qa.css','pkmsvv-v20-ui-qa.css'];
 for(const file of scripts){
  const dest=path.join(web,'js/ui',file);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(path.join(root,'src',file),dest);
  if(!html.includes(file))html=html.replace('</body>','<script defer src="js/ui/'+file+'"></script>\n</body>');
 }
 for(const file of css){
  const dest=path.join(web,'css',file);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(path.join(root,'src',file),dest);
  if(!html.includes(file))html=html.replace('</head>','<link rel="stylesheet" href="css/'+file+'">\n</head>');
 }
 copyRegionCovers(web);
 // The app title must unambiguously say this is a separate test build.
 html=html.replace(/<title>[^<]*<\/title>/,'<title>PokéBox 4/4 QA — KHÔNG PHẢI BẢN CHÍNH</title>');
 fs.writeFileSync(htmlFile,html,'utf8');
 fs.writeFileSync(path.join(web,'POKEBOX-QA-ONLY.txt'),
  'This is a QA app installed separately. No production update or cloud deployment. Always import a COPY of your JSON save. Do not use your only save.\n');
 console.log('Injected PokéBox Stage 4 into FULL Android WebView. Not signed or packaged yet.');
}
function isolate(){
 const appGradle=path.join(root,'android/app/build.gradle');
 const strings=path.join(root,'android/app/src/main/res/values/strings.xml');
 if(!fs.existsSync(appGradle)||!fs.existsSync(strings))throw Error('Capacitor Android project missing');
 let gradle=fs.readFileSync(appGradle,'utf8');
 if(!gradle.includes('PKMSVV_STABLE_SIGNING_BEGIN'))throw Error('Permanent signing not configured before QA isolation');
 const anchor='applicationId "'+PROD_ID+'"';
 if(gradle.split(anchor).length!==2)throw Error('Expected exactly one production application ID in build.gradle');
 gradle=gradle.replace(anchor,'applicationId "'+QA_ID+'"');
 fs.writeFileSync(appGradle,gradle);
 let labels=fs.readFileSync(strings,'utf8');
 labels=labels.replace(/(<string name="app_name">)[^<]*(<\/string>)/,
  '$1PokéBox QA - Chuyen Sinh$2');
 labels=labels.replace(/(<string name="title_activity_main">)[^<]*(<\/string>)/,
  '$1PokéBox QA$2');
 if(!labels.includes('PokéBox QA'))throw Error('QA Android app label anchor missing');
 fs.writeFileSync(strings,labels);
 // Do not touch namespace/Java classes; Android APK identity is applicationId.
 console.log('Isolated QA Android application ID:',QA_ID);
}
if(process.argv.includes('--isolate-android-project'))isolate();else inject();
