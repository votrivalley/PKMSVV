'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
// A real, purchasable individual Pokémon upgrade (not a global skill).
const upgrades=path.join(game,'js','data','upgrades.js');
const oldUpgrades=fs.readFileSync(upgrades,'utf8').replace(/\r\n/g,'\n');
const slot='  ];\n  const BY = {};';
if(oldUpgrades.split(slot).length!==2)throw Error('Personal upgrade list changed');
// The upstream 'start' entry was the final array element without a comma.
const finalStart=/({ id: 'start'[^\n]*grow: 1 })/;
if(!finalStart.test(oldUpgrades))throw Error('Original personal upgrade last entry changed');
const separated=oldUpgrades.replace(finalStart,'$1,');
fs.writeFileSync(upgrades,separated.replace(slot,
 "    { id: 'forget', icon: 'book', name: 'Quên Kỹ Năng', unit: 'Tối đa 1 lần mỗi trận sau khi học đủ kỹ năng', max: 1, base: 600, grow: 1 },\n"+slot));
const from='<script defer src="js/ui/pkmsvv-berry-rescue.js"></script>';
const to=from+'\n<script defer src="js/ui/pkmsvv-forget-skill.js"></script>\n<script defer src="js/ui/pkmsvv-wiki.js"></script>';
const html=path.join(game,'dev.html'),src=fs.readFileSync(html,'utf8');
if(src.split(from).length!==2)throw Error('Forget skill install anchor changed');
fs.writeFileSync(html,src.replace(from,to));
fs.copyFileSync(path.join(root,'src','pkmsvv-forget-skill.js'),path.join(game,'js','ui','pkmsvv-forget-skill.js'));
fs.copyFileSync(path.join(root,'src','pkmsvv-wiki.js'),path.join(game,'js','ui','pkmsvv-wiki.js'));
fs.appendFileSync(path.join(game,'css','style.css'),`
/* Per-Pokémon skill reset overlays only that actor's own level-up selection. */
.pkmsvv-forget-skill{position:fixed;inset:0;z-index:20040;display:grid;place-items:center;padding:14px;
 background:rgba(4,15,32,.80);box-sizing:border-box}
.pkmsvv-forget-panel{width:min(490px,94vw);max-height:85vh;overflow-y:auto;padding:18px;
 border:2px solid #e8c0ff;border-radius:15px;background:#1d3047;color:#f6f3ff;box-shadow:0 14px 44px #020b1b}
.pkmsvv-forget-panel h2{font-size:20px;color:#ffe4ae;margin:0 0 8px}
.pkmsvv-forget-panel p{font-size:13px;line-height:1.5;color:#e5f0ef}
.pkmsvv-forget-choice{display:block;width:100%;text-align:left;margin:10px 0;padding:14px;
 border:2px solid #a48ac8;background:#35436b;color:#fff;border-radius:10px;font-size:15px;font-weight:800}
.pkmsvv-forget-choice:focus-visible{outline:3px solid #ffe97e}
`);

// New Wiki navigation and safe, equal-height per-Pokémon upgrade cards.
// Keep original palette but eliminate the narrow last two cards and inaccessible buttons.
fs.appendFileSync(path.join(game,'css','style.css'),`
#scr-upgrades #upg-list{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important;align-items:stretch!important}
#scr-upgrades #upg-list>.upg-item{display:grid!important;grid-template-columns:44px minmax(0,1fr)!important;grid-template-rows:minmax(72px,auto) auto!important;
 gap:9px!important;min-width:0!important;width:100%!important;height:auto!important;min-height:148px!important;max-width:none!important;
 box-sizing:border-box!important;padding:14px!important;align-items:start!important;overflow:visible!important}
#scr-upgrades #upg-list>.upg-item>.ic{grid-column:1;grid-row:1;min-width:0}
#scr-upgrades #upg-list>.upg-item>div:nth-child(2){grid-column:2;grid-row:1;min-width:0;overflow-wrap:break-word;font-size:13px;line-height:1.45}
#scr-upgrades #upg-list>.upg-item>div:nth-child(2)>b{display:block;font-size:15px;line-height:1.35}
#scr-upgrades #upg-list>.upg-item .upg-btns{grid-column:1/-1;grid-row:2;display:flex!important;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}
#scr-upgrades #upg-list>.upg-item .upg-btns button{cursor:pointer!important;pointer-events:auto!important;min-height:39px}
#scr-upgrades #upg-list>.upg-item .pips{max-width:100%;display:flex;flex-wrap:wrap;gap:3px}
#scr-upgrades #upg-list> :not(.upg-item){grid-column:1/-1}
@media(max-width:640px){#scr-upgrades #upg-list{grid-template-columns:1fr!important}}
#scr-upgrade-select #pkmsvv-skill-guide,#scr-upgrade-select #pkmsvv-support-entry,#scr-upgrade-select #pkmsvv-mega-entry{display:none!important}
#scr-menu .pkmsvv-offline-save-note{background:#092935!important;color:#fff4a3!important;
 border:2px solid #f3d27c!important;text-shadow:0 1px 2px #061520!important;
 box-shadow:0 3px 10px #06151dc9!important;font-weight:850!important;letter-spacing:.01em}
#scr-menu .pkmsvv-v15-news-card,#scr-menu .pkmsvv-v15-news-card *{color:#193d49;text-shadow:none}
#scr-menu .pkmsvv-credit,#scr-menu .pkmsvv-credit *{color:#ffe7b1!important;text-shadow:0 1px 3px #08191e!important}
.pkmsvv-wiki-overlay{position:fixed;inset:0;z-index:23000;display:grid;place-items:center;background:#041727dc;padding:12px}
.pkmsvv-wiki-panel{width:min(780px,96vw);max-height:90dvh;overflow:auto;padding:20px;border:2px solid #8fd9ca;
 border-radius:16px;background:linear-gradient(145deg,#175462,#0d3041);color:#f1ffff;box-shadow:0 18px 48px #06121c}
.pkmsvv-wiki-panel>header{display:flex;align-items:center;justify-content:space-between;gap:12px}
.pkmsvv-wiki-panel h2{font-size:clamp(17px,2vw,23px);color:#ffe59e;margin:0}
.pkmsvv-wiki-action{padding:10px 15px;min-height:40px;cursor:pointer;background:#ffe078;color:#173441;font-weight:800;border:2px solid #bb933a;border-radius:9px;margin:5px 5px 5px 0}
.pkmsvv-wiki-section{margin:11px 0;padding:12px;border:1px solid #79c0b8;border-radius:11px;background:#204d58;color:#f5ffff}
.pkmsvv-wiki-section>summary{cursor:pointer;font-weight:800;font-size:15px;color:#ffe8a9}
.pkmsvv-wiki-content{padding:11px 3px 2px;font-size:13px;line-height:1.55}
.pkmsvv-wiki-content p{margin:5px 0 9px;color:#f6ffff}
#scr-menu #pkmsvv-menu-wiki{display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px}
@media(max-width:550px){.pkmsvv-wiki-panel{padding:12px}.pkmsvv-wiki-panel>header{flex-wrap:wrap}}
`,'utf8');
console.log('Per Pokémon one-time skill forgetting installed in ordinary level-up cards.');
