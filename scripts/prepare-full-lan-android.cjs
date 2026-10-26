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
const rel='js/ui/pkmsvv-full-lan-ui.js',dest=path.join(web,rel);
fs.mkdirSync(path.dirname(dest),{recursive:true});
fs.copyFileSync(path.join(root,'src/android/full-lan-ui.js'),dest);
const tag='<script defer src="'+rel+'"></script>';
if(!html.includes(tag))html=html.replace('</body>',tag+'\n</body>');
fs.copyFileSync(path.join(root,'src/shared/local-shell.js'),
 path.join(web,'js/ui/pkmsvv-local-shell.js'));
const localCSS=fs.readFileSync(path.join(root,'src/shared/local-shell.css'),'utf8');
html=html.replace('</head>','<style id="pkmsvv-local-shell-style">'+localCSS+'</style><style id="pkmsvv-android-compact-style">'+fs.readFileSync(path.join(root,'src/android/compact-landscape.css'),'utf8')+'</style></head>');
html=html.replace('</body>',
 '<script>window.PKMSVV_LOCAL_UI_MODE="android-full-lan"</script>\n<script defer src="js/ui/pkmsvv-local-shell.js"></script>\n</body>');
fs.writeFileSync(idx,html);
const cfg=JSON.parse(fs.readFileSync(configFile,'utf8'));
if(cfg.appId!=='com.ronvotri.pkmsvv')throw Error('Unexpected original Android identity: '+cfg.appId);
cfg.appId='com.votrivalley.pkmsvv.fulllan';
cfg.appName='Pokemon Chuyen Sinh Full LAN';
fs.writeFileSync(configFile,JSON.stringify(cfg,null,2)+'\n');
console.log('Full Android + Co-op LAN packaged; '+(size/1024/1024).toFixed(1)+' MiB of game assets. Existing app untouched.');
