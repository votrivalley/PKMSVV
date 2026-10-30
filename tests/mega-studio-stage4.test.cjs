'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../tools/mega-eightdir-studio/index.html'),'utf8');
test('Mega Stage4 draft importer requires exact 384x768 art and never autoapproves',()=>{
 assert.match(html,/id="draftSheet"/);
 assert.match(html,/image\.width!==384\|\|image\.height!==768/);
 assert.match(html,/reviewed\[key\]=false/);
 assert.match(html,/if\(!confirm\(/);
});
test('Mega Walk cardinal source cannot be overwritten by imported draft',()=>{
 assert.match(html,/targetAct==='Walk'&&Object\.hasOwn\(ROW,dir\)\)continue/);
 assert.match(html,/const key=\[targetMon,targetVar,targetAct,dir,frame\]\.join\('\|'\)/);
});
test('Mega draft editor does not mutate save or enable gameplay',()=>{
 assert.doesNotMatch(html,/PKMSVV_MEGA_READY|DB\.save\s*=|megaStone\s*=|battleReady\s*=\s*true/);
});
