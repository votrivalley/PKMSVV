'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {selected,html}=require('../scripts/build-mega-recovery-preview.cjs');
test('preview allowlist has only five credited exact SpriteCollab forms; no derived or unverified Web assets',()=>{assert.deepEqual(selected().map(x=>x.key).sort(),['hawluchamega','scraftymega','sceptilemega','sharpedomega','slowbromega']);assert.ok(selected().every(f=>f.gameplayReady===false));});
test('read-only preview registry cannot unlock Mega battle art',()=>{
 const f={key:'slowbromega',spriteId:10080,dex:80,artReady:false},G={PKMSVV_MEGA_CATALOG:[f],SPRITE_META:{10080:{a:{Idle:{}},sa:{Idle:{}},sh:true}}};
 const src=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-mega-entry.js'),'utf8');
 vm.runInNewContext(src,{G});assert.equal(G.PKMSVVMegaEntry.hasSprite(f,'normal'),false);
 G.PKMSVV_MEGA_RECOVERY_PREVIEW={slowbromega:{spriteId:10080}};assert.equal(G.PKMSVVMegaEntry.hasSprite(f,'normal'),true);assert.equal(G.PKMSVVMegaEntry.hasSprite(f,'shiny'),true);assert.equal(f.artReady,false);
});
