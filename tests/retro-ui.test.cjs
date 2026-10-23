'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const lum=h=>[.2126,.7152,.0722].reduce((a,w,i)=>{let c=parseInt(h.slice(1+i*2,3+i*2),16)/255;return a+w*(c<=.04045?c/12.92:((c+.055)/1.055)**2.4)},0);
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
test('palette core text pairs meet WCAG AA 4.5:1',()=>{
 for(const [text,bg] of [
 ['#173648','#d5ebe6'],['#173648','#ffe36a'],['#143646','#f6fffb'],
 ['#fbffff','#28656c'],['#e0f2ee','#17424c'],
 ['#133448','#eaf8f2'],['#27495b','#eaf8f2'],
 ['#192e3a','#ffda39'],['#f8fffb','#123943']
 ])assert.ok(ratio(text,bg)>=4.5,text+' on '+bg+' ratio '+ratio(text,bg));
});
test('upgrade picker contains individual-only warning and separate preserved paths',()=>{
 const patch=read('scripts/patch-retro-ui.cjs'),chooser=read('src/pkmsvv-upgrade-select.js');
 assert.match(patch,/data-go="global"/);assert.match(patch,/scr-upgrade-select/);
 assert.match(chooser,/G\.MenuUI\.openUpgrades\(\)/);
 assert.match(chooser,/G\.GlobalPowerUI\.open\(\)/);
 assert.match(chooser,/CHỈ áp dụng cho một Pokémon/);
});
