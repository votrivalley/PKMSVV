'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');
const assets={
 'assets/coop-lab/room_base.png':[320,224],
 'assets/coop-lab/decor/machine_old.png':[80,80],
 'assets/coop-lab/decor/kabuto_skeleton.png':[48,48],
 'assets/coop-lab/decor/research_terminal.png':[56,40]
};
const table=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;return c>>>0;});
function crc(buf){let c=0xFFFFFFFF;for(const x of buf)c=table[(c^x)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function dimensions(buf){
 assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 let off=8,sz=[],idat=[],end=false;
 while(off<buf.length){
  assert.ok(off+12<=buf.length);
  const n=buf.readUInt32BE(off),type=buf.toString('ascii',off+4,off+8);
  assert.ok(off+12+n<=buf.length,'truncated '+type);
  assert.equal(crc(buf.subarray(off+4,off+8+n)),buf.readUInt32BE(off+8+n),'bad PNG CRC '+type);
  if(type==='IHDR'){sz=[buf.readUInt32BE(off+8),buf.readUInt32BE(off+12)];assert.equal(buf.readUInt8(off+20),0);}
  if(type==='IDAT')idat.push(buf.subarray(off+8,off+8+n));
  off+=12+n;
  if(type==='IEND'){end=true;break;}
 }
 assert.ok(end&&off===buf.length,'trailing or missing PNG IEND');
 assert.ok(zlib.inflateSync(Buffer.concat(idat)).length>sz[0]*sz[1]/8);
 return sz;
}
test('original fossil laboratory PNG assets have valid CRC, native size and IDAT streams',()=>{
 for(const [name,size] of Object.entries(assets)){
  const b=fs.readFileSync(path.join(root,name));
  assert.deepEqual(dimensions(b),size,name);
  assert.ok(b.length<30000,'asset exceeds mobile texture budget');
 }
});
test('only the three approved sample items are in prototype; eight fixed slots remain catalog-owned',()=>{
 const direction=require('../data/pkmsvv-coop-lab-art-direction.json');
 const slots=new Set(direction.slots.map(x=>x.id));
 assert.equal(slots.size,8);
 for(const name of ['machine_old','kabuto_skeleton','research_terminal'])
  assert.ok(direction.items.find(x=>x.id===name)&&fs.existsSync(path.join(root,'assets/coop-lab/decor/'+name+'.png')));
 assert.equal(direction.items.length,11,'catalog slots are future work; do not pretend all items are drawn');
});

test('art QA V2 uses detailed 960x672 206KB WebP instead of enlarging three toy-scale sprites',()=>{
 const crypto=require('node:crypto');
 const scene=fs.readFileSync(path.join(root,'assets/coop-lab/room_art_qa_v2.webp'));
 assert.equal(scene.subarray(0,4).toString('ascii'),'RIFF');
 assert.equal(scene.subarray(8,12).toString('ascii'),'WEBP');
 assert.equal(scene.subarray(12,16).toString('ascii'),'VP8 ');
 assert.equal(scene.readUInt16LE(26)&0x3fff,960);
 assert.equal(scene.readUInt16LE(28)&0x3fff,672);
 assert.equal(crypto.createHash('sha256').update(scene).digest('hex'),'2b3e5295ae0a291dfc21fa6741eebf72d69ba05c1614f128545b1e750a1b6b44');
 assert.ok(scene.length>100000&&scene.length<250000,'QA artwork mobile budget');
 const wiki=fs.readFileSync(path.join(root,'src/pkmsvv-wiki.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'src/pkmsvv-pc-menu-clean-qa.css'),'utf8');
 assert.match(wiki,/\.dataset\.pkmsvvLabArtPreview='2'/);
 assert.equal((wiki.match(/btn\.dataset\.labSlot=id/g)||[]).length,1);
 assert.doesNotMatch(wiki,/pkmsvv-lab-art-sprite/,'legacy toy overlays should not cover new concept');
 assert.match(css,/room_art_qa_v2\.webp/);
 assert.doesNotMatch(css,/\.pkmsvv-lab-art-machine\{/);
 assert.match(css,/image-rendering:auto/);
});


test('new interactive lab station UI uses five real hotspots and keeps building separate',()=>{
 const wiki=fs.readFileSync(path.join(root,'src/pkmsvv-wiki.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'src/pkmsvv-pc-menu-clean-qa.css'),'utf8');
 const menu=fs.readFileSync(path.join(root,'src/pkmsvv-pc-menu-clean-qa.js'),'utf8');
 assert.match(wiki,/hero\.dataset\.pkmsvvResearchHub='2'/);
 for(const id of ['support','mega','berry','companion','fossil'])
  assert.match(wiki,new RegExp("id:'"+id+"'"));
 assert.match(wiki,/b\.dataset\.researchHotspot=z\.id/);
 assert.match(wiki,/build\.dataset\.researchBuild='1'/);
 assert.match(wiki,/function construction\(\)/);
 assert.match(wiki,/spot\.dataset\.buildSlot=id/);
 assert.match(wiki,/grid\.hidden=true/);
 assert.match(wiki,/help\.hidden=true/);
 assert.match(wiki,/btn\.dataset\.buildEquip=id/);
 assert.match(wiki,/E\.buy\(G\.DB\.save,id,commit\)/);
 assert.match(wiki,/E\.equip\(G\.DB\.save,slot,id,commit\)/);
 assert.match(menu,/const order=\[play,pokemon,pc,coop,arena\]/);
 assert.match(css,/pkmsvv-research-hotspot-tag/);
 assert.match(css,/pkmsvv-research-lab-icon\.png/);
 const icon=fs.readFileSync(path.join(root,'assets/research-lab-menu-icon.png'));
 assert.deepEqual(dimensions(icon),[42,42]);
 const station=fs.readFileSync(path.join(root,'assets/research-station-icons.png'));
 assert.deepEqual(dimensions(station),[240,48]);
 assert.ok(station.length<5000,'Five station icons should be cheap for Android');
 assert.match(wiki,/glyph\.dataset\.researchGlyph=z\.id/);
 // Labels stay text-only: pixel furnishings are scene children, not glyphs
 // embedded in a large floating UI badge.
 assert.match(wiki,/prop\.dataset\.researchObject=z\.id/);
 assert.match(wiki,/prop\.innerHTML=stationArt\[z\.id\]/);
 assert.match(wiki,/label\.textContent=tr\(z\.vi,z\.en\);tag\.append\(label\);b\.append\(tag\)/);
 assert.match(wiki,/companion:\`<svg/,'Companion must have a distinct visible egg prop');
 assert.match(wiki,/Lower-right workbench: the visible egg belongs to Bạn đồng hành/);
 assert.match(wiki,/stationArt\[z\.id\]/);
 assert.match(css,/RESEARCH_SCENE_PROPS_V4/);
 assert.match(css,/\.pkmsvv-research-scene-object/);
 assert.match(css,/\.pkmsvv-research-quick \.pkmsvv-research-glyph\{\s*display:none!important/);
 assert.match(wiki,/fromResearchLab:true/);
 assert.match(wiki,/__pkmsvvResearchEntryCapture/);
});

test('modular lab separates its background and all purchased art; original concept stays reference',()=>{
 const base=fs.readFileSync(path.join(root,'assets/coop-lab/room_empty_modular.svg'),'utf8');
 const chamber=fs.readFileSync(path.join(root,'assets/coop-lab/decor/machine_old_modular.svg'),'utf8');
 const statue=fs.readFileSync(path.join(root,'assets/coop-lab/decor/gold_pippi_statue.svg'),'utf8');
 const css=fs.readFileSync(path.join(root,'src/pkmsvv-pc-menu-clean-qa.css'),'utf8');
 const wiki=fs.readFileSync(path.join(root,'src/pkmsvv-wiki.js'),'utf8');
 const staging=fs.readFileSync(path.join(root,'scripts/prepare-pippi-web-preview.cjs'),'utf8');
 for(const asset of [base,chamber,statue])assert.match(asset,/<svg[^>]*viewBox/);
 assert.match(base,/Room architecture only/);
 assert.match(statue,/Tượng Vàng Giáo sư Pippi/);
 assert.match(css,/room_empty_modular\.svg/);
 assert.match(css,/MODULAR_ROOM_20261117/);
 assert.match(wiki,/renderFurnitureLayers\(room\)/);
 assert.match(wiki,/renderFurnitureLayers\(stage\)/);
 assert.match(wiki,/pixel\.dataset\.researchPixel=z\.id/);
 assert.match(wiki,/pkmsvv-research-pixel-art/);
 assert.match(staging,/gold_pippi_statue\.svg/);
 assert.match(staging,/room_empty_modular\.svg/);
});
