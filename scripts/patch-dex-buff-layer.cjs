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
const mount="    // Three separate buttons in the Pokédex header: Select, Items, Start.\n    const toolbar=document.getElementById('pkmsvv-dex-top-actions');\n    const playNow=document.getElementById('dex-play-now');\n    if(!toolbar||!playNow)throw Error('PKMSVV: missing Pokédex top action row');\n    toolbar.querySelectorAll('[data-pkmsvv-dex-action]').forEach(button=>button.remove());\n    const oldPick=box.querySelector('#dex-pick')||box.querySelector('.pkmsvv-dex-action button[disabled]');\n    const oldItem=box.querySelector('#pkmk-open-dex');\n    const addTop=(button,label,id)=>{\n      const action=button||document.createElement('button');\n      if(!button){action.type='button';action.className='btn small';action.disabled=true;}\n      const english=G.I18n&&G.I18n.lang==='en';\n      action.id=id;action.textContent=english?(id==='dex-pick'?'Choose Pokémon':'Use Items / TMs'):label;action.dataset.pkmsvvDexAction='1';\n      action.classList.add('btn','small','pkmsvv-dex-top-btn');\n      action.classList.remove('grow');action.removeAttribute('style');\n      // Even the already-selected partner may be confirmed again before START.\n      if(button && button.disabled && id==='dex-pick')action.disabled=false;\n      toolbar.insertBefore(action,playNow);\n    };\n    addTop(oldPick,'Chọn Pokémon','dex-pick');\n    addTop(oldItem,'Dùng vật phẩm / TM','pkmk-open-dex');\n    const emptyHolder=box.querySelector('.pkmsvv-dex-action');\n    if(emptyHolder&&!emptyHolder.querySelector('button'))emptyHolder.remove();\n    // Only stats, skills, nature and ability scroll, never the three actions.\n    const scroller=document.createElement('div');\n    scroller.className='pkmsvv-dex-scroll';\n    while(box.firstChild)scroller.appendChild(box.firstChild);\n    box.appendChild(scroller);";
patch('dev.html',
 '<button id="dex-play-now" class="btn small gold hidden" type="button">▶ CHƠI NGAY (START)</button>',
 '<div id="pkmsvv-dex-top-actions" role="group" aria-label="Thao tác Pokémon">'+
 '<button id="dex-play-now" class="btn small gold hidden" type="button">▶ CHƠI NGAY (START)</button></div>');
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
const css="\n/* Header order: [Chọn Pokémon] [Dùng vật phẩm / TM] [Chơi ngay]. */\n#scr-dex .box > .row.between{\n display:flex!important;flex-wrap:nowrap!important;\n align-items:center!important;justify-content:space-between!important;\n gap:8px!important;min-width:0;\n}\n#scr-dex .box > .row.between > h2{\n flex:1 1 auto;min-width:0;white-space:nowrap;\n}\n#scr-dex #pkmsvv-dex-top-actions{\n display:flex;flex:0 1 auto;min-width:0;align-items:center;\n flex-wrap:nowrap;gap:7px;overflow-x:auto;scrollbar-width:none;\n -webkit-overflow-scrolling:touch;\n}\n#scr-dex #pkmsvv-dex-top-actions::-webkit-scrollbar{display:none}\n#scr-dex #pkmsvv-dex-top-actions > .btn{\n position:static!important;flex:0 0 auto;min-width:0;\n margin:0!important;white-space:nowrap!important;\n height:48px;min-height:44px;padding:7px 12px!important;\n font-size:clamp(12px,1.05vw,17px);font-weight:700;\n}\n#scr-dex #pkmsvv-dex-top-actions #dex-play-now{\n border-color:#ffdb6b;min-width:0;\n}\n#scr-dex #pkmsvv-dex-top-actions > .btn[disabled]{\n opacity:.48;cursor:not-allowed;\n}\n#scr-dex #dex-detail{\n display:block!important;min-height:0;min-width:0;\n max-height:100%;overflow:hidden!important;\n box-sizing:border-box;overscroll-behavior:contain;\n}\n#scr-dex #dex-detail .pkmsvv-dex-scroll{\n height:100%;min-height:0;min-width:0;overflow-x:hidden;overflow-y:auto;\n overscroll-behavior-y:contain;scrollbar-gutter:stable;\n -webkit-overflow-scrolling:touch;padding:2px 3px 8px;\n}\n#scr-dex #dex-detail .pkmsvv-dex-action{display:none!important}\n@media(max-height:520px), (max-width:850px){\n #scr-dex .box > .row.between{gap:5px!important}\n #scr-dex .box > .row.between > h2{font-size:17px}\n #scr-dex #pkmsvv-dex-top-actions{gap:4px}\n #scr-dex #pkmsvv-dex-top-actions > .btn{\n  height:41px;min-height:40px;padding:5px 7px!important;font-size:12px;\n }\n}\n";
fs.appendFileSync(path.join(dir,'css','style.css'),'\n'+css+'\n','utf8');
console.log('PKMSVV: Dex fixed header/footer + rear buff rings and orbit art');
