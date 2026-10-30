'use strict';
/* v1.5.36: competitive trainers choose independently while match simulation
 * keeps running. Co-op remains synchronized for shared skill choices.
 */
const fs=require('node:fs'),path=require('node:path');
const game=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(file,from,to){
 const full=path.join(game,file),s=fs.readFileSync(full,'utf8').replace(/\r\n/g,'\n');
 if(s.split(from).length!==2)throw Error('Competitive levelup patch drift '+file+': '+from.slice(0,100));
 fs.writeFileSync(full,s.replace(from,to),'utf8');
}
patch('js/net/coop.js',
 '  // ---------------- subida de nivel compartida ----------------',
 [
 '  const pkmsvvCompetitive=()=>!!(G.Royale?.active||G.EggRush?.active);',
 '  // Host broadcasts a monotonic level sequence in every frame, even after',
 '  // participants have picked, so lost packets cannot steal a skill card.',
 '  function receiveIndividualLevel(level,seq){',
 '    if(!Number.isSafeInteger(seq)||seq<=seenSeq)return;',
 '    const start=seenSeq+1;',
 '    for(let n=start;n<=seq&&n<start+100;n++)',
 '      api.levelStart(Math.max(1,Math.round(level)-(seq-n)));',
 '    seenSeq=Math.min(seq,start+99);',
 '  }',
 '  // ---------------- subida de nivel compartida ----------------'
 ].join('\n'));
patch('js/net/coop.js',
 '    if (waiting.size) f.lu = [levelSeq, levelNow];',
 '    if (waiting.size || (pkmsvvCompetitive() && levelSeq)) f.lu = [levelSeq, levelNow];');
patch('js/net/coop.js',
 '      if (msg.lu && msg.lu[0] > doneSeq && (msg.lu[0] > seenSeq || !showing)) { seenSeq = msg.lu[0]; api.levelStart(msg.lu[1]); }\n      else if (!msg.lu && showing) api.resume();',
 [
 '      if(pkmsvvCompetitive()){',
 '        if(msg.lu)receiveIndividualLevel(msg.lu[1],msg.lu[0]);',
 '      }else{',
 '        if (msg.lu && msg.lu[0] > doneSeq && (msg.lu[0] > seenSeq || !showing)) { seenSeq = msg.lu[0]; api.levelStart(msg.lu[1]); }',
 '        else if (!msg.lu && showing) api.resume();',
 '      }'
 ].join('\n'));
patch('js/net/coop.js',
 "      case 'lu': if (!ev[2] || ev[2] > seenSeq) { seenSeq = ev[2] || seenSeq; api.levelStart(ev[1]); } break;",
 "      case 'lu': if(pkmsvvCompetitive())receiveIndividualLevel(ev[1],ev[2]); else if(!ev[2]||ev[2]>seenSeq){seenSeq=ev[2]||seenSeq;api.levelStart(ev[1]);} break;");
patch('js/net/coop.js',
 '  function levelStart(level) {\n    waiting = new Set([me]);',
 [
 '  function levelStart(level) {',
 '    if(pkmsvvCompetitive()){',
 '      ++levelSeq;levelNow=level;seenSeq=levelSeq;',
 "      emit(['lu',level,levelSeq]);flushAll();",
 '      api.levelStart(level);G.LanAI?.levelUp?.(level,levelSeq);return; // AI pick legally, no shared waiting barrier',
 '    }',
 '    waiting = new Set([me]);'
 ].join('\n'));
patch('js/net/coop.js',
 '  function localPicked() {\n    if (host) picked(me);',
 '  function localPicked() {\n    if(pkmsvvCompetitive()){doneSeq=seenSeq;return;}\n    if (host) picked(me);');
patch('js/game.js',
 '    time = 0; pendingLevels = 0;',
 '    time = 0; pendingLevels = 0; individualLevelQueue=[]; individualLevelOpen=false;');
