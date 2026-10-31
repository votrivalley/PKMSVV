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
   chapter7(){save.pkmsvvChapter7Seen=true;save.pkmsvvChapter7Pending=false;return true;},
   onChampionSeal(){save.pkmsvvChapter7Seen=true;return true;},
   tenChampionCompleted(){return Object.values(save.arenas?.pkmChampion?.seals||{}).filter(Boolean).length===10;}
  },
  Enemy:class{constructor(def){this.dex=def.dex;this.dead=false;this.boss=true;this.maxHp=def.hp;this.hp=def.hp}},
  EnemyMgr:{add(e){this.last=e;return e},clear(){this.clears=(this.clears||0)+1}},
  Spawner:{update(){}},World:{setArena(a){this.arena=a}},
  Projectiles:{clear(){}},Pickups:{clear(){}},Hazards:{clear(){}},
  FX:{burst(){}},Coop:{active:false}};
 vm.runInNewContext(read('src/pkmsvv-champion-arena.js'),{G,document,Math});
 return {G,save,lib:G.PKMSVVChampionArena,document,player,get:id=>elements.get(id)};
}
test('Champion stage transitions clear cached arena tiles and never set Arena on opponent preview',()=>{
 const source=read('scripts/patch-champion-arena.cjs');
 assert.match(source,/formerArena=arena/);
 assert.match(source,/zone=a\|\|formerArena/);
 const runtime=read('src/pkmsvv-champion-arena.js');
 const preview=runtime.slice(runtime.indexOf('function revealUpcoming()'),runtime.indexOf('function spawnPrepBoss()'));
 assert.doesNotMatch(preview,/setArena\?\.\(/);
 assert.ok(runtime.includes("'Vòng sơ kết'"));
});
test('Ten distinct regional map rules and post-campaign random map gate',()=>{
 const {lib,save}=setup();
 assert.equal(lib.REGION_THEMES.length,10);
 assert.equal(new Set(lib.REGION_THEMES).size,10);
 for(const theme of lib.REGION_THEMES){
  const effect=lib.MAP_EFFECTS[theme];
  assert.ok(effect?.name&&effect.hint,theme);
  assert.ok(Number.isFinite(effect.atk)&&Number.isFinite(effect.spd),theme);
 }
 assert.equal(lib.storyCompleted(save),false);
 const book=lib.ledger(save);
 for(const [region] of lib.REGIONS)book.seals[region]=true;
 assert.equal(lib.storyCompleted(save),true);
});
test('Ten Champions, sixteen entrants, 4m opener and 1m30 later preparation',()=>{
 const {lib}=setup();
 assert.equal(lib.REGIONS.length,10);
 assert.equal(lib.PREP_SECONDS,90);
 assert.equal(lib.FIRST_PREP_SECONDS,240);
 assert.equal(lib.FIGHT_SECONDS,120);
 assert.equal(lib.WARN_SECONDS,15);
 assert.equal(lib.ROUNDS.length,5);
 const draw=lib.makeBracket(()=>.5);
 assert.equal(draw.length,16);assert.equal(draw.filter(p=>p.id==='you').length,1);
 assert.equal(draw.filter(p=>p.tier==='elite').length,2,'at least 2 strong AI guaranteed');
 assert.equal(new Set(draw.map(p=>p.id)).size,16);
});
test('Champion starts with four-minute opener and first Crown Seal unlocks Mega after four real fights',()=>{
 const h=setup(),{lib,G,save}=h;
 assert.equal(lib.start(),true);assert.equal(lib.stage,'prep');
 for(let round=0;round<4;round++){
  assert.equal(lib.round,round);assert.equal(lib.stage,'prep');
  assert.equal(lib.nextDuel(),true);
  assert.equal(lib.stage,'fight');assert.equal(G.EnemyMgr.last.maxHp,320+5*round);
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
test('Rayquaza Sky fight unlocks only at ten real Champion seals and finishes only after Rayquaza dies',()=>{
 const {lib,save,G}=setup();
 assert.equal(lib.startSky(),false,'nine or fewer seals cannot start the finale');
 const book=lib.ledger(save);
 for(const [region] of lib.REGIONS)book.seals[region]=true;
 assert.equal(lib.startSky(),true);
 assert.equal(lib.stage,'sky');
 assert.equal(G.EnemyMgr.last.dex,384);
 assert.equal(save.pkmsvvRayquazaDefeated,undefined);
 G.EnemyMgr.last.dead=true;
 lib.update(.1);
 assert.equal(save.pkmsvvRayquazaDefeated,true,'must kill Rayquaza actor');
 assert.equal(lib.active,false);
 assert.equal(G.World.arena,null,'return to ordinary map');
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
  'CHƯƠNG 5 · ĐỒNG HÀNH','CHƯƠNG 7 · ĐẤU TRƯỜNG VƯƠNG MIỆN',
  'CHƯƠNG 8 · SỨC MẠNH MEGA'])
  assert.ok(s.includes(t),t);
 assert.match(s,/pkmsvvChapter5Seen/);assert.match(s,/pkmsvvChapter6Seen/);
 assert.match(s,/pkmsvvChapterPurpleRewards/);
 assert.match(s,/Chương 6 · Bí Mật Berry/);
 assert.match(s,/berryChapter/);
 assert.match(s,/pkmsvvBerryChapterDone/);
 assert.match(s,/pkmsvvChapter1Seen/);
 assert.match(read('scripts/prepare-game.cjs'),/patch-champion-arena\.cjs/);
 const game=path.join(root,'vendor','pokesurvivor');
 if(fs.existsSync(path.join(game,'dev.html'))){
  const html=fs.readFileSync(path.join(game,'dev.html'),'utf8');
  assert.match(html,/js\/ui\/pkmsvv-champion-arena\.js/);
  assert.match(fs.readFileSync(path.join(game,'js','ui','pkmsvv-champion-arena.js'),'utf8'),/guardUpdate\(G\.EnemyMgr,'update'/);
 }
});

test('Arena preparation doubles mobs and XP but preserves native duel maps',()=>{
 for(const p of ['src/pkmsvv-arena-solo.js','src/pkmsvv-champion-arena.js']){
  const source=read(p);
  assert.match(source,/FARM_SPAWN_MULT=2,FARM_XP_MULT=2/);
  assert.match(source,/dropXp/);
  assert.match(source,/type:(duelType|surfaceType)/);
  const mapTypes=source.match(/DUEL_TYPES=\[([^\]]+)\]/);
  assert.ok(mapTypes,'1v1 maps must be selected from engine-owned biomes');
  assert.equal(mapTypes[1].split(',').length,6,'exactly six varied neutral duel arenas');
 }
});
test('Story Crown Journey unlocks regions only after previous seals while preserving old wins',()=>{
 const {lib,save}=setup();
 assert.equal(lib.regionUnlocked(0),true);
 assert.equal(lib.regionUnlocked(1),false);
 assert.equal(lib.regionUnlocked(9),false);
 save.arenas={pkmChampion:{trophies:{Johto:true},seals:{Johto:true}}};
 assert.equal(lib.regionUnlocked(1),true,'grandfather genuinely earned Johto seal');
 assert.equal(lib.regionUnlocked(2),false,'future region still blocked');
 for(const [name] of lib.REGIONS)save.arenas.pkmChampion.seals[name]=true;
 assert.equal(lib.storyCompleted(),true);
});
test('Bracket randomizes human and includes exactly two strong AI',()=>{
 const {lib}=setup();
 const participants=lib.makeBracket(()=>.37);
 assert.equal(participants.length,16);
 assert.equal(participants.filter(p=>p.tier==='elite').length,2);
 assert.equal(participants.filter(p=>p.id==='you').length,1);
 assert.notEqual(participants[0].id,'you','player position must not be fixed to slot one');
});
test('Podium appears only for final results and clears when Arena is reopened',()=>{
 const {lib,get}=setup();lib.open();
 lib.renderPodium([{dex:25,name:'Trainer A'}]);
 assert.equal(get('pkmsvv-champion-podium').hidden,false);
 lib.open();
 assert.equal(get('pkmsvv-champion-podium').hidden,true);
});
test('League stays locked until all ten seals; AI-only league does not award new story seals',()=>{
 const {lib,save,G,get}=setup();
 lib.open();
 assert.equal(get('pkmsvv-arena-mode-league').disabled,true);
 const book=lib.ledger(save);for(const [name] of lib.REGIONS)book.seals[name]=true;
 lib.open();assert.equal(get('pkmsvv-arena-mode-league').disabled,false);
 get('pkmsvv-arena-mode-league').onclick();
 assert.equal(lib.start(),true);assert.equal(lib.stage,'prep');
 const count=Object.values(book.seals).filter(Boolean).length;
 for(let r=0;r<4;r++){lib.nextDuel();G.EnemyMgr.last.dead=true;lib.update(.1);}
 assert.equal(Object.values(book.seals).filter(Boolean).length,count);
 assert.equal(book.history.length,0,'AI-only league must not rewrite earned story titles');
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

test('unreleased regional Champion Mega art uses real stand-in Pokémon, then true sprite when imported',()=>{
 const {lib,G}=setup();
 assert.equal(lib.MEGA_KEYS.length,10);
 assert.equal(lib.regionChampion(1).dex,248,'Johto uses Tyranitar before Mega Scizor art');
 assert.equal(lib.regionChampion(2).dex,282,'Hoenn uses Gardevoir before Mega Gardevoir');
 assert.equal(lib.regionChampion(9).dex,359,'Votri Valley uses Absol before Mega Absol');
 G.PKMSVV_MEGA_CATALOG=[{key:'absolmega',dex:359,artReady:true,spriteId:10359}];
 G.SPRITE_META={10359:{a:{Idle:{}}}};
 assert.equal(lib.regionChampion(9).dex,359,'new Mega Absol sprite restores Votri Valley Champion');
 assert.equal(lib.regionChampion(9).spriteId,10359);
 assert.equal(lib.regionChampion(9).temporary,true,'replacement stays marked temporary');
 assert.equal(lib.regionChampion(1).temporary,true);
});

test('Champion opens after 4m with bosses at 1m30 and 3m; later rounds at 1m30',()=>{
 const {G,lib,get}=setup(),alerts=[];
 G.UI.toast=(message)=>alerts.push(message);
 assert.equal(lib.start(),true);
 assert.equal(lib.prepSeconds(),240);
 G.Enemies={BOSSES:[{dex:25,name:'Pikachu',hp:300},{dex:6,name:'Charizard',hp:600}],bossScale(){return {hp:1,dmg:1,spd:1}}};
 lib.update(89);assert.equal(lib.stage,'prep');
 lib.update(1);assert.equal(G.EnemyMgr.last._pkmsvvChampionPrepBoss,1);
 lib.update(89);assert.equal(lib.stage,'prep');
 lib.update(1);assert.equal(G.EnemyMgr.last._pkmsvvChampionPrepBoss,2);
 lib.update(0);
 assert.equal(lib.stage,'prep');
 assert.equal(G.World.arena,null,'opening farms on ordinary map');
 lib.update(1);
 assert.equal(lib.stage,'prep');
 assert.equal(G.World.arena,null,'opponent preview does not leave regular farming world');
 assert.equal(get('pkmsvv-champion-preview').hidden,false);
 assert.ok(alerts.some(m=>m.includes('Đối thủ xuất hiện')));
 lib.update(45);
 assert.ok(alerts.some(m=>m.includes('15 giây')));
 lib.update(15);
 assert.equal(lib.stage,'fight');
 assert.equal(get('pkmsvv-champion-preview').hidden,true);
 G.EnemyMgr.last.dead=true;lib.update(.1);
 assert.equal(lib.round,1);assert.equal(lib.stage,'prep');
 assert.equal(G.World.arena,null,'winner exits duel to ordinary farming map');
 assert.equal(lib.prepSeconds(),90);
 lib.update(59.9);
 assert.equal(G.World.arena,null);
 lib.update(.1);
 assert.equal(G.World.arena,null,'later preview stays on regular map too');
 lib.update(15);
 assert.ok(alerts.filter(m=>m.includes('15 giây')).length>=2);
 lib.update(15);
 assert.equal(lib.stage,'fight');
});
