'use strict';
/* Build isolated portable PC QA by copying a successful baseline win-unpacked.
 * Never rewrites source PC release, and never touches the signing identity. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const source=path.resolve(process.env.PKMSVV_BOX_PC_BASE||path.join(root,'dist/lan-windows/win-unpacked'));
const dest=path.resolve(process.env.PKMSVV_BOX_PC_QA_OUT||path.join(root,'dist/pokebox-stage4-pc-qa'));
if(source===dest||dest.startsWith(source+path.sep)||source.startsWith(dest+path.sep))throw Error('Unsafe QA path');
const game=path.join(source,'resources/lan-site/game');
if(!fs.existsSync(path.join(game,'index.html')))throw Error('Build a baseline Windows win-unpacked first');
fs.rmSync(dest,{recursive:true,force:true});fs.cpSync(source,dest,{recursive:true});
// Electron's default PC userData is shared across folders. Never point this
// experiment at the player's installed save. Change the packaged app.asar
// launcher to an isolated, persistent QA profile BEFORE distributing the ZIP.
const asarPath=path.join(dest,'resources/app.asar');
const bytes=fs.readFileSync(asarPath);
const headerBytes=bytes.readUInt32LE(12),headerSize=bytes.readUInt32LE(4);
let header=bytes.subarray(16,16+headerBytes).toString('utf8');
const meta=JSON.parse(header).files?.desktop?.files?.['lan-main.cjs'];
if(!meta||!meta.integrity)throw Error('Cannot verify Electron launcher to isolate QA save');
const offset=8+headerSize+Number(meta.offset),end=offset+meta.size;
const oldMain=bytes.subarray(offset,end);
const a=Buffer.from('PKMSVV-LAN-Beta'),b=Buffer.from('PKMSVV-BOX-QA-1');
if(a.length!==b.length||oldMain.indexOf(a)<0||oldMain.indexOf(a)!==oldMain.lastIndexOf(a))
 throw Error('PC userData name anchor changed; refusing unsafe QA build');
const replaced=Buffer.from(oldMain);
b.copy(replaced,oldMain.indexOf(a));
const newHash=crypto.createHash('sha256').update(replaced).digest('hex');
header=header.replaceAll(meta.integrity.hash,newHash);
if(Buffer.byteLength(header)!==headerBytes)throw Error('ASAR integrity header length changed');
replaced.copy(bytes,offset);Buffer.from(header).copy(bytes,16);
fs.writeFileSync(asarPath,bytes);
const out=path.join(dest,'resources/lan-site/game');
fs.copyFileSync(path.join(root,'src/pkmsvv-box-stage1.js'),path.join(out,'js/ui/pkmsvv-box-stage1.js'));
fs.copyFileSync(path.join(root,'src/pkmsvv-box-stage1.css'),path.join(out,'css/pkmsvv-box-stage1.css'));
for(const [filename,sub] of [['pkmsvv-box-stage2.js','js/ui'],['pkmsvv-box-stage2-ui.js','js/ui'],['pkmsvv-box-stage2.css','css'],['pkmsvv-box-stage3.js','js/ui'],['pkmsvv-box-stage3.css','css'],['pkmsvv-box-stage4.js','js/ui'],['pkmsvv-box-hub.js','js/ui'],['pkmsvv-box-hub-ui.js','js/ui'],['pkmsvv-box-hub.css','css'],['pkmsvv-quick-region.js','js/ui'],['pkmsvv-quick-region.css','css']])
 fs.copyFileSync(path.join(root,'src',filename),path.join(out,sub,filename));
const entry=path.join(out,'index.html');let html=fs.readFileSync(entry,'utf8');
if(!html.includes('</head>')||!html.includes('</body>'))throw Error('PC QA entry changed');
if(!html.includes('pkmsvv-box-stage1.css'))html=html.replace('</head>','<link rel="stylesheet" href="css/pkmsvv-box-stage1.css">\n</head>');
if(!html.includes('pkmsvv-box-stage1.js'))html=html.replace('</body>','<script defer src="js/ui/pkmsvv-box-stage1.js"></script>\n</body>');
for(const cssName of ['pkmsvv-box-stage2.css','pkmsvv-box-stage3.css','pkmsvv-box-hub.css','pkmsvv-quick-region.css'])if(!html.includes(cssName))html=html.replace('</head>','<link rel="stylesheet" href="css/'+cssName+'">\n</head>');
for(const name of ['pkmsvv-box-stage2.js','pkmsvv-box-stage2-ui.js','pkmsvv-box-stage3.js','pkmsvv-box-stage4.js','pkmsvv-box-hub.js','pkmsvv-box-hub-ui.js','pkmsvv-quick-region.js'])
 if(!html.includes(name))html=html.replace('</body>','<script defer src="js/ui/'+name+'"></script>\n</body>');
fs.writeFileSync(entry,html);
fs.writeFileSync(path.join(dest,'POKEBOX-STAGE1-QA.txt'),'PokéBox Stage 1+2+3+4 QA only. Extract to a separate folder; never overwrite your existing installed game. Export JSON backup before migration. No production release.\n');
console.log('PokéBox Stage 4 Windows QA output:',dest);