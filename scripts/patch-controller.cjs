'use strict';
/* PKMSVV v0.9.1 — controller accessibility for Gacha, Evolution and Pokédex. */
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),dir=path.join(root,'vendor','pokesurvivor');
function patch(file,a,b) {
 const target=path.join(dir,file),src=fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n'),parts=src.split(a.replace(/\r\n/g,'\n'));
 if(parts.length!==2)throw Error('Controller: expected one source anchor: '+file+' '+a.slice(0,100));
 fs.writeFileSync(target,parts.join(b),'utf8');
}
// Results modal sits OUTSIDE .scr so upstream topScreen() ignored its "Continuar" button.
// Let the gamepad's candidate/confirm/back logic see ONLY this highest overlay.
patch('js/core/gamepad.js',
 '  function topScreen() {\n    let top = null, tz = -Infinity;',
 '  function topScreen() {\n    const gachaResults = document.getElementById("pull-fx");\n    if (gachaResults && !gachaResults.classList.contains("hidden")) return gachaResults;\n'+
 '    // Dynamically mounted PKMSVV dialogs must be navigable before the underlying screen.\n'+
 '    for(const selector of [".pkmsvv-memory-chooser",".pkmsvv-berry-overlay",\n'+
 '      "#pkmsvv-wiki-overlay","#pkmsvv-champion-screen",\n'+
 '      "#pkmsvv-support-catalog","#pkmsvv-mega-phase1",\n'+
 '      "#pkmsvv-arena-solo-screen"]){\n'+
 '      const node=document.querySelector(selector);\n'+
 '      if(node&&!node.hidden&&!node.classList.contains("hidden"))return node;\n'+
 '    }\n'+
 '    let top = null, tz = -Infinity;');
// Gacha results often appear after an asynchronous slot animation. Focus must be
// moved explicitly when the continue button finally becomes visible.
patch('js/core/gamepad.js',
 '    focusFirst() { const opts = candidates(); if (opts.length) setFocus(firstOf(opts)); },',
 '    focusFirst() { const opts = candidates(); if (opts.length) setFocus(firstOf(opts)); },\n'+
 '    focusElement(el) {\n'+
 '      if (!el || !el.isConnected || el.disabled || !candidates().includes(el)) return false;\n'+
 '      setFocus(el); return true;\n'+
 '    },');
// Start is a direct shortcut ONLY after selecting an owned Pokemon from the Pokedex;
// in all other menus Start retains upstream Escape/back behavior.
patch('js/core/gamepad.js',
 "      if (hit(BT.START)) G.Input.virtual('escape');",
 "      if (hit(BT.START)) {\n"+
 "        const top = topScreen();\n"+
 "        if (top && top.id === 'scr-dex' && G.PKMSVVPadFlow && G.PKMSVVPadFlow.consumeSelected(G.DB.save)) {\n"+
 "          G.Flow.play();\n"+
 "        } else G.Input.virtual('escape');\n"+
 "      }");
// The browser/gamepad can enter and leave the Pokédex. Only an actual pick arms
// the Start shortcut, so opening Dex cannot accidentally start a run.
const helper=String.raw`/* PKMSVV — One-tap Start after choosing a Pokémon. */
G.PKMSVVPadFlow=(()=>{
 let chosen=null;
 const select=(dex,shiny=false)=>{chosen={dex:Number(dex),shiny:!!shiny};};
 const updateVariant=(dex,shiny)=>{
   if(chosen && chosen.dex===Number(dex))chosen.shiny=!!shiny;
 };
 const consumeSelected=save=>{
   if(!save || !chosen || !save.owned || !save.owned[chosen.dex])return false;
   save.partner=chosen.dex;
   save.partnerShiny=!!(chosen.shiny && save.shiny && save.shiny[chosen.dex]);
   G.DB.commit(true);
   chosen=null;return true;
 };
 const reset=()=>{chosen=null;};
 return {select,updateVariant,consumeSelected,reset};
})();
`;
fs.writeFileSync(path.join(dir,'js','ui','pkmsvv-pad-flow.js'),helper);
patch('dev.html',
 '<script defer src="js/ui/menu.js"></script>',
 '<script defer src="js/ui/pkmsvv-pad-flow.js"></script>\n<script defer src="js/ui/menu.js"></script>');
