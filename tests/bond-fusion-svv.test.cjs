'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function setup(){
 const G={I18n:{lang:'vi'},Coop:{active:false},Royale:{active:false},EggRush:{active:false},
  PKMSVVBerryRescue:{active:false},PKMSVVArenaSolo:{active:false},
  PKMSVVChampionArena:{active:false},Moves:{ALL:Array.from({length:103},(_,i)=>({id:'skill-'+i}))},
  RunUI:{showBond(){}},DB:{save:{coins:122,pkmsvvBerry:{bag:{oran:1}}}}};
 const document={getElementById(){return null},querySelector(){return null}};
 vm.runInNewContext(read('src/pkmsvv-bond-fusion.js'),{G,document});
 const m=id=>({id,name:id,evolved:false,lvl:1,def:{maxLvl:6},type:'normal'});
 const pl={slots:[[m('ember')],[m('tackle')],[m('water-gun')]],bonds:0,
  bondOptions(){
   const loose=this.slots.filter(s=>s.length===1).map(s=>s[0]);
   const grow=this.slots.find(s=>s.length>1&&s.length<4);
   if(grow)return loose.length?{mode:'add',group:grow,loose}:null;
   return loose.length>=2?{mode:'pair',group:null,loose}:null;
  },
  fuse(picked,group=null){
   this.bonds=Math.max(0,this.bonds-1);
   const target=group||this.slots.find(s=>s[0]===picked[0]);
   for(const move of picked){
    if(target.includes(move))continue;
    const index=this.slots.findIndex(s=>s.length===1&&s[0]===move);
    if(index<0)continue;
    this.slots.splice(index,1);target.push(move);
   }
   return target;
  }
 };
 return {G,api:G.PKMSVVFusionPilot,pl,m};
}
test('Original 103 moves offer 5253 theoretical pairs, no fixed recipe gate',()=>{
 const {api}=setup();
 assert.equal(api.learnedCount(),103);
 assert.equal(api.potentialPairs(),5253);
 assert.equal(api.maxGroup,4);
 assert.equal(api.maxPerRun,1);
 assert.equal(api.RECIPES.length,10,'ten suggestions, not mandatory recipes');
 assert.equal(api.readyMove({id:'tackle',lvl:1,evolved:false}),true);
});
test('Any two distinct learned moves can be fused, even if unevolved and level one',()=>{
 const {api,pl}=setup();
 const opt=api.options(pl);
 assert.equal(opt.mode,'pair');assert.equal(opt.pilot,true);
 assert.equal(opt.loose.length,3,'all three learned moves remain available');
 assert.equal(api.confirm(pl,[opt.loose[0],opt.loose[2]]),true,'not a named recipe pair');
 assert.equal(pl._pkmsvvFusionUsed,1);
 assert.equal(api.options(pl),null,'free Fusion cannot be spent twice');
 assert.equal(api.confirm(pl,[opt.loose[0],opt.loose[1]]),false);
});
test('Fusion rejects same move twice, unknown moves and stale selections',()=>{
 const {api,pl,m}=setup(),opt=api.options(pl);
 assert.equal(api.confirm(pl,[opt.loose[0],opt.loose[0]]),false);
 assert.equal(api.confirm(pl,[opt.loose[0],m('unlearned')]),false);
 assert.equal(api.confirm(pl,[opt.loose[0]]),false);
 assert.equal(Number(pl._pkmsvvFusionUsed)||0,0);
});
test('With an existing group, free Fusion adds one learned loose move up to group size four',()=>{
 const {api,pl,m}=setup();
 const group=pl.slots[0];
 group.push(m('quick-attack'));
 const opt=api.options(pl);assert.equal(opt.mode,'add');
 assert.equal(opt.group,group);
 assert.equal(api.confirm(pl,[opt.loose[1]]),true);
 const {api:other,pl:p2,m:move}=setup();
 p2.slots=[[move('a'),move('b'),move('c'),move('d')],[move('e')]];
 assert.equal(other.options(p2),null,'full groups have no addable Bond target');
});
test('Co-op, Berry Rescue, Royale, Egg Rush, Solo and Champion all allow free Fusion',()=>{
 const {api,G,pl}=setup();
 for(const obj of [G.Coop,G.Royale,G.EggRush,G.PKMSVVBerryRescue,G.PKMSVVArenaSolo,G.PKMSVVChampionArena]){
  obj.active=true;assert.equal(api.pilotEligible(pl),true);assert.equal(api.options(pl).mode,'pair');
  obj.active=false;
 }
 pl.remote=true;assert.equal(api.options(pl),null);
 pl.remote=false;pl.lanBot=true;assert.equal(api.options(pl),null);
 pl.lanBot=false;pl.dead=true;assert.equal(api.options(pl),null);
});
test('Rift-earned Bonds are never overridden by the free Fusion patch',()=>{
 const {api,pl}=setup(),old=JSON.stringify(api.progress(pl)),save=JSON.stringify(setup().G.DB.save);
 assert.equal(typeof api.openFusion,'function');
 assert.equal(typeof api.showGuide,'function');
 assert.equal(typeof api.potentialPairs,'function');
 assert.ok(old.includes('ember-quick'));
 const patch=read('scripts/patch-bond-fusion.cjs');
 assert.doesNotMatch(patch,/patch\('js\/game\.js'/);
 assert.match(patch,/pl\.bondOptions\(\)/,'original Bond code must remain in game');
 assert.match(read('src/pkmsvv-bond-fusion.js'),/p\.fuse\(picked,opt\.group\)/);
 assert.match(read('src/pkmsvv-bond-fusion.js'),/p\.bonds=\(Number\(p\.bonds\)\|\|0\)\+1/);
 assert.ok(save.includes('coins'));
});
test('Fusion Chapter 2 tutorials and Wiki explain all pairings without changing progression',()=>{
 const story=read('src/pkmsvv-story.js'),wiki=read('src/pkmsvv-wiki.js');
 const passage=story.slice(story.indexOf('  chapter1:['),story.indexOf('  chapter2:['));
 assert.match(passage,/Fusion/);assert.match(passage,/Không có công thức bắt buộc/);
 assert.match(passage,/tối đa bốn chiêu/);
 assert.match(wiki,/GỢI Ý, không mở chiêu mới/);
 assert.match(wiki,/potentialPairs/);
 assert.match(read('scripts/prepare-game.cjs'),/patch-bond-fusion\.cjs/);
});

test('All ten suggestions are distinct pairs of real pinned PokéSurvivor skills',()=>{
 const source=read('src/pkmsvv-bond-fusion.js');
 const m=source.match(/id:'fire-gust'/);assert.ok(m);
 const {api}=setup();
 const original=['tackle','quick-attack','ember','water-gun','vine-whip','rapid-spin',
  'thunder-shock','confusion','flamethrower','gust','bubble-beam','ice-shard',
  'razor-leaf','rock-tomb','shadow-ball','psychic','thunderbolt','metal-claw'];
 const pairs=new Set();
 for(const r of api.RECIPES){
  assert.equal(r.ids.length,2);
  assert.notEqual(r.ids[0],r.ids[1]);
  for(const id of r.ids)assert.ok(original.includes(id),id);
  const key=[...r.ids].sort().join('|');
  assert.equal(pairs.has(key),false,'duplicate named pair '+key);
  pairs.add(key);
 }
 const compiled=path.join(__dirname,'..','vendor','pokesurvivor','js','data','moves.js');
 if(fs.existsSync(compiled)){
  const skills=fs.readFileSync(compiled,'utf8');
  for(const id of original)assert.ok(skills.includes("id: '"+id+"'"),'missing move in real game: '+id);
 }
});
test('Level-up cards label a known partner, two offered halves, and any free Fusion',()=>{
 const {api,G,pl,m}=setup();
 G.Moves.BY_ID=Object.fromEntries([
  'tackle','ember','flamethrower','gust','rock-tomb','razor-leaf','ice-shard','bubble-beam',
  'metal-claw','thunderbolt','spikes','quick-attack'
 ].map(id=>[id,{name:id}]));
 G.T=(v)=>v;
 G.Game={player:pl,state:'playing'};
 G.UI={toast(){}};
 const cards=[
  {type:'new',key:'new:flamethrower',desc:'Fire',apply:p=>p.slots.push([m('flamethrower')])},
  {type:'new',key:'new:gust',desc:'Wind',apply:p=>p.slots.push([m('gust')])},
  {type:'new',key:'new:spikes',desc:'Normal',apply:p=>p.slots.push([m('spikes')])}
 ];
 api.decorateOffers(pl,cards);
 assert.match(cards[0].desc,/CẶP TIỀM NĂNG/);
 assert.match(cards[1].desc,/chọn 1, học chiêu kia sau/);
 assert.match(cards[2].desc,/Có thể Fusion với skill đã học/);
 assert.equal(cards[0]._pkmsvvFusionHint,'offered');
 assert.ok(!cards[0].desc.includes('FUSION SẴN SÀNG'),
  'two offered halves cannot both be picked at once');
 const more=[{type:'new',key:'new:quick-attack',desc:'Quick',apply:p=>p.slots.push([m('quick-attack')])}];
 api.decorateOffers(pl,more);
 assert.equal(more[0]._pkmsvvFusionHint,'ready','Ember is already owned');
 assert.match(more[0].desc,/Đã có ember/);
 assert.equal(cards[0].desc.includes('<script'),false);
});
test('A newly learned complementary skill alerts once per pair and lights the Fusion HUD',()=>{
 const {api,G,pl,m}=setup();let toasts=[];
 G.Moves.BY_ID=Object.fromEntries(['ember','quick-attack','flamethrower','gust']
  .map(id=>[id,{name:id}]));
 G.T=v=>v;G.UI={toast:(s)=>toasts.push(s)};
 G.Game={player:pl,state:'playing'};
 G.LevelUp={offer(){
  return [
   {type:'new',key:'new:quick-attack',desc:'move',
    apply:p=>p.slots.push([m('quick-attack')])},
   {type:'stat',key:'stat:hp',desc:'heal',apply(){}}
  ];
 }};
 assert.equal(api.installSkillHints(),true);
 assert.equal(api.installSkillHints(),true,'do not wrap twice');
 let cards=G.LevelUp.offer(pl);
 assert.equal(cards.length,2,'no extra card slots or altered RNG');
 assert.match(cards[0].desc,/FUSION GỢI Ý/);
 assert.equal(cards[1].desc,'heal','stats are not marked');
 const initial=G.DB.save,old=JSON.stringify(initial);
 cards[0].apply(pl);
 assert.equal(toasts.length,1,'new matching pair notifies after actual learn');
 assert.match(toasts[0],/FUSION SẴN SÀNG/);
 assert.ok(Number(pl._pkmsvvFusionHintUntil)>Date.now());
 assert.equal(JSON.stringify(G.DB.save),old,'no persistent state mutation');
 cards=G.LevelUp.offer(pl);
 cards[0].apply(pl);
 assert.equal(toasts.length,1,'relearning/same card cannot notify repeatedly');
 assert.equal(api.RECIPES.length,10);
});
test('First generic pair notifies once even without named recipe, but no notifications before owning two',()=>{
 const {api,G,pl,m}=setup();const seen=[];
 G.Game={player:pl,state:'playing'};G.UI={toast:t=>seen.push(t)};
 pl.slots=[[m('tackle')]];
 const before=api.learnedIds(pl);
 pl.slots.push([m('ice-beam')]);
 assert.equal(api.notifyLearned(pl,'ice-beam',before),true);
 assert.match(seen[0],/2 skill rồi/);
 const after=api.learnedIds(pl);
 pl.slots.push([m('aura-sphere')]);
 assert.equal(api.notifyLearned(pl,'aura-sphere',after),false);
 assert.equal(seen.length,1);
});

test('All ten Fusion suggestions use clear Pokémon-style Vietnamese labels without changing recipes',()=>{
 const {api}=setup();
 const names=new Map([
  ['ember-quick','Lướt Lửa'],
  ['water-tackle','Húc Sóng'],
  ['grass-spin','Dây Leo Xoáy'],
  ['spark-quick','Lướt Điện'],
  ['mind-tackle','Húc Tâm Linh'],
  ['fire-gust','Lốc Lửa'],
  ['bubble-ice','Bong Bóng Băng'],
  ['leaf-rock','Lá Sắc Đá Rơi'],
  ['shadow-mind','Bóng Ma Siêu Năng'],
  ['thunder-claw','Vuốt Sét']
 ]);
 assert.equal(api.RECIPES.length,names.size);
 assert.equal(new Set(api.RECIPES.map(r=>r.vi)).size,names.size);
 for(const recipe of api.RECIPES){
  assert.equal(recipe.vi,names.get(recipe.id),'stable recipe '+recipe.id);
  assert.equal(recipe.ids.length,2,'must preserve two learned move ids');
 }
 const oldNames=['Thủy Kích','Tâm Lực','Hỏa Phong','Băng Triều','Thạch Diệp','Tâm Ảnh','Lôi Trảo'];
 for(const forbidden of oldNames){
  assert.ok(!api.RECIPES.some(r=>r.vi===forbidden),forbidden+' is still used');
 }
 const src=read('src/pkmsvv-bond-fusion.js');
 const wiki=read('src/pkmsvv-wiki.js');
 assert.match(src,/hint\.recipe\.vi/,'skill pick hints use the updated labels');
 assert.match(src,/tr\(r\.vi,r\.en\)/,'Fusion guide uses the updated labels');
 assert.match(wiki,/tr\(formula\.vi,formula\.en\)/,'Wiki uses the updated labels');
});
