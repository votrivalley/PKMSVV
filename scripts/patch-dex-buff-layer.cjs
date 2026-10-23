'use strict';
/* Shared Windows/Android/Web: stationary Pokédex controls, under-sprite buffs and orbit attacks. */
const fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(rel,a,b){
 const file=path.join(dir,rel),src=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 const n=src.split(a).length-1;
 if(n!==1)throw Error('PKMSVV source anchor '+rel+' expected once, got '+n+': '+a.slice(0,80));
 fs.writeFileSync(file,src.replace(a,b),'utf8');
}
const mount="    // Anchored companion action, scrolling info, anchored item/TM action.\n    const scroller=document.createElement('div');\n    scroller.className='pkmsvv-dex-scroll';\n    const head=document.createElement('div');head.className='pkmsvv-dex-head';\n    const foot=document.createElement('div');foot.className='pkmsvv-dex-foot';\n    const partnerAction=box.querySelector('#dex-pick')||box.querySelector('button.btn.grow[disabled]');\n    const itemAction=box.querySelector('#pkmk-open-dex');\n    while(box.firstChild)scroller.appendChild(box.firstChild);\n    if(partnerAction)head.appendChild(partnerAction);\n    if(itemAction)foot.appendChild(itemAction);\n    box.append(head,scroller,foot);";
patch('js/ui/menu.js','    G.KecleonUI.attachDex(dex,box);',
 '    G.KecleonUI.attachDex(dex,box);\n'+mount);
// Move the complete ON/OFF ring before the Pokemon sprite render.
const playerFile=path.join(dir,'js','entities','player.js');
let player=fs.readFileSync(playerFile,'utf8').replace(/\r\n/g,'\n');
const begin='    // Arcos de buff alrededor de los pies.';
const finish='    // Cooperativo: anillo de "reviviendo" y nombre encima.';
const anim="    this.anim.draw(ctx, this.x, this.y, { flash: this.flash > 0, softFlash: true, alpha, color: '#ffcb3d' });";
const a=player.indexOf(begin),b=player.indexOf(finish,a),c=player.indexOf(anim);
if(a<0||b<a||c<0||c>a||player.indexOf(anim,c+anim.length)!==-1)
 throw Error('PKMSVV buff ring draw source changed');
const ring=player.slice(a,b);
if(!ring.includes('Math.PI * 2')||!ring.includes('if (b.n <= 0) continue;'))
 throw Error('ON/OFF buff ring policy changed');
player=player.slice(0,c)+ring+player.slice(c,a)+player.slice(b);
if(!(player.indexOf(begin)<player.indexOf(anim)))throw Error('Buffs still overlay sprite');
fs.writeFileSync(playerFile,player,'utf8');
// Orbiting Razor Leaf and similar projectiles are drawn in the ground pass.
// Other missiles, particles, damage numbers stay in their original front layer.
const projectileFile=path.join(dir,'js','entities','projectile.js');
let source=fs.readFileSync(projectileFile,'utf8').replace(/\r\n/g,'\n');
const drawStart=source.indexOf('  function draw(ctx) {');
const drawEnd=source.indexOf('  return { clear, all, spawn',drawStart);
if(drawStart<0||drawEnd<=drawStart)throw Error('Projectile renderer source changed');
let block=source.slice(drawStart,drawEnd);
const loops=block.split('for (const p of list)').length-1;
if(loops!==3)throw Error('Expected 3 projectile draw loops, got '+loops);
block=block.replace('  function draw(ctx) {',
 '  function drawLayer(ctx,underSprite) {\n    const rendered=list.filter(p=>!!p.orb===underSprite);');
block=block.replaceAll('for (const p of list)','for (const p of rendered)');
block+='  function drawGround(ctx) { drawLayer(ctx,true); }\n';
block+='  function draw(ctx) { drawLayer(ctx,false); }\n\n';
source=source.slice(0,drawStart)+block+source.slice(drawEnd);
const before='clearOrbs, update, remove, draw, nearest,';
if(source.split(before).length!==2)throw Error('Projectile return API changed');
source=source.replace(before,'clearOrbs, update, remove, drawGround, draw, nearest,');
fs.writeFileSync(projectileFile,source,'utf8');
patch('js/game.js','    G.Pickups.draw(ctx);',
 '    G.Pickups.draw(ctx);\n    G.Projectiles.drawGround(ctx); // PKMSVV orbit art below sprites');
const css="\n/* Pokédex: both controls are siblings outside the scrolling text panel. */\n#scr-dex #dex-detail{\n display:grid!important;grid-template-rows:auto minmax(0,1fr) auto;\n min-height:0;min-width:0;max-height:100%;overflow:hidden!important;\n box-sizing:border-box;overscroll-behavior:contain;\n}\n#scr-dex #dex-detail .pkmsvv-dex-scroll{\n min-height:0;min-width:0;overflow-x:hidden;overflow-y:auto;\n overscroll-behavior-y:contain;scrollbar-gutter:stable;\n -webkit-overflow-scrolling:touch;padding:2px 3px 8px;\n}\n#scr-dex #dex-detail .pkmsvv-dex-head,\n#scr-dex #dex-detail .pkmsvv-dex-foot{\n position:static!important;min-width:0;flex:none;z-index:1;\n background:#173f49;padding:6px;border-radius:8px;\n}\n#scr-dex #dex-detail .pkmsvv-dex-head:empty,\n#scr-dex #dex-detail .pkmsvv-dex-foot:empty{display:none}\n#scr-dex #dex-detail .pkmsvv-dex-head{margin-bottom:6px}\n#scr-dex #dex-detail .pkmsvv-dex-foot{margin-top:6px}\n#scr-dex #dex-detail .pkmsvv-dex-head .btn,\n#scr-dex #dex-detail .pkmsvv-dex-foot .btn{\n position:static!important;inset:auto!important;bottom:auto!important;\n order:initial!important;margin:0!important;box-shadow:none!important;\n min-height:44px;width:100%;max-width:100%;white-space:normal;line-height:1.25;\n padding:8px 10px!important;\n}\n#scr-dex #dex-detail .pkmsvv-dex-scroll .btn{\n position:static!important;bottom:auto!important;order:initial!important;\n margin-top:6px!important;\n}\n@media(max-height:520px){\n #scr-dex #dex-detail{padding:5px!important;grid-template-rows:auto minmax(0,1fr) auto;}\n #scr-dex #dex-detail .pkmsvv-dex-head,\n #scr-dex #dex-detail .pkmsvv-dex-foot{padding:4px}\n #scr-dex #dex-detail .pkmsvv-dex-head .btn,\n #scr-dex #dex-detail .pkmsvv-dex-foot .btn{font-size:13px!important;min-height:42px}\n}\n";
fs.appendFileSync(path.join(dir,'css','style.css'),'\n'+css+'\n','utf8');
console.log('PKMSVV: Dex fixed header/footer + rear buff rings and orbit art');
