'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/pkmsvv-story.js'),'utf8');
const buildScript=fs.readFileSync(path.join(root,'scripts/patch-chapter-purple-rewards.cjs'),'utf8');
function setup(save){
 const messages=[],G={
  I18n:{lang:'vi'},
  DB:{save,commit(force){this.commits=(this.commits||0)+1;this.forced=force;}},
  UI:{toast:(text)=>messages.push(text)}
 };
 vm.runInNewContext(source,{G,Map,Number,Object,Array});
 return{G,messages,claim:()=>G.PKMSVVStory.syncChapterPurpleRewards()};
}
test('purple ticket is the real ×10 Gacha currency, NOT yellow single pull',()=>{
 const iconSource=fs.readFileSync(path.join(root,'scripts/patch-chapter-purple-rewards.cjs'),'utf8');
 assert.match(iconSource,/ticket10|tickets\.t10|purple/);
 assert.match(source,/s\.tickets\.t10=\(Number\(s\.tickets\.t10\)\|\|0\)\+count/);
});
test('Chapter 0 only rewards after starter choice, even when prologue is skipped',()=>{
 const save={pkmsvvStorySeen:true,starter:null,partner:null,tickets:{t1:9,t10:2}};
 const h=setup(save);
 assert.equal(h.claim(),0);
 assert.equal(h.G.DB.commits||0,0);
 save.starter=25;save.partner=25;
 assert.equal(h.claim(),1);
 assert.equal(save.tickets.t1,9);
 assert.equal(save.tickets.t10,3);
 assert.equal(save.pkmsvvChapterPurpleRewards[0],true);
 assert.equal(h.G.DB.commits,1);
 assert.equal(h.G.DB.forced,true);
 assert.equal(h.claim(),0,'re-opening the menu cannot duplicate Chapter 0');
});
test('Chapters 1–3 each award one purple ×10 and never double-award on Memories replay',()=>{
 const save={pkmsvvStorySeen:true,starter:25,partner:25,tickets:{t1:7,t10:4}};
 const h=setup(save);
 assert.equal(h.claim(),1);
 for(const ch of [1,2,3]){
  save['pkmsvvChapter'+ch+'Seen']=true;
  assert.equal(h.claim(),1,'Chapter '+ch+' should reward at completion');
  assert.equal(h.claim(),0,'replaying Chapter '+ch+' gives no new ticket');
 }
 assert.equal(save.tickets.t10,8);
 assert.equal(save.tickets.t1,7,'purple rewards do not change yellow tickets');
 assert.equal(Object.keys(save.pkmsvvChapterPurpleRewards).length,4);
 assert.equal(h.G.DB.commits,4);
 assert.equal(h.messages.length,4);
 for(const ch of [0,1,2,3])assert.equal(save.pkmsvvChapterPurpleRewards[ch],true);
});
test('Existing v1.5.34 saves receive all previous chapters once, without resetting purchased currency',()=>{
 const old={pkmsvvStorySeen:true,starter:25,partner:25,pkmsvvChapter1Seen:true,
  pkmsvvChapter2Seen:true,pkmsvvChapter3Seen:true,
  pkmsvvChapter2Pending:false,pkmsvvChapter3Pending:false,
  tickets:{t1:15,t10:27},stats:{runs:120},owned:{25:{at:1}}};
 const h=setup(old);
 assert.equal(h.claim(),4,'backfill each already-completed chapter once');
 assert.equal(old.tickets.t10,31);
 assert.equal(old.tickets.t1,15);
 assert.equal(old.stats.runs,120);
 assert.ok(old.owned[25]);
 assert.equal(h.claim(),0);
 assert.equal(old.tickets.t10,31);
 assert.match(h.messages.at(-1),/\+4 vé tím/);
});
test('Only completed chapters reward: pending and skipped scenes do not impersonate completion',()=>{
 const save={pkmsvvStorySeen:true,partner:25,starter:25,
  pkmsvvChapter1Pending:true,pkmsvvChapter2Pending:true,pkmsvvChapter3Pending:true,
  tickets:{t1:0,t10:0}};
 const h=setup(save);
 assert.equal(h.claim(),1,'Chapter 0 has starter, Chapters 1–3 are pending');
 save.pkmsvvChapter1Pending=false;
 save.pkmsvvChapter1Seen=true;
 assert.equal(h.claim(),1);
 assert.equal(save.tickets.t10,2);
 assert.equal(h.claim(),0);
});
test('Two separate offline saves never share rewarded chapter state',()=>{
 const a=setup({pkmsvvStorySeen:true,partner:25,tickets:{t1:0,t10:0}});
 const b=setup({pkmsvvStorySeen:true,partner:7,tickets:{t1:0,t10:5}});
 assert.equal(a.claim(),1);assert.equal(b.claim(),1);
 assert.equal(a.G.DB.save.tickets.t10,1);
 assert.equal(b.G.DB.save.tickets.t10,6);
});
test('Production game scripts install claim defaults, merge claim flags and main-menu reconciliation on every platform',()=>{
 const build=fs.readFileSync(path.join(root,'scripts/prepare-game.cjs'),'utf8');
 assert.match(build,/patch-chapter-purple-rewards\.cjs/);
 assert.match(buildScript,/pkmsvvChapterPurpleRewards/);
 assert.match(buildScript,/r\.pkmsvvChapterPurpleRewards\[ch\]/);
 assert.match(buildScript,/G\.PKMSVVStory\?\.syncChapterPurpleRewards\?\.\(\)/);
 assert.match(source,/syncChapterPurpleRewards\(\);markChapter3\(\)/);
 assert.match(source,/pkmsvvChapter1Seen=true;[\s\S]{0,150}syncChapterPurpleRewards\(\)/);
 assert.match(source,/pkmsvvChapter3Seen=true;[\s\S]{0,180}syncChapterPurpleRewards\(\)/);
});

test('Renumbering Chapters 1–4 preserves old flags; new Chapters 5/6 each add exactly one purple ticket',()=>{
 const save={pkmsvvStorySeen:true,partner:25,starter:25,pkmsvvChapter1Seen:true,
  pkmsvvChapter2Seen:true,pkmsvvChapter3Seen:true,tickets:{t1:4,t10:0}};
 const h=setup(save);
 assert.equal(h.claim(),4);
 save.pkmsvvChapter5Seen=true;
 assert.equal(h.claim(),1);
 save.pkmsvvChapter6Seen=true;
 assert.equal(h.claim(),1);
 assert.equal(h.claim(),0);
 assert.equal(save.tickets.t10,6);
 assert.equal(save.tickets.t1,4);
 for(const id of [0,1,2,3,4,5])assert.equal(save.pkmsvvChapterPurpleRewards[id],true);
});

test('Chapter 7 pays one purple x10 ticket once and preserves old six slots',()=>{
 const save={pkmsvvStorySeen:true,starter:25,partner:25,pkmsvvChapter1Seen:true,
 pkmsvvChapter2Seen:true,pkmsvvChapter3Seen:true,pkmsvvChapter5Seen:true,
 pkmsvvChapter6Seen:true,pkmsvvChapter7Seen:true,tickets:{t1:3,t10:4}};
 const h=setup(save);
 assert.equal(h.claim(),7);
 assert.equal(save.tickets.t10,11);
 assert.equal(h.claim(),0);
 assert.equal(save.pkmsvvChapterPurpleRewards[6],true);
 assert.equal(save.tickets.t1,3);
});
