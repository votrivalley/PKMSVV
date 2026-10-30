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
  baseAtk:1.30,baseSpd:120,cdMul:1,moves:[{t:10}],x:0,y:0,
  kills:0,bosses:0,_megaEnergy:100};
 return {G,s,pl,lib:G.PKMSVVMegaPhase3,forms,
  coop:v=>{coop=v},state:v=>{active=v}};
}
test('10 regional Champions remain fixed and never mark a tournament victory',()=>{
 const {lib,s}=setup();
 assert.equal(lib.CHAMPIONS.length,10);
 assert.deepEqual(Array.from(lib.CHAMPIONS,c=>c.region),[
  'Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea','Votri Valley']);
 assert.equal(lib.STONE_CHANCE,.01);
 assert.equal(lib.DURATION,30);assert.equal(lib.REUSE_COOLDOWN,200);
 assert.equal(lib.ENERGY_MAX,100);assert.equal(lib.CD_FACTOR,.7);
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
 assert.equal(lib.eligible(),false,'200s cooldown begins after form expires');
 assert.equal(pl._megaCooldownRemaining,200);
 lib.addEnergy(pl,100);
 lib.tick(pl,199);assert.equal(pl._megaCooldownRemaining,1);
 assert.equal(lib.eligible(),false,'even full energy cannot bypass cooldown');
 lib.tick(pl,1);assert.equal(pl._megaCooldownRemaining,0);
 assert.equal(lib.eligible(),true,'Mega can be reused after 200s if energy is full');
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
 pl._megaCooldownRemaining=0;pl._megaEnergy=100;
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

test('solo Mega energy gains from actual hits, credited kills and boss defeats',()=>{
 const {lib,pl,coop,state}=setup();
 pl._megaEnergy=0;
 assert.equal(lib.eligible(),false,'fresh run needs 100 energy');
 const enemy={dead:false,remote:false,arceus:false};
 lib.onEnemyHurt(enemy,10);
 assert.equal(pl._megaEnergy,1);
 lib.onEnemyHurt({...enemy,remote:true},50);
 lib.onEnemyHurt({...enemy,arceus:true},50);
 lib.onEnemyHurt({...enemy,dead:true},50);
 lib.onEnemyHurt(enemy,0);
 assert.equal(pl._megaEnergy,1,'remote/invincible/dead/zero hits never charge');
 pl.kills=2;pl.bosses=1;lib.tick(pl,.1);
 assert.equal(pl._megaEnergy,8,'1 hit + 2x2 kills + 3 boss = 8');
 lib.tick(pl,.1);assert.equal(pl._megaEnergy,8,'counters do not double-credit');
 lib.addEnergy(pl,10000);assert.equal(pl._megaEnergy,100,'energy caps at 100');
 assert.equal(lib.activate(pl),true);
 assert.equal(pl._megaEnergy,0,'activation consumes full energy');
 lib.onEnemyHurt(enemy,10);assert.equal(pl._megaEnergy,0,'cannot recharge while Mega active');
 lib.tick(pl,30);assert.equal(pl._megaCooldownRemaining,200);
 pl.kills=3;lib.tick(pl,1);assert.equal(pl._megaEnergy,2,'can charge during cooldown');
 assert.equal(lib.eligible(),false,'charged energy still respects cooldown');
 coop(true);lib.onEnemyHurt(enemy,10);assert.equal(pl._megaEnergy,2,'no multiplayer charge');
 coop(false);state('ui');lib.onEnemyHurt(enemy,10);assert.equal(pl._megaEnergy,2,'no menu charge');
});
test('phase3 build pipeline wires real Enemy.hurt hit credit and does not write save currency',()=>{
 const patcher=read('scripts/patch-ui-phase3-mega.cjs');
 assert.match(patcher,/onEnemyHurt/);
 assert.match(patcher,/js\/entities\/enemy\.js/);
 const source=read('src/pkmsvv-mega-phase3.js');
 assert.match(source,/REUSE_COOLDOWN=200/);
 assert.doesNotMatch(source,/G\.DB\.commit\(|megaStones\[.*\]=\s*100/);
});

test('Phase 3 never double-ticks the independent Mega Lucario BETA timer',()=>{
 const {lib,pl}=setup();
 pl._megaActive=true;pl._megaPhase3Backup=null;pl._megaRemaining=25;
 lib.tick(pl,5);
 assert.equal(pl._megaRemaining,25,'separate Lucario BETA module owns its timer');
});

test('QA4 preview never grants permanent unlocks and remains isolated to imported private art',()=>{
 const {lib,G,s,pl,forms}=setup();
 const f=forms.find(x=>x.key==='dragonitemega');
 assert.ok(f);s.owned={};s.megaStones={};s.pkmsvvChapter7Seen=false;
 assert.equal(lib.isUnlocked(f),false);
 f.artReady=true;f.qa4dir=true;
 G.SPRITE_META[f.spriteId]={a:{Idle:{}},sh:true,sa:{Idle:{}}};
 G.PKMSVV_MEGA_4DIR_QA={enabled:false,forms:[f.key]};
 assert.equal(lib.isUnlocked(f),false,'disabled flag cannot bypass gates');
 G.PKMSVV_MEGA_4DIR_QA.enabled=true;
 assert.equal(lib.privateQaPreview(f),true);
 assert.equal(lib.isUnlocked(f),true,'visible only with authenticated isolated PC QA flag');
 assert.equal(lib.isBattleReady(f),true,'QA sprite can be tested without story flags');
 pl.dex=f.dex;
 assert.equal(lib.eligible(),true,'PC QA can test when energy reaches 100%');
 assert.equal(lib.activate(pl),true,'PC QA Mega transformation starts');
 lib.tick(pl,30);
 assert.equal(pl._megaCooldownRemaining,200);
 assert.equal(s.pkmsvvChapter7Seen,false);
 assert.equal(s.owned[f.dex],undefined);
 assert.equal(s.megaStones[f.stoneKey],undefined,'QA never grants a permanent stone');
 G.PKMSVV_MEGA_4DIR_QA.enabled=false;
 assert.equal(lib.privateQaPreview(f),false);
 assert.equal(lib.isUnlocked(f),false,'ordinary release keeps story and stone gates');
});

test('Mega hotkey uses remappable Digit5 or controller action without hard-coded M',()=>{
 const phase=read('src/pkmsvv-mega-phase3.js'),lucario=read('src/pkmsvv-mega-lucario.js');
 const keymap=read('scripts/patch-keybind-title.cjs'),pad=read('scripts/patch-v14-gamepad-orbs.cjs');
 assert.match(keymap,/mega:'digit5',orb:'digit4'/);
 assert.match(pad,/orbital\.mega/);
 for(const source of [phase,lucario]){
  assert.ok(source.includes("G.Input?.tap?.('digit5')"));
  assert.ok(source.includes("G.Input?.tap?.('pkmsvv-mega')"));
  assert.doesNotMatch(source,/event\.key.*!==\s*'m'/);
 }
});
