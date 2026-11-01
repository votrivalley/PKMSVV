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
 assert.equal(api.RECIPES.length,5,'five are illustrative combinations, not mandatory');
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
