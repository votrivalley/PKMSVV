'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function setup(overrides={}){
 const save={partner:25,starter:25,pkmsvvStorySeen:true,
  pkmsvvChapter1Seen:true,pkmsvvChapter2Seen:true,pkmsvvChapter3Seen:true,
  pkmsvvChapter5Seen:true,tickets:{t1:0,t10:0},arenas:{},...overrides};
 const messages=[];
 const G={I18n:{lang:'vi'},DB:{save,commit(){this.count=(this.count||0)+1}},
  UI:{toast:(str)=>messages.push(str)}};
 vm.runInNewContext(read('src/pkmsvv-story.js'),{G,console});
 return {G,save,api:G.PKMSVVStory,messages};
}
const result=(n=4)=>({standings:Array.from({length:n},(_,i)=>({uid:'user'+i})),finishedAt:720});
test('Chapter 5 introduces 3 modes; room creation/quit/invalid result never count',()=>{
 const {api,save}=setup();
 assert.equal(api.multiplayerProgress().count,0);
 assert.equal(api.chapter6(()=>{}),false,'reading Chapter 6 before the trilogy is blocked');
 assert.equal(api.recordMultiplayerCompletion('coop',{time:5}),false);
 assert.equal(api.recordMultiplayerCompletion('coop',{time:300,abandoned:true}),false);
 assert.equal(api.recordMultiplayerCompletion('royale',{time:300}),false);
 assert.equal(api.recordMultiplayerCompletion('eggrush',{result:{standings:[],finishedAt:720}}),false);
 assert.equal(api.recordMultiplayerCompletion('unknown',{time:900,result:result()}),false);
 assert.equal(save.pkmsvvMultiplayerDone,undefined);
});
test('All 3 genuine completed modes open Chapter 6, but not Arena until story read',()=>{
 const {api,save,G}=setup();
 assert.equal(api.recordMultiplayerCompletion('coop',{time:90}),true);
 assert.equal(api.recordMultiplayerCompletion('royale',{time:180,result:result()}),true);
 assert.equal(api.recordMultiplayerCompletion('eggrush',{time:720,result:result()}),true);
 assert.deepEqual(Array.from(api.multiplayerProgress().done),['coop','royale','eggrush']);
 assert.equal(api.allMultiplayerCompleted(),true);
 assert.equal(api.recordMultiplayerCompletion('eggrush',{result:result()}),false);
 assert.equal(api.arenaUnlocked(),false,'players must see Chapter 6 to enter Arena');
 save.pkmsvvChapter6Seen=true;
 assert.equal(api.arenaUnlocked(),true);
 assert.equal(api.megaUnlocked(),false,'Arena unlock never directly grants Mega');
 assert.equal(G.DB.count,3,'one saved milestone per mode, no duplicate');
});
test('Chapter 7 requires the first earned Champion Crown Seal, not a cup',()=>{
 const {api,save}=setup({pkmsvvChapter6Seen:true,
  pkmsvvMultiplayerDone:{coop:true,royale:true,eggrush:true}});
 assert.equal(api.earnedChampion(),false);
 assert.equal(api.chapter7(()=>{}),false);
 assert.equal(api.megaUnlocked(),false);
 save.arenas.pkmChampion={trophies:{Kanto:true},seals:{}};
 assert.equal(api.earnedChampion(),false);
 assert.equal(api.megaUnlocked(),false);
 save.arenas.pkmChampion.seals.Kanto=true;
 assert.equal(api.earnedChampion(),true);
 assert.equal(api.megaUnlocked(),false,'seal unlocks chapter, not free Mega');
 save.pkmsvvChapter7Seen=true;
 assert.equal(api.megaUnlocked(),true);
});
test('Old earned cups retain Arena entitlement; old story flags do not fabricate completed modes',()=>{
 const {api,save}=setup({pkmsvvChapter6Seen:true,pkmsvvMultiplayerDone:{}});
 assert.equal(api.arenaUnlocked(),false);
 assert.equal(api.allMultiplayerCompleted(),false);
 save.arenas.pkmChampion={trophies:{Johto:true},seals:{},rewards:{}};
 assert.equal(api.arenaUnlocked(),true,'existing Champion cup is grandfathered');
 assert.equal(api.megaUnlocked(),false);
});
test('Modes and chapters are merged across saves; game hooks run only at actual multiplayer end',()=>{
 const p=read('scripts/patch-champion-arena.cjs');
 for(const word of ['pkmsvvMultiplayerDone','pkmsvvChapter7Seen',
  'pkmsvvFinishedMode','recordMultiplayerCompletion','G.Coop.active',
  "G.Royale?.outcome","G.EggRush?.outcome"])
  assert.ok(p.includes(word),word);
 assert.match(p,/for\(const mode of \[/);
 assert.match(read('src/pkmsvv-champion-arena.js'),/allMultiplayerCompleted/);
 assert.match(read('src/pkmsvv-mega-lucario.js'),/pkmsvvChapter7Seen/);
 assert.match(read('src/pkmsvv-mega-phase3.js'),/pkmsvvChapter7Seen/);
 assert.match(read('src/pkmsvv-mega-entry.js'),/pkmsvvChapter7Seen/);
 const s=read('src/pkmsvv-story.js');
 assert.match(s,/chapter7:\[/);
 assert.doesNotMatch(s,/chapter8:\[|chapter9:\[/,'no invented Chapter 8/9 narrative');
});

test('A completed match after Chapter 4 is remembered even before viewing Chapter 5',()=>{
 const h=setup({pkmsvvChapter5Seen:false}),{api,save}=h;
 assert.equal(api.recordMultiplayerCompletion('coop',{time:80}),true);
 assert.equal(api.multiplayerProgress().count,1);
 assert.equal(api.chapter6(()=>{}),false,'Chapter 5 storyline remains required');
 save.pkmsvvChapter5Seen=true;
 assert.equal(api.multiplayerProgress().count,1,'earned mode completion survives the cutscene');
});
test('Chapter 5 automatically follows Chapter 4 for new players without hijacking Multiplayer menu',()=>{
 const s=read('src/pkmsvv-story.js');
 assert.match(s,/if\(G\.DB\.save&&!G\.DB\.save\.pkmsvvChapter5Seen\)chapter5/);
 assert.match(s,/Hãy hoàn thành cả ba chế độ/);
 assert.doesNotMatch(read('src/pkmsvv-champion-arena.js'),/stopImmediatePropagation/);
});
