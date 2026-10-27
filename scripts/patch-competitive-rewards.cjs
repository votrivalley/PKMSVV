'use strict';
/* v1.5.28 — Competitive-only personal tickets and Shiny ownership.
 * Sống Còn + Tranh Trứng: only the collector gets tickets, only the
 * final damaging trainer earns a wild Shiny. Regular Co-op stays shared.
 * Host remains authoritative; never let a client grant its own rewards.
 */
const fs=require('node:fs'),path=require('node:path');
const game=path.resolve(__dirname,'../vendor/pokesurvivor');
function once(file,from,to){
 const filename=path.join(game,file);
 const code=fs.readFileSync(filename,'utf8').replace(/\r\n/g,'\n');
 if(code.split(from).length!==2)throw Error('Competitive rewards upstream anchor drift '+file+': '+from.slice(0,90));
 fs.writeFileSync(filename,code.replace(from,to),'utf8');
}
const competitive='(G.Royale?.active||G.EggRush?.active)';
// In competitive games the host cannot bank a guest's ticket, and clients
// must never overwrite their private counters from host team frames.
once('js/game.js',
 "      if (t.t1 > pl.t1 || t.t10 > pl.t10) G.Audio.sfx('shiny');\n      pl.t1 = t.t1 || 0; pl.t10 = t.t10 || 0;\n      bankTickets();",
 "      if(!"+competitive+"){\n        if(t.t1>pl.t1||t.t10>pl.t10)G.Audio.sfx('shiny');\n        pl.t1=t.t1||0;pl.t10=t.t10||0;\n        bankTickets();\n      }");
once('js/game.js',
 "    shiny(dex) { G.onShinyCaught({ dex, name: (G.DEX_BY[dex] || {}).name || '' }); },",
 "    shiny(dex) { G.onShinyCaught({ dex, name: (G.DEX_BY[dex] || {}).name || '' }); },\n"+
 "    ticket(kind){\n"+
 "      if(!"+competitive+"||(kind!=='ticket'&&kind!=='ticket10'))return;\n"+
 "      if(kind==='ticket')pl.t1++;else pl.t10++;\n"+
 "      bankTickets();\n"+
 "      G.Audio.sfx(kind==='ticket'?'shiny':'legend');\n"+
 "      G.FX.dmgText(pl.x,pl.y-pl.bodyH-8,kind==='ticket'?'+1 ticket':'Ticket ×10',kind==='ticket'?'#ffd23f':'#d9a6ff',true);\n"+
 "    },");
once('js/game.js',
 "      if (d) Object.assign(pl, { kills: d.ki, bosses: d.bo, coins: d.co, level: Math.max(pl.level, d.lv || 1), t1: d.t1 || pl.t1, t10: d.t10 || pl.t10 });",
 "      if(d)Object.assign(pl,{kills:d.ki,bosses:d.bo,coins:d.co,level:Math.max(pl.level,d.lv||1)},\n"+
 "        "+competitive+"?{}:{t1:d.t1||pl.t1,t10:d.t10||pl.t10});");
once('js/game.js',
 "    if (G.Coop.isHost) G.Coop.shinyCaught(e);",
 "    if(G.Coop.isHost&&G.Coop.shinyCaught(e)===false)return;");
once('js/game.js',
 "      if (p.kind === 'ticket') pl.t1++; else pl.t10++;\n      bankTickets();",
 "      const recipient="+competitive+"?who:pl;\n"+
 "      if(p.kind==='ticket')recipient.t1=(recipient.t1||0)+1;\n"+
 "      else recipient.t10=(recipient.t10||0)+1;\n"+
 "      if(recipient===pl)bankTickets();");
// Host messages are delivered only to the actual collector. Bots accumulate
// only their ephemeral in-run totals and never write to a human user's save.
once('js/net/coop.js',
 "    if ((p.kind === 'heal' || p.kind === 'item') && who !== local) {",
 "    if("+competitive+"&&(p.kind==='ticket'||p.kind==='ticket10')&&who!==local){\n"+
 "      const receiver=mates.get(who.uid);\n"+
 "      if(receiver?.connected&&!receiver.pl.lanBot)receiver.q.push(['tk',p.kind]);\n"+
 "    }\n"+
 "    if ((p.kind === 'heal' || p.kind === 'item') && who !== local) {");
once('js/net/coop.js',
 "      case 'sh': api.shiny(ev[1]); break;",
 "      case 'tk': if("+competitive+")api.ticket?.(ev[1]); break;\n"+
 "      case 'sh': api.shiny(ev[1]); break;");
once('js/net/coop.js',
 "  function shinyCaught(e) { emit(['sh', e.dex]); }",
 "  function shinyCaught(e){\n"+
 "    if(!"+competitive+"){emit(['sh',e.dex]);return true;}\n"+
 "    const killer=e.pkmsvvLastHitUid;\n"+
 "    if(!killer)return false; // environmental kills cannot grant a Shiny\n"+
 "    if(killer===me)return true;\n"+
 "    const receiver=mates.get(killer);\n"+
 "    if(receiver?.connected&&!receiver.pl.lanBot)receiver.q.push(['sh',e.dex]);\n"+
 "    return false;\n"+
 "  }");
once('js/net/coop.js',
 "          hitFrom = from;\n          e.hurt(ev[2], ev[3], ev[4], ev[5], ev[6]);\n          hitFrom = null;",
 "          if("+competitive+")e.pkmsvvLastHitUid=from;\n"+
 "          hitFrom=from;\n"+
 "          try{e.hurt(ev[2],ev[3],ev[4],ev[5],ev[6]);}finally{hitFrom=null;}");
const attribution="if(G.Coop.isHost&&"+competitive+"&&!ghost&&pl?.uid)e.pkmsvvLastHitUid=pl.uid;\n    ";
once('js/systems/combat.js',
 "    e.hurt(dmg, col, dx, dy, knock, crit ? 'crit' : G.Types.label(G.Types.mult(m.type, e.types)));",
 "    "+attribution+"e.hurt(dmg, col, dx, dy, knock, crit ? 'crit' : G.Types.label(G.Types.mult(m.type, e.types)));");
once('js/systems/combat.js',
 "        e.hurt(p.dmg * k, p.color, p.vx || (e.x - pl.x), p.vy || (e.y - pl.y), p.knock,",
 "        "+attribution+"e.hurt(p.dmg * k, p.color, p.vx || (e.x - pl.x), p.vy || (e.y - pl.y), p.knock,");
console.log('PKMSVV competitive rewards: per-trainer tickets and last-hit Shiny ownership enabled.');
