'use strict';
/* Runs after Web multiplayer/Co-op patches; never included in offline builds. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(rel,oldText,newText){
 const file=path.join(game,rel),s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 if(s.split(oldText).length!==2)throw Error('Co-op Voice source drift in '+rel+': '+oldText.slice(0,85));
 fs.writeFileSync(file,s.replace(oldText,newText),'utf8');
}
fs.copyFileSync(path.join(root,'src','web','pkmsvv-voice.js'),path.join(game,'js','ui','pkmsvv-voice.js'));
patch('dev.html',
 '<script defer src="js/ui/pkmsvv-coop-repair.js"></script>',
 '<script defer src="js/ui/pkmsvv-coop-repair.js"></script>\n<script defer src="js/ui/pkmsvv-voice.js"></script>');
patch('js/game.js',
 'G.MultiplayerUI.init(); G.RankingUI.init();',
 'G.MultiplayerUI.init(); G.PKMSVVVoice.init(); G.RankingUI.init();');
fs.appendFileSync(path.join(game,'css','style.css'),
 '\n'+fs.readFileSync(path.join(root,'src','web','pkmsvv-voice.css'),'utf8'),'utf8');
console.log('SVV Web: opt-in Voice Chat is active for Co-op Sống Sót only (no TURN, no media writes to Firebase).');
