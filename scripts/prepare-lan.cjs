'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const env={...process.env,PKMSVV_WEB_PREVIEW:'1',PKMSVV_LAN_BUILD:'1'};
execFileSync(process.execPath,[path.join(root,'scripts','prepare-web.cjs')],{cwd:root,env,stdio:'inherit'});
const from=path.join(root,'dist','web'),to=path.join(root,'dist','lan');
fs.rmSync(to,{recursive:true,force:true});fs.cpSync(from,to,{recursive:true,force:true});
fs.copyFileSync(path.join(root,'src','lan','index.html'),path.join(to,'index.html'));
fs.copyFileSync(path.join(root,'src','lan','entry.js'),path.join(to,'entry.js'));
for(const file of ['lan-connect.html','lan-connect.js'])
 fs.copyFileSync(path.join(root,'src','ios',file),path.join(to,file));
// The LAN site is built independently of the native dist/game directory.
 // Copy the same local-only art resources as the PC game to avoid empty icons.
 const game=path.join(to,'game'),images=path.join(game,'images');
 function addFile(src,relative){
  if(!fs.existsSync(src))throw Error('Missing pinned local PC asset: '+src);
  const out=path.join(images,relative);
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(src,out);
 }
 addFile(path.join(root,'src/pkmsvv-menu-icons.webp'),'pkmsvv-menu-icons.webp');
 addFile(path.join(root,'assets/research-lab-menu-icon.png'),'pkmsvv-research-lab-icon.png');
 addFile(path.join(root,'assets/research-station-icons.png'),'pkmsvv-research-station-icons.png');
 addFile(path.join(root,'assets/pippi-skill-icons.png'),'pippi/skill-icons.png');
 const pippi=path.join(root,'assets/pippi-pmd');
 if(!fs.existsSync(path.join(pippi,'Walk-Anim.png')))throw Error('Pippi native sprites not fetched');
 fs.mkdirSync(images,{recursive:true});
 fs.cpSync(pippi,path.join(images,'pippi'),{recursive:true});
 const lab=path.join(root,'assets/coop-lab');
 if(!fs.existsSync(path.join(lab,'room_base.png')))throw Error('Fossil Lab native room missing');
 fs.cpSync(lab,path.join(images,'coop-lab'),{recursive:true});
 for(const rel of ['pkmsvv-menu-icons.webp','pippi/Walk-Anim.png','pippi/portrait/Happy.png',
  'coop-lab/room_base.png','coop-lab/decor/machine_old.png',
  'coop-lab/decor/kabuto_skeleton.png','coop-lab/decor/research_terminal.png']){
  if(!fs.existsSync(path.join(images,rel)))throw Error('LAN packaging missing '+rel);
 }
 const sw=path.join(to,'sw.js');if(fs.existsSync(sw))fs.rmSync(sw);
if(!fs.existsSync(path.join(to,'game','js','app.min.js')))throw Error('Missing LAN compiled game');
console.log('PKMSVV LAN build ready in dist/lan');
