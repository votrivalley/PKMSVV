const test=require('node:test'),assert=require('node:assert/strict');
const {selectBot}=require('../lan-server/server.cjs');
const roster=require('../lan-server/bot-roster.json');
test('Random AI spans playable generations, evolved forms and legends without mirroring the trainer',()=>{
 assert.ok(roster.length>900);assert.ok(roster.some(p=>p.dex===150&&p.leg));
 assert.ok(roster.some(p=>p.dex===3));assert.ok(roster.some(p=>p.dex>1000));
 for(let i=0;i<100;i++){
  const chosen=selectBot([{dex:25},{dex:150}],undefined,()=>i/100);
  assert.ok(roster.some(p=>p.dex===chosen.dex));assert.ok(![25,150].includes(chosen.dex));
 }
 assert.equal(selectBot([],150).dex,150);
 const ids=new Set();for(let i=0;i<roster.length;i++)ids.add(selectBot([],undefined,()=>(i+.5)/roster.length).dex);
 assert.equal(ids.size,roster.length,'every playable Pokemon has a chance');
});
