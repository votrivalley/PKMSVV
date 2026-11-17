'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const rules=require('../data/pkmsvv-coop-lab-catalog.json');
test('Fossil Expedition is a distinct 2–4 Co-op mode everywhere, not a disguised Survival room',()=>{
 const picker=read('src/shared/coop-unified.js'),ai=read('src/lan/solo-ai-bus.js'),server=read('lan-server/server.cjs');
 const card=read('src/pkmsvv-coop-fossil-mission-qa.js');
 assert.equal(rules.rewards.partySize.min,2);
 assert.equal(rules.rewards.partySize.max,4);
 assert.equal(rules.rewards.playerCount.soloHumanWithBotsAllowed,true);
 assert.match(picker,/\['fossil_lab','Khai quật hóa thạch','2–4 người · 6–8 phút'/);
 assert.match(picker,/fossil_lab:\['Fossil Expedition','2–4 players · 6–8 minutes'/);
 assert.match(picker,/\['coop','fossil_lab'\]\.includes\(requestedMode\)\?1:3/);
 assert.match(picker,/G\.PKMSVVFossilExpedition\?\.nativeReady!==true/);
 for(const s of [ai,server])assert.match(s,/,'fossil_lab','arena'/);
 assert.match(card,/2–4 người · 6–8 phút/);
 assert.doesNotMatch(card,/1–4 người · 6–8 phút/);
});
test('Unfinished mission cannot mint coins; core mandates 3 excavations plus real 6–8 minute clock',()=>{
 const engine=require('../src/pkmsvv-fossil-expedition-core.cjs');
 assert.equal(engine.MIN_PARTY,2);assert.equal(engine.MAX_PARTY,4);
 assert.equal(engine.ROTOM_DEADLINE,240);
 assert.equal(engine.DEFEND_END,480);
 assert.equal(engine.MIN_TIME,480);assert.equal(engine.MAX_TIME,480);
 assert.equal(engine.ROCK_HITS,3);assert.equal(engine.SITE_OFFSETS.length,3);
 assert.equal(engine.BOSS_DEX,623,'Golurk is the temporary ancient automaton boss');
 const s=engine.begin({members:[{uid:'host'},{uid:'bot',bot:true}],roomId:'qa',
  hostUid:'host',origin:{x:0,y:0}});
 assert.equal(s.ok,true);assert.equal(engine.receipt(s,1),null);
});
