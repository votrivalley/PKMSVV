'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
execFileSync(process.execPath,[path.join(root,'scripts','build-mega-ui-catalog.cjs')],{cwd:root,stdio:'inherit'});
const file=path.join(game,'dev.html'),html=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
const anchor='<script defer src="js/ui/pkmsvv-mega-entry.js"></script>';
if(html.split(anchor).length!==2)throw Error('Mega Phase 2 script ordering drift');
fs.writeFileSync(file,html.replace(anchor,
 '<script defer src="js/data/pkmsvv-mega-catalog.js"></script>\n'+anchor));
fs.copyFileSync(path.join(root,'src','pkmsvv-mega-entry.js'),path.join(game,'js','ui','pkmsvv-mega-entry.js'));
fs.appendFileSync(path.join(game,'css','style.css'),'\n'+fs.readFileSync(path.join(root,'src','pkmsvv-mega-phase2.css'),'utf8')+'\n');
console.log('Phase 2 Mega encyclopedia installed after Phase 1.');
