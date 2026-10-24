'use strict';
// Shared PC/Android/Web: run-only fullscreen restore control.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),base=path.join(root,'vendor','pokesurvivor');
const src='js/ui/pkmsvv-fullscreen-recover.js';
fs.copyFileSync(path.join(root,'src','pkmsvv-fullscreen-recover.js'),path.join(base,src));
const html=path.join(base,'dev.html');
let s=fs.readFileSync(html,'utf8').replace(/\r\n/g,'\n');
const old='<script defer src="js/ui/settings-ui.js"></script>';
if(s.split(old).length!==2)throw Error('Match fullscreen: settings script anchor changed');
s=s.replace(old,old+'\n<script defer src="'+src+'"></script>');
fs.writeFileSync(html,s);
const css=`\n/* In-run one-tap fullscreen RECOVERY. Pause remains at upper-right. */
#pkmsvv-full-restore{
 position:fixed;z-index:1151;top:max(14px,env(safe-area-inset-top));
 right:max(86px,calc(env(safe-area-inset-right) + 86px));
 width:42px;height:42px;padding:0;margin:0;
 display:grid;place-items:center;cursor:pointer;pointer-events:auto;
 background:#1c4069;color:#e8f8ff;border:2px solid #7bbde9;
 border-radius:11px;box-shadow:0 3px 10px #0009;
 font:700 28px/1 "Segoe UI",sans-serif;
}
#pkmsvv-full-restore[hidden]{display:none!important}
#pkmsvv-full-restore:active{transform:scale(.96)}
#pkmsvv-full-restore:focus-visible{outline:3px solid #ffdf83;outline-offset:3px}
#pkmsvv-full-restore:disabled{opacity:.6;cursor:wait}
html.pkmsvv-full-restore-coop #pkmsvv-full-restore{
 right:max(194px,calc(env(safe-area-inset-right) + 194px));
}
@media(max-width:600px){
 #pkmsvv-full-restore{
  top:max(10px,env(safe-area-inset-top));
  right:max(71px,calc(env(safe-area-inset-right) + 71px));
  width:35px;height:35px;font-size:23px;border-radius:9px;
 }
 html.pkmsvv-full-restore-coop #pkmsvv-full-restore{
  right:max(164px,calc(env(safe-area-inset-right) + 164px));
 }
}
`;
fs.appendFileSync(path.join(base,'css','style.css'),css);
console.log('PKMSVV: restore-only fullscreen button added for live matches.');
