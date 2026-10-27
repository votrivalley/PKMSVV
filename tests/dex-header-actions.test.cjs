'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Pokédex toolbar places Select > Items > Start on same row',()=>{
 const patch=read('scripts/patch-dex-buff-layer.cjs');
 const first=patch.indexOf("addTop(oldPick,'Chọn Pokémon'");
 const second=patch.indexOf("addTop(oldItem,'Dùng vật phẩm / TM'");
 const last=patch.indexOf("toolbar.insertBefore(action,playNow)");
 assert.ok(first>0&&second>first);
 assert.ok(last>0);
 assert.match(patch,/flex-wrap:nowrap/);
 assert.match(patch,/pkmsvv-dex-top-actions/);
 assert.match(patch,/while\(box.firstChild\)scroller.appendChild/);
 assert.doesNotMatch(patch,/box\.append\(head,scroller,foot\)/);
});
test('Real move-to-header actions preserve handlers, controller and save path',()=>{
 const patch=read('scripts/patch-dex-buff-layer.cjs');
 const pad=read('scripts/patch-controller.cjs');
 const select=read('scripts/patch-ui094.cjs');
 assert.match(patch,/box\.querySelector\('#dex-pick'\)/);
 assert.match(patch,/box\.querySelector\('#pkmk-open-dex'\)/);
 assert.match(patch,/action\.id=id/);
 assert.match(pad,/id=\\"dex-play-now\\"/);
 assert.match(pad,/G\.PKMSVVPadFlow\.consumeSelected/);
 assert.match(select,/Chọn Pokémon/);
 const generated=path.join(root,'vendor/pokesurvivor/index.html');
 if(!fs.existsSync(generated))return;
 const html=read('vendor/pokesurvivor/index.html');
 const ui=read('vendor/pokesurvivor/js/ui/menu.js');
 assert.match(html,/id="pkmsvv-dex-top-actions"/);
 assert.match(ui,/toolbar\.insertBefore\(action,playNow\)/);
 assert.match(ui,/G\.PKMSVVPadFlow\.select\(dex, hasSh && viewShiny\)/);
});

test('Pokédex shows a single sharp square sprite frame on every build',()=>{
 const patch=read('scripts/patch-dex-buff-layer.cjs');
 assert.match(patch,/pkmsvv-dex-square-portrait/);
 assert.match(patch,/width="220" height="220"/);
 assert.match(patch,/aspect-ratio:1\/1/);
 assert.match(patch,/border-radius:0!important;box-shadow:none!important;outline:none!important/);
 const vendor=path.join(root,'vendor','pokesurvivor');
 if(!fs.existsSync(path.join(vendor,'index.html')))return;
 const js=read('vendor/pokesurvivor/js/ui/menu.js');
 const css=read('vendor/pokesurvivor/css/style.css');
 assert.match(js,/<canvas id="dex-big" class="stage pkmsvv-dex-square-portrait" width="220" height="220"><\/canvas>/);
 assert.match(css,/#scr-dex #dex-big\.pkmsvv-dex-square-portrait/);
 assert.match(css,/border:2px solid var\(--stage-c,#5b83d6\)/);
});
