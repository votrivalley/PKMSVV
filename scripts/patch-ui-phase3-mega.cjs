'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(file,from,to){
 const full=path.join(game,file),raw=fs.readFileSync(full,'utf8').replace(/\r\n/g,'\n');
 if(raw.split(from).length!==2)throw Error('Mega Phase3 source drift: '+file+'/'+from.slice(0,70));
 fs.writeFileSync(full,raw.replace(from,to),'utf8');
}
const anchor='<script defer src="js/ui/pkmsvv-mega-entry.js"></script>';
patch('dev.html',anchor,anchor+'\n<script defer src="js/ui/pkmsvv-mega-phase3.js"></script>');
fs.copyFileSync(path.join(root,'src','pkmsvv-mega-phase3.js'),
 path.join(game,'js','ui','pkmsvv-mega-phase3.js'));
// Credit actual solo combat hits even though Enemy is not exported on G.
// No damage, hitboxes or multiplayer authority are modified.
patch('js/entities/enemy.js',
 "    hurt(amount, color = '#fff', dirX = 0, dirY = 0, knock = 0, eff = null) {\n      if (this.dead) return;",
 "    hurt(amount, color = '#fff', dirX = 0, dirY = 0, knock = 0, eff = null) {\n      if (this.dead) return;\n      G.PKMSVVMegaPhase3?.onEnemyHurt?.(this, amount);");
patch('js/core/db.js',
 '      megaStones: {},             // permanent Mega Stone ownership, zero on fresh saves',
 '      megaStones: {},             // permanent Mega Stone ownership, zero on fresh saves\n'+
 '      megaForms: {}, megaStoryCleared: {}, // form-specific and future story gates');
patch('js/core/db.js',
 "for (const coll of ['legends', 'arenas', 'itemsFound', 'evoMoves', 'ach', 'megaStones'])",
 "for (const coll of ['legends', 'arenas', 'itemsFound', 'evoMoves', 'ach', 'megaStones', 'megaForms', 'megaStoryCleared'])");
patch('js/ui/gacha-ui.js','      out.appendChild(c);',
 '      if(r.megaStone){const stone=document.createElement("div");'+
 'stone.className="pkmsvv-mega-pull-bonus";'+
 'stone.textContent="✧ Mega Stone: "+r.megaStone;'+
 'c.appendChild(stone);}\n      out.appendChild(c);');
fs.appendFileSync(path.join(game,'css','style.css'),
 '\n#pkmsvv-mega-champion-btn{z-index:12019}\n'+
 '.pkmsvv-mega-champion-gem{color:#faf0a1;font-size:30px;font-weight:900;'+
 'text-shadow:0 0 7px #faffda,0 0 14px #ae79ee;line-height:1}\n'+
 '.pkmsvv-mega-pull-bonus{margin-top:7px;background:#24384d;'+
 'border:2px solid #e3bd6e;color:#ffeaa2;border-radius:8px;'+
 'padding:7px;font-size:12px;font-weight:800;text-align:center}\n','utf8');
console.log('Mega Phase 3: real successful Gacha side Stones and solo Mega transformations installed');
