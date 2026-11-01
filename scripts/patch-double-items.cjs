'use strict';
/* One item choice at a time: coexist with skill cards, Bond, Berry pre-picks
 * and Judgment cinematics. Keep Co-op and competitive pause rules unchanged. */
const fs=require('node:fs'),path=require('node:path');
const game=path.join(__dirname,'..','vendor','pokesurvivor');
const p=path.join(game,'js/game.js');
let code=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
function patch(needle,replacement){
 const split=code.split(needle);
 if(split.length!==2)throw Error('Item queue patch anchor changed: '+needle.slice(0,100));
 code=split.join(replacement);
}
// Epoch is only run-local, never persisted into save or shared over LAN.
patch('  const laterItems = [];         // objetos recogidos con las cartas de nivel abiertas',
 '  const laterItems = [];         // objetos recogidos con las cartas de nivel abiertas\n'+
 '  let pkmsvvItemEpoch=0;\n'+
 '  function pkmsvvChoiceBusy(){\n'+
 "    return !!(G.Judgment?.cinematic||G.PKMSVVBerry?.choosing||\n"+
 "      ['scr-item','scr-bond','scr-levelup','scr-pause'].some(id=>G.UI.isOpen(id)));\n"+
 '  }');
patch('  function startRun(coop = null) {\n    holdBy = []; awayBy = null;',
 '  function startRun(coop = null) {\n    holdBy = []; awayBy = null;\n'+
 '    openItem = null; laterItems.length = 0; ++pkmsvvItemEpoch;');
patch("  function endRun(dead = true) {\n    if (state === 'over' || !pl) return;",
 "  function endRun(dead = true) {\n    if (state === 'over' || !pl) return;\n"+
 "    openItem=null;laterItems.length=0;++pkmsvvItemEpoch;");
// Some bosses drop two items during levelup or a Z-Move.
// Enqueue the second selection rather than destroy the first callback.
patch("    if (state === 'levelup' || G.UI.isOpen('scr-levelup')) { laterItems.push(id); return; }",
 "    if (openItem || state === 'choice' || state === 'levelup' || pkmsvvChoiceBusy()) {\n"+
 "      if(laterItems.length<256)laterItems.push(id);\n"+
 "      return;\n"+
 "    }");
// Double taps and callbacks from previous matches cannot equip an item twice.
patch('    const take = got => {\n      openItem = null;',
 '    const epoch=pkmsvvItemEpoch;\n'+
 '    let selected = false;\n'+
 "    const take = got => {\n      if (selected||epoch!==pkmsvvItemEpoch||state==='over'||!pl) return;\n"+
 '      selected = true;\n      openItem = null;');
// Flush any deferred item after closing a Bond.
patch("      if (G.Coop.active) G.Coop.holdEnd();\n    });\n  }\n\n  // ---------------- recogida",
 "      if (G.Coop.active) G.Coop.holdEnd();\n      afterLevelUp();\n    });\n  }\n\n  // ---------------- recogida");
// Never show an item behind a cinematic, Berry chooser, pause, or other modal.
patch("    if (state !== 'playing' && state !== 'held') return;\n    if (openItem && !G.UI.isOpen('scr-item')) {",
 "    if (state !== 'playing' && state !== 'held') return;\n"+
 "    if(pkmsvvChoiceBusy())return;\n"+
 "    if (openItem && !G.UI.isOpen('scr-item')) {");
patch("    if (laterItems.length) offerItem(laterItems.shift());",
 "    if (laterItems.length&&!pkmsvvChoiceBusy())offerItem(laterItems.shift());");
// Offer one pending item per safe gameplay tick, also after Berry/Z-Move closes.
patch('    if (pl.bonds > 0) offerBond(true);',
 '    if(laterItems.length)afterLevelUp();\n    if (pl.bonds > 0) offerBond(true);');
// Pending item queue takes precedence over opening a new Bond.
patch("    if (['scr-bond', 'scr-pause', 'scr-item', 'scr-levelup'].some(G.UI.isOpen)) return;",
 "    if(laterItems.length||G.PKMSVVBerry?.choosing||G.Judgment?.cinematic||"+
 "['scr-bond', 'scr-pause', 'scr-item', 'scr-levelup'].some(G.UI.isOpen)) return;");
fs.writeFileSync(p,code,'utf8');
console.log('PKMSVV: serialized reward choices, cinematic deferral and stale-callback guard installed.');