patch('js/ui/menu.js',
 '  function openDex() {\n    G.UI.show(\'scr-dex\', true);',
 '  function openDex() {\n    G.PKMSVVPadFlow.reset();\n    G.UI.show(\'scr-dex\', true);');
patch('js/ui/menu.js',
 '      s.partner = dex;\n      s.partnerShiny = hasSh && viewShiny;',
 '      s.partner = dex;\n      s.partnerShiny = hasSh && viewShiny;\n      G.PKMSVVPadFlow.select(dex);');
patch('js/ui/menu.js',
 "      G.UI.toast(p.name + (s.partnerShiny ? ' shiny' : '') + ' es ahora tu compañero');",
 "      G.UI.toast(p.name + (s.partnerShiny ? ' shiny' : '') + ' es ahora tu compañero · START để vào trận');");
// Also show an on-screen Start control at the TOP of the Pokedex, for touch
// and mouse users who otherwise need to scroll to the lower "Play" button.
patch('dev.html',
 '<span id="dex-total" class="sub" style="font-size:15px"></span></h2><button class="btn small ghost" data-back>Volver</button>',
 '<span id="dex-total" class="sub" style="font-size:15px"></span></h2><button id="dex-play-now" class="btn small gold hidden" type="button">▶ CHƠI NGAY (START)</button><button class="btn small ghost" data-back>Volver</button>');
patch('js/ui/menu.js',
 '    const s = G.DB.save;\n    if (dexSel == null) {',
 '    const s = G.DB.save;\n    const quick=$("dex-play-now");\n    quick.classList.add("hidden");\n    quick.onclick=()=>{\n      if (!G.PKMSVVPadFlow.consumeSelected(G.DB.save)) return;\n      G.Flow.play();\n    };\n    if (dexSel == null) {');
patch('js/ui/menu.js',
 '      G.PKMSVVPadFlow.select(dex);',
 '      G.PKMSVVPadFlow.select(dex);\n      $("dex-play-now").classList.remove("hidden");');

// v0.9.2: A on the tile arms the choice; Start selects + enters the run.
patch("js/ui/menu.js","      G.PKMSVVPadFlow.select(dex);\n      $(\"dex-play-now\").classList.remove(\"hidden\");","      G.PKMSVVPadFlow.select(dex, hasSh && viewShiny);\n      $(\"dex-play-now\").classList.remove(\"hidden\");");
patch("js/ui/menu.js","      showDetail(p.dex);\n    };","      showDetail(p.dex);\n      if (own) {\n        G.PKMSVVPadFlow.select(p.dex, !!(s.shiny && s.shiny[p.dex]) && viewShiny);\n        $('dex-play-now').classList.remove('hidden');\n      } else {\n        G.PKMSVVPadFlow.reset();\n        $('dex-play-now').classList.add('hidden');\n      }\n    };");
patch("js/ui/menu.js","      b.onclick = () => { viewShiny = b.dataset.v === '1'; showDetail(dex); };","      b.onclick = () => {\n        viewShiny = b.dataset.v === '1';\n        G.PKMSVVPadFlow.updateVariant(dex,viewShiny);\n        showDetail(dex);\n      };");
// Avoid a stale armed shortcut after changing screens without starting a run.
patch('js/ui/menu.js',
 '  function open() {\n    const s = G.DB.save;',
 '  function open() {\n    if(G.PKMSVVPadFlow)G.PKMSVVPadFlow.reset();\n    const s = G.DB.save;');
// Gacha result modal goes through .scr-style navigation now. When its async
// reveal finishes, the continue button is immediately focused and A/B both work.
patch('js/ui/gacha-ui.js',
 "    $('pull-close').classList.remove('hidden');\n    busy = false;",
 "    $('pull-close').classList.remove('hidden');\n"+
 "    if (G.Pad && G.Pad.name && G.Pad.focusElement) G.Pad.focusElement($('pull-close'));\n"+
 "    busy = false;");
