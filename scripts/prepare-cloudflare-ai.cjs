'use strict';
/* Package genuine single-device AI matches into the SAME Cloudflare site without
 * duplicating 13,000 sprite/audio assets. LAN gameplay is compiled against an
 * in-memory room bus; all ordinary assets keep using /game/ URLs.
 */
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const vendor=path.join(root,'vendor','pokesurvivor');
const dest=path.join(root,'dist','cloudflare'),lan=path.join(root,'dist','lan');
const PIN='11fe868c640b62ac37beacc222e056bc4d9ec892';
if(!fs.existsSync(path.join(dest,'game','js','app.min.js')))
 throw Error('Build ordinary Cloudflare game before standalone AI mode');
// The first Web compilation patches the checked-out upstream in place. Reset
// ONLY the pinned vendor checkout (never user saves or root custom-music), so
// the LAN compilation does not apply any gameplay patches twice.
const current=execFileSync('git',['rev-parse','HEAD'],{cwd:vendor,encoding:'utf8'}).trim();
if(current!==PIN)throw Error('Refusing to reset non-pinned PokéSurvivor checkout');
execFileSync('git',['reset','--hard',PIN],{cwd:vendor,stdio:'inherit'});
execFileSync('git',['clean','-fd'],{cwd:vendor,stdio:'inherit'});
execFileSync(process.execPath,[path.join(root,'scripts','prepare-lan.cjs')],{
 cwd:root,stdio:'inherit',env:{...process.env,PKMSVV_STANDALONE_AI:'1'}
});
const ai=path.join(dest,'ai'),game=path.join(ai,'game');
fs.mkdirSync(path.join(game,'js'),{recursive:true});
fs.mkdirSync(path.join(game,'css'),{recursive:true});
fs.copyFileSync(path.join(lan,'game','js','app.min.js'),path.join(game,'js','app.min.js'));
let css=fs.readFileSync(path.join(lan,'game','css','style.css'),'utf8');
// CSS relative files would otherwise resolve under /ai/game/ instead of /game/.
css=css.replace(/url\(\s*(['"]?)\.\.\//g,'url($1/game/');
fs.writeFileSync(path.join(game,'css','style.css'),css,'utf8');
let html=fs.readFileSync(path.join(lan,'game','index.html'),'utf8');
const js=/<script defer src="js\/app\.min\.js\?v=[^"]+"><\/script>/;
const styles=/<link rel="stylesheet" href="css\/style\.css\?v=[^"]+">/;
if(!html.includes('<head>')||!js.test(html)||!styles.test(html))
 throw Error('Standalone AI HTML has unexpected asset anchors');
html=html.replace('<head>',`<head><base href="/game/"><script>try{localStorage.setItem('pkmsvv.web.saveMode','local')}catch(e){}</script>`);
html=html.replace(js,'<script defer src="/ai/game/js/app.min.js"></script>');
html=html.replace(styles,'<link rel="stylesheet" href="/ai/game/css/style.css">');
html=html.replace(/<title>[^<]*<\/title>/,'<title>Pokémon Sinh Tồn — Chơi với AI</title>');
fs.writeFileSync(path.join(game,'index.html'),html,'utf8');
const welcome=`<!doctype html><html lang="vi"><meta charset="utf-8"><title>Chơi với AI — Pokémon Sinh Tồn</title><script>
try{localStorage.setItem('pkmsvv.web.saveMode','local')}catch(e){}\nconst allowed=['coop','royale','eggrush'];const q=new URLSearchParams(location.search);
const mode=allowed.includes(q.get('mode'))?q.get('mode'):'coop';
location.replace('/ai/game/?pkmsvvRole=ai&pkmsvvMode='+encodeURIComponent(mode));
</script><body>Đang mở trận AI ngoại tuyến…</body></html>`;
fs.writeFileSync(path.join(ai,'index.html'),welcome,'utf8');
if(!fs.readFileSync(path.join(game,'js','app.min.js'),'utf8').includes('PKMSVV_STANDALONE_AI'))
 throw Error('Standalone AI runtime flag missing from compiled bundle');
console.log('AI HTML5 mode ready at /ai/ (all 3 modes, in-browser room + engine bots).');
