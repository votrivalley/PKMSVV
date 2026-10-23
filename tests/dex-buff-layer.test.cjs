'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Pokédex actions are separate from scrollable details',()=>{
 const src=read('scripts/patch-dex-buff-layer.cjs');
 for(const x of ['pkmsvv-dex-top-actions','pkmsvv-dex-scroll','while(box.firstChild)scroller.appendChild','addTop(oldPick,\'Chọn Pokémon\'','addTop(oldItem,\'Dùng vật phẩm / TM\'','toolbar.insertBefore(action,playNow)','box.appendChild(scroller)','overflow-y:auto'])
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
 assert.ok(menu.includes('toolbar.insertBefore(action,playNow)'));
 assert.ok(pl.indexOf('Arcos de buff alrededor de los pies')<pl.indexOf('this.anim.draw(ctx, this.x, this.y'));
 assert.ok(pl.includes('Math.PI * 2); // PKMSVV: whole ON ring'));
 assert.ok(proj.includes('!!p.orb===underSprite'));
 assert.ok(proj.includes('drawGround, draw, nearest'));
 assert.ok(game.indexOf('G.Projectiles.drawGround(ctx)')<game.indexOf('items.sort'));
 assert.ok(read(dir+'css/style.css').includes('pkmsvv-dex-scroll'));
 const html=read(dir+'index.html');
 assert.match(html,/id="pkmsvv-dex-top-actions"/);
 assert.ok(html.indexOf('id="pkmsvv-dex-top-actions"')<html.indexOf('id="dex-play-now"'));
 assert.match(menu,/addTop\(oldPick,'Chọn Pokémon','dex-pick'\)/);
 assert.match(menu,/addTop\(oldItem,'Dùng vật phẩm \/ TM','pkmk-open-dex'\)/);
});
