'use strict';
/* v1.5 Solo egg gameplay — applied after Ch3 and Orb patch layers. */
const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..');
const game=path.join(root,'vendor','pokesurvivor');
function patch(p,a,b){const file=path.join(game,p),src=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 if(src.split(a).length!==2)throw Error('Egg gameplay patch anchor drift '+p+': '+a.slice(0,92));
 fs.writeFileSync(file,src.replace(a,b),'utf8');
}
fs.mkdirSync(path.join(game,'js','systems'),{recursive:true});
fs.copyFileSync(path.join(root,'src','v15','eggs.js'),path.join(game,'js','systems','pkmsvv-eggs.js'));
fs.copyFileSync(path.join(root,'src','v15','egg-sprites.js'),path.join(game,'js','systems','pkmsvv-egg-sprites.js'));
const artFolder=path.join(game,'assets','eggs');
fs.mkdirSync(artFolder,{recursive:true});
for(const file of ['egg_follow.svg','egg_crack.svg','egg_nest.svg'])
 fs.copyFileSync(path.join(root,'src','v15','sprites',file),path.join(artFolder,file));
patch('dev.html',
 '<script defer src="js/systems/orbs.js"></script>',
 '<script defer src="js/systems/orbs.js"></script>\n<script defer src="js/systems/pkmsvv-egg-sprites.js"></script>\n<script defer src="js/systems/pkmsvv-eggs.js"></script>');
patch('js/game.js',
 '    G.Camera.x = pl.x; G.Camera.y = pl.y; G.Camera.shake = 0;',
 '    G.PKMSVVEggs.begin(pl,!!coop);\n    G.Camera.x = pl.x; G.Camera.y = pl.y; G.Camera.shake = 0;');
patch('js/game.js',
 '    G.Orbs.update(dt,pl);',
 '    G.Orbs.update(dt,pl);\n    G.PKMSVVEggs.update(dt,pl,time,coop);');
patch('js/game.js',
 '    G.Pickups.draw(ctx);',
 '    G.Pickups.draw(ctx);\n    G.PKMSVVEggs.draw(ctx);');
patch('js/game.js',
 '    G.Judgment.drawOverlay(ctx, w, h);',
 '    G.Judgment.drawOverlay(ctx, w, h);\n    G.PKMSVVEggs.hud(ctx,w,h);');
patch('js/entities/player.js',
 '    this.hp -= d;',
 '    const shield=Math.max(0,Number(this.pkmsvvShield)||0),absorbed=Math.min(shield,d);\n'+
 '    this.pkmsvvShield=shield-absorbed;\n'+
 '    this.hp -= d-absorbed;');
fs.appendFileSync(path.join(game,'css','style.css'),`
/* v1.5 egg-team replacement keeps active companions user-controlled. */
.pkmsvv-egg-choice{position:fixed;z-index:12020;inset:0;background:#081e2bd9;display:grid;place-items:center;padding:16px}
.pkmsvv-egg-choice-inner{display:flex;flex-direction:column;gap:10px;width:min(430px,95vw);max-height:90vh;overflow:auto;padding:19px;background:linear-gradient(145deg,#225d65,#10333e);border:3px solid #8fdfd2;border-radius:18px;color:#f9fffd;box-shadow:0 10px 35px #0009}
.pkmsvv-egg-choice-inner h3{color:#ffe57b;font-size:21px;margin:0}
.pkmsvv-egg-choice-inner p{line-height:1.5;margin:0 0 6px}
.pkmsvv-egg-choice-inner button{min-height:45px}
`,'utf8');
console.log('PKMSVV v1.5: Ch3 egg nests / follower incubation / small support abilities integrated for solo.');
