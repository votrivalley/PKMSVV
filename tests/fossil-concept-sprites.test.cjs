'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const test=require('node:test'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const {main,EXPECTED}=require('../scripts/build-fossil-concept-sprites.cjs');
test('source pixels are the uploaded approved image, not recreated concept SVG',async()=>{
 const manifest=await main();
 assert.equal(manifest.sha256,EXPECTED);
 assert.equal(manifest.fallbackSVG,false);
 assert.deepEqual([manifest.mossFossilWall,manifest.boneDigSite,manifest.amberDeposit],[[2,0],[3,0],[0,1]]);
 const src=fs.readFileSync(path.join(root,'assets/coop-lab/approved-fossil-source-atlas.png'));
 const dist=fs.readFileSync(path.join(root,'dist/fossil-concept-sprites/approved-fossil-source-atlas.png'));
 assert.deepEqual(src,dist);
 const meta=await sharp(dist).metadata();
 assert.deepEqual([meta.width,meta.height,meta.hasAlpha],[384,192,true]);
});
test('machine foot ordering, overlap transparency, compact SOS and concept sprite lookups',()=>{
 const code=fs.readFileSync(path.join(root,'src/pkmsvv-fossil-expedition-native.js'),'utf8');
 assert.match(code,/drawImage\(machines,obj\.online\?128:0,0,128,128,-64,-116,128,128\)/);
 assert.match(code,/drawImage\(excavations,sx,sy,ART_CELL,ART_CELL,-48,-61,ART_CELL,ART_CELL\)/);
 assert.match(code,/fillRect\(-35,14,70,8\)/);
 assert.match(code,/drawImage\(v3,0,0,176,144,-44,-51,88,72\)/);
 assert.match(code,/drawImage\(rotomFallback,320,0,144,144,-36,-66,72,72\)/);
 assert.match(code,/rotomAnimator\.draw\(ctx,0,-18\)/);
 assert.match(code,/current\.phase==='escort'&&current\.rotom\.freed/);
 assert.doesNotMatch(code,/drawImage\(machines,[^\n]*90,90\)/);
 assert.doesNotMatch(code,/drawImage\(excavations,[^\n]*92,92\)/);
 assert.match(code,/overlap=ally\(\)\.some/);
 assert.match(code,/obj\.type==='machine'\?obj\.y\+7:obj\.y/);
 assert.match(code,/digSprite=\[\[192,0\],\[288,0\],\[0,96\]\]/);
 assert.match(code,/background-position:-88px 0/);
 assert.match(code,/approved-fossil-v3-atlas\.png/);
 assert.doesNotMatch(code,/fossil-excavation-concept-atlas\.png/);
});

test('approved V3 crop sheet is authentic, fully padded, and the only SOS/beacon source',async()=>{
 const manifest=await main();
 assert.equal(manifest.approvedV3.normalRotomFollowDex,479);
 const original=fs.readFileSync(path.join(root,'assets/coop-lab/approved-fossil-v3-atlas.png'));
 const exported=fs.readFileSync(path.join(root,'dist/fossil-concept-sprites/approved-fossil-v3-atlas.png'));
 assert.deepEqual(exported,original);
 const meta=await sharp(exported).metadata();
 assert.deepEqual([meta.width,meta.height,meta.hasAlpha],[464,144,true]);
 const js=fs.readFileSync(path.join(root,'src/pkmsvv-fossil-expedition-native.js'),'utf8');
 assert.match(js,/current\.phase==='escort'&&current\.rotom\.freed/);
 assert.match(js,/rotomAnimator\.draw\(ctx,0,-18\)/);
});

test('complete Restorer OFF and ON sprite frames are genuine padded concept extractions',async()=>{
 const manifest=await main();
 const full=manifest.approvedMachine;
 assert.deepEqual(full.size,[256,128]);
 const src=fs.readFileSync(path.join(root,'assets/coop-lab/approved-fossil-machine-full-v4.png'));
 const exported=fs.readFileSync(path.join(root,'dist/fossil-concept-sprites/approved-fossil-machine-full-v4.png'));
 assert.deepEqual(exported,src);
 const meta=await sharp(exported).metadata();
 assert.deepEqual([meta.width,meta.height,meta.hasAlpha],[256,128,true]);
 const code=fs.readFileSync(path.join(root,'src/pkmsvv-fossil-expedition-native.js'),'utf8');
 assert.match(code,/machines\.naturalWidth===256/);
 assert.match(code,/!current\.rotom\.merged&&current\.collected===3/);
});
