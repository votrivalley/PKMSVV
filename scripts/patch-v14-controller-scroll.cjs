'use strict';
const fs=require('node:fs'),path=require('node:path');
const game=path.join(__dirname,'..','vendor','pokesurvivor');
const file=path.join(game,'js','core','gamepad.js');
let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
function patch(a,b){if(s.split(a).length!==2)throw Error('Gamepad viewport source drift: '+a.slice(0,100));s=s.replace(a,b);}
patch("  /** Lo que se puede pulsar ahora: botones, enlaces y lo que tiene cursor de mano. */\n  function candidates() {",
 "  /** Is this element revealable by scrolling an active menu? */\n"+
 "  function scrollableParent(el,scope){\n"+
 "    for(let a=el.parentElement;a;a=a.parentElement){\n"+
 "      const css=getComputedStyle(a);\n"+
 "      if(/auto|scroll/.test(css.overflowY||'')&&a.scrollHeight>a.clientHeight+5)return true;\n"+
 "      if(a===scope)break;\n"+
 "    }\n"+
 "    return false;\n"+
 "  }\n"+
 "  /** Include focusable controls below the fold. */\n  function candidates() {");
patch("        if (r.width < 4 || r.height < 4 || r.right < 0 || r.bottom < 0 || r.left > W || r.top > H) continue;",
 "        if(r.width<4||r.height<4)continue;\n"+
 "        const offscreen=r.right<0||r.bottom<0||r.left>W||r.top>H;\n"+
 "        const canScroll=scrollableParent(el,sc);\n"+
 "        if(offscreen&&!canScroll)continue;");
patch("        if (hit && !el.contains(hit) && !hit.contains(el)) continue;",
 "        if (!offscreen && hit && !el.contains(hit) && !hit.contains(el) && !canScroll) continue;");
fs.writeFileSync(file,s,'utf8');
const css="\n#pkmsvv-public-refresh.pad-focus,#pkmsvv-upgrade-guide-toggle.pad-focus,\n#scr-multiplayer button.pad-focus,#scr-lobby button.pad-focus{\n outline:3px solid #ffe27a!important;outline-offset:3px!important;box-shadow:0 0 0 2px #1c3459,0 0 16px rgba(255,218,109,.75)!important}\n.pkmsvv-upgrade-guide-toggle{width:100%;display:flex;align-items:center;gap:12px;text-align:left;\n background:rgba(11,31,55,.89);border:2px solid #75bdf1;color:#f2f7ff;border-radius:9px;padding:10px 12px;\n min-height:50px;white-space:normal;font-size:15px}\n.pkmsvv-guide-symbol{display:grid;place-items:center;min-width:33px;height:33px;\n font-size:24px;font-weight:800;background:#173b5a;border:2px solid #ffd16a;color:#ffdd77;border-radius:6px}\n.pkmsvv-guide-title{font-weight:800;line-height:1.35}\n.pkmsvv-upgrade-guide-details{padding:12px 13px;color:#d7e6fc;background:rgba(8,21,43,.7);\n border:1px solid #6a97bc;border-top:0;border-radius:0 0 10px 10px;font-size:13px;line-height:1.55}\n.pkmsvv-upgrade-guide-details[hidden]{display:none!important}\n.pkmsvv-orb-guide-row{margin:6px 0}\n#pkmsvv-public-refresh{min-height:42px}\n";
fs.appendFileSync(path.join(game,'css','style.css'),css,'utf8');
console.log('SVV gamepad: scrollable menu items and Orb/skill accordion reachable with D-pad.');
