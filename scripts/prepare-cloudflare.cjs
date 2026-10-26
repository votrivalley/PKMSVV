'use strict';
/* Complete static web game for Cloudflare Pages Free, preserving all sprite URLs.
 * User saves remain in browser (same existing save keys). No Firebase login.
 */
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),source=path.join(root,'dist','ios'),dest=path.join(root,'dist','cloudflare');
if(process.env.PKMSVV_CLOUDFLARE_SKIP_BUILD!=='1')
 execFileSync(process.execPath,[path.join(root,'scripts','prepare-ios.cjs')],{cwd:root,stdio:'inherit'});
if(!fs.existsSync(path.join(source,'game','js','app.min.js')))throw Error('Missing complete HTML5 game build');
fs.rmSync(dest,{recursive:true,force:true});fs.cpSync(source,dest,{recursive:true});
const html=[
 '<!doctype html><html lang="vi"><head><meta charset="utf-8">',
 '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
 '<meta name="theme-color" content="#09283a">',
 '<meta name="apple-mobile-web-app-capable" content="yes">',
 '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
 '<meta name="apple-mobile-web-app-title" content="Pokémon Chuyển Sinh">',
 '<link rel="manifest" href="/manifest.webmanifest">',
 '<link rel="apple-touch-icon" href="/game/assets/icons/icon-180.png">',
 '<title>Pokémon Chuyển Sinh — Offline</title>',
 '<style>body{margin:0;background:#09283a;color:#fff;display:grid;place-items:center;min-height:100dvh;font:16px system-ui}</style>',
 '<script>',
 "try{localStorage.setItem('pkmsvv.web.saveMode','local');}catch(e){}",
 "if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{});",
 "location.replace('/game/');",
 '</script></head><body><p>Đang mở Pokémon Chuyển Sinh…</p>',
 '<noscript>Vui lòng bật JavaScript để chơi.</noscript></body></html>'
].join('\n');
fs.writeFileSync(path.join(dest,'index.html'),html,'utf8');
fs.copyFileSync(path.join(root,'src/cloudflare/sw.js'),path.join(dest,'sw.js'));
fs.copyFileSync(path.join(root,'src/cloudflare/_headers'),path.join(dest,'_headers'));
// Cloudflare-only localization for the boot that appears while game scripts load.
const htmlFile=path.join(dest,'game/index.html');
let gameHTML=fs.readFileSync(htmlFile,'utf8');
const from=gameHTML.indexOf('<div id="boot" class="boot">');
const to=gameHTML.indexOf('<script src="js/boot.js"></script>',from);
if(from<0||to<0)throw Error('Missing upstream loading-screen markup');
let loadingHTML=gameHTML.slice(from,to);
const translation=[
 ['Juego de supervivencia con Pokémon, gratis en el navegador y en el móvil.',
  'Game sinh tồn Pokémon — chơi ngay trên trình duyệt, không cần đăng nhập.'],
 ['<p class="boot-ld">Cargando…</p>',
  '<p class="boot-ld" lang="vi">Đang tải trò chơi…</p>']
];
for(const [oldText,newText] of translation){
 if(!loadingHTML.includes(oldText))throw Error('Original loading text changed: '+oldText);
 loadingHTML=loadingHTML.replace(oldText,newText);
}
loadingHTML=loadingHTML.replace(/(<h1[^>]*>)[^<]*(<\/h1>)/,'$1Pokémon Chuyển Sinh$2');
gameHTML=gameHTML.slice(0,from)+loadingHTML+gameHTML.slice(to);
fs.writeFileSync(htmlFile,gameHTML,'utf8');
const scriptFile=path.join(dest,'game/js/boot.js');
let bootScript=fs.readFileSync(scriptFile,'utf8');
const spanish="    es: ['Juego de supervivencia con Pokémon, gratis en el navegador y en el móvil.', 'Cargando…'],";
const oldSelector="  var p = document.querySelectorAll('#boot p');\n  p[0].textContent = copy[0]; p[1].textContent = copy[1];";
if(!bootScript.includes(spanish)||!bootScript.includes(oldSelector))throw Error('Upstream boot.js changed');
bootScript=bootScript.replace(spanish,
 "    vi: ['Game sinh tồn Pokémon — chơi ngay trên trình duyệt, không cần đăng nhập.', 'Đang tải trò chơi…'],\n"+spanish);
bootScript=bootScript.replace(oldSelector,
 "  var description = document.querySelector('#boot .boot-in > p:not(.pkmsvv-boot-credit):not(.boot-ld)');\n"+
 "  var progress = document.querySelector('#boot .boot-ld');\n"+
 "  if (description) description.textContent = copy[0];\n"+
 "  if (progress) progress.textContent = copy[1];");
fs.writeFileSync(scriptFile,bootScript,'utf8');

for(const name of ['manifest.webmanifest','game/manifest.webmanifest']){
 const file=path.join(dest,name),m=JSON.parse(fs.readFileSync(file,'utf8'));
 Object.assign(m,{id:'/',start_url:'/',scope:'/',display:'standalone',orientation:'landscape',
 name:'Pokémon Chuyển Sinh',short_name:'Pokémon Chuyển Sinh'});
 for(const icon of m.icons||[])if(!icon.src.startsWith('/game/'))
  throw Error('Broken PWA icon path: '+icon.src);
 fs.writeFileSync(file,JSON.stringify(m,null,2)+'\n','utf8');
}
for(const needed of ['index.html','sw.js','_headers','manifest.webmanifest',
 'game/index.html','game/js/app.min.js','game/js/boot.js','game/css/style.css',
 'game/js/ui/pkmsvv-local-shell.js','game/assets/icons/icon-180.png'])
 if(!fs.existsSync(path.join(dest,needed)))throw Error('Missing game asset: '+needed);
const bundle=fs.readFileSync(path.join(dest,'game/js/app.min.js'),'utf8');
if(/AIza[A-Za-z0-9_-]{35}|pkmsvv-b84d2-default-rtdb/.test(bundle))
 throw Error('Forbidden Google/Firebase configuration in offline game');
let files=0,total=0,max=0,largest='';
const maxFile=25*1024*1024;
function scan(folder){
 for(const item of fs.readdirSync(folder,{withFileTypes:true})){
  const filename=path.join(folder,item.name);
  if(item.isDirectory())scan(filename);
  else if(item.isFile()){
   const size=fs.statSync(filename).size;
   files++;total+=size;
   if(size>max){max=size;largest=path.relative(dest,filename);}
   if(size>maxFile)throw Error('Cloudflare Pages Free 25 MiB/file limit: '+path.relative(dest,filename));
  }
 }
}
scan(dest);
if(files>20000)throw Error('Cloudflare Pages Free 20,000 file limit: '+files);
if(files<1000||total<15*1024*1024)throw Error('Incomplete game: '+files+' files, '+total+' bytes');
const report={files,totalMiB:+(total/1048576).toFixed(2),largestFile:largest,
 largestMiB:+(max/1048576).toFixed(2),hosting:'Cloudflare Pages Free',
 gameRoute:'/game/',localSave:true,standalonePWA:true};
fs.writeFileSync(path.join(dest,'build-info.json'),JSON.stringify(report,null,2)+'\n');
console.log('Cloudflare Pages ready:',JSON.stringify(report));
