'use strict';
/* One Save Guardian 2.0 implementation for Cloudflare, Windows and Android.
 * Never overwrite the old cloud-only script or duplicate its independent
 * startup handler: it has a global idempotency guard.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
const source=path.join(root,'src','cloudflare','save-guardian.js');
const output=path.join(game,'js','ui','pkmsvv-save-guardian.js');
const html=path.join(game,'dev.html');
fs.mkdirSync(path.dirname(output),{recursive:true});fs.copyFileSync(source,output);
let text=fs.readFileSync(html,'utf8');
const anchor='<script defer src="js/ui/pkmsvv-save-ui.js"></script>';
if(!text.includes(anchor)||text.includes('pkmsvv-save-guardian.js'))
 throw Error('Save Guardian 2.0 mount missing or duplicated');
text=text.replace(anchor,'<script defer src="js/ui/pkmsvv-save-guardian.js"></script>\n'+anchor);
fs.writeFileSync(html,text,'utf8');
console.log('Save Guardian 2.0: local-only transaction journal and safe restore comparison bundled on all platforms.');
