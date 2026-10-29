'use strict';
// Integrate one production-compatible noncommercial Mega sprite/animation demo.
// No Gacha changes, no account rewards, no Pokémon dex duplication.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(file,before,after){
 const full=path.join(game,file),text=fs.readFileSync(full,'utf8').replace(/\r\n/g,'\n');
 if(text.split(before).length!==2)throw Error('Mega Lucario source drift '+file+': '+before.slice(0,85));
 fs.writeFileSync(full,text.replace(before,after),'utf8');
}
execFileSync(process.execPath,[path.join(root,'scripts','build-mega-lucario.cjs')],{cwd:root,stdio:'inherit'});
fs.copyFileSync(path.join(root,'src','pkmsvv-mega-lucario.js'),
 path.join(game,'js','ui','pkmsvv-mega-lucario.js'));
// Button visuals stay in the shipped CSS so CSP remains safe on every platform.
fs.appendFileSync(path.join(game,'css','style.css'),'\n'+
 fs.readFileSync(path.join(root,'src','pkmsvv-mega-lucario.css'),'utf8'),'utf8');
// Mega applies a temporary cooldown factor to real casts (not permanent perks).
patch('js/systems/combat.js',
 'm.t = Math.max(0.05, m.cd * pl.cdMul);',
 'm.t = Math.max(0.05, m.cd * pl.cdMul * (pl._megaActive ? 0.70 : 1));');
patch('js/entities/player.js',
 'const cd = Math.max(0.12, m.cd * this.cdMul);',
 'const cd = Math.max(0.12, m.cd * this.cdMul * (this._megaActive ? 0.70 : 1));');
patch('dev.html','<script defer src="js/data/sprites-meta.js"></script>',
 '<script defer src="js/data/sprites-meta.js"></script>\n'+
 '<script defer src="js/data/pkmsvv-mega-sprite-meta.js"></script>');
patch('dev.html','<script defer src="js/game.js"></script>',
 '<script defer src="js/game.js"></script>\n'+
 '<script defer src="js/ui/pkmsvv-mega-lucario.js"></script>');
patch('js/core/db.js',
 '      tickets: { t1: 0, t10: 0 },   // tickets del gacha (x1 y x10)',
 '      tickets: { t1: 0, t10: 0 },   // tickets del gacha (x1 y x10)\n'+
 '      megaStones: {},             // permanent Mega Stone ownership, zero on fresh saves');
patch('js/core/db.js',
 "for (const coll of ['legends', 'arenas', 'itemsFound', 'evoMoves', 'ach'])",
 "for (const coll of ['legends', 'arenas', 'itemsFound', 'evoMoves', 'ach', 'megaStones'])");
console.log('Mega Lucario preview integrated (solo only; no permanent stone awarded).');
