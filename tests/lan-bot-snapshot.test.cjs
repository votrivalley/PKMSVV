'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('broadcast flush allocates frames only for human guests and drains unused bot queues',()=>{
 const source=fs.readFileSync('vendor/pokesurvivor/js/net/coop.js','utf8');
 const line=source.split('\n').find(s=>s.includes('function flushAll()'));
 assert.ok(line,'compiled host flush function must exist');
 const mates=new Map(),sent=[],allocated=[];
 for(let i=0;i<8;i++)mates.set('ai-'+i,{uid:'ai-'+i,connected:true,pl:{lanBot:true},q:[['event']]});
 mates.set('human',{uid:'human',connected:true,pl:{},q:[['event']]});
 mates.set('gone',{uid:'gone',connected:false,pl:{},q:[]});
 const fixture={mates,G:{Net:{send:(uid,frame)=>sent.push({uid,frame})}},hostFrame:m=>{allocated.push(m.uid);return {k:'f',ev:m.q};}};
 vm.runInNewContext(line+'\nflushAll();',fixture);
 assert.deepEqual(allocated,['human']);assert.equal(sent.length,1);assert.equal(sent[0].uid,'human');
 for(const m of mates.values())if(m.pl.lanBot)assert.equal(m.q.length,0);
});
