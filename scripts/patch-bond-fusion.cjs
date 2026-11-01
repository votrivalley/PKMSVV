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
