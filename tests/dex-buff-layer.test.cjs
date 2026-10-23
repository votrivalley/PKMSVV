'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Pokédex actions are separate from scrollable details',()=>{
 const src=read('scripts/patch-dex-buff-layer.cjs');
 for(const x of ['pkmsvv-dex-head','pkmsvv-dex-foot','pkmsvv-dex-scroll','while(box.firstChild)scroller.appendChild','head.appendChild(partnerAction)','foot.appendChild(itemAction)','box.append(head,scroller,foot)','grid-template-rows:auto minmax(0,1fr) auto','overflow-y:auto'])
  assert.ok(src.includes(x),x);
});
test('Render buff rings and orbit sprites below Pokemon on all builds',()=>{
 const script=read('scripts/patch-dex-buff-layer.cjs');
 for(const text of ['if(!ring.includes','drawGround(ctx)','!!p.orb===underSprite','G.Projectiles.drawGround(ctx)'])
  assert.ok(script.includes(text),text);
 const dir='vendor/pokesurvivor/';
 if(!fs.existsSync(path.join(root,dir,'index.html')))return;
 const menu=read(dir+'js/ui/menu.js'),pl=read(dir+'js/entities/player.js');
 const proj=read(dir+'js/entities/projectile.js'),game=read(dir+'js/game.js');
 assert.ok(menu.includes('box.append(head,scroller,foot)'));
 assert.ok(pl.indexOf('Arcos de buff alrededor de los pies')<pl.indexOf('this.anim.draw(ctx, this.x, this.y'));
 assert.ok(pl.includes('Math.PI * 2); // PKMSVV: whole ON ring'));
 assert.ok(proj.includes('!!p.orb===underSprite'));
 assert.ok(proj.includes('drawGround, draw, nearest'));
 assert.ok(game.indexOf('G.Projectiles.drawGround(ctx)')<game.indexOf('items.sort'));
 assert.ok(read(dir+'css/style.css').includes('pkmsvv-dex-scroll'));
});
