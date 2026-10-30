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

test('upgrade chooser shows Mystery Orb before Skill Awakening, without support encyclopedia',()=>{
 const s=read('src/pkmsvv-upgrade-select.js');
 assert.match(s,/Hướng dẫn Mystery Orb/);
 assert.match(s,/Hướng dẫn Thức tỉnh kỹ năng/);
 assert.ok(s.indexOf('Hướng dẫn Mystery Orb')<s.indexOf('Hướng dẫn Thức tỉnh kỹ năng'));
 assert.doesNotMatch(s,/Thông tin Pokémon hỗ trợ/);
 assert.match(s,/G\.Orbs\?\.LIST/);
 assert.match(s,/G\.PKMSVVSkillTrack\?\.guide/);
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
 assert.match(keys,/orb:'digit4'/);
  assert.match(keys,/mega:'digit5'/);
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

test('v1.5 backup opens separate modal after closing Settings',()=>{
 const ui=read('scripts/patch-v15-menu-qa.cjs');
 const save=read('src/pkmsvv-save-ui.js');
 assert.ok(ui.includes('saveTab.onclick=event=>'));
 assert.ok(ui.includes('G.SettingsUI?.close?.()'));
 assert.ok(ui.includes('G.PKMSVVSaveUI.openQuick()'));
 assert.ok(!ui.includes('G.PKMSVVSaveUI.mount(saveBody'));
 assert.ok(save.includes("modal.id='scr-pkmsvv-save-quick'"));
 assert.ok(save.includes("wrap.querySelector('#'+prefix+'-export').onclick"));
 assert.ok(save.includes("wrap.querySelector('#'+prefix+'-import').onclick"));
});
test('v1.5 renamed runtime retains completed egg gameplay on all platforms',()=>{
 const patch=read('scripts/patch-v15-menu-qa.cjs');
 const game=read('scripts/prepare-game.cjs');
 const web=read('scripts/prepare-web.cjs');
 assert.ok(patch.includes('Pokemon Chuyển sinh'));
 assert.ok(game.includes('pkmsvv-changelog-v15.js'));
 assert.ok(game.includes('patch-v15-eggs.cjs'));
 assert.ok(web.includes('patch-v15-egg-rush-web.cjs'));
 assert.ok(web.includes('Có gì mới: 1.5'));
});

test('v1.5 home subtitle announces waking up as a Pokemon without changing save identity',()=>{
 const qa=read('scripts/patch-v15-menu-qa.cjs');
 assert.match(qa,/Tỉnh giấc tôi thấy mình hóa Pokemon/);
 assert.match(qa,/pkmsvv-awakening-tagline/);
 assert.match(qa,/menuStart=markup.indexOf/);
 assert.match(qa,/translate="no"/);
 assert.match(qa,/text-transform:uppercase/);
 assert.match(read('desktop/main.cjs'),/PKMSVV-Offline/);
});

test('desktop nav bottom aligns with left cards without legacy 32px cap',()=>{
 const src=read('scripts/patch-v15-menu-qa.cjs');
 assert.match(src,/leftEdge-rightEdge,available/);
 assert.doesNotMatch(src,/Math\.min\(32,leftEdge-rightEdge/);
 assert.match(src,/window\.addEventListener\('resize'/);
 assert.match(src,/min-width: 1000px/);
});

test('Support encyclopedia lives beside Upgrade Back, not in main Pokémon menu',()=>{
 const s=read('src/pkmsvv-support-catalog.js'),css=read('src/pkmsvv-retro-theme.css');
 const patch=read('scripts/patch-v15-eggs.cjs');
 assert.match(s,/pkmsvv-upgrade-back/);
 assert.match(s,/back\\.parentElement\\.insertBefore\\(button,back\\)/);
 assert.doesNotMatch(s,/getElementById\\('scr-dex'\\)/);
 assert.match(s,/pkmsvv-support-entry/);
 assert.match(s,/pkmsvvSupportShiny/);
 assert.match(css,/pkmsvv-support-entry-btn/);
 assert.match(css,/pkmsvv-support-cell\\.locked canvas/);
 assert.match(patch,/pkmsvv-support-catalog\\.js/);
});
test('Memories contains chapter replay buttons, but no Mystery Orb guide button',()=>{
 const src=read('src/pkmsvv-story.js');
 assert.match(src,/data-chapter/);
 assert.match(src,/Chương 3 · Mầm Sống Bị Lãng Quên/);
 assert.match(src,/data-close/);
 assert.doesNotMatch(src,/data-orb-help/);
 assert.doesNotMatch(src,/pkmsvv-orb-guide-back/);
});

test('Windows-only fullscreen control toggles windowed/fullscreen from Pause or Graphics',()=>{
 const src=read('src/pkmsvv-pc-fullscreen.js');
 const patch=read('scripts/patch-v155-pc-fullscreen.cjs');
 const build=read('scripts/prepare-game.cjs');
 assert.match(src,/window\.PKMSVVNative/);
 assert.match(src,/pkmsvv-pc-restore-pause/);
 assert.match(src,/pkmsvv-pc-restore-settings/);
 assert.match(src,/native\.isFullscreen\(\)/);
 assert.match(src,/await native\.toggleFullscreen\(\)/);
 assert.match(src,/event\.key==='F11'/);
 assert.match(src,/Thu gọn màn hình/);
 assert.match(src,/G\.RunUI\.showPause=function/);
 assert.match(src,/G\.SettingsUI\.open=function/);
 assert.match(patch,/js\/ui\/pkmsvv-pc-fullscreen\.js/);
 assert.match(build,/patch-v155-pc-fullscreen\.cjs/);
});

test('Skill Awakening guide hides only after all eight skill slots unlock',()=>{
 const code=read('src/pkmsvv-upgrade-select.js');
 assert.match(code,/const awakening=G\.PKMSVVSkillTrack\?\.guide\?/);
 assert.match(code,/if\(!awakening\|\|awakening\.count<8\)/);
 assert.ok(code.indexOf('Hướng dẫn Mystery Orb')<code.indexOf('Hướng dẫn Thức tỉnh kỹ năng'));
 // Progress is calculated from both persisted milestones and current achievements.
 const skill=read('src/pkmsvv-skill-track.js');
 assert.match(skill,/return \{headline,note,lines,count:p\.count\}/);
});
