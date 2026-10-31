'use strict';
// Build the 10 user-approved 32x32 RGBA pixel sprites from a compact
// lossless indexed palette. No CDN, runtime fetch or external PNG packages.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const pack=require('../src/berry-pixel-pack.json');
const out=path.join(__dirname,'..','vendor','pokesurvivor','assets','berry');
fs.mkdirSync(out,{recursive:true});
const W=32,H=32;
let table=null;
function crc(data){
 if(!table){
  table=new Uint32Array(256);
  for(let n=0;n<256;n++){let x=n;for(let k=0;k<8;k++)x=x&1?0xedb88320^(x>>>1):x>>>1;table[n]=x>>>0;}
 }
 let x=0xffffffff;
 for(const b of data)x=table[(x^b)&255]^(x>>>8);
 return (x^0xffffffff)>>>0;
}
function chunk(type,payload){
 const label=Buffer.from(type,'ascii'),len=Buffer.alloc(4),sum=Buffer.alloc(4);
 len.writeUInt32BE(payload.length);sum.writeUInt32BE(crc(Buffer.concat([label,payload])));
 return Buffer.concat([len,label,payload,sum]);
}
function png(o){
 const pixels=zlib.inflateSync(Buffer.from(o.z,'base64'));
 if(pixels.length!==W*H||o.p.length%8!==0)throw Error('Berry sprite corrupt');
 const colors=Array.from({length:o.p.length/8},(_,n)=>Buffer.from(o.p.slice(n*8,n*8+8),'hex'));
 const rgba=Buffer.alloc(H*(1+W*4));
 for(let y=0;y<H;y++){
  rgba[y*(1+W*4)]=0;
  for(let x=0;x<W;x++){
   const idx=pixels[y*W+x];if(!colors[idx])throw Error('Missing palette index '+idx);
   colors[idx].copy(rgba,y*(1+W*4)+1+x*4);
  }
 }
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);
 ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),
  chunk('IDAT',zlib.deflateSync(rgba,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
for(const [id,blob] of Object.entries(pack)){
 fs.writeFileSync(path.join(out,id+'.png'),png(blob));
}
console.log('Berry: installed '+Object.keys(pack).length+' original 32px pixel sprites, offline, RGBA.');
