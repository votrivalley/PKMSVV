'use strict';
/* Original compact pixel Orb sprites, visible in world drops and HUD. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(rel,from,to){
 const f=path.join(game,rel),s=fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n');
 if(s.split(from).length!==2)throw Error('Orb sprites anchor changed '+rel+': '+from.slice(0,110));
 fs.writeFileSync(f,s.replace(from,to),'utf8');
}
const dest=path.join(game,'assets','orbs');fs.mkdirSync(dest,{recursive:true});
for(const id of ['slumber','slow','blowback','focus','luminous','quick']){
 const source=path.join(root,'src','v14','orb-art',id+'.svg');
 if(!fs.existsSync(source))throw Error('Missing Orb art '+source);
 fs.copyFileSync(source,path.join(dest,id+'.svg'));
}
fs.copyFileSync(path.join(root,'src','v14','orb-sprites.js'),path.join(game,'js','systems','pkmsvv-orb-sprites.js'));
patch('dev.html',
 '<script defer src="js/systems/orbs.js"></script>',
 '<script defer src="js/systems/orbs.js"></script>\n<script defer src="js/systems/pkmsvv-orb-sprites.js"></script>');
patch('js/entities/pickup.js',
 "  /** Suelta un objeto suelto: 'heal' | 'magnet' | 'bomb' | 'coin'. */",
 "  /** Guaranteed Orb when a player learns skill eight, counted toward the cap. */\n"+
 "  function dropFirstOrb(x,y,id){\n"+
 "    if(runOrbDrops>=10 || (G.Coop.active&&!G.Coop.isHost))return false;\n"+
 "    runOrbDrops++;push(orb('orb',x,y,id));return true;\n"+
 "  }\n"+
 "  /** Suelta un objeto suelto: 'heal' | 'magnet' | 'bomb' | 'coin'. */");
patch('js/entities/pickup.js',
 "return { clear, all, dropXp, drop, update, draw, addRemote",
 "return { clear, all, dropXp, drop, dropFirstOrb, update, draw, addRemote");
patch('js/entities/pickup.js',
 "        if(p.kind==='orb'){\n"+
 "          ctx.fillStyle=(G.Orbs.BY[p.value]||{}).col||'#a6dfff';\n"+
 "          ctx.beginPath();ctx.arc(p.x,y,10,0,6.2832);ctx.fill();\n"+
 "          ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillStyle='#172536';ctx.fillText('✦',p.x,y+5);\n"+
 "          continue;\n"+
 "        }",
 "        if(p.kind==='orb'){\n"+
 "          // Draw a recognizable 32px pixel sprite, not the old generic star.\n"+
 "          const data=G.Orbs.BY[p.value];\n"+
 "          ctx.globalAlpha=0.28+Math.sin(p.t*1.4)*.12;\n"+
 "          ctx.fillStyle=data?data.col:'#a6dfff';\n"+
 "          ctx.beginPath();ctx.arc(p.x,y,19,0,6.2832);ctx.fill();\n"+
 "          ctx.globalAlpha=1;\n"+
 "          G.OrbSprites.draw(ctx,p.value,p.x-16,y-16,32);\n"+
 "          continue;\n"+
 "        }");
patch('js/game.js',
 "const PICK_SFX = { xp: 'xp'",
 "const PICK_SFX = { orb:'shiny', xp: 'xp'");
console.log('PKMSVV v1.4: six offline pixel Orb sprites; first-use guaranteed Orb counted toward 10-drop limit.');
