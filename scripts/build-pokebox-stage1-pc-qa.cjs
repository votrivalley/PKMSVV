'use strict';
/* Build isolated portable PC QA by copying a successful baseline win-unpacked.
 * Never rewrites source PC release, and never touches the signing identity. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=path.resolve(process.env.PKMSVV_BOX_PC_BASE||path.join(root,'dist/lan-windows/win-unpacked'));
const dest=path.resolve(process.env.PKMSVV_BOX_PC_QA_OUT||path.join(root,'dist/pokebox-stage1-pc-qa'));
if(source===dest||dest.startsWith(source+path.sep)||source.startsWith(dest+path.sep))throw Error('Unsafe QA path');
const game=path.join(source,'resources/lan-site/game');
if(!fs.existsSync(path.join(game,'index.html')))throw Error('Build a baseline Windows win-unpacked first');
fs.rmSync(dest,{recursive:true,force:true});fs.cpSync(source,dest,{recursive:true});
const out=path.join(dest,'resources/lan-site/game');
fs.copyFileSync(path.join(root,'src/pkmsvv-box-stage1.js'),path.join(out,'js/ui/pkmsvv-box-stage1.js'));
fs.copyFileSync(path.join(root,'src/pkmsvv-box-stage1.css'),path.join(out,'css/pkmsvv-box-stage1.css'));
const entry=path.join(out,'index.html');let html=fs.readFileSync(entry,'utf8');
if(!html.includes('</head>')||!html.includes('</body>'))throw Error('PC QA entry changed');
if(!html.includes('pkmsvv-box-stage1.css'))html=html.replace('</head>','<link rel="stylesheet" href="css/pkmsvv-box-stage1.css">\n</head>');
if(!html.includes('pkmsvv-box-stage1.js'))html=html.replace('</body>','<script defer src="js/ui/pkmsvv-box-stage1.js"></script>\n</body>');
fs.writeFileSync(entry,html);
fs.writeFileSync(path.join(dest,'POKEBOX-STAGE1-QA.txt'),'PokéBox Stage 1 QA only. Extract to a separate folder; never overwrite your existing installed game. Export JSON backup before migration. No production release.\n');
console.log('PokéBox Stage 1 Windows QA output:',dest);