// Evolution has a large custom overlay and does not get focus on all controllers.
// Guarantee that A chooses the first evolution, while B safely selects skip.
patch('js/systems/pkmsvv-evolution.js',
 '    if (G.Pad && G.Pad.name && G.Pad.focusFirst) G.Pad.focusFirst();',
 "    if (G.Pad && G.Pad.name) {\n"+
 "      if (!G.Pad.focusElement || !G.Pad.focusElement(panel.querySelector('.pkmsvv-evo-option'))) {\n"+
 "        if (G.Pad.focusFirst) G.Pad.focusFirst();\n"+
 "      }\n"+
 "    }");
/* A/B on any new overlay uses the existing gamepad candidates() and press()/back().
   Observe only overlay mounts/unhides, never rebuild the candidate list on every frame. */
const accessibility=String.raw`
(function(){
 let scheduled=false;
 const selectors=['.pkmsvv-memory-chooser','.pkmsvv-berry-overlay','#pkmsvv-wiki-overlay',
  '#pkmsvv-champion-screen','#pkmsvv-support-catalog','#pkmsvv-mega-phase1',
  '#pkmsvv-arena-solo-screen'];
 function current(){
  for(const selector of selectors){
   const element=document.querySelector(selector);
   if(element&&!element.hidden&&!element.classList.contains('hidden'))return element;
  }
  return null;
 }
 function focus(){
  scheduled=false;
  const dlg=current();
  if(!dlg)return;
  const buttons=Array.from(dlg.querySelectorAll('button:not([disabled]),select:not([disabled]),input:not([disabled]),summary'))
   .filter(b=>b.getClientRects?.().length!==0);
  if(buttons.length&&G.Pad?.focusElement){
   if(!buttons.some(b=>b.classList.contains('pad-focus')))G.Pad.focusElement(buttons[0]);
  }else G.Pad?.focusFirst?.();
 }
 function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(focus);}
 if(typeof MutationObserver==='function')new MutationObserver(list=>{
  if(list.some(x=>x.type==='childList'||x.attributeName==='hidden'||x.attributeName==='class'))queue();
 }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class']});
 document.addEventListener('DOMContentLoaded',queue,{once:true});
 document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  const dlg=current();if(!dlg)return;
  if(dlg.id==='pkmsvv-wiki-overlay'){G.PKMSVVWiki?.close?.();e.stopPropagation();return;}
  if(dlg.classList.contains('pkmsvv-memory-chooser')){dlg.remove();e.stopPropagation();return;}
  const close=dlg.querySelector('[data-back],[data-mega-close],.pkmsvv-pc-close,.pkmsvv-champion-heading #pkmsvv-champion-close');
  if(close){close.click();e.stopPropagation();}
 },true);
})();
`;
fs.writeFileSync(path.join(dir,'js','ui','pkmsvv-pad-dialogs.js'),accessibility);
patch('dev.html','<script defer src="js/ui/pkmsvv-pad-flow.js"></script>',
 '<script defer src="js/ui/pkmsvv-pad-flow.js"></script>\\n<script defer src="js/ui/pkmsvv-pad-dialogs.js"></script>');
fs.appendFileSync(path.join(dir,'css','style.css'),String.raw`
/* Show the active controller selection in custom modal options. */
.pkmsvv-evo-option.pad-focus,.pkmsvv-evo-skip.pad-focus,
#pull-close.pad-focus,#dex-play-now.pad-focus,
.pkmsvv-memory-chooser .pad-focus,.pkmsvv-pc-overlay .pad-focus,
.pkmsvv-champion-overlay .pad-focus,.pkmsvv-support-overlay .pad-focus,
.pkmsvv-mega-phase1-overlay .pad-focus,.pkmsvv-berry-overlay .pad-focus,
.pkmsvv-arena-solo-screen .pad-focus{
 outline:3px solid #ffe17d!important;outline-offset:3px;
 box-shadow:0 0 0 4px rgba(12,22,44,.8),0 0 17px rgba(255,221,102,.55)!important;
}
`+'\n');
console.log('PKMSVV: controller can confirm Gacha/evolution, Start enters run from selected Dex Pokémon.');
