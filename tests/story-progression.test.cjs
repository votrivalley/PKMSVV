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
test('Chapter 5 requires Sống Sót + Sống Còn; skipped, quit and unranked runs do not count',()=>{
 const {api,save}=setup();
 assert.equal(api.multiplayerProgress().count,0);
 assert.equal(api.chapter6(()=>{}),false,'Arena cannot begin before required modes and Berry chapter');
 assert.equal(api.recordMultiplayerCompletion('coop',{time:5}),false);
 assert.equal(api.recordMultiplayerCompletion('coop',{time:300,abandoned:true}),false);
 assert.equal(api.recordMultiplayerCompletion('royale',{time:300}),false);
 assert.equal(api.recordMultiplayerCompletion('eggrush',{result:{standings:[],finishedAt:720}}),false);
 assert.equal(api.recordMultiplayerCompletion('unknown',{time:900,result:result()}),false);
 assert.equal(save.pkmsvvMultiplayerDone,undefined);
});
test('Only two genuine modes open Berry Chapter 6; using five distinct Berry types opens Arena Chapter 7',()=>{
 const {api,save,G}=setup();
 assert.equal(api.recordMultiplayerCompletion('eggrush',{time:720,result:result()}),true,'Egg Rush is optional');
 assert.equal(api.allMultiplayerCompleted(),false,'Egg Rush alone never counts');
 assert.equal(api.recordMultiplayerCompletion('coop',{time:90}),true);
 assert.equal(api.multiplayerProgress().count,1);
 assert.equal(api.chapter6(()=>{}),false);
 assert.equal(api.recordMultiplayerCompletion('royale',{time:180,result:result()}),true);
 assert.deepEqual(Array.from(api.multiplayerProgress().done),['coop','royale']);
 assert.equal(api.multiplayerProgress().total,2);
 assert.equal(api.allMultiplayerCompleted(),true);
 assert.equal(api.recordMultiplayerCompletion('eggrush',{result:result()}),false);
 assert.equal(api.chapter6(()=>{}),false,'two modes open Berry, NOT Arena');
 assert.equal(api.arenaUnlocked(),false,'cannot enter Arena before completing Berry');
 save.pkmsvvBerryChapterDone=true;
 assert.match(read('src/pkmsvv-story.js'),/allMultiplayerCompleted\(\)\|\|!G\.DB\.save\.pkmsvvBerryChapterDone/);
 // Scene completion is asynchronous in the actual UI. Simulate its persisted result.
 save.pkmsvvChapter6Seen=true;
 assert.equal(api.arenaUnlocked(),true);
 assert.equal(api.megaUnlocked(),false,'Arena never directly grants Mega');
 assert.equal(G.DB.count,4,'three saved mode milestones plus one-time Chapter 5 ticket reconciliation');
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
test('Chapter 8 introduces Champion, one seal unlocks Mega, first actual Mega completes Chapter 9, ten seals gate Chapter 10',()=>{
 const {save,api,G}=setup({pkmsvvChapter6Seen:true,pkmsvvChapter8IntroSeen:true});
 save.arenas.pkmChampion={seals:{Kanto:true},trophies:{Kanto:true}};
 assert.equal(api.megaUnlocked(),false);
 assert.equal(api.onChampionSeal(),false);
 assert.equal(api.megaUnlocked(),true,'one genuine seal is enough to open Mega Gacha');
 assert.equal(api.championSealCount(save),1);
 assert.equal(api.tenChampionCompleted(save),false);
 assert.equal(api.firstMegaUnlocked(save),false);
 G.PKMSVV_MEGA_CATALOG=[{dex:6,key:'charizardmegax',artReady:true}];
 G.PKMSVVMegaPhase3={isUnlocked:()=>true,isBattleReady:()=>false};
 assert.equal(api.onMegaUnlocked(),false,'owning a stone without battle-ready sprite is not a completed Mega');
 G.PKMSVVMegaPhase3.isBattleReady=f=>f.key==='charizardmegax';
 assert.equal(api.onMegaUnlocked(),true);
 assert.equal(save.pkmsvvChapter9MegaDone,true);
 assert.equal(api.onMegaUnlocked(),false,'first Mega milestone pays only once');
 assert.equal(save.pkmsvvChapter10Pending,undefined);
 for(const region of ['Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea','Votri Valley'])
  save.arenas.pkmChampion.seals[region]=true;
 assert.equal(api.tenChampionCompleted(save),true);
 assert.equal(api.onChampionSeal(),true);
 assert.equal(save.pkmsvvChapter10Pending,true);
 assert.notEqual(save.pkmsvvChapter10Done,true,'ten seals only unlock the boss');
});
test('Chapter 10 Rayquaza sky battle is real gameplay, Shadow exchange is future-only',()=>{
 const runtime=read('src/pkmsvv-champion-arena.js'),story=read('src/pkmsvv-story.js');
 assert.match(runtime,/function startSky\(/);
 assert.match(runtime,/target=G\.EnemyMgr\.add\(new G\.Enemy\(/);
 assert.match(runtime,/if\(stage==='sky'&&target\?\.dead\)\{finishSky\(true\)/);
 assert.match(story,/chapter10:\[/);
 assert.match(story,/pkmsvvRayquazaDefeated/);
 assert.match(story,/pkmsvvShadowBonusTeased/);
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

test('Required modes never count fake completed matches as Berry chapter progress',()=>{
 const {save,api}=setup();
 save.pkmsvvMultiplayerDone={coop:true,royale:true};
 assert.equal(api.allMultiplayerCompleted(),true);
 assert.equal(api.chapter6(()=>{}),false);
 assert.equal(save.pkmsvvBerryChapterDone,undefined);
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
 assert.match(s,/Hoàn thành Sống Sót và Sống Còn/);
 assert.doesNotMatch(read('src/pkmsvv-champion-arena.js'),/stopImmediatePropagation/);
});

test('Chapter 5 uses its own two uploaded cinematic scenes, not Chapter 2 or Chapter 6 artwork',()=>{
 const story=read('src/pkmsvv-story.js'),patch=read('scripts/patch-story.cjs');
 const scene=story.split('  chapter5:[')[1]?.split('  // Chapter 6')[0];
 assert.ok(scene,'Chapter 5 scene exists');
 assert.equal(scene.split('{art:16,').length-1,3,'Companion Gate tells the first three beats');
 assert.equal(scene.split('{art:17,').length-1,6,'three-mode trials tell the following six beats');
 assert.ok(!scene.includes('{art:10,'),'old memory artwork cannot appear in Chapter 5');
 assert.match(story,/16:'chapter5-gate', 17:'chapter5-trials'/);
 for(const name of ['chapter5-gate','chapter5-trials']){
  const image=read('src/story-art/'+name+'.webp');
  assert.ok(image.length>10000, name+' artwork is missing');
  assert.ok(patch.includes("'"+name+"'"),name+' must be copied into the build');
  assert.ok(story.includes("'"+name+"'"),name+' must be mapped into runtime');
 }
 assert.match(patch,/chapter5-'.*chapter6-'.*chapter7-/,'Chapter 5 art required at build time');
});
