'use strict';
/* v1.4 FIFO Orb — after patch-v14-gamepad-orbs.cjs. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
const load=p=>fs.readFileSync(path.join(game,p),'utf8').replace(/\r\n/g,'\n');
const save=(p,s)=>fs.writeFileSync(path.join(game,p),s,'utf8');
function patch(p,a,b){const s=load(p);if(s.split(a).length!==2)throw Error('Orb FIFO anchor changed '+p+': '+a.slice(0,85));save(p,s.replace(a,b));}
patch('js/entities/pickup.js',
 "      if (plain) return;\n      if(runOrbDrops<10&&Math.random()<0.45)",
 "      if (plain) return;\n      if((G.Coop.active?G.Coop.players().some(G.Orbs.eligible):G.Orbs.ready(G.Game.player))&&runOrbDrops<10&&Math.random()<0.45)");
patch('js/entities/pickup.js',
 "    if(runOrbDrops<10&&Math.random()<0.0015)",
 "    if((G.Coop.active?G.Coop.players().some(G.Orbs.eligible):G.Orbs.ready(G.Game.player))&&runOrbDrops<10&&Math.random()<0.0015)");
patch('js/entities/pickup.js',
 "        if (o.dead && players.length > 1) continue;",
 "        if (o.dead && players.length > 1) continue;\n        if(p.kind==='orb'&&!G.Orbs.canTake(o,p.value))continue;");
patch('js/net/coop.js',
 "            r2(local.reviveT || 0), api.choosing && api.choosing() ? 1 : 0, doneSeq];",
 "            r2(local.reviveT || 0), api.choosing && api.choosing() ? 1 : 0, doneSeq,\n            G.Orbs.ready(local)?1:0];");
patch('js/net/coop.js',
 "ld: num(a[14], 0, 0, 1e9)",
 "ld: num(a[14], 0, 0, 1e9), orbReady:a[15]===1?1:0");
patch('js/net/coop.js',
 "      case 'item': api.item(ev[1]); break;",
 "      case 'item': api.item(ev[1]); break;\n      case 'orb': if(G.Orbs.ready(local))api.orb(ev[1]); break;");
patch('js/game.js',
 "    for(let i=0;i<4;i++)if(G.Input.tap('digit'+(i+5))||G.Input.tap('numpad'+(i+5)))G.Orbs.use(pl,i);",
 "    if(G.Input.tap('digit5')||G.Input.tap('numpad5'))G.Orbs.useNext(pl);");
{
 const p='js/ui/hud.js',s=load(p),start=s.indexOf('    // v1.4: Mystery Dungeon Orbs are run-only items');
 const end=s.indexOf('    // ---------- vínculo guardado (aún no hay dos movimientos sueltos) ----------',start);
 if(start<0||end<0)throw Error('v1.4 FIFO HUD block changed');
 const hud=fs.readFileSync(path.join(root,'src','v14','orb-hud-block.txt'),'utf8');
 save(p,s.slice(0,start)+hud+s.slice(end));
}
console.log('PKMSVV v1.4: learned-eight gating, FIFO Orb collection, per-player Co-op eligibility, minimal 3/1 HUD.');
