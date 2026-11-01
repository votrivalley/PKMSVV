'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(require('node:path').join(__dirname,'..',p),'utf8');
test('Crown Journey appears above regions and the two equal combat tabs',()=>{
 const ui=read('src/pkmsvv-champion-arena.js');
 const start=ui.indexOf('overlay.innerHTML='),end=ui.indexOf('document.body.append(overlay)',start);
 const markup=ui.slice(start,end);
 assert.equal((markup.match(/id="pkmsvv-arena-mode-champion"/g)||[]).length,1);
 assert.equal((markup.match(/id="pkmsvv-champion-sky"/g)||[]).length,1);
 assert.ok(markup.indexOf('id="pkmsvv-arena-mode-champion"')<markup.indexOf('id="pkmsvv-champion-regions"'));
 assert.ok(markup.indexOf('id="pkmsvv-champion-regions"')<markup.indexOf('id="pkmsvv-arena-mode-solo"'));
 const tabs=markup.slice(markup.indexOf('<div class="pkmsvv-arena-mode-tabs">'),markup.indexOf('<div id="pkmsvv-champion-map-row"'));
 assert.match(tabs,/id="pkmsvv-arena-mode-solo"/);assert.match(tabs,/id="pkmsvv-arena-mode-league"/);
 assert.doesNotMatch(tabs,/id="pkmsvv-arena-mode-champion"/);
 assert.doesNotMatch(markup,/Xem lại Hành Trình Thiên Không/);
 const css=read('src/pkmsvv-champion-arena.css');
 assert.match(css,/pkmsvv-crown-journey/);assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
test('Chapter 10 is not allowed to reuse chapter 9 imagery',()=>{
 const story=read('src/pkmsvv-story.js'),pack=read('scripts/patch-story.cjs');
 assert.match(story,/14:'chapter7-seal', 15:'chapter7-mega'/);
 assert.match(story,/20:'chapter10-darkening',21:'chapter10-shadow-sky'/);
 assert.doesNotMatch(story,/20:'chapter7-seal',21:'chapter7-mega'/);
 for(const key of ['chapter10-darkening','chapter10-shadow-sky'])assert.ok(pack.includes("'"+key+"'"));
});
test('Sky Rayquaza boss remains playable, story replay is only in Memories',()=>{
 const ui=read('src/pkmsvv-champion-arena.js');
 assert.match(ui,/sky.hidden=!storyCompleted\(\)\|\|!!G.DB\?\.save\?\.pkmsvvChapter10Done\|\|active/);
 assert.match(ui,/Thách đấu Rayquaza/);
 assert.doesNotMatch(ui,/replay\?\.\('chapter10'\)/);
 assert.match(ui,/function startSky\(\)/);
});
