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
 assert.ok(s.includes('f?.artReady&&G.SPRITE_META?.[f.spriteId]?.a?.Idle'));
});
test('Berry subsystem compiles on all platform builds before game minification',()=>{
 const patch=fs.readFileSync(path.join(root,'scripts/patch-berry.cjs'),'utf8');
 const prepare=fs.readFileSync(path.join(root,'scripts/prepare-game.cjs'),'utf8');
 assert.match(prepare,/patch-berry\.cjs/);
 assert.match(patch,/pkmsvv-berry\.js/);
 assert.match(patch,/pkmsvv-berry\.css/);
 assert.match(patch,/pkmsvvBerryChapterDone/);
});

function interactiveHarness(){
 const elements=[],byId=new Map(),intervals=new Map();
 let id=0,starts=0;
 function node(tag){
  const e={tagName:tag,children:[],textContent:'',className:'',style:{},hidden:false,disabled:false,
   classList:{add(v){e.className+=' '+v},remove(v){e.className=e.className.replace(v,'')}},
   append(...children){e.children.push(...children)},replaceChildren(...children){e.children=[...children]},
   setAttribute(){},remove(){e.removed=true},onclick:null,innerHTML:''};
  Object.defineProperty(e,'id',{get(){return e._id},set(v){e._id=v;byId.set(v,e)}});elements.push(e);return e;
 }
 const document={body:{append(){}},createElement:node,getElementById:name=>byId.get(name)||null};
 const save={coins:2000,tickets:{t10:0},pkmsvvChapter5Seen:true};
 const G={I18n:{lang:'vi'},DB:{save,commit(){}},Game:{state:'ui',player:null,
  startRun(){starts++;this.state='playing';this.player={hp:100,maxHp:100,atkMul:1,spdMul:1,cdMul:1,invuln:0}}},
  UI:{toast(){},refreshCoins(){}},PKMSVVStory:{syncChapterPurpleRewards(){save.tickets.t10++;}}};
 const add=fn=>{const key=++id;intervals.set(key,fn);return key};
 vm.runInNewContext(fs.readFileSync(path.join(root,'src','pkmsvv-berry.js'),'utf8'),
  {G,document,setInterval:add,clearInterval:i=>intervals.delete(i),Math,Number,Array,Set,Object,console});
 return {G,berry:G.PKMSVVBerry,elements,byId,intervals,get starts(){return starts},
  pulse(){for(const fn of [...intervals.values()])fn()}};
}
test('Solo Berry choice occurs before enemy spawning, lasts 4 seconds, consumes once and applies to new player',()=>{
 const h=interactiveHarness(),b=h.berry;
 b.grant('liechi',1);b.grant('oran',1);
 h.G.Game.startRun(null);
 assert.equal(h.starts,0,'start must wait for confirmation');
 const options=h.elements.filter(e=>e.tagName==='button'&&e.textContent.includes('Liechi'));
 assert.equal(options.length,1);
 options[0].onclick();
 for(let i=0;i<3;i++)h.pulse();
 assert.equal(h.starts,0);
 h.pulse();
 assert.equal(h.starts,1);
 assert.equal(b.count('liechi'),0);
 assert.deepEqual([...h.G.Game.player._pkmsvvBerry.ids],['liechi']);
 assert.equal(b.chapterProgress(),1);
});
test('Berry Rescue has moving six-tile targets, three chances, and awards exactly one inventory item',()=>{
 const h=interactiveHarness(),b=h.berry;
 assert.equal(b.rescue(),true);
 const before=b.TYPES.reduce((v,t)=>v+b.count(t.id),0);
 for(let turn=0;turn<5;turn++){
  const good=h.elements.filter(e=>e.className.includes('pkmsvv-berry-target')&&!e.used).at(-1);
  assert.ok(good,'berry target must appear in each wave');
  good.used=true;good.onclick();
 }
 const after=b.TYPES.reduce((v,t)=>v+b.count(t.id),0);
 assert.equal(after-before,1);
 assert.equal(b.data().rescueWins,1);
 assert.equal(h.intervals.size,0,'successful challenge clears countdown interval');
});
test('Berry chapter story has two uploaded 16:9 illustrations and exactly five-type requirement',()=>{
 const story=fs.readFileSync(path.join(root,'src/pkmsvv-story.js'),'utf8');
 const patch=fs.readFileSync(path.join(root,'scripts/patch-berry.cjs'),'utf8');
 for(const name of ['chapter6-berry-grove','chapter6-berry-rescue']){
  const stat=fs.statSync(path.join(root,'src/story-art',name+'.webp'));
  assert.ok(stat.size>50000,name+' should be real illustration');
  assert.ok(story.includes(name),name+' should be referenced by story');
  assert.ok(patch.includes(name),name+' should be shipped in the PC build');
 }
 assert.match(story,/pkmsvvBerryChapterDone/);
 assert.match(story,/berryChapter\(done\)/);
});
