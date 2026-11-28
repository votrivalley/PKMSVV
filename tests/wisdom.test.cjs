'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync(require.resolve('../src/pkmsvv-wisdom-qa.js'),'utf8');
test('Wisdom is rare, single-use, multiplicative and resets on new player; not competitive',()=>{
 const G={I18n:{lang:'vi'},Coop:{active:false},PKMSVVQuickRegion:{active:true},Social:{room:{mode:'coop'}}};
 vm.runInNewContext(code,{G});const api=G.PKMSVVWisdomQA,p={xpMul:1.12,statsTaken:{}};
 const c=api.card(p);assert.equal(c.w,2);assert.equal(c.key,'stat:wisdom');assert.equal(c.apply(p),true);
 assert.ok(Math.abs(p.xpMul-1.288)<1e-9);assert.equal(api.card(p),null);assert.equal(c.apply(p),false);
 const next={xpMul:1,statsTaken:{}};assert.ok(api.card(next));G.Coop.active=true;assert.ok(api.card(next));
 for(const mode of ['eggrush','arena','royale','berry','fossil']){G.Social.room.mode=mode;assert.equal(api.card(next),null);}
 G.Coop.active=false;G.Arena={active:true};assert.equal(api.card(next),null);G.Arena.active=false;G.PKMSVVQuickRegion.active=false;assert.equal(api.card(next),null);
});
