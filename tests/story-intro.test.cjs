'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('Chapter 0 has 4 prologue pixel scenes, a revealed Pokémon and both languages',()=>{
 const a=read('scripts/generate-story-art.cjs'),s=read('src/pkmsvv-story.js');
 assert.match(a,/for\(let n=1;n<=5;n\+\+\)/);
 for(const w of ['Mình đang ở đâu','Where am I','Hạ tổng cộng 50, 100 và 200','Unlock once','replay'])assert.ok(s.includes(w),w);
 assert.match(s,/G\.UI\.sprite\(cv,chosenDex/);
});
test('first new character sees introduction before personality quiz, existing saves safe',()=>{
 const p=read('scripts/patch-story.cjs');
 for(const phrase of ['pkmsvvStorySeen','G.PKMSVVStory.prologue','G.TestUI.start','G.PKMSVVStory.reveal','G.PKMSVVStory.replay','src','generate-story-art'])assert.ok(p.includes(phrase),phrase);
 assert.match(p,/scr-pkmsvv-story/);
});
test('Story UI requires readable opaque text panels and skip controls',()=>{
 const c=read('src/pkmsvv-story.css'),p=read('scripts/patch-story.cjs');
 assert.match(c,/#0b303b/);assert.match(c,/#fbffff/);
 assert.match(p,/pkmsvv-story-skip/);assert.match(p,/pkmsvv-story-next/);
});

test('main menu places Ký Ức immediately after Cài đặt',()=>{
 const p=read('scripts/patch-story.cjs');
 assert.ok(p.indexOf('data-go="settings"')>=0 && p.indexOf('data-go="memories"')>p.indexOf('data-go="settings"'));
 assert.doesNotMatch(p,/data-go="upgrades"/);
});

test('menu actively moves Memories immediately after Settings whenever menu opens',()=>{
 const source=read('scripts/patch-story.cjs');
 assert.match(source,/settingsItem\.nextElementSibling/);
 assert.match(source,/settingsItem\.after\(memoriesItem\)/);
 assert.match(source,/menu-list \[data-go=/);
});

test('approved cinematic art paths and renderer are wired into build',()=>{
 const story=read('src/pkmsvv-story.js'),p=read('scripts/patch-story.cjs'),css=read('src/pkmsvv-story.css');
 assert.ok(story.includes('const VISUALS'));
 assert.ok(story.includes("1:'eyes', 2:'eyes', 3:'eyes'"));
 assert.ok(story.includes("4:'gate', 5:'reveal'"));
 assert.ok(story.includes("assets/story/"));
 assert.ok(story.includes(".webp"));
 assert.ok(story.includes("img.onerror"));
 assert.ok(p.includes("'src','story-art'"));
 assert.ok(p.includes('fs.copyFileSync(source,dest)'));
 assert.ok(css.includes('object-fit:contain'));
});

test('third reveal background never replaces either existing approved scene',()=>{
 const story=read('src/pkmsvv-story.js'),css=read('src/pkmsvv-story.css'),patch=read('scripts/patch-story.cjs');
 assert.match(story,/1:'eyes', 2:'eyes', 3:'eyes'/);
 assert.match(story,/4:'gate', 5:'reveal'/);
 assert.match(story,/const VISUALS=Object\.freeze/);
 assert.match(story,/assets\/story\/gate\.webp/);
 assert.match(patch,/for\(const name of \['eyes','gate','reveal'\]\)/);
 assert.match(css,/data-scene="5"/);
 assert.match(css,/scale\(2\)/);
 assert.doesNotMatch(css,/\.menu-item.*scale\(2\)/);
});

test('Chapter 0 offers a story nickname without changing established social nicknames',()=>{
 const story=read('src/pkmsvv-story.js'),patch=read('scripts/patch-story.cjs');
 for(const term of ['Nếu ngươi không nhớ tên mình','askName:true','G.Social.start()','G.Social.claimNick(name)','G.DB.setName(name)','pkmsvvNameChosen','if(replaying||','e.target.closest'])assert.ok(story.includes(term),term);
 assert.match(patch,/pkmsvv-story-name-form/);
 assert.match(patch,/pkmsvvNameChosen/);
 assert.match(story,/If you cannot remember your name/);
 assert.match(story,/Hãy gọi tôi như vậy/);
 assert.doesNotMatch(story,/Vậy\.\.\. bạn tên gì\?|Đây là tên tôi!/);
 assert.match(patch,/Hãy gọi tôi như vậy/);
});

test('skipping Chapter 0 or the personality quiz can never bypass starter selection on any platform',()=>{
 const story=read('src/pkmsvv-story.js'),p=read('scripts/patch-story.cjs');
 const browser=read('tests/starter-onboarding-browser.cjs');
 assert.match(story,/finish\(true\)/,'skip signals must reach the post-story callback');
 assert.match(p,/skipped=>skipped\?G\.TestUI\.skipToStarters\(\):G\.TestUI\.start\(\)/);
 assert.match(p,/test-skip-starter/);
 assert.match(p,/function skipToStarters\(\)/);
 assert.match(browser,/skip-story-after-name/);
 assert.match(browser,/skip-quiz/);
 assert.match(browser,/complete-quiz/);
 const android=read('src/android/compact-landscape.css');
 assert.match(android,/#scr-menu\.pkmsvv-v15-menu\.hidden\{display:none!important/);
});
