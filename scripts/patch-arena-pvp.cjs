'use strict';
/* Install the identical Arena PvP implementation into LAN, Web and Android.
 * This is a source module after G.Coop: no standalone AI or counterfeit
 * opponent; room.mode === "arena" with two human uids is mandatory.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
const html=path.join(game,'dev.html');
const src=path.join(root,'src','lan','arena-pvp.js');
const dst=path.join(game,'js','net','pkmsvv-arena-pvp.js');
fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);
const original=fs.readFileSync(html,'utf8');
const anchor='<script defer src="js/net/coop.js"></script>';
if(!original.includes(anchor))throw Error('Arena PvP missing source Co-op loader');
if(original.includes('pkmsvv-arena-pvp.js'))throw Error('Arena PvP registered twice');
fs.writeFileSync(html,original.replace(anchor,anchor+'\n<script defer src="js/net/pkmsvv-arena-pvp.js"></script>'));
fs.appendFileSync(path.join(game,'css','style.css'),'\n'+
 fs.readFileSync(path.join(root,'src','lan','arena-pvp.css'),'utf8')+'\n');
console.log('Arena 1v1: real LAN humans only, host authoritative 3-2-1, skill damage and result.');
