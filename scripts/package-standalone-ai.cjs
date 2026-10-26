'use strict';
// Reuse one compiled AI engine on Web and Capacitor without copying sprites.
const fs=require('node:fs'),path=require('node:path');
module.exports=function packageAI({dest,assetBase='/game/'}){
 const lan=path.resolve(__dirname,'../dist/lan/game');
 const game=path.join(dest,'ai/game');
 fs.mkdirSync(path.join(game,'css'),{recursive:true});
 fs.cpSync(path.join(lan,'js'),path.join(game,'js'),{recursive:true});
 let css=fs.readFileSync(path.join(lan,'css/style.css'),'utf8');
 css=css.replace(/url\(\s*(['"]?)\.\.\//g,'url($1'+assetBase);
 fs.writeFileSync(path.join(game,'css/style.css'),css);
 let html=fs.readFileSync(path.join(lan,'index.html'),'utf8');
 if(!html.includes('<head>'))throw Error('Missing AI HTML head');
 html=html.replace('<head>',`<head><base href="${assetBase}"><script src="/ai/game/js/pkmsvv-ai-config.js"></script>`);
 fs.writeFileSync(path.join(game,'js/pkmsvv-ai-config.js'),
  "try{localStorage.setItem('pkmsvv.web.saveMode','local')}catch(e){}\n");
 html=html.replace(/(<script[^>]+src=")js\//g,'$1/ai/game/js/');
 html=html.replace(/(<link[^>]+href=")css\//g,'$1/ai/game/css/');
 html=html.replace(/<title>[^<]*<\/title>/,'<title>Pokémon Sinh Tồn — Chơi với AI</title>');
 fs.writeFileSync(path.join(game,'index.html'),html);
 const entry=`
 try{localStorage.setItem('pkmsvv.web.saveMode','local')}catch(e){}
 const q=new URLSearchParams(location.search),allowed=['coop','royale','eggrush'];
 const mode=allowed.includes(q.get('mode'))?q.get('mode'):'coop';
 location.replace('/ai/game/?pkmsvvRole=ai&pkmsvvMode='+encodeURIComponent(mode));
 `;
 fs.writeFileSync(path.join(dest,'ai/entry.js'),entry);
 const welcome='<!doctype html><html lang="vi"><meta charset="utf-8"><title>Chơi với AI</title><script defer src="/ai/entry.js"></script><body>Đang mở trận AI ngoại tuyến…</body></html>';
 fs.writeFileSync(path.join(dest,'ai/index.html'),welcome);
 if(!fs.readFileSync(path.join(game,'js/app.min.js'),'utf8').includes('PKMSVV_STANDALONE_AI'))
  throw Error('AI bundle was not compiled with in-memory transport');
};
