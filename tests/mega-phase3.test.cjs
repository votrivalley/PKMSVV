'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function setup(){
 let active='playing',coop=false,pl=null;
 const s={partner:6,owned:{6:{at:1}},megaStones:{charizarditex:1},
  pkmsvvChapter3Seen:true,pkmsvvChapter7Seen:true,megaForms:{},megaStoryCleared:{}};
 class Animator{constructor(dex,scale,shiny){this.dex=dex;this.scale=scale;this.shiny=shiny;this.dir=0}}
 class Player{update(){return true}}
 const makeButton=()=>({style:{},addEventListener(){},append(){},querySelector(){return {textContent:''}},setAttribute(){}});
 const forms=[
  {dex:6,key:'charizardmegax',stone:'Charizardite X',stoneKey:'charizarditex',
   storyLocked:false,sharedStone:false,spriteId:10006,artReady:true,
   stats:{hp:78,atk:130,def:111,spa:130,spd:85,spe:100}},
  {dex:530,key:'excadrillmega',stone:'Excadrite',stoneKey:'excadrite',
   storyLocked:false,sharedStone:false,spriteId:10530,artReady:true,
   stats:{hp:110,atk:165,def:100,spa:65,spd:85,spe:108}},
  ...['scizormega','swampertmega','garchompmega','greninjamega','golisopodmega',
   'falinksmega','baxcaliburmega','dragonitemega'].map((key,i)=>({
   dex:100+i,key,stone:'Stone '+key,stoneKey:'stone'+key,
   storyLocked:false,sharedStone:false,spriteId:40000+i,artReady:false,
   stats:{hp:100,atk:100,def:100,spa:100,spd:100,spe:100}})),
  {dex:384,key:'rayquazamega',stone:null,stoneKey:null,storyLocked:true,
   sharedStone:false,spriteId:10384,artReady:false,stats:{}}
 ];
 const G={
  PKMSVV_MEGA_CATALOG:forms,
  DB:{save:s,commit(){}},Gacha:{pull(save,n){if(n<1)return null;return Array.from({length:n},()=>({dex:6}));}},
  Game:{get player(){return pl},get state(){return active},startRun(){return true},
   toUI(){active='ui'},quit(){active='ui'}},
  Player,Sprites:{Animator,playerScale(){return 1},playerRadius(){return 18},bodyHeight(){return 36},
   preload:async()=>{},sheet(){return {ready:true}}},
  SPRITE_META:{10006:{a:{Idle:{}}},10530:{a:{Idle:{}}}},
  Coop:{get active(){return coop}},UI:{toast(){}},FX:{ring(){}},Audio:{sfx(){}},
  DEX_BY:{6:{name:'Charizard'},530:{name:'Excadrill'}}
 };
 const context={G,document:{body:{append(){}},readyState:'complete',getElementById(){return null},
  addEventListener(){},createElement:makeButton},setInterval(){},console};
 vm.runInNewContext(read('src/pkmsvv-mega-phase3.js'),context);
 pl={dex:6,dead:false,shiny:false,anim:new Animator(6,1,false),scale:1,r:18,bodyH:36,
  mon:{dex:6,pa:1.16,sa:1.30,atk:1.30,df:78,sd:85,spd:120,types:['fire','flying']},
  baseAtk:1.30,baseSpd:120,cdMul:1,moves:[{t:10}],x:0,y:0};
 return {G,s,pl,lib:G.PKMSVVMegaPhase3,forms,
  coop:v=>{coop=v},state:v=>{active=v}};
}
test('10 regional Champions remain fixed and never mark a tournament victory',()=>{
 const {lib,s}=setup();
 assert.equal(lib.CHAMPIONS.length,10);
 assert.deepEqual(Array.from(lib.CHAMPIONS,c=>c.region),[
  'Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea','Votri Valley']);
 assert.equal(lib.STONE_CHANCE,.01);
 assert.equal(lib.DURATION,30);assert.equal(lib.CD_FACTOR,.7);
 assert.equal(s.megaChampions,undefined);
});
test('only paid successful Gacha pulls can receive 1% bonus and duplicates are skipped',()=>{
 const {lib,G,s}=setup();
 let calls=0;
 const r=[{dex:6},{dex:6}];
 const bonus=lib.rewardStone(s,r,()=>{calls++;return 0;});
 assert.equal(bonus.length,2);
 assert.equal(bonus[0],'Stone scizormega'); // Charizard stone already owned
 assert.equal(bonus[1],'Stone swampertmega');
 assert.equal(s.megaStones.stonescizormega,1);
 assert.equal(s.megaStones.stoneswampertmega,1);
 assert.equal(r[0].megaStone,bonus[0]);
 const before=JSON.stringify(s.megaStones);
 assert.equal(lib.rewardStone(s,[{}],()=>.5).length,0);
 assert.equal(JSON.stringify(s.megaStones),before);
 assert.equal(G.Gacha.pull(s,0),null,'invalid unpaid pull does not run bonus');
});
test('owner + right stone + Chapters 3 and 7 required; legendary miniquests not bypassed',()=>{
 const {lib,s,forms}=setup(),char=forms[0],ray=forms.at(-1);
 assert.equal(lib.isUnlocked(char),true);
 assert.deepEqual(JSON.parse(JSON.stringify(lib.progress(char))),{pokemon:true,stone:true,story:true,form:true});
 s.pkmsvvChapter3Seen=false;assert.equal(lib.isUnlocked(char),false);
 s.pkmsvvChapter3Seen=true;delete s.megaStones.charizarditex;
 assert.equal(lib.isUnlocked(char),false);
 s.megaStones.charizarditex=1;delete s.owned[6];
 assert.equal(lib.isUnlocked(char),false);
 s.owned[384]={at:1};s.megaStoryCleared.rayquazamega=false;
 assert.equal(lib.isUnlocked(ray),false);
 s.megaStoryCleared.rayquazamega=true;
 assert.equal(lib.isUnlocked(ray),true,'Rayquaza does not use a stone but requires story');
 assert.equal(lib.isBattleReady(ray),false);
});
test('authentic Mega Charizard X uses individual original stat ratios and reverts after 30s',()=>{
 const {lib,pl,G,coop}=setup(),original=pl.mon;
 assert.equal(lib.eligible(),true);
 assert.equal(lib.activate(pl),true);
 assert.equal(pl.anim.dex,10006);
 assert.ok(Math.abs(pl.mon.pa-1.16*130/84)<1e-8);
 assert.ok(Math.abs(pl.mon.sa-1.30*130/109)<1e-8);
 assert.equal(pl.mon.df,111);
 assert.equal(pl.mon.types.join('/'),'fire/dragon');
 assert.equal(pl.baseSpd,120);
 assert.equal(pl.cdMul,.7);
 assert.equal(pl.moves[0].t,7);
 assert.equal(pl.dex,6);
 lib.tick(pl,30.1);
 assert.equal(pl.anim.dex,6);
 assert.strictEqual(pl.mon,original);
 assert.equal(pl.baseSpd,120);
 assert.ok(Math.abs(pl.cdMul-1)<1e-9);
 assert.equal(lib.eligible(),false,'Mega used once per run');
 coop(true);assert.equal(lib.eligible(),false);
 assert.equal(lib.activate(pl),false,'no LAN Mega without host replication');
});
test('compiled Phase 3 assets are loaded after Phase 2 catalog and original Gacha saves stay intact',()=>{
 const html=read('vendor/pokesurvivor/dev.html');
 assert.ok(html.indexOf('js/data/pkmsvv-mega-catalog.js')<html.indexOf('js/ui/pkmsvv-mega-phase3.js'));
 const script=read('vendor/pokesurvivor/js/ui/pkmsvv-mega-phase3.js');
 assert.match(script,/STONE_CHANCE=\.01/);
 const gacha=read('vendor/pokesurvivor/js/ui/gacha-ui.js');
 assert.match(gacha,/r\.megaStone/);
 const db=read('vendor/pokesurvivor/js/core/db.js');
 assert.match(db,/megaStoryCleared/);assert.match(db,/megaForms/);
 const runtime=read('src/pkmsvv-mega-phase3.js');
 assert.doesNotMatch(runtime,/save\.stats\.runs\s*\+\+|megaChampions\s*=|G\.DEX_BY\[/);
});

test('Shiny Mega Charizard X keeps its genuine Shiny animation and returns Shiny after 30s',()=>{
 const {lib,G,pl}=setup();
 G.Sprites.hasShiny=dex=>dex===10006;
 pl.shiny=true;
 assert.equal(lib.eligible(),true);
 assert.equal(lib.activate(pl),true);
 assert.equal(pl.anim.dex,10006);
 assert.equal(pl.anim.shiny,true);
 assert.equal(pl.shiny,true);
 lib.tick(pl,30.1);
 assert.equal(pl.anim.dex,6);
 assert.equal(pl.anim.shiny,true);
 assert.equal(pl.shiny,true);
 G.Sprites.hasShiny=()=>false;
 G.Game.startRun();
 pl._megaUsed=false;
 assert.equal(lib.eligible(),false,'no Shiny Mega until genuine Shiny art exists');
});

test('Phase 3 cannot activate normal or Shiny Mega before Chapter 7 even with the stone',()=>{
 const h=setup(),{s,lib,forms}=h;
 assert.equal(lib.eligible(),true);
 s.pkmsvvChapter7Seen=false;
 assert.equal(lib.isUnlocked(forms[0]),false);
 assert.equal(lib.eligible(),false);
 assert.equal(lib.progress(forms[0]).story,false);
 s.pkmsvvChapter7Seen=true;
 assert.equal(lib.eligible(),true);
});
