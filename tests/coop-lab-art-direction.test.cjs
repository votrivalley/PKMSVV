'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'..');
const art=require('../data/pkmsvv-coop-lab-art-direction.json');
const catalog=require('../data/pkmsvv-coop-lab-catalog.json');
test('style blueprint matches exactly eight live lab slots and 11 catalog items',()=>{
 assert.equal(art.status,'art-direction-approved-blueprint-only-no-final-sprites');
 assert.equal(art.slots.length,8);assert.equal(art.items.length,11);
 assert.deepEqual([...art.slots.map(x=>x.id)].sort(),[...catalog.slots.map(x=>x.id)].sort());
 assert.deepEqual([...art.items.map(x=>x.id)].sort(),[...catalog.items.map(x=>x.id)].sort());
 for(const item of art.items){
  const expected=catalog.items.find(c=>c.id===item.id);
  assert.deepEqual(item.slotIds,expected.slots);
  assert.equal(item.spritePath,'assets/coop-lab/decor/'+item.id+'.png');
  assert.ok(item.size.width>0&&item.size.height>0);
  assert.ok(item.silhouette.length>10&&item.artNotes.length>10);
 }
});
test('room art hotspots remain nonoverlapping inside 320x224 canvas',()=>{
 assert.deepEqual(art.room.designSize,{width:320,height:224});
 assert.equal(art.room.tileSize,16);
 for(const a of art.slots){
  const r=a.rect;
  assert.ok(r.x>=0&&r.y>=0&&r.w>0&&r.h>0&&r.x+r.w<=320&&r.y+r.h<=224,a.id);
  assert.ok(a.anchor.x>=0&&a.anchor.x<=320&&a.anchor.y>=0&&a.anchor.y<=224,a.id);
  for(const b of art.slots){
   if(a===b)continue;const q=b.rect;
   const overlap=r.x<q.x+q.w&&r.x+r.w>q.x&&r.y<q.y+q.h&&r.y+r.h>q.y;
   assert.equal(overlap,false,a.id+' overlaps '+b.id);
  }
 }
});
test('fixed 16-color palette follows existing teal-mint-amber and original pixel art controls',()=>{
 assert.equal(Object.keys(art.palette).length,16);
 const shades=Object.values(art.palette);assert.equal(new Set(shades).size,16);
 assert.ok(shades.every(x=>/^#[0-9A-F]{6}$/.test(x)));
 assert.equal(art.palette.deepTeal,'#1B4354');assert.equal(art.palette.amberLight,'#FFE08C');
 assert.equal(art.shading.outerOutline,1);assert.equal(art.shading.antiAliasing,false);
 assert.match(art.room.renderMethod,/nearest-neighbor/);
 assert.equal(art.room.movement,'static room diorama, no free drag/rotate, interactive hotspots only');
});
test('mythic Pippi statue only trophy slot and art direction does not claim assets exist',()=>{
 const statue=art.items.find(x=>x.id==='gold_pippi_statue');
 assert.deepEqual(statue.slotIds,['trophy']);
 assert.equal(catalog.items.find(x=>x.id===statue.id).price,null);
 assert.match(art.status,/no-final-sprites/);
 const docs=fs.readFileSync(path.join(root,'docs/COOP_FOSSIL_LAB_ART_DIRECTION_V1.md'),'utf8');
 assert.match(docs,/chưa có sprite trang trí chính thức/);
 assert.match(docs,/Tượng Vàng Giáo sư Pippi/);
 assert.match(docs,/Đã có:/);
});
