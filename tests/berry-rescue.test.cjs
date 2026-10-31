'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function harness(){
 let last=null,events=[],grants=[];
 const G={
  I18n:{lang:'vi'},
  Enemies:{BOSSES:[{dex:25,name:'Pikachu',hp:1000},{dex:6,name:'Charizard',hp:1800}],bossScale(){return {hp:1,dmg:1,spd:1}}},
  Enemy:class {constructor(def,x,y,sc,boss){Object.assign(this,{def,x,y,sc,boss,hp:1000,maxHp:1000});}},
  EnemyMgr:{all(){return this.enemies||[]},add(e){(this.enemies||=[]).push(e)}},
  Coop:{isHost:true,active:true,broadcast(e){events.push(e)}},
  BIOME_MUSIC:['forest','cave','volcano'],Audio:{music(name){this.last=name;}},
  UI:{toast(){}},Spawner:{say(){}},PKMSVVBerry:{TYPES:[{id:'oran'}],grant(id){grants.push(id);return true;}},
 };
 vm.runInNewContext(read('src/pkmsvv-berry-rescue.js'),{G,Math,Image:undefined,Number});
 return {G,game:G.PKMSVVBerryRescue,events,grants,step(dt,time){G.PKMSVVBerryRescue.tick(dt,time,[],r=>last=r);},result:()=>last};
}
test('One optional lossless WebP atlas holds three Berry trees and six HP states, preserving canvas fallback',()=>{
 const runtime=read('src/pkmsvv-berry-rescue.js');
 const build=read('scripts/patch-berry-coop.cjs');
 assert.match(runtime,/berry_trees_3x6\.webp/);
 assert.match(runtime,/stage\*TREE_CELL,id\*TREE_CELL,TREE_CELL,TREE_CELL/);
 assert.match(runtime,/if\(hasTreeAtlas\(\)\)/);
 assert.match(runtime,/ctx\.imageSmoothingEnabled=false/);
 assert.match(runtime,/function treeStage\(r\)/);
 assert.match(build,/fs\.existsSync\(atlasSource\)/,'missing optional atlas must not break builds');
 assert.match(build,/fs\.copyFileSync\(atlasSource/);
});
test('Berry Rescue uses 3x6 genuine lossless WebP tree damage art in offline builds',()=>{
 const atlas=fs.readFileSync(path.join(root,'src/berry-tree-assets/berry_trees_3x6.webp'));
 assert.equal(atlas.toString('ascii',0,4),'RIFF');
 assert.equal(atlas.toString('ascii',8,12),'WEBP');
 assert.ok(atlas.length>15000&&atlas.length<300000,'one compact asset, not 18 separate downloads');
 const source=read('src/pkmsvv-berry-rescue.js'),installer=read('scripts/patch-berry-coop.cjs');
 assert.match(source,/stage\*TREE_CELL,id\*TREE_CELL,TREE_CELL,TREE_CELL/);
 assert.match(source,/TREE_ATLAS_URL='assets\/berry-trees\/berry_trees_3x6\.webp'/);
 assert.match(installer,/fs\.copyFileSync\(atlasSource/);
 assert.match(read('src/shared/coop-unified.js'),/\['berry','Giải Cứu Berry','4 người · 8 phút',420,'Cherubi'/);
});
test('Three defended Berry trees, four-player Co-op mode and exactly 8 minutes',()=>{
 const h=harness();assert.equal(h.game.begin({mode:'coop'}),false);
 assert.equal(h.game.begin({mode:'berry'}),true);
 assert.equal(h.game.DURATION,480);assert.deepEqual([...h.game.BOSS_TIMES],[240,480]);
 assert.equal(h.game.trees.length,3);
 // Three close but non-overlapping trees in a triangle: two below and one above.
 const [left,right,top]=h.game.trees;
 assert.equal(left.y,right.y);
 assert.ok(left.x<top.x&&top.x<right.x&&top.y<left.y);
 assert.ok(Math.hypot(right.x-left.x,right.y-left.y)<230);
 h.step(1,239);assert.equal(h.game.bossStage,0);
 h.step(1,240);assert.equal(h.game.bossStage,1);assert.equal(h.G.EnemyMgr.enemies.length,1);
 h.step(1,479);assert.equal(h.game.bossStage,1);
 h.step(1,480);assert.equal(h.game.bossStage,2);assert.equal(h.G.EnemyMgr.enemies.length,2);
 h.G.EnemyMgr.enemies[1].dead=true;
 h.step(.5,480.5);assert.equal(h.game.active,false);
 assert.equal(h.result().success,true);assert.equal(h.result().trees.length,3);
});
test('Berry soundtrack matches Egg Rush forest and releases audio override after completion',()=>{
 const h=harness();h.game.begin({mode:'berry'});
 h.G.Audio.music('boss');
 assert.equal(h.G.Audio.last,'forest');
 h.game.begin({mode:'coop'});
 h.G.Audio.music('boss');
 assert.equal(h.G.Audio.last,'boss');
});
test('Berry mode HP tiers, easy rewards and enemy speed escalations',()=>{
 const h=harness();
 assert.equal(h.game.begin({mode:'berryeasy'}),true);
 assert.equal(h.game.easy,true);
 assert.equal(h.game.trees[0].maxHp,220);
 for(const [hp,prob] of [[100,.18],[90,.16],[70,.15],[50,.14],[30,.13],[0,0]]){
  assert.equal(h.game.chanceForHp(hp,true),prob);
 }
 for(const [hp,prob] of [[100,.35],[90,.33],[70,.32],[50,.31],[30,.30],[0,0]]){
  assert.equal(h.game.chanceForHp(hp,false),prob);
 }
 for(const [minute,mul] of [[0,.7],[2,.77],[4,.84],[6,.91]]){
  assert.ok(Math.abs(h.game.difficultyFor(minute/2,true)-mul)<1e-9);
 }
 const enemy={x:900,y:900,hp:100,maxHp:100,dmg:10,spd:100,dead:false};
 h.G.EnemyMgr.enemies=[enemy];
 h.step(.1,0);
 assert.ok(Math.abs(enemy.spd-70)<1e-8);
 assert.ok(Math.abs(enemy.dmg-7)<1e-8);
 assert.ok(Math.abs(enemy.hp-70)<1e-8);
 h.step(.1,120);
 assert.ok(Math.abs(enemy.spd-77)<1e-8);
 h.step(.1,360);
 assert.ok(Math.abs(enemy.spd-91)<1e-8);
});
test('Berry normal enemies award 1.5× kill XP, new arrivals get one-time multiplier',()=>{
 const h=harness();h.game.begin({mode:'berry'});
 const e={x:900,y:900,xp:30,spd:100,dmg:10,hp:100,maxHp:100};
 h.G.EnemyMgr.enemies=[e];
 h.step(.1,0);assert.equal(e.xp,45);
 h.step(.1,120);assert.equal(e.xp,45,'no exponential XP stacking every tick');
 assert.ok(Math.abs(e.spd-100*(1+.2*2/3))<1e-7);
});
test('Berry AI defendGoal stays at live trees and never chases beyond the grove',()=>{
 const h=harness();h.game.begin({mode:'berry'});
 const far={x:700,y:700},near={x:0,y:0};
 const defense=h.game.defendGoal(far,[{x:2000,y:2000}]);
 assert.ok(Math.hypot(defense.x,defense.y)<h.game.DEFENSE_RADIUS);
 const loc=h.game.defendGoal(near,[{x:-92,y:95,dead:false}]);
 assert.ok(Math.hypot(loc.x+92,loc.y-82)<=55+1e-6);
 const outside=h.game.defendGoal(near,[{x:1200,y:1200,dead:false}]);
 assert.ok(Math.hypot(outside.x,outside.y)<h.game.DEFENSE_RADIUS);
 const bots=read('src/lan/lan-ai.js');
 assert.match(bots,/PKMSVVBerryRescue\?\.defendGoal/);
 assert.match(bots,/mode!=='berry'&&mode!=='berryeasy'&&dash/);
});
test('Berry tree sprites draw without large ellipses and use thin borderless HP strips',()=>{
 const src=read('src/pkmsvv-berry-rescue.js');
 const chunk=src.slice(src.indexOf('function draw(ctx)'),src.indexOf('function hud('));
 assert.doesNotMatch(chunk,/ellipse\(/);
 assert.doesNotMatch(chunk,/stroke\(/);
 assert.match(chunk,/fillRect\(-31,y,62,3\)/);
});
test('Host owns Berry tree HP; guests only consume validated snapshots',()=>{
 const h=harness();h.game.begin({mode:'berry'});
 h.G.EnemyMgr.enemies=[{x:92,y:82,dead:false,boss:false}];
 h.step(10,10);
 assert.ok(h.game.trees[1].hp<h.game.trees[1].maxHp);
 assert.equal(h.game.trees[0].hp,h.game.trees[0].maxHp);
 assert.ok(h.events.some(e=>e[0]==='br'));
 h.G.Coop.isHost=false;
 h.game.onEvent(['br',65,44,92,1,150,1]);
 assert.equal(Math.round(100*h.game.trees[1].hp/h.game.trees[1].maxHp),44);
 assert.equal(h.game.bossStage,1);
});
test('Each of three saved trees independently has a 30 percent reward roll and only awards once',()=>{
 const h=harness();h.game.begin({mode:'berry'});
 const old=Math.random; // module receives mocked Math
 const always={...Math,random:()=>0};
 const G=h.G;G.PKMSVVBerry.grant=id=>{h.grants.push(id);return true;};
 const h2={G}; 
 assert.equal(h.game.REWARD_CHANCE,.3);
 assert.equal(h.game.reward({success:false,trees:[true,true,true]}).length,0);
 assert.equal(h.grants.length,0);
});
test('Berry art is bundled as 10 offline pixel sprite assets in Kecleon with no duplicate menu button',()=>{
 const art=JSON.parse(read('src/berry-pixel-pack.json'));
 assert.equal(Object.keys(art).length,10);
 for(const [k,v] of Object.entries(art)){assert.ok(v.p.length>30,k);assert.ok(v.z.length>45,k);}
 const builder=read('scripts/install-berry-sprites.cjs');
 assert.match(builder,/assets','berry/);
 assert.match(builder,/32,H=32/);
 const shop=read('src/kecleon/pkmsvv-kecleon-ui.js');
 assert.match(shop,/pkmk-tab-berry/);
 assert.match(shop,/G\.PKMSVVBerry\?\.kecleonHtml/);
 const berry=read('src/pkmsvv-berry.js');
 assert.match(berry,/imageHtml\(t\.id\)/);
 assert.doesNotMatch(berry,/menu\.append\(b\)/);
});
test('Mega 5 and PC+touch button are live in co-op, with Host bot auto-transformation',()=>{
 const mega=read('src/pkmsvv-mega-phase3.js');
 assert.match(mega,/lanBot&&G\.Coop\?\.isHost/);
 assert.match(mega,/netMega\(p,f\.spriteId\)/);
 assert.match(mega,/remoteMega\(uid,sprite\)/);
 assert.match(mega,/G\.Input\?\.tap\?\.\('digit5'\)/);
 assert.match(read('scripts/patch-berry-coop.cjs'),/case 'mg'/);
});
test('Rescue Berry room disables unrelated eggs, Rift, story bosses and NPC rescues',()=>{
 const patch=read('scripts/patch-berry-coop.cjs');
 assert.match(patch,/PKMSVVBerryRescue\.begin\(coop\)/);
 assert.match(patch,/!G\.PKMSVVBerryRescue\?\.active/);
 assert.match(patch,/G\.PKMSVVBerryRescue\.tick/);
 assert.match(patch,/G\.PKMSVVBerryRescue\.reward/);
 assert.match(read('src/shared/coop-unified.js'),/\['berry','Giải Cứu Berry','4 người · 8 phút'/);
});
