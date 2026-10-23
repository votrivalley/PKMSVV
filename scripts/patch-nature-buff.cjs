'use strict';
/* Option A: buff ON/OFF visualization, nature-aware Pokédex stats; after Kecleon and all UI patches. */
const fs=require('node:fs'),path=require('node:path');
const game=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(p,a,b){const file=path.join(game,p),s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');if(s.split(a).length!==2)throw Error('Nature/buff anchor drift: '+p+' '+a.slice(0,90));fs.writeFileSync(file,s.replace(a,b),'utf8');}
patch("js/entities/player.js","    b.amount = amount;\n    b.n = 1; // PKMSVV: refreshed effect, never accumulated by auto-casting\n    b.t = dur;","    const wasActive = b.n > 0;\n    const permanent = wasActive && b.t === Infinity;\n    b.amount = Math.max(wasActive ? b.amount : 0, amount);\n    b.n = 1; // PKMSVV: ON or OFF; no buff stacks\n    b.t = permanent ? Infinity : Math.max(wasActive ? b.t : 0, dur);");
patch("js/entities/player.js","0, 0, 6.2832 * (b.n / 5));","0, 0, Math.PI * 2); // PKMSVV: whole ON ring (never a stack fraction)");
patch("js/ui/hud.js","const txt = LBL[k] + ' ×' + b.n;","const txt = LBL[k] + (b.t === Infinity ? ' MAX' : ' ON');");
patch("js/ui/menu.js","    const p = G.DEX_BY[dex];\n    const own = !!s.owned[dex];","    const own = !!s.owned[dex];\n    const p = own && G.Mons ? G.Mons.monFor(dex) : G.DEX_BY[dex];\n    const nature = own && G.Mons ? G.Mons.natureOf(dex) : null;");
patch("js/ui/menu.js","    const bar = (label, v, m, txt) =>\n      `<div class=\"stat\"><span>${label}</span><div class=\"bar\"><i style=\"width:${Math.min(100, v / m * 100)}%\"></i></div><span>${txt}</span></div>`;","    const bar = (label, v, m, txt, key) => {\n      const boost = nature && key && nature.up === key;\n      const penalty = nature && key && nature.down === key;\n      const badge = boost ? '<b class=\"pkmsvv-nature-up\">+10%</b>' : penalty ? '<b class=\"pkmsvv-nature-down\">−10%</b>' : '';\n      return `<div class=\"stat\"><span>${label}</span><div class=\"bar\"><i style=\"width:${Math.min(100, v / m * 100)}%\"></i></div><span>${txt}${badge ? ' ' + badge : ''}</span></div>`;\n    };");
patch("js/ui/menu.js","${bar('Vida', p.hp, max.hp, p.hp)}","${bar('Vida', p.hp, max.hp, p.hp, 'hp')}");
patch("js/ui/menu.js","${bar('Ataque', p.pa, max.atk, '×' + p.pa.toFixed(2))}","${bar('Ataque', p.pa, max.atk, '×' + p.pa.toFixed(2), 'pa')}");
patch("js/ui/menu.js","${bar('At. Esp.', p.sa, max.atk, '×' + p.sa.toFixed(2))}","${bar('At. Esp.', p.sa, max.atk, '×' + p.sa.toFixed(2), 'sa')}");
patch("js/ui/menu.js","${bar('Defensa', p.df, max.def, p.df)}","${bar('Defensa', p.df, max.def, Math.round(p.df), 'df')}");
patch("js/ui/menu.js","${bar('Def. Esp.', p.sd, max.def, p.sd)}","${bar('Def. Esp.', p.sd, max.def, Math.round(p.sd), 'sd')}");
patch("js/ui/menu.js","${bar('Velocidad', p.spd, max.spd, p.spd)}","${bar('Velocidad', p.spd, max.spd, Math.round(p.spd), 'spd')}");
fs.appendFileSync(path.join(game,'css','style.css'),'\n/* Nature stat badges reflect the effective values used in-game. */\n.pkmsvv-nature-up{color:#76f8b8;font-size:11px;font-weight:800;white-space:nowrap}\n.pkmsvv-nature-down{color:#ffa49a;font-size:11px;font-weight:800;white-space:nowrap}\n#dex-detail .stat>span:last-child{white-space:nowrap;min-width:max-content}\n','utf8');
console.log('PKMSVV: full ON/OFF buff rings + nature-adjusted Pokédex stats');
