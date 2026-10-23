'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,'vendor/pokesurvivor',p),'utf8');
test('the layout button opens above settings and surfaces any error',()=>{
 const ui=read('js/ui/settings-ui.js'),editor=read('js/ui/layout-ui.js'),css=read('css/style.css');
 assert.match(ui,/addEventListener\('click',e=>/);
 assert.match(ui,/closest\('#set-layout'\)/);
 assert.match(ui,/G\.LayoutUI\.open\(\)/);
 assert.match(ui,/Không mở được chỉnh nút/);
 assert.match(editor,/el\.style\.zIndex='10080'/);
 assert.match(css,/#scr-layout\{z-index:10080!important/);
});
test('touch layout can drag/save/reset bar, pause, joystick and active dash',()=>{
 const src=read('js/ui/layout-ui.js'),hud=read('js/ui/hud.js'),settings=read('js/core/settings.js');
 for(const k of ['bar','pause','stick','dash'])assert.ok(src.includes('data-k="'+k+'"'));
 assert.match(src,/G\.Settings\.set\('pad',/);
 assert.match(src,/G\.Settings\.set\('stickMode',/);
 assert.match(src,/id="lay-reset"/);
 assert.match(src,/id="lay-save"/);
 assert.match(src,/pointermove/);
 assert.match(hud,/G\.Touch\.spot\('dash'\)/);
 assert.match(settings,/localStorage\.setItem\(KEY/);
 assert.doesNotMatch(src,/G\.DB\.commit/);
});