patch('js/game.js',
 '  const coopApi = {',
 [
 "  // Private card queue: the simulation always stays in 'playing'.",
 "  const pkmsvvCompetitive=()=>!!(G.Coop.active&&(G.Royale?.active||G.EggRush?.active));",
 '  let individualLevelQueue=[],individualLevelOpen=false;',
 '  function pkmsvvNextPersonalLevel(){',
 "    if(!pkmsvvCompetitive()||individualLevelOpen||!individualLevelQueue.length||!pl||pl.dead||state==='over')return;",
 "    if(['scr-item','scr-bond'].some(G.UI.isOpen))return;",
 '    const level=individualLevelQueue.shift();',
 '    individualLevelOpen=true;',
 "    G.UI.hide('scr-pause');",
 "    document.body?.classList?.add?.('pkmsvv-competitive-pick');",
 "    G.Audio.sfx('levelup');",
 '    G.RunUI.showLevelUp(level,G.LevelUp.offer(pl),card=>{',
 "      if(pl.dead){individualLevelQueue.length=0;individualLevelOpen=false;document.body?.classList?.remove?.('pkmsvv-competitive-pick');return;} // eliminated trainers cannot claim cards",
 "      G.Audio.sfx('confirm');card.apply(pl);individualLevelOpen=false;
      document.body?.classList?.remove?.('pkmsvv-competitive-pick');",
 '      G.Coop.localPicked();pkmsvvNextPersonalLevel();',
 '      if(!individualLevelOpen)afterLevelUp();',
 '    },false);',
 '  }',
 '  const coopApi = {'
 ].join('\n'));
patch('js/game.js',
 '    levelStart(level) {\n      // (Si tenías abierta la elección de objeto, vuelve al terminar: afterLevelUp.)',
 '    levelStart(level) {\n      if(pkmsvvCompetitive()){\n        if(pl?.dead){individualLevelQueue.length=0;individualLevelOpen=false;document.body?.classList?.remove?.('pkmsvv-competitive-pick');G.RunUI.closeLevelUp();return;}\n        individualLevelQueue.push(level);pkmsvvNextPersonalLevel();return;\n      }\n      // (Si tenías abierta la elección de objeto, vuelve al terminar: afterLevelUp.)');
patch('js/game.js',
 '    resume() {\n      G.RunUI.closeLevelUp();',
 '    resume() {\n      if(pkmsvvCompetitive())return; // never cancel an independent pick\n      G.RunUI.closeLevelUp();');
patch('js/game.js',
 "    if (state === 'levelup') {\n      for (let i = 0; i < 3; i++) {",
 "    if (state === 'levelup' || (pkmsvvCompetitive() && G.UI.isOpen('scr-levelup'))) {\n      for (let i = 0; i < 3; i++) {");
patch('js/game.js',
 "    pl.frozen = coop && (G.UI.isOpen('scr-pause') || G.UI.isOpen('scr-item'));",
 "    pl.frozen = coop && (G.UI.isOpen('scr-pause') || G.UI.isOpen('scr-item')); // skill cards never freeze movement in Royale/Egg Rush");
patch('js/game.js',
 '    if (pl.bonds > 0) offerBond(true);',
 '    if (pl.bonds > 0) offerBond(true);\n    if(pkmsvvCompetitive())pkmsvvNextPersonalLevel();');
patch('js/game.js',
 "    state = 'choice';\n    if (G.Coop.active) G.Coop.holdStart();\n    G.Audio.sfx('levelup');",
 "    if(!pkmsvvCompetitive())state='choice';\n    if(G.Coop.active&&!pkmsvvCompetitive())G.Coop.holdStart();\n    G.Audio.sfx('levelup');");
// Both item and bond choices must not create room-wide holds in competition.
function patchAll(file,from,to,expected){
 const full=path.join(game,file),s=fs.readFileSync(full,'utf8').replace(/\r\n/g,'\n');
 const count=s.split(from).length-1;
 if(count!==expected)throw Error('Competitive patch occurrences '+file+': '+count+' (expected '+expected+')');
 fs.writeFileSync(full,s.split(from).join(to),'utf8');
}
patchAll('js/game.js',
 'if (G.Coop.active) G.Coop.holdEnd();',
 'if (G.Coop.active && !pkmsvvCompetitive()) G.Coop.holdEnd();',2);
patch('js/game.js',
 "      if (o.mine) { state = 'choice'; if (G.Coop.active) G.Coop.holdStart(); }",
 "      if (o.mine && !pkmsvvCompetitive()) { state='choice'; if(G.Coop.active)G.Coop.holdStart(); }");
