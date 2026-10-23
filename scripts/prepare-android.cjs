'use strict';
// Bundle only the already-patched game into a local Capacitor WebView.
const fs=require('node:fs'),path=require('node:path');
const project=path.join(__dirname,'..');
const source=path.join(project,'vendor','pokesurvivor');
const dest=path.join(project,'mobile','www');
if(!fs.existsSync(path.join(source,'index.html')))throw Error('Please run npm run prepare:game first');
fs.rmSync(dest,{recursive:true,force:true});
fs.mkdirSync(dest,{recursive:true});
for(const dir of ['assets','css','js']){
 const orig=path.join(source,dir);
 if(!fs.existsSync(orig))throw Error('Missing required game directory: '+dir);
 fs.cpSync(orig,path.join(dest,dir),{recursive:true,force:true});
}
for(const file of ['index.html','favicon.ico','manifest.webmanifest','version.json','LICENSE','LICENSE-NONCOMMERCIAL.md','CREDITS.md','NOTICE-PKMSVV.txt']){
 const from=path.join(source,file);
 if(fs.existsSync(from))fs.copyFileSync(from,path.join(dest,file));
}
const idx=path.join(dest,'index.html');
let html=fs.readFileSync(idx,'utf8');
if(!/<\/head>/i.test(html))throw Error('Missing </head> in game');
const csp='<meta http-equiv="Content-Security-Policy" content="connect-src \'self\'; object-src \'none\'; base-uri \'self\'">\n';
const css='<style>html,body{overscroll-behavior:none;touch-action:manipulation}</style>\n';
html=html.replace(/<html lang="[^"]*">/,'<html lang="vi">');
html=html.replace(/<\/head>/i,csp+css+'</head>');
fs.writeFileSync(idx,html,'utf8');
const manifest=path.join(dest,'manifest.webmanifest');
if(fs.existsSync(manifest)){
 const data=JSON.parse(fs.readFileSync(manifest,'utf8'));
 data.name='Pokémon Sống Sót — Votri Valley';
 data.short_name='Sống Sót';
 data.short_name='PKMSVV';
 data.lang='vi';
 data.orientation='landscape';
 data.display='fullscreen';
 fs.writeFileSync(manifest,JSON.stringify(data,null,2)+'\n','utf8');
}
console.log('PKMSVV: Offline Android runtime ready in mobile/www');
