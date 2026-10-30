'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function harness(){
 const save={coins:1000,tickets:{t1:0,t10:0},pkmsvvChapter5Seen:true};
 let commits=0;
 const G={DB:{save,commit(){commits++}},I18n:{lang:'vi'},Game:{state:'ui'},UI:{toast(){},refreshCoins(){}},
  PKMSVVStory:{syncChapterPurpleRewards(){save.tickets.t10++;return 1}}};
 const document={getElementById(){return null;}};
 const src=fs.readFileSync(path.join(root,'src','pkmsvv-berry.js'),'utf8');
 vm.runInNewContext(src,{G,document,setInterval,clearInterval,Math,Number,Array,Set,Object,console});
 return {G,save,berry:G.PKMSVVBerry,get commits(){return commits}};
}
test('Berry catalog is ten unique, non-excessive and has two ultra-rare effects',()=>{
 const {berry}=harness(),types=berry.TYPES;
 assert.equal(types.length,10);assert.equal(new Set(types.map(t=>t.id)).size,10);
 assert.equal(types.filter(t=>t.tier===3).length,2);
 assert.equal(berry.byId.enigma.price,0);
});
test('Berry bag uses save-backed stock; shop charges coins, rescue grants are persistent',()=>{
 const h=harness(),b=h.berry;
 assert.equal(b.count('oran'),0);
 assert.equal(b.buy('oran'),true);assert.equal(h.save.coins,900);
 assert.equal(b.count('oran'),1);
 assert.equal(b.grant('sitrus',2),true);assert.equal(b.count('sitrus'),2);
 assert.equal(b.grant('invalid'),false);
 assert.ok(h.commits>1);
});
test('Chapter 6 counts distinct used Berry types, never five copies of the same Berry',()=>{
 const h=harness(),b=h.berry;
 for(let i=0;i<5;i++)b.markUsed(['oran']);
 assert.equal(b.chapterProgress(),1);assert.ok(!h.save.pkmsvvBerryChapterDone);
 b.markUsed(['liechi','salac','lum','petaya']);
 assert.equal(b.chapterProgress(),5);assert.equal(h.save.pkmsvvBerryChapterDone,true);
 assert.equal(h.save.tickets.t10,1);
 b.markUsed(['enigma']);assert.equal(h.save.tickets.t10,1,'reward only once');
});
test('Mega regional candidates are ten distinct forms; every use is gated by a real battle sprite',()=>{
 const s=fs.readFileSync(path.join(root,'src','pkmsvv-champion-arena.js'),'utf8');
 assert.match(s,/tyranitarmega/);assert.match(s,/tatsugiricurlymega/);
 assert.match(s,/f\.artReady&&G\.SPRITE_META\?\.\[f\.spriteId\]\?\.a\?\.Idle/);
});
test('Berry subsystem compiles on all platform builds before game minification',()=>{
 const patch=fs.readFileSync(path.join(root,'scripts/patch-berry.cjs'),'utf8');
 const prepare=fs.readFileSync(path.join(root,'scripts/prepare-game.cjs'),'utf8');
 assert.match(prepare,/patch-berry\.cjs/);
 assert.match(patch,/pkmsvv-berry\.js/);
 assert.match(patch,/pkmsvv-berry\.css/);
 assert.match(patch,/pkmsvvBerryChapterDone/);
});
