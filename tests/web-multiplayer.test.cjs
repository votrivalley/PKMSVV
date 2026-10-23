'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'src/web/pkmsvv-royale.js'),'utf8');
const patch=fs.readFileSync(path.join(root,'scripts/patch-web-multiplayer.cjs'),'utf8');
test('room modes are separate: four-player co-op and ten-player survival',()=>{
 assert.match(patch,/roomLimit = r => r&&r\.mode==='royale'\?10:4/);
 assert.match(patch,/mode: room\.mode\|\|'coop'/);
 assert.match(patch,/pkmsvv-create-royale/);
 assert.match(patch,/G\.Social\.roomLimit\(room\)/);
});
test('survival does not feed unverified scores into public leaderboards',()=>{
 assert.match(patch,/!G\.Royale\.active \? G\.Ranking\.submitSolo/);
 assert.match(patch,/!G\.Royale\.active \? G\.Ranking\.submitGroup/);
});
test('difficulty starts calmer and increases monotonically',()=>{
 const context={G:{I18n:{lang:'vi'},UI:{toast(){}},Royale:null},console};
 vm.runInNewContext(src,context);
 const R=context.G.Royale;
 R.begin({mode:'royale',members:[{uid:'a',name:'A'},{uid:'b',name:'B'}]});
 const levels=[0,60,180,400,900].map(t=>R.intensity(t));
 assert.ok(levels[0].density<1);
 for(let i=1;i<levels.length;i++)for(const k of ['density','hp','dmg'])assert.ok(levels[i][k]>=levels[i-1][k]);
});
test('only the last living participant wins; defeated players cannot return',()=>{
 const context={G:{I18n:{lang:'vi'},UI:{toast(){}},Royale:null},console};
 vm.runInNewContext(src,context);const R=context.G.Royale;
 R.begin({mode:'royale',members:[{uid:'a',name:'Người A'},{uid:'b',name:'Người B'},{uid:'c',name:'Người C'}]});
 let done=null;
 assert.equal(R.check([{uid:'a',dead:false},{uid:'b',dead:true},{uid:'c',dead:false}],80,r=>done=r),false);
 assert.equal(R.check([{uid:'a',dead:true},{uid:'b',dead:true},{uid:'c',dead:false}],100,r=>done=r),true);
 assert.equal(done.winner,'c');
 assert.equal(done.standings[0].uid,'c');
 assert.equal(done.standings[0].points,2000);
 assert.equal(R.check([{uid:'c',dead:false}],120,()=>{throw Error('twice')}),false);
 R.begin({mode:'coop',members:[]});assert.equal(R.active,false);
});
