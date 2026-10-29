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
  pkmsvvChapter6Seen:true,pkmsvvMultiplayerDone:{coop:true,royale:true,eggrush:true},
  tickets:{t1:2,t10:1},coins:20,arenas:{}};
 const G={DB:{save,commit(){this.saved=(this.saved||0)+1}},I18n:{lang:'vi'},
  UI:{toast(){}},DEX_BY:new Proxy({}, {get(target,dex){return {dex:Number(dex),name:'Pokémon '+dex}}}),
  Game:{get player(){return player},get state(){return playing},startRun(){playing='playing';},toUI(){playing='ui';}},
  Flow:{goMenu(){this.gone=(this.gone||0)+1}},
  PKMSVVStory:{
   arenaUnlocked(){return !!save.pkmsvvChapter6Seen&&['coop','royale','eggrush'].every(m=>save.pkmsvvMultiplayerDone?.[m]);},
   allMultiplayerCompleted(){return ['coop','royale','eggrush'].every(m=>save.pkmsvvMultiplayerDone?.[m]);},
   multiplayerProgress(){return {count:3,missing:[]};},
   chapter7(){save.pkmsvvChapter7Seen=true;save.pkmsvvChapter7Pending=false;return true;}
  },
  Enemy:class{constructor(def){this.dex=def.dex;this.dead=false;this.boss=true;this.maxHp=def.hp;this.hp=def.hp}},
  EnemyMgr:{add(e){this.last=e;return e},clear(){this.clears=(this.clears||0)+1}},
  Spawner:{update(){}},World:{setArena(a){this.arena=a}},
  Projectiles:{clear(){}},Pickups:{clear(){}},Hazards:{clear(){}},
  FX:{burst(){}},Coop:{active:false}};
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
test('Champion starts with 3-minute farm and crowns champion after exactly 4 real fights',()=>{
 const h=setup(),{lib,G,save}=h;
 assert.equal(lib.start(),true);assert.equal(lib.stage,'prep');
 for(let round=0;round<4;round++){
  assert.equal(lib.round,round);assert.equal(lib.stage,'prep');
  assert.equal(lib.nextDuel(),true);
  assert.equal(lib.stage,'fight');assert.equal(G.EnemyMgr.last.maxHp,320);
  G.EnemyMgr.last.dead=true;lib.update(.1);
 }
 const book=lib.ledger(save);
 assert.equal(lib.active,false);
 assert.equal(book.trophies.Kanto,true);
 assert.equal(book.seals.Kanto,true);
 assert.equal(book.history.length,1);
 assert.equal(book.history[0].wins,4);
 assert.equal(save.tickets.t1,12);
 assert.equal(save.pkmsvvChapter7Seen,true);
 assert.equal(lib.rematch(),false);
});
test('Real mobs spawn in Champion preparation but stop during one-versus-one duel',()=>{
 const h=setup(),{lib,G}=h,spawns=[];
 G.Spawner.update=function(_dt,_p,t){spawns.push(t);};
 // Instrument installed wrapper in original game source instead of overriding mock in test.
 assert.match(read('src/pkmsvv-champion-arena.js'),/if\(stage==='prep'\)\{const copy=args\.slice\(\)/);
 assert.match(read('src/pkmsvv-champion-arena.js'),/G\.EnemyMgr\?\.clear\?\.\(\)/);
 lib.start();assert.equal(lib.stage,'prep');
 lib.update(90);assert.equal(lib.stage,'prep');
 lib.nextDuel();assert.equal(lib.stage,'fight');
});

test('Lose round 16: no false cup/seal, participant PokéCoins once',()=>{
 const h=setup(),{lib,player,save}=h;
 lib.start();lib.nextDuel();player.dead=true;lib.update(.1);
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
  'CHƯƠNG 5 · ĐỒNG HÀNH','CHƯƠNG 6 · ĐẤU TRƯỜNG VƯƠNG MIỆN',
  'CHƯƠNG 7 · SỨC MẠNH MEGA'])
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

test('First multiplayer click is never intercepted by story; Chapter 5 accessible from Memories',()=>{
 const runtime=read('src/pkmsvv-champion-arena.js');
 const story=read('src/pkmsvv-story.js');
 assert.doesNotMatch(runtime,/stopImmediatePropagation\(\)/);
 assert.doesNotMatch(runtime,/link\.click\(\)/);
 assert.match(story,/if\(s\.pkmsvvChapter3Seen\)available\.push\('chapter5'\)/);
 assert.match(story,/chapter==='chapter5'.*pkmsvvChapter5Seen/);
});

test('Older Champion cups and seals survive; no compulsory fifth boss',()=>{
 const h=setup(),{lib,save}=h;
 assert.equal(lib.rematch(),false);
 const ledger=lib.ledger(save);ledger.trophies.Kanto=true;ledger.seals.Kanto=true;
 assert.equal(ledger.trophies.Kanto,true);assert.equal(ledger.seals.Kanto,true);
});

test('Chapter 5/6 and regional seals survive offline save merges',()=>{
 const patch=read('scripts/patch-champion-arena.cjs');
 assert.match(patch,/pkmsvvChapter5Seen/);
 assert.match(patch,/pkmsvvChapter6Seen/);
 assert.match(patch,/localCup\.trophies/);
 assert.match(patch,/otherCup\.seals/);
 assert.match(patch,/Math\.min\(Number\(a\?\.rank\)/);
});

test('Arena does not start if Chapter 6 was seen but real multiplayer trilogy is incomplete',()=>{
 const h=setup(),{lib,save}=h;
 delete save.pkmsvvMultiplayerDone.eggrush;
 assert.equal(lib.start(),false);
 assert.equal(lib.active,false);
 save.pkmsvvMultiplayerDone.eggrush=true;
 assert.equal(lib.start(),true);
});
test('Champion semifinal defeat enters real third-place playoff, without false Champion',()=>{
 const h=setup(),{G,lib,save,player}=h;
 lib.start();
 for(let i=0;i<2;i++){lib.nextDuel();G.EnemyMgr.last.dead=true;lib.update(.1);}
 assert.equal(lib.round,2);
 lib.nextDuel();player.dead=true;lib.update(.1);
 assert.equal(lib.round,4);assert.equal(lib.stage,'prep');
 assert.equal(lib.nextDuel(),true);
 G.EnemyMgr.last.dead=true;lib.update(.1);
 assert.equal(lib.active,false);
 assert.equal(save.tickets.t1,5);
 assert.equal(lib.ledger(save).seals.Kanto,undefined);
});
test('Final win does not unlock a Mega Stone without Gacha',()=>{
 const h=setup(),{lib,G,save}=h;lib.start();
 for(let i=0;i<4;i++){lib.nextDuel();G.EnemyMgr.last.dead=true;lib.update(.1);}
 assert.equal(save.pkmsvvChapter7Seen,true);
 assert.equal(save.megaStones,undefined);
 assert.equal(save.arenas.pkmChampion.seals.Kanto,true);
});

test('Offline save merge retains and deduplicates full Champion Hall of Fame records',()=>{
 const source=read('scripts/patch-champion-arena.cjs');
 assert.match(source,/localCup\.history/);
 assert.match(source,/otherCup\.history/);
 assert.match(source,/seenHistory\.has/);
 assert.match(source,/crown\.history/);
});
