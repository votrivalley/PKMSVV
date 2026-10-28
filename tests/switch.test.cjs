'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const id='com.votrivalley.pkmsvv';
const dir=path.join(root,'dist','switch-package','switch','brewser','apps',id);
const content=p=>fs.readFileSync(path.join(dir,p),'utf8');
test('offline Switch app has local assets, scripts and licenses',()=>{
 for(const name of ['index.html','js','css','assets','manifest.json','pkmsvv-switch-boot.js','pkmsvv-switch-health.js','LICENSE-NONCOMMERCIAL.md','CREDITS.md','NOTICE-PKMSVV.txt'])
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
 assert.ok(info.includes('PKMSVV.nro'));
 assert.match(info,/tự cài/);
});

test('Switch NRO includes runtime and game assets and preserves save data',()=>{
 const manifest=JSON.parse(content('manifest.json'));
 assert.match(manifest.name,/Pokemon Chuyển sinh/);
 const guide=fs.readFileSync(path.join(root,'dist','switch-package','HUONG_DAN_SWITCH.txt'),'utf8');
 assert.ok(guide.includes('một file PKMSVV.nro'));
 assert.match(guide,/không xóa/i);
 const c=fs.readFileSync(path.join(root,'switch/nro-forwarder/source/main.c'),'utf8');
 for(const part of ['romfsInit()','copyTree(GAME_SOURCE,GAME)','markVersion(version)',
   'envSetNextLoad(RUNTIME,args)','--fwd=1','--app=com.votrivalley.pkmsvv'])
  assert.ok(c.includes(part),part);
 const make=fs.readFileSync(path.join(root,'switch/nro-forwarder/Makefile'),'utf8');
 assert.ok(make.includes('ROMFS\t:=\tromfs'));
 const workflow=fs.readFileSync(path.join(root,'.github/workflows/build-switch.yml'),'utf8');
 assert.match(workflow,/PKMSVV-Switch-One-File-NRO/);
 assert.match(workflow,/sha256sum -c/);
});


test('Switch boot reuses libnx automatic SD mount and probes real access',()=>{
 const c=fs.readFileSync(path.join(root,'switch/nro-forwarder/source/main.c'),'utf8');
 const init=c.indexOf('fsdevGetDeviceFileSystem("sdmc")');
 const mount=c.indexOf('fsdevMountSdmc()',init);
 const read=c.indexOf('opendir("sdmc:/")',mount);
 assert.ok(init>=0&&mount>init&&read>mount,
  'Reuse libnx automatic mount first, then read the real SD root');
 assert.doesNotMatch(c,/if\s*\(\s*R_FAILED\s*\(\s*fsdevMountSdmc\(\)\s*\)\s*\)/,
  'Never treat an already-mounted SD card as a failure');
 assert.ok(c.includes('closedir(sdRoot)'), 'Successful SD probe must close the directory');
 assert.ok(c.includes('mount result 0x%08X; errno %d'),
  'Real errors must show diagnostic codes');
 assert.ok(c.includes('Nothing was removed from the Switch save folder.'));
});

test('Switch chainload passes a real NRO in nx.js argv[1], then forwarder options',()=>{
 const c=fs.readFileSync(path.join(root,'switch/nro-forwarder/source/main.c'),'utf8');
 const start=c.indexOf('const char *args =');
 assert.ok(start>=0, 'Launcher must define an explicit next-load argument string');
 const end=c.indexOf('Result rc=envSetNextLoad(RUNTIME,args);',start);
 assert.ok(end>start, 'Launcher must give argv to hbloader');
 const literal=c.slice(start,end);
 const runtime='"sdmc:/switch/brewser.nro"';
 // In C source, each quoted argument is escaped and assembled from string literals.
 const occurrences=literal.match(/\\\"sdmc:\/switch\/brewser\.nro\\\"/g)||[];
 assert.equal(occurrences.length,2, 'argv[0] is runtime and argv[1] is the NRO entrypoint');
 const a=literal.indexOf('sdmc:/switch/brewser.nro');
 const b=literal.indexOf('sdmc:/switch/brewser.nro',a+1);
 const f=literal.indexOf('--fwd=1');
 const app=literal.indexOf('--app=com.votrivalley.pkmsvv');
 assert.ok(a>=0 && b>a && f>b && app>f,'nx.js must receive argv[1] NRO before Brewser flags');
 assert.doesNotMatch(literal,/^\\s*const char \\*args=\\\"\\\\\\\"sdmc:\/switch\/brewser.nro/);
});



test('Switch boot removes defer and provides diagnostics for actual device',()=>{
 const html=content('index.html');
 assert.ok(html.includes('pkmsvv-switch-health.js'));
 assert.match(html,/<script src="js\/app\.min\.js\?v=[^"]+"><\/script>/);
 assert.doesNotMatch(html,/<script defer src="js\/app\.min\.js/);
 assert.ok(html.includes('id="pkmsvv-switch-health"'));
 const health=content('pkmsvv-switch-health.js');
 assert.ok(health.includes("addEventListener('error'"));
 assert.ok(health.includes("addEventListener('unhandledrejection'"));
 assert.ok(health.includes("Dừng ở bước:"));
 const patcher=fs.readFileSync(path.join(root,'scripts/prepare-game.cjs'),'utf8');
 assert.ok(patcher.includes("PKMSVV_SWITCH_BOOT === '1'"));
 assert.ok(patcher.includes('Promise.race('));
 assert.ok(patcher.includes('setTimeout(bootOnce,500)'));
 const flow=fs.readFileSync(path.join(root,'.github/workflows/build-switch.yml'),'utf8');
 assert.ok(flow.includes("PKMSVV_SWITCH_BOOT: '1'"));
 assert.ok(flow.includes('GITHUB_SHA:0:12'));
});
