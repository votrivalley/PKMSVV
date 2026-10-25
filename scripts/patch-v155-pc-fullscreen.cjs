'use strict';
// Shared packaging, PC-only runtime: Android and Web never receive the control.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
const target=path.join(game,'js','ui','pkmsvv-pc-fullscreen.js');
fs.copyFileSync(path.join(root,'src','pkmsvv-pc-fullscreen.js'),target);
const entry=path.join(game,'dev.html'),s=fs.readFileSync(entry,'utf8');
const anchor='<script defer src="js/main.js"></script>';
if(s.split(anchor).length!==2)throw Error('PC fullscreen entry anchor changed');
fs.writeFileSync(entry,s.replace(anchor,
 '<script defer src="js/ui/pkmsvv-pc-fullscreen.js"></script>\n'+anchor),'utf8');
console.log('PKMSVV: native fullscreen restore exposed inside pause + graphics only on Electron PC.');