patch('js/game.js',
 "      state = 'choice';\n      if (G.Coop.active) G.Coop.holdStart();\n    }\n    openItem =",
 "      if(!pkmsvvCompetitive())state='choice';\n      if(G.Coop.active&&!pkmsvvCompetitive())G.Coop.holdStart();\n    }\n    openItem =");
// Never let the competitive card overlay take over the left stick. The
// match simulation, touch joystick and keyboard remain live while choosing.
patch('js/core/gamepad.js',
 "    return G.Game.state !== 'playing' || !!topScreen();",
 "    return G.Game.state !== 'playing' || (!!topScreen() && !(G.Coop?.active && (G.Royale?.active||G.EggRush?.active) && G.UI.isOpen('scr-levelup')));");
patch('js/core/gamepad.js',
 "      if (hit(G.PKMSVVPadOrb.bindings().confirm)) G.Input.virtual('space');",
 "      if(G.Coop?.active && (G.Royale?.active||G.EggRush?.active) && G.UI.isOpen('scr-levelup')){\\n"+
 "        if(hit(G.PKMSVVPadOrb.bindings().confirm))G.RunUI.pick(0);\\n"+
 "        if(hit(2))G.RunUI.pick(1);if(hit(3))G.RunUI.pick(2);\\n"+
 "      }else if (hit(G.PKMSVVPadOrb.bindings().confirm)) G.Input.virtual('space');");
// Game HUD remains touchable and the three personal card choices take very
// little space; only the cards themselves capture pointer events.
fs.appendFileSync(path.join(game,'css','style.css'),String.raw`
body.pkmsvv-competitive-pick #scr-levelup{
 background:transparent!important;pointer-events:none!important;
 padding:0!important;justify-content:flex-start!important;align-items:flex-end!important;
}
body.pkmsvv-competitive-pick #scr-levelup .box{
 pointer-events:auto!important;position:absolute!important;
 top:max(48px,env(safe-area-inset-top) + 20px)!important;
 right:max(10px,env(safe-area-inset-right))!important;left:auto!important;
 width:min(370px,48vw)!important;max-width:calc(100vw - 20px)!important;
 max-height:min(75vh,460px)!important;overflow:auto!important;
 padding:10px!important;border-radius:12px!important;background:rgba(13,36,53,.94)!important;
 box-shadow:0 4px 18px rgba(0,0,0,.5)!important;
}
body.pkmsvv-competitive-pick #scr-levelup .box h2{font-size:16px!important;margin:0 0 3px!important}
body.pkmsvv-competitive-pick #scr-levelup .box .sub{font-size:10px!important;margin:2px 0!important}
body.pkmsvv-competitive-pick #scr-levelup #cards{width:100%!important;gap:4px!important}
body.pkmsvv-competitive-pick #scr-levelup #cards .card{
 min-height:0!important;padding:5px 7px!important;gap:6px!important;
 font-size:11px!important;line-height:1.15!important;border-width:1px!important;
}
body.pkmsvv-competitive-pick #scr-levelup #cards .card .ico{width:26px!important;height:26px!important;flex:0 0 26px!important}
body.pkmsvv-competitive-pick #scr-levelup #cards .card .ico svg{width:22px!important;height:22px!important}
body.pkmsvv-competitive-pick #scr-levelup #cards .card .nm{font-size:11px!important}
body.pkmsvv-competitive-pick #scr-levelup #cards .card .ds{font-size:10px!important;line-height:1.2!important}
body.pkmsvv-competitive-pick #scr-levelup #cards .card .key{font-size:11px!important}
body.pkmsvv-competitive-pick #scr-levelup #lvl-reroll{min-height:27px;font-size:10px!important;margin-top:5px!important}
@media(max-width:650px){
 body.pkmsvv-competitive-pick #scr-levelup .box{
  top:max(26px,env(safe-area-inset-top) + 7px)!important;
  width:min(315px,54vw)!important;padding:6px!important;
  max-height:70vh!important;
 }
 body.pkmsvv-competitive-pick #scr-levelup #cards .card .ds{
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
 }
}
`+'\\n');
console.log('PKMSVV competitive: personal cards, no shared pause; Co-op shared pause preserved.');
