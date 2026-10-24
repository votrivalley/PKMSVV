'use strict';
/* v1.4 gamepad hotfix, after all shared gameplay patches. */
const fs=require('node:fs'),path=require('node:path');
const game=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(rel,from,to){
 const fp=path.join(game,rel),s=fs.readFileSync(fp,'utf8').replace(/\r\n/g,'\n');
 if(s.split(from).length!==2)throw Error('Pad/Orb control anchor changed: '+rel+' '+from.slice(0,85));
 fs.writeFileSync(fp,s.replace(from,to),'utf8');
}
fs.copyFileSync(path.join(__dirname,'..','src','v14','pad-orb-map.js'),
 path.join(game,'js','core','pkmsvv-pad-orb-map.js'));
patch('dev.html',
 '<script defer src="js/core/gamepad.js"></script>',
 '<script defer src="js/core/pkmsvv-pad-orb-map.js"></script>\n<script defer src="js/core/gamepad.js"></script>');
// Previously the gameplay X button was already bound to manual Dash.
// Do not send the same button to both Dash and an Orb action.
patch('js/core/gamepad.js',
 "      if (hit(BT.X)) G.Input.virtual('keyf');",
 "      const orbital=G.PKMSVVPadOrb.bindings();\n"+
 "      if (hit(orbital.dash)) G.Input.virtual('keyf');\n"+
 "      if (hit(orbital.use)) G.Input.virtual('pkmsvv-orb-use');\n"+
 "      if (hit(orbital.next)) G.Input.virtual('pkmsvv-orb-next');");
patch('js/game.js',
 "    if(G.Input.tap('padx'))G.Orbs.useSelected(pl);\n    if(G.Input.tap('pady'))G.Orbs.next(pl);",
 "    if(G.Input.tap('pkmsvv-orb-use'))G.Orbs.useSelected(pl);\n    if(G.Input.tap('pkmsvv-orb-next'))G.Orbs.next(pl);");
// The settings keyboard-rebind panel remains unchanged; the new gamepad panel
// is separate and uses a constrained set of available gameplay buttons.
patch('js/ui/settings-ui.js',
 "    if(tab==='ctl')drawBindings(box);",
 "    if(tab==='ctl'){drawBindings(box);G.PKMSVVPadOrb.mount(box);}");
patch('js/ui/settings-ui.js',
 "activar movimiento especial (si lo has aprendido)</span>",
 "activar movimiento especial (si lo has aprendido)</span>");
// Keep a clear selected-slot frame in the Orb HUD for controller users.
patch('js/ui/hud.js',
 "        ctx.lineWidth=1;ctx.strokeStyle=data?data.col:'#53657c';ctx.stroke();",
 "        ctx.lineWidth=i===G.Orbs.sel?3:1;\n"+
 "        ctx.strokeStyle=i===G.Orbs.sel?'#fff2ae':data?data.col:'#53657c';ctx.stroke();");
console.log('PKMSVV v1.4: gamepad Y uses Orb, B cycles Orb, X retains manual Dash; all three remappable.');
