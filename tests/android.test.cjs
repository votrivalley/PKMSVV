'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const app=path.join(root,'mobile','www');
test('offline game and licenses packaged for Android',()=>{
 for(const file of ['index.html','assets','js','css','LICENSE-NONCOMMERCIAL.md','NOTICE-PKMSVV.txt'])
  assert.ok(fs.existsSync(path.join(app,file)),'Missing '+file);
 const html=fs.readFileSync(path.join(app,'index.html'),'utf8');
 assert.match(html,/<html lang="vi">/);
 assert.match(html,/connect-src 'self'/);
 assert.match(html,/PKMSVV/);
});
test('mobile shell has stable origin and package identity',()=>{
 const conf=JSON.parse(fs.readFileSync(path.join(root,'capacitor.config.json'),'utf8'));
 assert.equal(conf.appId,'com.ronvotri.pkmsvv');
 assert.equal(conf.webDir,'mobile/www');
 assert.equal(conf.server.androidScheme,'https');
});

test('Android assets have Survivor title, never the old Survival branding',()=>{
 const root=path.join(__dirname,'..','mobile','www');
 const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
 assert.match(m.name,/Pokémon Survivor/);
 assert.doesNotMatch(m.name,/Survival/);
});
