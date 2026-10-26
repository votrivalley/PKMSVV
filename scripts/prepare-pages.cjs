'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),ios=path.join(root,'dist','ios'),dest=path.join(root,'dist','pages');
const repo=process.env.GITHUB_REPOSITORY||'votrivalley/PKMSVV',project=repo.split('/').pop();
if(!/^[\w.-]{1,100}$/.test(project)||project==='.'||project==='..')throw Error('Invalid project path');
const prefix='/'+project+'/';
if(process.env.PKMSVV_PAGES_SKIP_BUILD!=='1')
 execFileSync(process.execPath,[path.join(root,'scripts','prepare-ios.cjs')],{cwd:root,stdio:'inherit'});
if(!fs.existsSync(path.join(ios,'game','js','app.min.js')))throw Error('Missing complete game');
fs.rmSync(dest,{recursive:true,force:true});fs.cpSync(ios,dest,{recursive:true});
const read=p=>fs.readFileSync(p,'utf8'),write=(p,c)=>fs.writeFileSync(p,c,'utf8');
const url=/(['"\x60(=:]\s*)\/(game\/|sw\.js|entry\.js|index\.html|manifest\.webmanifest|favicon\.ico|assets\/|css\/|js\/)/g;
function fix(text){
 return text.replace(url,(match,lead,target)=>lead+prefix+target)
  .replace(/(\bscope\s*:\s*['"])\/(['"])/g,(match,lead,trail)=>lead+prefix+trail);
}
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
 const p=path.join(dir,ent.name);
 if(ent.isDirectory())walk(p);
 else if(ent.isFile()&&/\.(html|js|css)$/.test(ent.name))write(p,fix(read(p)));
}}
walk(path.join(dest,'game'));
write(path.join(dest,'index.html'),[
 '<!doctype html><html lang="vi"><head><meta charset="utf-8">',
 '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
 '<meta name="theme-color" content="#0a2633">',
 '<meta name="apple-mobile-web-app-capable" content="yes">',
 '<meta name="apple-mobile-web-app-title" content="Pokémon Chuyển Sinh">',
 '<link rel="manifest" href="./manifest.webmanifest">',
 '<link rel="apple-touch-icon" href="./game/assets/icons/icon-180.png">',
 '<title>Pokémon Chuyển Sinh — Offline</title>',
 '<style>body{margin:0;background:#09283a;color:#e9faf5;min-height:100dvh;display:grid;place-items:center;font:16px system-ui}</style>',
 '<script>',
 "try{localStorage.setItem('pkmsvv.web.saveMode','local');}catch(e){}",
 "if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});",
 "location.replace(new URL('./game/',location.href).href);",
 '</script></head><body><p>Đang mở Pokémon Chuyển Sinh…</p>',
 '<noscript>Game cần JavaScript. Hãy bật JavaScript trong Safari.</noscript></body></html>'
].join('\n'));
for(const name of ['manifest.webmanifest','game/manifest.webmanifest']){
 const filename=path.join(dest,name),m=JSON.parse(read(filename));
 Object.assign(m,{id:prefix,start_url:prefix,scope:prefix,display:'standalone',
 name:'Pokémon Chuyển Sinh',short_name:'Pokémon Chuyển Sinh',orientation:'landscape'});
 m.icons=(m.icons||[]).map(icon=>({...icon,src:icon.src.startsWith('/')?
  prefix+icon.src.replace(/^\/+/,''):prefix+'game/'+icon.src.replace(/^\.?\//,'')}));
 write(filename,JSON.stringify(m,null,2)+'\n');
}
const swFile=path.join(dest,'sw.js');
let sw=fix(read(swFile)).replace("const SHELL=['/'","const SHELL=['"+prefix+"'");
if(!sw.includes("const SHELL=['"+prefix+"'"))throw Error('Service worker shell URL changed');
sw=sw.replace("const CACHE='pkmsvv-ios-v1516-1'","const CACHE='pkmsvv-pages-"+project.toLowerCase()+"-v1516-2'");
sw=sw.replace("k.startsWith('pkmsvv-ios-')", "(k.startsWith('pkmsvv-ios-')||k.startsWith('pkmsvv-pages-'))");
write(swFile,sw);
for(const item of ['index.html','sw.js','manifest.webmanifest','game/index.html','game/js/app.min.js'])
 if(!fs.existsSync(path.join(dest,item)))throw Error('Missing compiled '+item);
if(/AIza[A-Za-z0-9_-]{35}|pkmsvv-b84d2-default-rtdb/.test(read(path.join(dest,'game/js/app.min.js'))))
 throw Error('Unexpected Google authentication material');
write(path.join(dest,'.nojekyll'),'');
console.log('PKMSVV: local-only Pages build is ready at dist/pages for '+prefix);
