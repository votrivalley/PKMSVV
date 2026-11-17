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
 assert.match(catalog.roomArt.layeringStatus,/reconstruction pending QA/);
 const script=fs.readFileSync(path.join(__dirname,'..','scripts/prepare-pippi-web-preview.cjs'),'utf8');
 assert.match(script,/extract-research-layers\.cjs/);
 assert.match(script,/source-cutouts-qa/);
});
