'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
const from='<script defer src="js/ui/pkmsvv-berry-rescue.js"></script>';
const to=from+'\n<script defer src="js/ui/pkmsvv-forget-skill.js"></script>';
const html=path.join(game,'dev.html'),src=fs.readFileSync(html,'utf8');
if(src.split(from).length!==2)throw Error('Forget skill install anchor changed');
fs.writeFileSync(html,src.replace(from,to));
fs.copyFileSync(path.join(root,'src','pkmsvv-forget-skill.js'),path.join(game,'js','ui','pkmsvv-forget-skill.js'));
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
console.log('Per Pokémon one-time skill forgetting installed in ordinary level-up cards.');
