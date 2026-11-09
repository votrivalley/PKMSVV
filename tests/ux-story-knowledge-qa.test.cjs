'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {patchStoryBundle}=require('../scripts/patch-v20-story-bundle.cjs');
test('15p boss unlocks next, 30p boss ends match; labels are bilingual',()=>{
 const s=read('src/pkmsvv-quick-region.js');
 assert.match(s,/Hạ Boss 15p để qua màn/);
 assert.match(s,/Boss 30p để kết màn/);
 assert.match(s,/15m Boss to unlock next/);
 assert.doesNotMatch(s,/▶ Boss 15p \+ 30p/);
});
test('Touch/mobile-landscape speed stays bottom-left at a safe 6-9px margin',()=>{
 const s=read('src/pkmsvv-runtime-controls-qa.css');
 assert.match(s,/PKMSVV_MOBILE_SPEED_EDGE_23/);
 assert.match(s,/@media \(pointer:coarse\), \(orientation:landscape\) and \(max-height:650px\)/);
 assert.match(s,/left:max\(6px,env\(safe-area-inset-left\)\)!important/);
 assert.match(s,/bottom:max\(9px,env\(safe-area-inset-bottom\)\)!important/);
});
test('Story uses split illustration + text and explains real Fusion skills',()=>{
 const css=read('src/pkmsvv-story.css'),s=read('src/pkmsvv-story.js');
 assert.match(css,/PKMSVV_STORY_SPLIT_V23/);
 assert.match(css,/flex-direction:column!important/);
 assert.match(css,/max-height:min\(47dvh,177px\)!important/);
 assert.match(s,/Fusion là dung hợp hai kỹ năng đã luyện MAX thành một chiêu hoàn toàn mới/);
 assert.match(s,/Skill Evolution strengthens one move/);
 assert.match(s,/Bond từ Khe Nứt là hệ thống riêng/);
});
test('Beginner guide is first, expanded, and only hidden at permanent 8 of 8',()=>{
 const s=read('src/pkmsvv-wiki.js'),clean=read('src/pkmsvv-pc-menu-clean-qa.js');
 assert.ok(s.indexOf("[tr('Thức tỉnh kỹ năng','Skill Awakening')")<s.indexOf("[tr('✨ Fusion"));
 assert.match(s,/pkmsvv-awakening-milestones/);
 assert.match(s,/const skillAwakeningDone=!!G.DB\?\.save&&/);
 assert.match(s,/p.hidden=!awakening/);
 assert.match(clean,/try\{return tracker.progress\(save\).count>=8;/);
 assert.doesNotMatch(clean,/save.pkmsvvChapter2Seen \|\|/);
});
test('Source Story replaces exactly one compiled module without appending a second handler',()=>{
 const old='const G={};G.PKMSVVStory=(()=>{return {old:true}})();const after=42;';
 const next=patchStoryBundle(old,read('src/pkmsvv-story.js'));
 assert.equal(next.includes('old:true'),false);
 assert.ok(next.includes('Fusion là dung hợp hai kỹ năng đã luyện MAX'));
 assert.equal(next.split('G.PKMSVVStory=').length-1,1);
 assert.ok(next.includes('const after=42;'));
 assert.throws(()=>patchStoryBundle('const G={}',read('src/pkmsvv-story.js')),/precisely one/);
});
test('Web and Android inject genuine compiled Story, skill guide and UI CSS',()=>{
 const w=read('scripts/promote-web-v20.cjs'),a=read('scripts/patch-pokebox-stage4-apk-qa.cjs');
 for(const k of ['pkmsvv-quick-region.js','pkmsvv-pc-menu-clean-qa.js',
  'pkmsvv-wiki-qa.js','pkmsvv-story-ui-fix.css','pkmsvv-runtime-controls-qa.css'])
  assert.ok(w.includes(k),'Web missing '+k);
 assert.ok(w.includes('patchStoryFile(path.join(to,prefix'));
 assert.ok(a.includes('patchFile(compiledBundle)'));
 assert.ok(a.includes('pkmsvv-story-ui-fix.css'));
});
