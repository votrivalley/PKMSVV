'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('PC and Android Pokemon knowledge only labels skill awakening',()=>{
 const wiki=read('src/pkmsvv-wiki.js');
 assert.match(wiki,/tr\('Thức tỉnh kỹ năng','Skill Awakening'\)/);
 assert.doesNotMatch(wiki,/Thức tỉnh & Quên kỹ năng|Awakening & Forgetting Skills/);
 assert.doesNotMatch(wiki,/khi quên một kỹ năng|replace an old skill when your slots fill/);
});

test('Wiki uses exactly one bounded scroll area, with no nested modal or Berry list scroll',()=>{
 const src=read('src/pkmsvv-wiki.js');
 assert.match(src,/height:100dvh/);
 assert.match(src,/overflow:hidden;overscroll-behavior:contain;touch-action:none/);
 assert.match(src,/max-height:min\(92dvh,880px\)/);
 assert.match(src,/overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain/);
 assert.match(src,/touch-action:pan-y;-webkit-overflow-scrolling:touch/);
 assert.match(src,/\.pkmsvv-pc-berry-list\{[^}]*max-height:none;overflow:visible/s);
 assert.match(src,/\.pkmsvv-pc-header\{position:sticky;top:0/);
 assert.match(src,/\.focus\(\{preventScroll:true\}\)/);
 assert.match(src,/if\(G\.Pad\?\.name\)G\.Pad\?\.focusFirst\?\.\(\)/,
  'D-pad focus is allowed only when an actual controller is connected');
});

test('Menu does not reparent Arena entry or rebuild PC/backup items on each open',()=>{
 const arena=read('src/pkmsvv-champion-arena.js');
 const wiki=read('src/pkmsvv-wiki.js');
 const qa=read('scripts/patch-v15-menu-qa.cjs');
 assert.match(arena,/if\(mult\.nextElementSibling!==btn\)mult\.after\(btn\)/);
 assert.match(arena,/else if\(btn\.parentElement!==nav\)nav\.append\(btn\)/);
 assert.match(wiki,/if\(!b\.dataset\.pkmsvvWikiReady\)/);
 assert.match(qa,/if\(quick\.dataset\.pkmsvvLanguage!==quickLanguage\)/);
});

test('Arena chapter gate remains intact: no fake completion or automatic unlock',()=>{
 const arena=read('src/pkmsvv-champion-arena.js');
 const story=read('src/pkmsvv-story.js');
 assert.match(arena,/allMultiplayerCompleted/);
 assert.match(arena,/pkmsvvBerryChapterDone/);
 assert.match(story,/pkmsvvChapter6Seen&&\(allMultiplayerCompleted\(save\)\|\|oldArenaCup\(save\)\)/);
});

test('PC knowledge removes the redundant seasonal row and hides finished Skill Awakening',()=>{
 const wiki=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-wiki.js'),'utf8');
 assert.doesNotMatch(wiki,/✨ Sương Ký Ức · Sự kiện mùa/);
 assert.match(wiki,/skillAwakeningDone=!!G\.DB\?\.save\?\.pkmsvvChapter2Seen/);
 assert.match(wiki,/articles\.filter\(/);
});
