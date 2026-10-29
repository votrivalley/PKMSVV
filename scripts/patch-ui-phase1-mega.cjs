'use strict';
/* Last palette layer, after v1.5 menu styling and Mega Lucario prototype.
 * Visual changes ONLY: do not touch Pokémon data, saves or game modes.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
const htmlPath=path.join(game,'dev.html');
const html=fs.readFileSync(htmlPath,'utf8').replace(/\r\n/g,'\n');
const anchor='<script defer src="js/ui/pkmsvv-support-catalog.js"></script>';
if(html.split(anchor).length!==2)throw Error('Phase 1 Mega UI source drift: support catalogue script not unique');
fs.writeFileSync(htmlPath,html.replace(anchor,anchor+'\n<script defer src="js/ui/pkmsvv-mega-entry.js"></script>'),'utf8');
fs.copyFileSync(path.join(root,'src','pkmsvv-mega-entry.js'),
 path.join(game,'js','ui','pkmsvv-mega-entry.js'));
fs.appendFileSync(path.join(game,'css','style.css'),'\n'+
 fs.readFileSync(path.join(root,'src','pkmsvv-phase1-pastel.css'),'utf8')+'\n','utf8');
console.log('Phase 1: mint/yellow game menu + functional Mega button beside Support installed.');
