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
