'use strict';
// Stage only: applied in prepare-game once Chapter 2 artwork is approved.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(p,a,b){
 const f=path.join(game,p),s=fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n');
 if(s.split(a).length!==2)throw Error('Mission UI source changed: '+p+' anchor '+a.slice(0,75));
 fs.writeFileSync(f,s.replace(a,b),'utf8');
}
fs.copyFileSync(path.join(root,'src','pkmsvv-mission-cues.js'),path.join(game,'js','ui','pkmsvv-mission-cues.js'));
patch('dev.html',
 '<script defer src="js/ui/goals-ui.js"></script>',
 '<script defer src="js/ui/goals-ui.js"></script>\n<script defer src="js/ui/pkmsvv-mission-cues.js"></script>');
patch('js/ui/goals-ui.js',
 "      G.PKMSVVCollectUI.render(box);",
 "      G.PKMSVVCollectUI.render(box);\n      G.PKMSVVMissionCue.decorate(box);");
patch('js/ui/menu.js',
 "    $('menu-goals-sub').classList.toggle('gold', pend > 0);",
 "    $('menu-goals-sub').classList.toggle('gold', pend > 0);\n    G.PKMSVVMissionCue.refresh();");
const css="\n/* SVV mission attention: subtle, legible, safe for reduced motion. */\n#scr-menu [data-go=\"goals\"]{position:relative;transition:border-color .25s,box-shadow .25s,background .25s}\n#scr-menu [data-go=\"goals\"].pkmsvv-mission-new-menu{\n border-color:#6faefa!important;box-shadow:inset 0 0 0 1px #8ac6f8,0 0 13px rgba(99,189,255,.35)!important}\n#scr-menu [data-go=\"goals\"].pkmsvv-mission-ready-menu{\n border-color:#f7d26a!important;box-shadow:inset 0 0 0 1px #ffe9a1,0 0 19px rgba(255,207,77,.45)!important}\n.pkmsvv-mission-dot{position:absolute;top:4px;right:8px;min-width:22px;height:22px;border-radius:16px;\n background:#ffd16d;color:#162339;font-weight:900;font-size:13px;line-height:22px;text-align:center;\n box-shadow:0 0 12px rgba(246,206,71,.7);z-index:3;pointer-events:none}\n.pkmsvv-mission-dot.hidden{display:none!important}\n.pkmsvv-missions-priority>h3{margin:8px 0 12px;color:#ffe69c;font-size:15px}\n.mission.pkmsvv-mission-priority{position:relative;margin:12px 0 14px!important;padding-top:28px!important;\n border-color:#ffe59b!important;background:linear-gradient(135deg,rgba(101,71,11,.22),rgba(26,43,68,.94))!important;\n box-shadow:0 0 0 1px rgba(255,238,169,.24),0 0 14px rgba(255,207,90,.28);\n animation:pkmsvv-mission-pulse 2.8s ease-in-out infinite}\n.mission.pkmsvv-mission-priority .btn.gold{box-shadow:0 0 9px rgba(255,215,98,.4)}\n.pkmsvv-ready-label{position:absolute;top:5px;left:12px;color:#ffe6a1;font-weight:800;font-size:10px;letter-spacing:.05em}\n.mission.pkmsvv-mission-active{border-color:rgba(117,190,255,.39);box-shadow:inset 0 0 0 1px rgba(104,161,240,.09)}\n.mission.pkmsvv-mission-claimed,.pkmsvv-collection-claimed{opacity:.45!important;filter:saturate(.36);box-shadow:none;animation:none!important}\n.pkm-guide.pkmsvv-collection-priority{border:2px solid #ffe39b!important;background:rgba(129,96,23,.20)!important;\n box-shadow:0 0 14px rgba(255,215,100,.25);animation:pkmsvv-mission-pulse 2.8s ease-in-out infinite}\n@keyframes pkmsvv-mission-pulse{\n 0%,100%{box-shadow:0 0 0 1px rgba(255,235,159,.20),0 0 8px rgba(255,211,106,.18)}\n 50%{box-shadow:0 0 0 1px rgba(255,236,171,.50),0 0 17px rgba(255,215,118,.44)}}\n@media(prefers-reduced-motion:reduce){.mission.pkmsvv-mission-priority,.pkm-guide.pkmsvv-collection-priority{animation:none!important}}\n";
fs.appendFileSync(path.join(game,'css','style.css'),css,'utf8');
console.log('SVV Missions: new rewards glow and float to top; claimed items return to the original daily/weekly order.');
