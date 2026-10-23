'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('Web v1.3 announcement retains approved VI/EN categories and beta warning',()=>{
 const G={CHANGELOG:[]};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/pkmsvv-changelog-v13-web.js'),'utf8'),{G});
 const e=G.CHANGELOG[0];
 assert.match(e.title[0],/1\.3/);
 assert.equal(e.new.length,5);
 assert.equal(e.chg.length,4);
 assert.ok(e.fix.length>=4,'new approved fixes can be appended');
 for(const group of ['new','chg','fix'])for(const pair of e[group])assert.equal(pair.length,2);
 assert.ok(e.fix.some(p=>/QA nhiều thiết bị/.test(p[0])));
 assert.match(e.chg[3][0],/nhấn Lưu/);
});
