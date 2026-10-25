'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const id='com.votrivalley.pkmsvv';
const dir=path.join(root,'dist','switch-package','switch','brewser','apps',id);
const content=p=>fs.readFileSync(path.join(dir,p),'utf8');
test('offline Switch app has local assets, scripts and licenses',()=>{
 for(const name of ['index.html','js','css','assets','manifest.json','pkmsvv-switch-boot.js','LICENSE-NONCOMMERCIAL.md','CREDITS.md','NOTICE-PKMSVV.txt'])
   assert.ok(fs.existsSync(path.join(dir,name)),name);
 assert.match(content('index.html'),/<canvas\b/i);
 assert.match(content('index.html'),/app\.min\.js/);
});
test('Switch controller mapping preserves moving and active dash',()=>{
 assert.match(content('js/core/gamepad.js'),/navigator\.getGamepads/);
 assert.match(content('js/core/gamepad.js'),/hit\(orbital\.dash\).*virtual\('keyf'\)/);
 assert.match(content('js/core/gamepad.js'),/hit\(orbital\.use\).*virtual\('pkmsvv-orb-use'\)/);
 assert.match(content('js/core/pkmsvv-pad-orb-map.js'),/dash:2,use:3/);
 assert.match(content('js/systems/combat.js'),/manualDash\(pl\)/);
});
test('manifest reserves Plus for pause, storage and noncommercial offline play',()=>{
 const m=JSON.parse(content('manifest.json'));
 assert.equal(m.id,id);assert.equal(m.entry,'index.html');
 assert.equal(m.exitGame,'MINUS');assert.equal(m.fullscreen,true);
 assert.deepEqual(m.allowed_origins,[]);
 assert.ok(m.permissions.includes('storage'));
 assert.ok(fs.existsSync(path.join(dir,m.logo)));
});
test('boot settings only apply on first run; clear install instruction',()=>{
 const b=content('pkmsvv-switch-boot.js');
 assert.match(b,/if \(!localStorage\.getItem\(key\)\)/);
 assert.match(b,/quality:"low"/);
 const info=fs.readFileSync(path.join(root,'dist','switch-package','HUONG_DAN_SWITCH.txt'),'utf8');
 assert.ok(info.includes('brewser://apps/'+id+'/index.html'));
 assert.ok(info.includes('sd:/switch/brewser.nro'));
});

test('renamed Pokemon Chuyển sinh branding and complete Switch bundle guide',()=>{
 const manifest=JSON.parse(content('manifest.json'));
 assert.match(manifest.name,/Pokemon Chuyển sinh/);
 assert.doesNotMatch(manifest.name,/Survival/);
 const guide=fs.readFileSync(path.join(root,'dist','switch-package','HUONG_DAN_SWITCH.txt'),'utf8');
 assert.match(guide,/brewser-forwarder\.nsp/);
 assert.match(guide,/NSP này CHỈ mở Brewser/);
 assert.match(guide,/PKMSVV\.nro/);
 assert.match(guide,/switch\/brewser\.nro/);
});
