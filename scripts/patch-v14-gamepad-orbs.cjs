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
 "      if (hit(orbital.use)) G.Input.virtual('pkmsvv-orb-use');");
patch('js/game.js',
 "    if(G.Input.tap('padx'))G.Orbs.useSelected(pl);\n    if(G.Input.tap('pady'))G.Orbs.next(pl);",
 "    if(G.Input.tap('pkmsvv-orb-use'))G.Orbs.useNext(pl);");
// The settings keyboard-rebind panel remains unchanged; the new gamepad panel
// is separate and uses a constrained set of available gameplay buttons.
patch('js/ui/settings-ui.js',
 "    if(tab==='ctl')drawBindings(box);",
 "    if(tab==='ctl')G.PKMSVVPadOrb.mount(box);");

 // UI actions remap only the actual buttons used by gameplay/menu logic.
patch('js/core/gamepad.js',
 "      if (hit(BT.A)) press();",
 "      if (hit(G.PKMSVVPadOrb.bindings().confirm)) press();");
patch('js/core/gamepad.js',
 "      if (hit(BT.B) || hit(BT.BACK)) back();",
 "      if (hit(G.PKMSVVPadOrb.bindings().back) || hit(BT.BACK)) back();");
patch('js/core/gamepad.js',
 "      if (hit(BT.START)) {",
 "      if (hit(G.PKMSVVPadOrb.bindings().pause)) {");
// Y / △ is for using an Orb in a run. Do not advertise or remap
// a duplicate "Đổi thẻ" action (skill cards are chosen directly).
patch('js/core/gamepad.js',
 "      if (hit(BT.Y)) G.Input.virtual('keyr');",
 "      // Orb remains available on Y in the run; menu needs no extra card-cycle button.");
patch('js/core/gamepad.js',
 "      if (hit(BT.START) || hit(BT.BACK)) G.Input.virtual('escape');",
 "      if (hit(G.PKMSVVPadOrb.bindings().pause) || hit(BT.BACK)) G.Input.virtual('escape');");
patch('js/core/gamepad.js',
 "      if (hit(BT.A)) G.Input.virtual('space');",
 "      if (hit(G.PKMSVVPadOrb.bindings().confirm)) G.Input.virtual('space');");
// Map old Y=reroll only in the level-up UI, not an additional Orb selector.
console.log('PKMSVV v1.5: single Keyboard/Controller control tabs and complete remappable actions.');
