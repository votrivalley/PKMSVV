'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const test=require('node:test'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const {main}=require('../scripts/build-fossil-concept-sprites.cjs');
test('packaging uses exactly the approved painting rather than a new concept',()=>{
 const source=fs.readFileSync(path.join(root,'scripts/build-fossil-concept-sprites.cjs'),'utf8');
 assert.match(source,/room_art_qa_v2\.webp/);
 assert.match(source,/restoration_chamber/);
 assert.match(source,/maskFor\(chamber\)/);
 assert.match(source,/newConcept:false/);
});
test('game can load all four crisp atlas sprites with source integrity',async()=>{
 await main();
 const dir=path.join(root,'dist/fossil-concept-sprites');
 const machine=await sharp(path.join(dir,'rotom-restorer-concept-atlas.png')).metadata();
 const sites=await sharp(path.join(dir,'fossil-excavation-concept-atlas.png')).metadata();
 assert.deepEqual([machine.width,machine.height],[256,128]);
 assert.equal(machine.hasAlpha,true);
 assert.deepEqual([sites.width,sites.height],[288,288]);
 const m=JSON.parse(fs.readFileSync(path.join(dir,'source-manifest.json'),'utf8'));
 assert.equal(m.newConcept,false);assert.equal(m.sites.names.length,3);
 const game=fs.readFileSync(path.join(root,'src/pkmsvv-fossil-expedition-native.js'),'utf8');
 assert.match(game,/obj\.online\?128:0,0,128,128/);
 assert.match(game,/col\*96,row\*96,96,96/);
 assert.doesNotMatch(game,/image\('images\/coop-lab\/rotom-restorer-atlas\.svg'\)/);
});
