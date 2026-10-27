'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
test('offline QR encoder retains both MIT notices even when build strips comments',async()=>{
 const source=require('../scripts/bundle-wifi-qr.cjs')();
 const code=await require('terser').minify(source,{format:{comments:false}});
 const fixture={window:{},TextEncoder};vm.runInNewContext(code.code,fixture);
 const notice=fixture.window.PKMSVV_QR_LICENSE;
 assert.equal(typeof fixture.window.PKMSVVQR.create,'function');
 assert.ok(notice.includes('Copyright'));
 assert.ok(notice.includes(require('node:fs').readFileSync(require.resolve('qrcode/license'),'utf8')));
 assert.ok(notice.includes('Permission is hereby granted'));
 assert.ok(notice.includes('THE SOFTWARE IS PROVIDED'));
 const path=require('node:path'),fs=require('node:fs');
 assert.ok(notice.includes(fs.readFileSync(path.join(path.dirname(require.resolve('dijkstrajs')),'LICENSE.md'),'utf8')));
});
