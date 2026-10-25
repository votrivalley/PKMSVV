'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const lum=h=>[.2126,.7152,.0722].reduce((a,w,i)=>{let c=parseInt(h.slice(1+i*2,3+i*2),16)/255;return a+w*(c<=.04045?c/12.92:((c+.055)/1.055)**2.4)},0);
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
test('palette core text pairs meet WCAG AA 4.5:1',()=>{
 for(const [text,bg] of [
 ['#173648','#d5ebe6'],['#173648','#ffe36a'],['#143646','#f6fffb'],
 ['#fbffff','#28656c'],['#e0f2ee','#17424c'],
 ['#133448','#eaf8f2'],['#27495b','#eaf8f2'],
 ['#192e3a','#ffda39'],['#f8fffb','#123943']
 ])assert.ok(ratio(text,bg)>=4.5,text+' on '+bg+' ratio '+ratio(text,bg));
});
test('upgrade picker contains individual-only warning and separate preserved paths',()=>{
 const patch=read('scripts/patch-retro-ui.cjs'),chooser=read('src/pkmsvv-upgrade-select.js');
 assert.match(patch,/data-go="global"/);assert.match(patch,/scr-upgrade-select/);
 assert.match(chooser,/G\.MenuUI\.openUpgrades\(\)/);
 assert.match(chooser,/G\.GlobalPowerUI\.open\(\)/);
 assert.match(chooser,/CHỈ áp dụng cho một Pokémon/);
});

test('upgrade chooser displays permanent account skill milestones without unsafe HTML',()=>{
 const s=read('src/pkmsvv-upgrade-select.js'),css=read('src/pkmsvv-retro-theme.css');
 assert.match(s,/PKMSVVSkillTrack\.guide/);assert.match(s,/panel\.replaceChildren/);
 assert.match(css,/pkmsvv-skill-guide-grid/);
});

test('single-line title and aligned icon/labels survive v1.5 menu polishing',()=>{
 const title=read('scripts/patch-v14-title-readability.cjs');
 const colors=read('src/pkmsvv-retro-theme.css');
 const shop=read('scripts/patch-kecleon.cjs');
 const web=read('scripts/patch-retro-web.cjs');
 assert.match(title,/pkmsvv-one-line/);
 assert.match(title,/Pokémon Sống Sót/);
 const final=read('scripts/patch-v15-menu-qa.cjs');
 assert.match(final,/pkmsvv-credit/);
 assert.match(final,/border-radius:0!important/);
 assert.match(final,/white-space:nowrap!important/);
 assert.match(final,/position:fixed!important/);
 assert.match(title,/justify-content:center!important/);
 assert.match(colors,/\.menu-item>\.mi-ico/);
 assert.match(colors,/grid-template-columns:34px max-content/);
 assert.match(colors,/align-items:center/);
 assert.match(shop,/Kecleon shop/);
 assert.match(shop,/pkmsvv-menu-copy/);
 assert.match(web,/multiplayer\.replace\('Nhiều người chơi','Nhiều người'\)/);
});

test('v1.5 menu preserves cloud and fullscreen, moves backup to Options, and keeps Orb keyboard binding',()=>{
 const menu=read('scripts/patch-v14-title-readability.cjs');
 const keys=read('scripts/patch-keybind-title.cjs');
 const pad=read('src/v14/pad-orb-map.js');
 const dex=read('src/kecleon/pkmsvv-kecleon-ui.js');
 assert.match(menu,/pkmsvv-v15-menu/);
 assert.match(menu,/pkmsvv-v15-partner/);
 assert.match(menu,/pkmsvv-v15-discord/);
 assert.match(menu,/pkmsvv-v15-event/);
 assert.match(menu,/pkmsvv-v15-news/);
 assert.match(menu,/pkmsvv-v15-backup/);
 assert.match(menu,/btn-backup\{display:none!important\}/);
 assert.doesNotMatch(menu,/#btn-save\{display:none/);
 assert.doesNotMatch(menu,/#btn-full\{display:none/);
 assert.match(keys,/orb:'digit5'/);
 assert.match(keys,/orb:'Dùng Orb'/);
 assert.doesNotMatch(pad,/Không cần nút chuyển Orb/);
 assert.doesNotMatch(dex,/pane\.innerHTML='<h3>'\+L\('Tính cách, Đặc tính & TM'/);
});

test('v1.5 final UI eliminates circle, duplicate News frame, low menu and blocked Discord',()=>{
 const polish=read('scripts/patch-v15-menu-qa.cjs');
 const build=read('scripts/prepare-game.cjs');
 const main=read('desktop/main.cjs');
 const preload=read('desktop/preload.cjs');
 const keys=read('src/v14/pad-orb-map.js');
 const pad=read('scripts/patch-v14-gamepad-orbs.cjs');
 assert.match(build,/patch-v15-menu-qa\.cjs/);
 assert.match(polish,/Việt hóa và Mod điều chỉnh bởi Votri Valley/);
 assert.match(polish,/border-radius:0!important/);
 assert.match(polish,/margin-top:0!important/);
 assert.match(polish,/holder\.replaceWith\(news\)/);
 assert.match(polish,/noopener noreferrer/);
 assert.match(polish,/window\.PKMSVVNative\?\.openDiscord/);
 assert.match(main,/pkmsvv:open-discord/);
 assert.match(main,/https:\/\/discord\.gg\/z36Hb9775K/);
 assert.match(preload,/openDiscord/);
 assert.doesNotMatch(keys,/reroll:tr\('Đổi thẻ'/);
 assert.doesNotMatch(keys,/,'reroll'\]/);
 assert.doesNotMatch(pad,/PKMSVVPadOrb\.bindings\(\)\.reroll/);
});
