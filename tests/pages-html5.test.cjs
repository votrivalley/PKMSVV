'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const site=path.join(__dirname,'..','dist','pages'),read=p=>fs.readFileSync(path.join(site,p),'utf8');
test('Pages enters full offline game without extra button/login',()=>{
 const page=read('index.html');
 assert.match(page,/location\.replace\(new URL\('\.\/game\/'/);
 assert.match(page,/pkmsvv\.web\.saveMode','local/);
 assert.doesNotMatch(page,/id="play"|id="cloud"|Đăng nhập/);
 assert.ok(fs.existsSync(path.join(site,'game','js','app.min.js')));
});
test('PWA scoped to Github project path',()=>{
 for(const filename of ['manifest.webmanifest','game/manifest.webmanifest']){
  const m=JSON.parse(read(filename));
  for(const property of ['id','start_url','scope'])assert.equal(m[property],'/PKMSVV/');
  assert.ok(m.icons.every(x=>x.src.startsWith('/PKMSVV/game/')));
 }
 const sw=read('sw.js');
 assert.match(sw,/const SHELL=\['\/PKMSVV\/'/);
 assert.match(sw,/\/PKMSVV\/game\/index\.html/);
});
test('No Firebase cloud authentication material or out-of-scope worker registration',()=>{
 const bundle=read('game/js/app.min.js');
 assert.doesNotMatch(bundle,/AIza[A-Za-z0-9_-]{35}|pkmsvv-b84d2-default-rtdb/);
 assert.doesNotMatch(bundle,/(?:['"])\/sw\.js(?:['"])/);
 assert.doesNotMatch(bundle,/\bscope\s*:\s*(?:['"])\/(?:['"])/);
});
