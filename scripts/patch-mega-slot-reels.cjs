'use strict';
// Give only the Mega banner the same 3-slot reel machinery with REAL item
// sprites. Original Pokemon Gacha keeps its existing Pokeball icons/behavior.
const fs=require('node:fs'),path=require('node:path');
const target=path.join(__dirname,'..','vendor','pokesurvivor','js','ui','slots.js');
let s=fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n');
function patch(before,after){
 if(s.split(before).length!==2)throw Error('Mega slot reels source drift: '+before.slice(0,70));
 s=s.replace(before,after);
}
patch("  let cv = null, ctx = null, st = null, raf = 0, last = 0, fast = false;",
 "  let cv = null, ctx = null, st = null, raf = 0, last = 0, fast = false, megaReels = null;\n"+
 "  const drawSymbol=(name,x,y,size)=>{\n"+
 "    if(name.startsWith('mega:')&&G.PKMSVVMegaGacha?.drawStoneSlot?.(ctx,name.slice(5),x,y,size))return;\n"+
 "    G.Icons.draw(ctx,name,x,y,size);\n"+
 "  };");
patch("  const symOf = r => (r.shiny ? 'shiny' : SYM[r.rarity]);",
 "  const symOf = r => megaReels ? 'mega:'+megaReels.prize : (r.shiny ? 'shiny' : SYM[r.rarity]);");
patch("  async function play(canvas, results) {",
 "  async function play(canvas, results, options = null) {");
patch("    fast = false;",
 "    fast = false;\n"+
 "    megaReels=options?.mega?.prize&&Array.isArray(options.mega.keys)&&options.mega.keys.length\n"+
 "      ?{prize:options.mega.prize,symbols:options.mega.keys.map(k=>'mega:'+k)}:null;");
patch("  function stopAll() { cancelAnimationFrame(raf); st = null; if (cv) cv.onclick = null; }",
 "  function stopAll() { cancelAnimationFrame(raf); st = null; megaReels=null; if (cv) cv.onclick = null; }");
patch("      G.Icons.draw(ctx, b.sym, x, Math.round(b.y - (n === 1 ? 10 : 0)), size);",
 "      drawSymbol(b.sym, x, Math.round(b.y - (n === 1 ? 10 : 0)), size);");
patch("        const name = STRIP[((i0 - k) % STRIP.length + STRIP.length) % STRIP.length];",
 "        const strip=megaReels?.symbols||STRIP;\n"+
 "        const name = strip[((i0 - k) % strip.length + strip.length) % strip.length];");
patch("        G.Icons.draw(ctx, name, x + 6, y, 24);",
 "        drawSymbol(name, x + 6, y, 24);");
patch("        if (rl.speed > 300) { ctx.globalAlpha = 0.25; G.Icons.draw(ctx, name, x + 6, y - 6, 24); }",
 "        if (rl.speed > 300) { ctx.globalAlpha = 0.25; drawSymbol(name, x + 6, y - 6, 24); }");
patch("      const n = STRIP.indexOf(rl.sym);",
 "      const strip=megaReels?.symbols||STRIP;\n"+
 "      const n = Math.max(0,strip.indexOf(rl.sym));");
patch("      G.Icons.draw(ctx, STRIP[(n + 3) % STRIP.length], x + 6, MID - 12 - CELL + by, 24);",
 "      drawSymbol(strip[(n + 3) % strip.length], x + 6, MID - 12 - CELL + by, 24);");
patch("      G.Icons.draw(ctx, STRIP[(n + 5) % STRIP.length], x + 6, MID - 12 + CELL + by, 24);",
 "      drawSymbol(strip[(n + 5) % strip.length], x + 6, MID - 12 + CELL + by, 24);");
patch("      G.Icons.draw(ctx, rl.sym, x + 6, MID - 12 + by, 24);",
 "      drawSymbol(rl.sym, x + 6, MID - 12 + by, 24);");
fs.writeFileSync(target,s,'utf8');
console.log('Mega Gacha: actual Mega Stone icons spin on 3 original slot reels; Pokemon slots unchanged.');
