'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function setup(){
 const elements=new Map();
 function element(tag){
  const e={tagName:String(tag).toUpperCase(),children:[],disabled:false,hidden:false,className:'',style:{},
   textContent:'',onclick:null,
   append(...items){for(const x of items){this.children.push(x);if(x.id)elements.set(x.id,x);}},
   replaceChildren(...items){this.children=[];this.append(...items);},
   after(){},
   setAttribute(){},
   addEventListener(){},
   querySelector(){return null}};
  Object.defineProperty(e,'id',{get(){return e._id},set(v){e._id=v;elements.set(v,e)}});
  Object.defineProperty(e,'innerHTML',{get(){return e._html||''},set(html){
   e._html=html;for(const match of html.matchAll(/id="([^"]+)"/g)){
    if(!elements.has(match[1])){const v=element('button');v.id=match[1];}
   }
  }});
  return e;
 }
 const document={readyState:'loading',body:{append(){}},createElement:element,
  addEventListener(){},querySelector(){return null},getElementById:id=>elements.get(id)||null};
 let playing='ui',player={dead:false,x:0,y:0,dex:25};
 const save={partner:25,pkmsvvChapter3Seen:true,pkmsvvChapter5Seen:true,
  pkmsvvChapter6Seen:true,tickets:{t1:2,t10:1},coins:20,arenas:{}};
 const G={DB:{save,commit(){this.saved=(this.saved||0)+1}},I18n:{lang:'vi'},
  UI:{toast(){}},DEX_BY:new Proxy({}, {get(target,dex){return {dex:Number(dex),name:'Pokémon '+dex}}}),
  Game:{get player(){return player},get state(){return playing},startRun(){playing='playing';},toUI(){playing='ui';}},
  Flow:{goMenu(){this.gone=(this.gone||0)+1}},
  Enemy:class{constructor(def){this.dex=def.dex;this.dead=false;this.boss=true}},
  EnemyMgr:{add(e){this.last=e;return e}},Coop:{active:false}};
 vm.runInNewContext(read('src/pkmsvv-champion-arena.js'),{G,document,Math});
 return {G,save,lib:G.PKMSVVChampionArena,document,player,get:id=>elements.get(id)};
}
test('Ten original regional Champions, sixteen entrants and three-minute preparation',()=>{
 const {lib}=setup();
 assert.equal(lib.REGIONS.length,10);
 assert.equal(lib.PREP_SECONDS,180);
 assert.equal(lib.FIGHT_SECONDS,150);
 assert.equal(lib.ROUNDS.length,5);
 const draw=lib.makeBracket(()=>.5);
 assert.equal(draw.length,16);assert.equal(draw.filter(p=>p.id==='you').length,1);
 assert.equal(draw.filter(p=>p.tier==='elite').length,2,'at least 2 strong AI guaranteed');
 assert.equal(new Set(draw.map(p=>p.id)).size,16);
});
test('Four REAL boss kills give a tournament cup; only fifth Champion kill gives seal',()=>{
 const h=setup(),{G,save,lib}=h;
 assert.equal(lib.start(),true);
 assert.equal(lib.round,0);
 assert.equal(lib.stage,'fight');
 assert.equal(save.tickets.t1,2);
 // Never advance a round until the actual enemy is dead.
 lib.update(0.1);assert.equal(lib.round,0);
 for(let round=0;round<4;round++){
  assert.equal(lib.round,round);
  G.EnemyMgr.last.dead=true;
  lib.update(.1);
  assert.equal(lib.round,round+1);
  assert.equal(lib.stage,'prep');
  if(round<3){assert.equal(lib.nextDuel(),true);}
 }
 const book=lib.ledger(save);
 assert.equal(book.trophies.Kanto,true);
 assert.equal(book.seals.Kanto,undefined);
 assert.equal(save.tickets.t1,12,'winner gets 10 yellow tickets exactly once');
 assert.equal(save.tickets.t10,1,'purple tickets are untouched');
 assert.equal(lib.nextDuel(),true);
 assert.equal(lib.round,4);
 assert.equal(save.arenas.pkmChampion.seals.Kanto,undefined);
 G.EnemyMgr.last.dead=true;
 lib.update(.1);
 assert.equal(book.seals.Kanto,true);
 assert.equal(lib.active,false);
 assert.equal(G.Flow.gone,1);
 assert.equal(save.tickets.t1,12,'no second first-place payout after Champion');
});
test('Lose round 16: no false cup/seal, participant PokéCoins once',()=>{
 const h=setup(),{lib,player,save}=h;
 lib.start();player.dead=true;lib.update(.1);
 assert.equal(lib.active,false);
 assert.equal(save.arenas.pkmChampion.trophies.Kanto,undefined);
 assert.equal(save.arenas.pkmChampion.seals.Kanto,undefined);
 assert.equal(save.tickets.t1,2);
 assert.equal(save.coins,140);
});
test('Claiming Champion seal without an earned tournament cup is impossible',()=>{
 const {lib,save}=setup();
 lib.claimSeal();
 assert.equal(save.arenas.pkmChampion.seals.Kanto,undefined);
 lib.ledger(save).trophies.Kanto=true;
 lib.claimSeal();
 assert.equal(save.arenas.pkmChampion.seals.Kanto,true);
});
test('Narrative chapters are renumbered visibly, with old save keys and reward slots stable',()=>{
 const s=read('src/pkmsvv-story.js');
 for(const t of ['CHƯƠNG 1 · THỨC TỈNH','CHƯƠNG 2 · NHỮNG MẢNH KÝ ỨC',
  'CHƯƠNG 3 · TIẾNG VỌNG THỨ TÁM','CHƯƠNG 4 · MẦM SỐNG BỊ LÃNG QUÊN',
  'CHƯƠNG 5 · ĐỒNG HÀNH','CHƯƠNG 6 · ĐẤU TRƯỜNG VƯƠNG MIỆN'])
  assert.ok(s.includes(t),t);
 assert.match(s,/pkmsvvChapter5Seen/);assert.match(s,/pkmsvvChapter6Seen/);
 assert.match(s,/pkmsvvChapterPurpleRewards/);
 assert.match(s,/pkmsvvChapter1Seen/);
 assert.match(read('scripts/prepare-game.cjs'),/patch-champion-arena\.cjs/);
 const game=path.join(root,'vendor','pokesurvivor');
 if(fs.existsSync(path.join(game,'dev.html'))){
  const html=fs.readFileSync(path.join(game,'dev.html'),'utf8');
  assert.match(html,/js\/ui\/pkmsvv-champion-arena\.js/);
  assert.match(fs.readFileSync(path.join(game,'js','ui','pkmsvv-champion-arena.js'),'utf8'),/guardUpdate\(G\.EnemyMgr,'update'/);
 }
});
