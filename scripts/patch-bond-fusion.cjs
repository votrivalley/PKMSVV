'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),base=path.join(root,'vendor/pokesurvivor');
const mod='js/ui/pkmsvv-bond-fusion.js';
fs.copyFileSync(path.join(root,'src/pkmsvv-bond-fusion.js'),path.join(base,mod));
function patch(file,from,to){
 const p=path.join(base,file),s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 if(s.split(from).length!==2)throw Error('Fusion pilot patch drift: '+file+': '+from.slice(0,100));
 fs.writeFileSync(p,s.replace(from,to));
}
const script='<script defer src="js/ui/pkmsvv-held-item-ui.js"></script>';
patch('dev.html',script,script+'\n<script defer src="'+mod+'"></script>');
patch('js/game.js',
 '    const opt = pl.bondOptions();',
 '    const pilot=G.PKMSVVFusionPilot;\n'+
 '    const opt=pilot?.pilotEligible?.(pl)?pilot.options(pl):pl.bondOptions();');
patch('js/game.js',
 '      const group = pl.fuse(picked, opt.group);',
 "      if(opt.pilot&&!G.PKMSVVFusionPilot?.confirm?.(pl,picked)){\n"+
 "        if(state==='choice')state=holdBy.length?'held':'playing';\n"+
 "        if(G.Coop.active)G.Coop.holdEnd();\n"+
 "        return;\n"+
 "      }\n"+
 '      const group = pl.fuse(picked, opt.group);');
const css="#scr-bond .pkmsvv-fusion-pilot-hint{\n margin:7px 0 10px;padding:9px 12px;border-radius:10px;\n background:#183e49;border:2px solid #d6b75d;color:#fff0ad;\n font:800 clamp(12px,1.8vw,15px)/1.5 \"Segoe UI\",sans-serif;\n text-align:center;overflow-wrap:anywhere\n}\n#scr-bond .pkmsvv-fusion-pilot-hint[hidden]{display:none!important}\n@media(orientation:landscape) and (max-height:430px){\n #scr-bond .pkmsvv-fusion-pilot-hint{padding:5px 8px;font-size:11px}\n}";
fs.appendFileSync(path.join(base,'css/style.css'),'\n'+css+'\n');
console.log('PKMSVV: five real 2-move Fusion recipes for Solo PvE, one per match.');
fs.appendFileSync(path.join(base,'css/style.css'),`\n.pkmsvv-fusion-recipes{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:5px;padding:6px 0}\n.pkmsvv-fusion-recipe{display:flex;align-items:center;flex-wrap:wrap;gap:5px;background:#163e50;border:1px solid #83c4c8;border-radius:8px;padding:7px;color:#fff}\n.pkmsvv-fusion-move{display:inline-flex;align-items:center;gap:5px;font-size:12px}.pkmsvv-fusion-move svg{width:20px;height:20px}.pkmsvv-fusion-recipe strong{color:#ffe47a}\n`);

fs.appendFileSync(path.join(base,'css/style.css'),String.raw`
/* Fusion lives above the Mystery Orb queue and never overlays pause/menu. */
#pkmsvv-fusion-action{
 position:fixed;left:calc(50% - 71px);bottom:208px;z-index:12018;
 min-width:106px;min-height:34px;padding:5px 9px;
 border:2px solid #93d6d1;border-radius:9px;
 background:linear-gradient(160deg,#19475c,#133442);color:#fff3b2;
 font:900 12px/1.15 "Segoe UI",sans-serif;letter-spacing:.4px;
 box-shadow:0 3px 10px #03192388;cursor:pointer;
}
#pkmsvv-fusion-action:disabled{opacity:.55;cursor:default}
#pkmsvv-fusion-action[hidden]{display:none!important}
body:has(#scr-pause:not([hidden])) #pkmsvv-fusion-action,
body:has(#scr-menu:not([hidden])) #pkmsvv-fusion-action,
body:has(#scr-settings:not([hidden])) #pkmsvv-fusion-action{
 display:none!important;pointer-events:none!important
}
@media(max-width:720px),(pointer:coarse){
 #pkmsvv-fusion-action{left:auto;right:max(12px,env(safe-area-inset-right));
 bottom:max(233px,env(safe-area-inset-bottom) + 204px);
 min-width:80px;min-height:31px;padding:4px 6px;font-size:10px}
}
`+'\n');

fs.appendFileSync(path.join(base,'css/style.css'),String.raw`
.pkmsvv-fusion-guide{position:fixed;inset:0;z-index:13050;background:rgba(1,14,25,.76);
 display:flex;align-items:center;justify-content:center;padding:12px}
.pkmsvv-fusion-guide-panel{box-sizing:border-box;width:min(560px,96vw);
 max-height:88dvh;overflow:auto;background:#153c49;color:#fff;
 border:2px solid #95d8cb;border-radius:14px;padding:16px;box-shadow:0 12px 28px #0009}
.pkmsvv-fusion-guide-panel h2{color:#ffe8a4;font-size:clamp(18px,3vw,23px);margin:0 0 7px}
.pkmsvv-fusion-guide-panel p{font-size:12px;line-height:1.5;color:#fff;margin:6px 0 12px}
.pkmsvv-fusion-guide-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;
 border:1px solid #72bbb8;background:#0a2f3b;border-radius:9px;padding:7px 9px;margin:6px 0}
.pkmsvv-fusion-guide-pair{display:flex;align-items:center;flex-wrap:wrap;gap:7px;min-width:0;flex:1}
.pkmsvv-fusion-guide-move{display:inline-flex;align-items:center;gap:4px;font-size:12px}
.pkmsvv-fusion-guide-move svg{width:24px;height:24px;flex:none}
.pkmsvv-fusion-guide-row>b{font-size:12px;color:#ffe77c}
.pkmsvv-fusion-guide-row>small{font-size:11px;color:#b9e4d9;width:100%}
.pkmsvv-fusion-guide-panel>.btn{margin-top:10px}
@media (max-height:430px){.pkmsvv-fusion-guide-panel{padding:8px;max-height:90dvh}
 .pkmsvv-fusion-guide-row{padding:3px 6px;margin:3px 0}}
`+'\n');
