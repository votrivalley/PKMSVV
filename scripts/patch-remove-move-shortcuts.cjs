'use strict';
/* All learned moves auto-cast: the old Pokémon-specific 1–4 move-slot
 * shortcut picker has no gameplay purpose. Keep historical save.pbind
 * untouched for backward compatibility, but neither render nor apply it.
 * Manual Dash, Orb keys and Settings > keyboard/controller remaps stay intact.
 */
const fs=require('node:fs'),path=require('node:path');
const game=path.join(__dirname,'..','vendor','pokesurvivor');
const load=p=>fs.readFileSync(path.join(game,p),'utf8').replace(/\r\n/g,'\n');
const save=(p,s)=>fs.writeFileSync(path.join(game,p),s,'utf8');
let menu=load('js/ui/menu.js');
const call="    box.appendChild(bindPanel());";
if(menu.split(call).length!==2)throw Error('Legacy Pokémon move shortcut panel call changed');
menu=menu.replace(call,'    // PKMSVV: all learned skills auto-cast; no per-Pokémon slot shortcuts.');
const start=menu.indexOf('  // ---------------- atajos: hueco fijo para cada movimiento ----------------');
const end=menu.indexOf('  // ---------------- movimiento inicial',start);
if(start<0||end<=start)throw Error('Legacy shortcut panel section changed');
menu=menu.slice(0,start)+menu.slice(end);
if(/bindPanel\s*\(/.test(menu))throw Error('Obsolete move-shortcut picker still reachable');
save('js/ui/menu.js',menu);
let runtime=load('js/game.js');
const old=`    // Atajos: movimientos con hueco fijo (save.pbind[dex] = [id del 1, id del 2, ...]),
    // antes de aprender nada: addMove ya los coloca.
    (save.pbind && save.pbind[mon.dex] || []).forEach((id, i) => { if (id) pl.bind[id] = i; });
`;
if(runtime.split(old).length!==2)throw Error('Legacy move-slot bindings at run start changed');
runtime=runtime.replace(old,'    // Old pbind save data is deliberately ignored: every learned move auto-casts.\n');
save('js/game.js',runtime);
console.log('PKMSVV: removed obsolete per-Pokémon Move Shortcuts UI + runtime bindings; preserved save, Dash and Orbs.');
