'use strict';
/* Queue simultaneous item/chest pickups instead of overwriting the modal callback.
   Applies to the offline PC and APK as well as Web before source compilation. */
const fs=require('node:fs'),path=require('node:path');
const game=path.join(__dirname,'..','vendor','pokesurvivor');
const p=path.join(game,'js/game.js');
let code=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
function patch(needle,replacement){
 const split=code.split(needle);
 if(split.length!==2)throw Error('Item queue patch anchor changed: '+needle.slice(0,100));
 code=split.join(replacement);
}
// Do not carry a modal callback/queue from a lost or finished run into the next one.
patch('  function startRun(coop = null) {\n    holdBy = []; awayBy = null;',
      '  function startRun(coop = null) {\n    holdBy = []; awayBy = null;\n    openItem = null; laterItems.length = 0;');
// Process *one* selection at a time; the second item must not destroy the first callback.
patch("    if (state === 'levelup' || G.UI.isOpen('scr-levelup')) { laterItems.push(id); return; }",
 "    if (openItem || state === 'choice' || state === 'levelup' ||\n"+
 "        G.UI.isOpen('scr-item') || G.UI.isOpen('scr-bond') || G.UI.isOpen('scr-levelup')) {\n"+
 "      // Some bosses drop two items at the same instant. Keep both rewards.\n"+
 "      if (laterItems.length < 80) laterItems.push(id);\n"+
 "      return;\n"+
 "    }");
// Even if some UI callback fires twice, do not award a duplicate reward or holdEnd twice.
patch('    const take = got => {\n      openItem = null;',
      '    let selected = false;\n    const take = got => {\n      if (selected) return;\n      selected = true;\n      openItem = null;');
// If an item arrives while a legendary bond is selected, flush item queue after bond closes.
patch("      if (G.Coop.active) G.Coop.holdEnd();\n    });\n  }\n\n  // ---------------- recogida",
      "      if (G.Coop.active) G.Coop.holdEnd();\n      afterLevelUp();\n    });\n  }\n\n  // ---------------- recogida");
// Prefer queued items whenever a level-up closes, and do not open item choice over bond UI.
patch("    if (laterItems.length) offerItem(laterItems.shift());",
      "    if (laterItems.length && !G.UI.isOpen('scr-bond') && !G.UI.isOpen('scr-item')) {\n"+
      "      offerItem(laterItems.shift());\n"+
      "    }");
fs.writeFileSync(p,code,'utf8');
console.log('PKMSVV: simultaneous item pickups queued, modal choice is idempotent and reset between runs.');
