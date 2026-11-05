'use strict';
/* QA-only overlay. Never writes to dist/cloudflare or invokes Cloudflare deploy. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=path.resolve(process.env.PKMSVV_BOX_BASE||path.join(root,'dist/cloudflare'));
const dest=path.resolve(process.env.PKMSVV_BOX_QA_OUT||path.join(root,'dist/pokebox-stage2-qa'));
if(source===dest||dest.startsWith(source+path.sep)||source.startsWith(dest+path.sep))throw Error('Unsafe QA path');
if(!fs.existsSync(path.join(source,'game/index.html')))throw Error('First build Web with npm run prepare:cloudflare');
fs.rmSync(dest,{recursive:true,force:true});fs.cpSync(source,dest,{recursive:true});
for(const variant of ['game','ai/game']){
 const html=path.join(dest,variant,'index.html');
 if(!fs.existsSync(html))continue;
 const pathJS=path.join(dest,variant,'js/ui/pkmsvv-box-stage1.js');
 const pathCSS=path.join(dest,variant,'css/pkmsvv-box-stage1.css');
 fs.mkdirSync(path.dirname(pathJS),{recursive:true});fs.mkdirSync(path.dirname(pathCSS),{recursive:true});
 fs.copyFileSync(path.join(root,'src/pkmsvv-box-stage1.js'),pathJS);
 fs.copyFileSync(path.join(root,'src/pkmsvv-box-stage1.css'),pathCSS);
 for(const [filename,sub] of [['pkmsvv-box-stage2.js','js/ui'],['pkmsvv-box-stage2-ui.js','js/ui'],['pkmsvv-box-stage2.css','css']]){
  fs.copyFileSync(path.join(root,'src',filename),path.join(dest,variant,sub,filename));
 }
 let body=fs.readFileSync(html,'utf8');
 const css='<link rel="stylesheet" href="css/pkmsvv-box-stage1.css">';
 const script='<script defer src="js/ui/pkmsvv-box-stage1.js"></script>';
 if(!body.includes('</head>')||!body.includes('</body>'))throw Error('QA game HTML structure changed');
 if(!body.includes('pkmsvv-box-stage1.css'))body=body.replace('</head>',css+'\n</head>');
 if(!body.includes('pkmsvv-box-stage1.js'))body=body.replace('</body>',script+'\n</body>');
 for(const cssName of ['pkmsvv-box-stage2.css'])if(!body.includes(cssName))
  body=body.replace('</head>','<link rel="stylesheet" href="css/'+cssName+'">\n</head>');
 for(const jsName of ['pkmsvv-box-stage2.js','pkmsvv-box-stage2-ui.js'])if(!body.includes(jsName))
  body=body.replace('</body>','<script defer src="js/ui/'+jsName+'"></script>\n</body>');
 fs.writeFileSync(html,body);
}
fs.writeFileSync(path.join(dest,'POKEBOX-STAGE1-QA.txt'),[
 'Pokémon Chuyển Sinh — PokéBox Stage 1+2 QA ONLY',
 'This is a completely separate website snapshot; not a released game.',
 'Run with a local HTTP server, e.g. python -m http.server 8000',
 'Open http://localhost:8000/ai/game/ for local offline QA.',
 'Back up your original save OUTSIDE the app before enabling migration.',
 'Never publish this QA directory as production.',
 'Stage 2: Gacha instances and Rank A+C are test-only; never deploy as production.',
 ''].join('\n'), 'utf8');
console.log('PokéBox Stage 1 isolated QA build:',dest);