'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function setup(){
 const forms=[
 {name:'Charizard-Mega-X',key:'charizardmegax',stone:'Charizardite X',stoneKey:'charizarditex',storyLocked:false},
 {name:'Lucario-Mega',key:'lucariomega',stone:'Lucarionite',stoneKey:'lucarionite',storyLocked:false},
 {name:'Mewtwo-Mega-X',key:'mewtwomegax',stone:'Mewtwonite X',stoneKey:'mewtwonitex',storyLocked:true},
 {name:'Rayquaza-Mega',key:'rayquazamega',stone:null,stoneKey:null,storyLocked:true}];
 const save={pkmsvvChapter7Seen:true,megaStones:{},arenaGacha:{points:500,pity:0,pulls:0,championPaid:{}}};
 const G={DB:{save,commit(){this.commits=(this.commits||0)+1}},PKMSVV_MEGA_CATALOG:forms,
  I18n:{lang:'vi'},UI:{toast(){}},Audio:{sfx(){}}};
 const document={readyState:'loading',addEventListener(){}};
 vm.runInNewContext(read('src/pkmsvv-mega-gacha.js'),{G,document});
 return {G,save,gacha:G.PKMSVVMegaGacha};
}
test('Arena Gacha is separate: 100 points, base 1.5% legendary, 30 roll guaranteed',()=>{
 const {gacha}=setup();
 assert.equal(gacha.COST,100);assert.equal(gacha.LEGEND_RATE,.015);
 assert.equal(gacha.LEGEND_PITY,30);
 assert.ok(read('src/pkmsvv-mega-gacha.js').includes('pkmsvv-gacha-tab-pokemon'));
 assert.ok(read('src/pkmsvv-mega-gacha.js').includes('pkmsvv-gacha-tab-mega'));
});
test('Champion grants exactly one Mega spin per new regional Seal, not for repeated claims',()=>{
 const {save,gacha}=setup();
 save.arenaGacha.points=0;
 assert.equal(gacha.grantChampion(save,'Kanto'),100);
 assert.equal(gacha.grantChampion(save,'Kanto'),0);
 assert.equal(gacha.grantChampion(save,'Hoenn'),100);
 assert.equal(gacha.balance(save),200);
 assert.equal(Object.keys(save.arenaGacha.championPaid).length,2);
});
test('Real Arena tournament rewards, repeat champions and no participation exploit',()=>{
 const {save,gacha}=setup();save.arenaGacha.points=0;
 assert.equal(gacha.grantTournament(save,'Kanto',1,true),40);
 assert.equal(gacha.grantTournament(save,'Kanto',1,false),20);
 assert.equal(gacha.grantTournament(save,'Kanto',2,false),10);
 assert.equal(gacha.grantTournament(save,'Kanto',3,false),5);
 assert.equal(gacha.grantTournament(save,'Kanto',9,false),0);
 assert.equal(gacha.balance(save),75);
});
test('Pull costs exactly 100, cannot bypass Chapter 7 or grant Pokémon/story',()=>{
 const {G,save,gacha}=setup();
 save.pkmsvvChapter7Seen=false;
 const initial=JSON.stringify(save);
 assert.equal(gacha.pull(save,()=>0),null);
 assert.equal(JSON.stringify(save),initial);
 save.pkmsvvChapter7Seen=true;
 const rare=gacha.pull(save,()=>0);
 assert.equal(rare.legendary,true);
 assert.equal(rare.stone,'Mewtwonite X');
 assert.equal(gacha.balance(save),400);
 assert.equal(save.megaStones.mewtwonitex,1);
 assert.equal(save.owned,undefined,'never grant the original Pokémon');
 assert.equal(save.megaStoryCleared,undefined,'never bypass legendary quest');
 assert.equal(G.DB.commits,1);
 save.arenaGacha.points=99;
 assert.equal(gacha.pull(save,()=>0),null);
 assert.equal(save.arenaGacha.points,99);
});
test('Missing-stone-only draw never gives a duplicate or the no-stone Rayquaza form',()=>{
 const {save,gacha}=setup();
 let r=gacha.pull(save,()=>.4);
 assert.equal(r.name,'Charizard-Mega-X');
 r=gacha.pull(save,()=>.4);
 assert.equal(r.name,'Lucario-Mega');
 assert.ok(!gacha.pool(save,false).length);
 r=gacha.pull(save,()=>.4);
 assert.equal(r.name,'Mewtwo-Mega-X');
 assert.equal(r.legendary,true);
 assert.equal(gacha.pool(save,true).length,0);
 const remaining=save.arenaGacha.points;
 assert.equal(gacha.pull(save,()=>0),null);
 assert.equal(save.arenaGacha.points,remaining);
});
test('Legendary pity triggers on pull 30 and resets on a true legendary stone',()=>{
 const {save,gacha}=setup();
 save.arenaGacha.pity=28;
 let r=gacha.pull(save,()=>.5);
 assert.equal(r.legendary,false);
 assert.equal(save.arenaGacha.pity,29);
 r=gacha.pull(save,()=>.5);
 assert.equal(r.legendary,true);
 assert.equal(save.arenaGacha.pity,0);
 assert.equal(save.arenaGacha.pulls,2);
});
test('Legacy Pokémon ticket Gacha no longer grants random Mega Stones',()=>{
 const phase=read('src/pkmsvv-mega-phase3.js');
 assert.doesNotMatch(phase,/G\.Gacha\.pull\s*=\s*function/);
 assert.match(read('scripts/patch-champion-arena.cjs'),/pkmsvv-mega-gacha\.js/);
 assert.match(read('scripts/patch-champion-arena.cjs'),/pkmsvv-mega-gacha\.css/);
 const runtime=read('src/pkmsvv-champion-arena.js');
 assert.match(runtime,/G\.PKMSVVMegaGacha\?\.grantTournament/);
 assert.match(runtime,/G\.PKMSVVMegaGacha\?\.grantChampion/);
});
test('Prepared offline bundle loads physical Mega machine without network and outside Pokémon Gacha',()=>{
 const base=path.join(root,'vendor','pokesurvivor');
 if(!fs.existsSync(path.join(base,'dev.html')))return;
 const html=fs.readFileSync(path.join(base,'dev.html'),'utf8');
 assert.match(html,/js\/ui\/pkmsvv-mega-gacha\.js/);
 assert.ok(html.indexOf('pkmsvv-mega-phase3.js')<html.indexOf('pkmsvv-mega-gacha.js'));
 assert.ok(html.indexOf('pkmsvv-mega-gacha.js')<html.indexOf('pkmsvv-champion-arena.js'));
 assert.ok(fs.statSync(path.join(base,'js','ui','pkmsvv-mega-gacha.js')).size>1000);
});
