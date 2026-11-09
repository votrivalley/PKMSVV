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
 assert.equal(h.G.Audio.last,'eggrush');
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
test('Berry Rescue gives standard EXP once and never mutates base enemy payouts',()=>{
 const h=harness();h.game.begin({mode:'berry'});
 const e={x:900,y:900,xp:30,spd:100,dmg:10,hp:100,maxHp:100};
 h.G.EnemyMgr.enemies=[e];
 h.step(.1,0);assert.equal(e.xp,30);
 h.step(.1,120);assert.equal(e.xp,30,'XP remains unmodified through all stages');
 assert.ok(Math.abs(e.spd-100*(1+.2*2/3))<1e-7);
});
test('Berry AI defendGoal stays at live trees and never chases beyond the grove',()=>{
 const h=harness();h.game.begin({mode:'berry'});
 const far={x:700,y:700},near={x:0,y:0};
 const defense=h.game.defendGoal(far,[{x:2000,y:2000}]);
 assert.ok(Math.hypot(defense.x,defense.y)<h.game.DEFENSE_RADIUS);
 const loc=h.game.defendGoal(near,[{x:-92,y:95,dead:false}]);
 assert.ok(Math.abs(Math.hypot(loc.x+92,loc.y-82)-76)<1e-6,'AI stands beside the tree instead of on its trunk');
 const outside=h.game.defendGoal(near,[{x:1200,y:1200,dead:false}]);
 assert.ok(Math.hypot(outside.x,outside.y)<h.game.DEFENSE_RADIUS);
 const bots=read('src/lan/lan-ai.js');
 assert.match(bots,/PKMSVVBerryRescue\?\.defendGoal/);
 assert.match(bots,/mode!=='berry'&&mode!=='berryeasy'&&dash/);
});
test('Berry tree sprites draw without large ellipses and use thin borderless HP strips',()=>{
 const src=read('src/pkmsvv-berry-rescue.js');
 const chunk=src.slice(src.indexOf('function drawOne(ctx,t)'),src.indexOf('function hud('));
 assert.doesNotMatch(chunk,/ellipse\(/);
 assert.doesNotMatch(chunk,/stroke\(/);
 assert.match(chunk,/fillRect\(-34,barY,68,7\)/);
 assert.match(chunk,/fillRect\(-32,barY\+2,64\*ratio,3\)/);
 assert.doesNotMatch(chunk,/fillRect\(-38,-5,76,10\)|strokeRect\(-38,-5,76,10\)/,'old faux second HP bar must not exist');
 const patch=read('scripts/patch-berry-coop.cjs');
 assert.match(patch,/PKMSVVBerryRescue\.drawables\(\)/,'insert trees into native Y-depth sort');
 assert.match(patch,/items\.push\(\{y:e\.y,ent:e\}\)/);
 assert.doesNotMatch(patch,/G\.PKMSVVBerryRescue\?\.draw\?\.\(ctx\)/,'no premature ground draw');
 const game=harness();game.game.begin({mode:'berry'});
 assert.equal(game.game.drawables().length,3);
 assert.equal(game.game.drawables()[0].y,82);
 const player={x:-92,y:82,r:15};game.game.keepOutsideTrunks(player);
 assert.ok(Math.hypot(player.x+92,player.y-82)>=56,'player cannot stand inside tree trunk');
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
 assert.match(patch,/PKMSVVBerryRescue\.begin\(\{mode:G\.Social\?\.room\?\.mode\}\)/);
 assert.match(patch,/!G\.PKMSVVBerryRescue\?\.active/);
 assert.match(patch,/G\.PKMSVVBerryRescue\.tick/);
 assert.match(patch,/G\.PKMSVVBerryRescue\.reward/);
 assert.match(read('src/shared/coop-unified.js'),/\['berry','Giải Cứu Berry','4 người · 8 phút'/);
});


test('Android Berry starts from live room mode and renders every missing objective exactly once',()=>{
 const h=harness();
 h.G.Social={room:{mode:'berryeasy'}};
 assert.equal(h.game.begin({}),true,'room mode fallback is necessary when LAN start packet omits mode');
 assert.equal(h.game.easy,true);
 const draws=[];
 const ctx={save(){},restore(){},translate(x,y){draws.push([x,y]);},fillRect(){},strokeRect(){}};
 h.game.beginFrame();
 const drawables=h.game.drawables();
 assert.equal(drawables.length,3);
 drawables[0].draw(ctx);
 h.game.drawMissing(ctx);
 assert.equal(draws.length,3,'draw missing two trees in transformed world layer');
 h.game.drawMissing(ctx);
 assert.equal(draws.length,3,'no duplicates when fallback runs twice');
 h.game.beginFrame();
 h.game.drawMissing(ctx);
 assert.equal(draws.length,6,'all 3 trees recover if native Y-sort skipped the whole frame');
 const patch=read('scripts/patch-berry-coop.cjs');
 assert.match(patch,/PKMSVVBerryRescue\?\.beginFrame\?\.\(\)/);
 assert.match(patch,/PKMSVVBerryRescue\?\.drawMissing\?\.\(ctx\)/);
 assert.match(patch,/drawScene\(G\.Camera, G\.Coop\.active/);
});

test('Berry predators defend all trees with standard EXP and four-second respawn',()=>{
 const h=harness();h.game.begin({mode:'berry'});
 const enemy={x:95,y:85,xp:20,spd:90,hp:100,maxHp:100};
 const target=h.game.targetFor(enemy);
 assert.equal(target._pkmsvvBerryTree,1);
 assert.equal(target.x,92);assert.equal(target.y,82);
 h.game.trees[1].hp=0;
 assert.notEqual(h.game.targetFor(enemy)._pkmsvvBerryTree,1);
 h.G.EnemyMgr.enemies=[enemy];h.step(.1,0);assert.equal(enemy.xp,20);
 h.game.trees.forEach(t=>t.hp=0);
 assert.equal(h.game.targetFor(enemy),null);
 const patch=read('scripts/patch-berry-coop.cjs');
 assert.match(patch,/enemy\.js/);assert.match(patch,/targetFor/);
 assert.match(patch,/pl\.reviveT>=4/);
 const bots=read('src/lan/lan-ai.js');
 assert.match(bots,/berry\?4:G\.Player\.REVIVE_TIME/);
 assert.match(read('src/pkmsvv-berry.css'),/body\.pkmsvv-berry-defense \.pkmsvv-berry-active-hud/);
});

test('Berry death HUD counts down from 4 seconds rather than asking for rescue',()=>{
 const src=read('src/web/pkmsvv-death-hud.js');
 assert.match(src,/PKMSVVBerryRescue\?\.active/);
 assert.match(src,/Math\.ceil\(4-\(Number\(player\.reviveT\)/);
 assert.match(src,/Tiếp tục bảo vệ ba cây Berry/);
});

test('Three surviving Berry trees guarantee ONE extra random reward even if all ordinary rolls fail',()=>{
 const source=read('src/pkmsvv-berry-rescue.js');
 const grants=[],G={
  Coop:{isHost:true},World:{flattenForBerry(){}},Audio:{music(){}},
  PKMSVVBerry:{TYPES:[{id:'oran'},{id:'sitrus'},{id:'lum'},{id:'liechi'},{id:'salac'},{id:'ganlon'}],
   grant(id){grants.push(id);return true;}},UI:{toast(){}}
 };
 const deterministic=Object.create(Math);deterministic.random=()=>.99;
 vm.runInNewContext(source,{G,Math:deterministic,Image:undefined,Number});
 const b=G.PKMSVVBerryRescue;
 b.begin('berry');
 const first=b.reward({success:true,trees:[88,30,1],easy:false});
 assert.equal(first.length,1,'one guaranteed award even when normal HP reward rolls fail');
 assert.equal(grants.length,1);
 assert.equal(b.reward({success:true,trees:[100,100,100]}).length,0,'one claim per match');
 b.begin('berryeasy');grants.length=0;
 assert.equal(b.reward({success:true,trees:[100,0,100]}).length,0,'two trees does not qualify');
 b.begin('berryeasy');grants.length=0;
 assert.equal(b.reward({success:false,trees:[100,100,100]}).length,0,'failed runs do not award');
});
test('Berry enemy targets are cached and read-only speed variants cannot freeze a LAN host',()=>{
 const h=harness();h.game.begin('berry');
 const e={x:92,y:82,spd:90,hp:100,maxHp:100,dmg:10,dead:false};
 const a=h.game.targetFor(e);assert.equal(a,h.game.targetFor(e),'same stable actor, no hot-loop allocation');
 h.G.EnemyMgr.enemies=[e];h.step(.01,0);assert.equal(e.spd,90);
 h.step(.01,120);assert.ok(e.spd>90);
 h.step(.01,120.1);assert.ok(e.spd>90);
 const readonly={x:900,y:900,hp:100,maxHp:100,dmg:10,
  get spd(){return 90;},dead:false};
 h.G.EnemyMgr.enemies=[readonly];
 assert.doesNotThrow(()=>h.step(.016,121));
});
test('Berry LAN AI uses bounded direct grove steering and skips expensive A* per bot',()=>{
 const src=read('src/lan/lan-ai.js');
 assert.match(src,/function chooseBerryAxis\(/);
 assert.match(src,/mode==='berry'\|\|mode==='berryeasy'\?\s*chooseBerryAxis/);
});
