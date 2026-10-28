'use strict';
/* Package a full game + LAN launcher without modifying game saves or keys. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),web=path.join(root,'mobile','www');
const idx=path.join(web,'index.html'),configFile=path.join(root,'capacitor.config.json');
for(const p of ['assets','css','js','manifest.webmanifest','LICENSE-NONCOMMERCIAL.md','NOTICE-PKMSVV.txt'])
 if(!fs.existsSync(path.join(web,p)))throw Error('Missing FULL game: '+p+' — run prepare:game then prepare:android');
let html=fs.readFileSync(idx,'utf8');
if(!html.includes('app.min.js')||!html.includes('</body>'))throw Error('Missing compiled full game HTML');
function bytes(dir){let n=0;for(const item of fs.readdirSync(dir,{withFileTypes:true})){
 const p=path.join(dir,item.name);if(item.isDirectory())n+=bytes(p);else if(item.isFile())n+=fs.statSync(p).size;
}return n;}
const size=bytes(path.join(web,'assets'));
if(size<15*1024*1024)throw Error('Incomplete FULL game assets: '+size);
const cfg=JSON.parse(fs.readFileSync(configFile,'utf8'));
if(cfg.appId!=='com.ronvotri.pkmsvv')throw Error('Unexpected original Android identity: '+cfg.appId);
cfg.appId='com.votrivalley.pkmsvv.fulllan';
cfg.appName='Pokemon Chuyen Sinh Full LAN';
fs.writeFileSync(configFile,JSON.stringify(cfg,null,2)+'\n');
// Android boots exactly the PC standalone LAN+AI engine at /index.html.
// This eliminates the second /ai/game/ document (source of frozen screens).
require('./compile-standalone-ai.cjs')();
const game=path.join(root,'dist','lan','game');
for(const name of ['index.html','js/app.min.js','css/style.css'])
 if(!fs.statSync(path.join(game,name)).isFile())throw Error('Missing compiled LAN game '+name);
for(const dir of ['js','css']){
 fs.rmSync(path.join(web,dir),{force:true,recursive:true});
 fs.cpSync(path.join(game,dir),path.join(web,dir),{recursive:true});
}
let main=fs.readFileSync(path.join(game,'index.html'),'utf8');
if(!main.includes('</head>')||!main.includes('js/app.min.js'))
 throw Error('Incomplete compiled LAN game HTML');
const mobileCSS=fs.readFileSync(path.join(root,'src/android/compact-landscape.css'),'utf8');
main=main.replace('</head>',
 '<meta name="pkmsvv-platform" content="android-pc-lan-shared">'+
 '<script>window.PKMSVV_ANDROID_LOCAL_LAN=true;window.PKMSVV_STANDALONE_AI_AVAILABLE=true;</script>'+
 '<style id="pkmsvv-android-compact-style">'+mobileCSS+'</style></head>');
fs.writeFileSync(idx,main);
fs.copyFileSync(path.join(root,'src/android/full-lan-ui.js'),
 path.join(web,'js/ui/pkmsvv-full-lan-ui.js')); // bundled, NOT executed
if(!fs.readFileSync(path.join(web,'js/app.min.js'),'utf8').includes('PKMSVV_STANDALONE_AI'))
 throw Error('Android root missing AI gameplay bundle');
console.log('Android SAME LAN/AI PC game engine, one root document, local save preserved; '+
 (size/1048576).toFixed(1)+' MiB sprites.');
