'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),ctx={G:{Upgrades:{BY:{hp:{},power:{}}},GlobalPower:{BY:{power:{},rapid:{}}}}};
vm.runInNewContext(fs.readFileSync(path.join(root,'src','pkmsvv-skill-track.js'),'utf8'),ctx);
const T=ctx.G.PKMSVVSkillTrack,mk=(kills=0,pupg={},globalUpgrades={})=>({stats:{totalKills:kills},pupg,globalUpgrades,pkmsvvSkillMarks:{}});
test('new saves have three slots and cumulative kills unlock slots four through six',()=>{
 assert.equal(T.progress(mk()).count,3);
 for(const [kills,count] of [[49,3],[50,4],[100,5],[199,5],[200,6]])assert.equal(T.progress(mk(kills)).count,count);
 assert.equal(T.progress(mk(49),1).count,4);
});
test('individual ranks across different Pokémon and global ranks both count',()=>{
 const s=mk(200,{25:{hp:7,power:2},133:{hp:9}},{power:2});
 assert.equal(T.progress(s).count,8);
});
test('unlocked marks survive refunds and merge without dropping a slot',()=>{
 const s=mk(200,{25:{hp:20}});
 assert.equal(T.refresh(s).count,8);
 s.pupg={};s.globalUpgrades={};s.stats.totalKills=0;
 assert.equal(T.progress(s).count,8);
 assert.equal(Object.keys(T.merge({},s.pkmsvvSkillMarks)).length,5);
});
test('guide explains global scope, progress and no free new moves',()=>{
 const g=T.guide(mk());
 assert.match(g.note,/MỌI Pokémon/);assert.match(g.note,/không phải nhận sẵn chiêu/);assert.equal(g.lines.length,5);
});
