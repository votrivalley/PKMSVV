'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {pieces,maskFor,canvas}=require('../scripts/extract-research-layers.cjs');
test('source-derived cutouts trace old detailed room at native 960x672, not new SVG geometry',()=>{
 assert.deepEqual(canvas,{width:960,height:672});
 assert.equal(pieces.length,9);
 assert.equal(new Set(pieces.map(x=>x.id)).size,9);
 for(const item of pieces){
  const [x,y,w,h]=item.rect;
  assert.ok(x>=0&&y>=0&&w>10&&h>10&&x+w<=960&&y+h<=672,item.id);
  assert.ok(item.polygon.length>=6,item.id);
  for(const [px,py] of item.polygon)
   assert.ok(px>=x&&px<=x+w&&py>=y&&py<=y+h,'invalid mask coordinate: '+item.id);
  assert.match(maskFor(item).toString(),/<polygon points=/);
 }
 assert.ok(fs.existsSync(path.join(__dirname,'..','assets/coop-lab/room_art_qa_v2.webp')));
});
test('no original cutout is sold or equipped before its background is repaired and art verified',()=>{
 const catalog=require('../data/pkmsvv-coop-lab-catalog.json');
 assert.equal(catalog.roomArt.background,'images/coop-lab/room_art_qa_v2.webp');
 assert.match(catalog.roomArt.layeringStatus,/reconstruction/);
 const script=fs.readFileSync(path.join(__dirname,'..','scripts/prepare-pippi-web-preview.cjs'),'utf8');
 assert.match(script,/extract-research-layers\.cjs/);
 assert.match(script,/source-cutouts-qa/);
});

test('lab QA layer registry maps nine independent original sprites to five stations',()=>{
 const c=require('../data/pkmsvv-coop-lab-catalog.json');
 assert.deepEqual(new Set(c.roomArt.sourceLayers.map(p=>p.id)),new Set(pieces.map(p=>p.id)));
 for(const item of c.roomArt.sourceLayers){
  assert.deepEqual([item.x,item.y,item.w,item.h],pieces.find(p=>p.id===item.id).rect);
  assert.equal(item.file,item.id+'.png');
 }
 for(const station of ['support','mega','berry','companion','fossil'])
  assert.ok(c.roomArt.sourceLayers.some(p=>p.station===station),station);
 assert.equal(c.items.filter(x=>x.sceneSwapReady).length,2);
 const wiki=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-wiki.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-pc-menu-clean-qa.css'),'utf8');
 assert.match(wiki,/pkmsvvLabLayers=1/);
 assert.match(wiki,/img\.dataset\.labLayer=part\.id/);
 assert.match(css,/RESEARCH_ORIGINAL_SOURCE_LAYERS_QA_20261120/);
});
test('clean draft backdrop cannot be mistaken for purchasable final art',()=>{
 const script=fs.readFileSync(path.join(__dirname,'../scripts/extract-research-layers.cjs'),'utf8');
 assert.match(script,/clean-backdrop\.png/);
 assert.match(script,/manifest\.readyForFurnitureSwap=false/);
 assert.match(script,/painter review required before swapping furniture/);
});

test('the QA preview is local, uses nine separate PNGs and never creates currency actions',()=>{
 const page=fs.readFileSync(path.join(__dirname,'../docs/research-lab-layer-preview.html'),'utf8');
 assert.match(page,/clean-backdrop\.png/);
 assert.match(page,/room-reference\.webp/);
 assert.match(page,/img\.src=id\+'\.png'/);
 assert.match(page,/Ẩn tất cả/);
 assert.doesNotMatch(page,/pkmsvvCoopLab|localStorage|fetch\(/);
});


test('five separately positioned, large semantic scenery props use trimmed native icon files',()=>{
 const c=require('../data/pkmsvv-coop-lab-catalog.json');
 assert.deepEqual(c.roomArt.stationProps.map(p=>p.id),['support','mega','berry','companion','fossil']);
 for(const p of c.roomArt.stationProps){
  assert.equal(p.file,'prop-'+p.id+'.png');
  assert.ok(p.w>=90&&p.h>=90&&p.x>=0&&p.y>=0&&p.x+p.w<=960&&p.y+p.h<=672);
 }
 const wiki=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-wiki.js'),'utf8');
 assert.match(wiki,/img\.dataset\.labProp=prop\.id/);
 assert.match(wiki,/pkmsvvLabLayers=0/);
 assert.match(wiki,/ok\.every\(Boolean\)/);
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-pc-menu-clean-qa.css'),'utf8');
 assert.match(css,/RESEARCH_STATION_PROPS_QA_20261124/);
});
