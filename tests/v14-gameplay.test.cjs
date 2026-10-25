'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('v1.4 release notes bilingual and native/cloud history preserved',()=>{
 const s=read('src/pkmsvv-changelog-v14.js');
 assert.match(s,/v1\.4/);assert.match(s,/10\/20\/30/);assert.match(s,/Mystery Dungeon Orbs/);
 assert.match(s,/Shiny Charm/);assert.match(s,/Gacha ×100/);assert.match(s,/Meteor Mash/);
 assert.match(read('scripts/prepare-game.cjs'),/patch-v14-gameplay.cjs/);
 assert.match(read('scripts/prepare-web.cjs'),/1\.5/);
 assert.equal(require('../package.json').version,'1.5.15');
});
test('Gacha balance uses precise 0.9% Shiny, 1.8% Charm and 1% Legend odds',()=>{
 const cfg=JSON.parse(read('config/gameplay.json'));
 assert.equal(cfg.shiny.gachaPercent,0.9);
 assert.equal(cfg.shiny.wildDenominator,2048,'Wild Shiny rate is unaffected');
 const prepare=read('scripts/prepare-game.cjs');
 const v14=read('scripts/patch-v14-gameplay.cjs');
 const legend=read('scripts/patch-gacha-legend-100.cjs');
 assert.match(prepare,/gachaPercent/);
 assert.match(v14,/const shinyLine=shinySource\.match/);
 assert.match(v14,/SHINY_RATE\*\(hasCharm\(save,gen\)\?2:1\)/);
 assert.match(legend,/const PITY_5 = 100;/);
 assert.match(legend,/\[5, 1\]/);
 assert.ok(cfg.shiny.gachaPercent < 1,'Base Shiny must be rarer per roll than a 5-star');
});

test('Gacha ×100 is 10 guaranteed ten-pulls; specific Gen completion doubles shiny rate',t=>{
 const file='vendor/pokesurvivor/js/systems/gacha.js';
 if(!fs.existsSync(path.join(root,file))){t.skip('Pinned game not prepared');return;}
 const dex=[];
 for(let gen=1;gen<=9;gen++)for(let rarity=1;rarity<=5;rarity++)
   dex.push({gen,dex:gen*100+rarity,rarity,bst:300+rarity*70});
 const meta=Object.fromEntries(dex.map(x=>[x.dex,{}]));
 const G={DEX:dex,SPRITE_META:meta,U:{pick:a=>a[0]},Sprites:{hasShiny:()=>true}};
 vm.runInNewContext(read(file),{G,Math,Date});
 const s={tickets:{t1:100,t10:10},coins:0,owned:{},shiny:{},pity:{},stats:{}};
 assert.ok(Math.abs(G.Gacha.shinyRate(s,1)-0.009)<1e-12);
 assert.equal(G.Gacha.costOf(s,100,'t1').t1,100);
 assert.equal(G.Gacha.costOf(s,100,'t10').t10,10);
 const rolls=G.Gacha.pull(s,100,1,'t1');
 assert.equal(rolls.length,100);
 assert.equal(s.tickets.t1,0);
 assert.equal(s.stats.pulls,100);
 for(let i=0;i<10;i++)assert.ok(rolls.slice(i*10,i*10+10).some(r=>r.rarity>=4),'ten-pull '+i+' must guarantee 4★');
 const ticket10Save={tickets:{t1:0,t10:10},coins:0,owned:{},shiny:{},pity:{},stats:{}};
 assert.equal(G.Gacha.pull(ticket10Save,100,1,'t10').length,100);
 assert.equal(ticket10Save.tickets.t10,0);
 for(const mon of dex.filter(x=>x.gen===1))s.owned[mon.dex]={at:1,from:'test'};
 assert.equal(G.Gacha.hasCharm(s,1),true);
 assert.ok(Math.abs(G.Gacha.shinyRate(s,1)-0.018)<1e-12);
 assert.equal(G.Gacha.hasCharm(s,0),false);
 assert.ok(Math.abs(G.Gacha.shinyRate(s,0)-0.009)<1e-12,'ALL GEN has no Shiny Charm multiplier');
});
test('5★ rarity odds are exactly 1%, with 100-pull hard pity and no loss of stored pity',t=>{
 const patch=read('scripts/patch-gacha-legend-100.cjs');
 assert.match(patch,/const PITY_5 = 100;/);
 assert.match(patch,/const RATES = \[\[1, 45\.5\], \[2, 30\], \[3, 17\], \[4, 6\.5\], \[5, 1\]\];/);
 assert.match(read('scripts/prepare-game.cjs'),/patch-gacha-legend-100\.cjs/);
 const file='vendor/pokesurvivor/js/systems/gacha.js';
 if(!fs.existsSync(path.join(root,file))){t.skip('Game source not prepared yet');return;}
 const dex=[];
 for(const gen of [1,2])for(let rarity=1;rarity<=5;rarity++)
   dex.push({gen,rarity,dex:gen*10+rarity,bst:100+100*rarity});
 const deterministicMath=Object.create(Math);
 deterministicMath.random=()=>0; // Forces rarity 1★ unless pity or 4★ guarantee intervenes.
 const G={DEX:dex,SPRITE_META:Object.fromEntries(dex.map(m=>[m.dex,true])),
  U:{pick:pool=>pool[0]},Sprites:{hasShiny:()=>false}};
 vm.runInNewContext(read(file),{G,Math:deterministicMath,Date});
 const makeSave=()=>({tickets:{t1:250,t10:20},coins:0,owned:{},shiny:{},pity:{},stats:{}});
 assert.deepEqual(Array.from(G.Gacha.RATES,([r,p])=>[r,p]),
  [[1,45.5],[2,30],[3,17],[4,6.5],[5,1]]);
 assert.equal(G.Gacha.RATES.reduce((n,[,w])=>n+w,0),100);
 assert.equal(G.Gacha.PITY_5,100);
 const oldSave=makeSave();
 oldSave.pity[0]=70; // Old 70/70 pity must carry over as 70/100, never erased.
 let result=G.Gacha.pull(oldSave,1,0);
 assert.equal(result[0].rarity,1);
 assert.equal(oldSave.pity[0],71);
 oldSave.pity[0]=99;
 result=G.Gacha.pull(oldSave,1,0);
 assert.equal(result[0].rarity,5);
 assert.equal(oldSave.pity[0],0);
 const genSave=makeSave();
 genSave.pity[0]=57;genSave.pity[1]=99;
 assert.equal(G.Gacha.pull(genSave,1,1)[0].rarity,5);
 assert.equal(genSave.pity[1],0);
 assert.equal(genSave.pity[0],57,'ALL GEN pity stays independent of Gen 1');
 const batchSave=makeSave();
 const oneHundred=G.Gacha.pull(batchSave,100,0,'t1');
 assert.equal(oneHundred.length,100);
 assert.equal(oneHundred[99].rarity,5,'100th pull guaranteed 5★ when 99 earlier rolls failed');
 assert.equal(oneHundred.filter(x=>x.rarity===5).length,1);
 assert.equal(batchSave.pity[0],0);
 for(let k=0;k<10;k++)assert.ok(oneHundred.slice(k*10,k*10+10).some(x=>x.rarity>=4),
  '×10 four-star minimum remains intact (batch '+k+')');
});

test('Orbs are unlocked per player at eight learned skills and used FIFO',t=>{
 const file='vendor/pokesurvivor/js/systems/orbs.js';
 if(!fs.existsSync(path.join(root,file))){t.skip('Pinned game not prepared');return;}
 const G={Camera:{zoom:1,zoomTo:1},I18n:{lang:'vi'},U:{pick:a=>a[0]},
  Game:{state:'playing'},Coop:{active:false},FX:{ring(){},dmgText(){}},Audio:{sfx(){}}};
 vm.runInNewContext(read(file),{G,Math,Date});
 const pl={x:0,y:0,bodyH:30,dead:false,maxMoves:8,slots:[],critChance:.1,spdMul:1};
 assert.equal(G.Orbs.LIST.length,6);
 assert.equal(G.Orbs.MAX,10);
 assert.equal(G.Orbs.canTake(pl,'focus'),false,'cannot collect with less than 8 learned skills');
 pl.slots=new Array(8).fill([]);
 assert.equal(G.Orbs.ready(pl),true);
 assert.equal(G.Orbs.add(pl,'focus'),true);
 assert.equal(G.Orbs.add(pl,'quick'),true);
 assert.equal(G.Orbs.add(pl,'slow'),true);
 assert.equal(pl.orbs[0],'focus');
 assert.equal(pl.orbs[1],'quick');
 assert.equal(G.Orbs.take(pl,'quick'),false,'cannot take a future Orb first');
 assert.equal(G.Orbs.useNext(pl),true);
 assert.equal(pl.orbs[0],'quick');
 assert.equal(G.Orbs.cd,5);
 assert.ok(Math.abs(pl.critChance-.25)<1e-8);
 assert.equal(G.Orbs.useNext(pl),false,'5-second cooldown must block rapid consumption');
 G.Orbs.update(12.1,pl);
 assert.ok(Math.abs(pl.critChance-.1)<1e-8,'buff cannot accumulate forever');
 assert.equal(G.Orbs.useNext(pl),true);
 assert.equal(pl.spdMul,1.25);
 G.Orbs.update(8.1,pl);
 assert.equal(pl.spdMul,1);
 for(let i=0;i<9;i++)G.Orbs.add(pl,'quick');
 assert.ok(pl.orbs.length<=10,'queue at most ten picked Orbs');
 G.Orbs.reset();assert.equal(G.Camera.zoomTo,1);
});
test('Orb controls cannot affect Arceus and boss debuffs remain modest',t=>{
 const file='vendor/pokesurvivor/js/systems/orbs.js';
 if(!fs.existsSync(path.join(root,file))){t.skip('Pinned game not prepared');return;}
 const effects={sleep:[],slow:[]};
 const enemy={x:10,y:20,dead:false,remote:false,boss:false,
  applySleep(v){effects.sleep.push(v);},applySlow(v,d){effects.slow.push([v,d]);}};
 const arceus={x:20,y:30,dead:false,remote:false,arceus:true,boss:true,
  applySleep(){throw Error('Arceus cannot be slept');},applySlow(){throw Error('Arceus cannot be slowed');}};
 const G={I18n:{lang:'vi'},U:{pick:a=>a[0],norm:()=>[1,0]},
  Game:{state:'playing'},Coop:{active:false},
  Camera:{VIEW_W:768,MIN_VIEW_H:432,zoom:1,zoomTo:1},
  EnemyMgr:{all:()=>[enemy,arceus]},FX:{ring(){},dmgText(){}},Audio:{sfx(){}}};
 vm.runInNewContext(read(file),{G,Math,Date});
 G.Orbs.foe('slumber',0,0,1);assert.equal(effects.sleep[0],3);
 G.Orbs.foe('slow',0,0,1);assert.equal(effects.slow[0][0],.4);
 assert.equal(effects.slow[0][1],6);
 const pickup=read('vendor/pokesurvivor/js/entities/pickup.js');
 assert.match(pickup,/runOrbDrops<10&&Math\.random\(\)<0\.45/);
 assert.match(pickup,/runOrbDrops<10&&Math\.random\(\)<0\.03/);
 assert.match(pickup,/G\.Orbs\.canTake\(o,p\.value\)/);
 assert.match(pickup,/function clear\(\) \{ list = \[\]; runOrbDrops = 0; \}/);
});

test('All six Orbs activate without Camera.zoom and buffs expire correctly',()=>{
 const effects={sleep:[],slow:[],knock:0};
 const near={x:30,y:0,dead:false,remote:false,boss:false,kx:0,ky:0,
  applySleep(t){effects.sleep.push(t);},applySlow(f,t){effects.slow.push([f,t]);}};
 const boss={x:70,y:0,dead:false,remote:false,boss:true,kx:0,ky:0,
  applySleep(t){effects.sleep.push(t);},applySlow(f,t){effects.slow.push([f,t]);}};
 const far={x:10000,y:0,dead:false,remote:false,kx:0,ky:0,
  applySleep(){throw Error('Out-of-range enemy slept');},
  applySlow(){throw Error('Out-of-range enemy slowed');}};
 const cam={VIEW_W:768,MIN_VIEW_H:420,w:768,h:420,scale:1,dpr:1,
  resize(cssW,cssH){this.scale=Math.min(cssW/this.VIEW_W,cssH/this.MIN_VIEW_H);
   this.w=cssW/this.scale;this.h=cssH/this.scale;}};
 const G={Camera:cam,Game:{state:'playing'},Coop:{active:false},
  I18n:{lang:'vi'},EnemyMgr:{all:()=>[near,boss,far]},
  U:{pick:a=>a[0],norm:(x,y)=>{const d=Math.hypot(x,y)||1;return [x/d,y/d];}},
  FX:{ring(){},dmgText(){}},Audio:{sfx(){}}};
 // Critical regression: pinned source defines NO Camera.zoom property.
 assert.equal(cam.zoom,undefined);
 vm.runInNewContext(read('src/v14/orbs.js'),{G,Math,Date});
 const p={x:0,y:0,bodyH:20,slots:Array.from({length:8},()=>[]),
  maxMoves:8,dead:false,critChance:.1,spdMul:1};
 for(const def of G.Orbs.LIST)assert.equal(G.Orbs.add(p,def.id),true);
 assert.equal(G.Orbs.useNext(p),true,'Slumber activates without camera.zoom');
 assert.deepEqual(effects.sleep,[3,.5]);
 G.Orbs.update(5.01,p);
 assert.equal(G.Orbs.useNext(p),true);
 assert.deepEqual(effects.slow,[[.4,6],[.15,6]]);
 G.Orbs.update(5.01,p);
 assert.equal(G.Orbs.useNext(p),true,'Blowback activates');
 assert.ok(near.kx>0&&boss.kx>0&&boss.kx<near.kx);
 assert.equal(far.kx,0);
 G.Orbs.update(5.01,p);
 assert.equal(G.Orbs.useNext(p),true,'Focus activates');
 assert.ok(Math.abs(p.critChance-.25)<1e-9);
 G.Orbs.update(5.01,p);
 assert.equal(G.Orbs.useNext(p),true,'Luminous activates');
 assert.equal(cam.VIEW_W,768*1.35);
 assert.ok(cam.w>768,'Luminous actually widens the visible world');
 G.Orbs.update(5.01,p);
 assert.equal(G.Orbs.useNext(p),true,'Quick activates');
 assert.ok(Math.abs(p.spdMul-1.25)<1e-9);
 G.Orbs.update(20,p);
 assert.ok(Math.abs(p.critChance-.1)<1e-9);
 assert.equal(p.spdMul,1);
 assert.equal(cam.VIEW_W,768,'Camera reset after Luminous Orb expiration');
 assert.equal(cam.MIN_VIEW_H,420);
 G.Orbs.reset();
 assert.equal(cam.VIEW_W,768,'New run restores default field of view');
});
test('The bundled enemy implementation supports real sleep and clear visual feedback',t=>{
 const file='vendor/pokesurvivor/js/entities/enemy.js';
 assert.match(read('scripts/prepare-game.cjs'),/patch-v14-orb-effects.cjs/);
 const patch=read('scripts/patch-v14-orb-effects.cjs');
 assert.match(patch,/applySleep\(dur\)/);
 assert.match(patch,/this.sleepT > 0/);
 assert.match(patch,/e.sleepT > 0 \? 16 : 0/);
 if(!fs.existsSync(path.join(root,file))){t.skip('Pinned game has not been prepared yet');return;}
 const source=read(file);
 assert.match(source,/applySleep\(dur\)/);
 assert.match(source,/sleepT = 0/);
 assert.match(source,/this.sleepT > 0/);
 assert.match(source,/fillText\('Zz'/);
 const combat=read('vendor/pokesurvivor/js/systems/combat.js');
 assert.match(combat,/e\.sleepT > 0/,'Sleeping enemies must not deal contact damage');
 const coop=read('vendor/pokesurvivor/js/net/coop.js');
 assert.match(coop,/e\.sleepT > 0 \? 16 : 0/,'Co-op must replicate sleeping status');
 const loops=[];
 const G={Camera:{sees:()=>true},World:{isLiquid:()=>false,collide:()=>{}},Weather:{speedFor:()=>1}};
 vm.runInNewContext(source,{G,Math,Date,performance:{now:()=>1000}});
 const e=Object.create(G.Enemy.prototype);
 Object.assign(e,{dead:false,remote:false,arceus:false,x:50,y:20,
  kx:0,ky:0,bodyH:20,shiny:false,flash:0,touchCd:0,rd:0,bob:0,
  slow:0,slowT:0,burn:0,poison:0,stunT:0,shield:0,
  anim:{loop:a=>loops.push(a),update(){}},sleepT:0});
 e.applySleep(3);
 assert.equal(e.sleepT,3);
 e.update(.5,{level:1,x:80,y:20});
 assert.equal(e.x,50,'Sleeping enemy cannot pursue the player');
 assert.equal(e.sleepT,2.5);
 assert.equal(loops.at(-1),'Idle');
 e.applySleep(.5);assert.equal(e.sleepT,2.5,'Shorter sleep cannot truncate remaining duration');
 e.applySleep(4);assert.equal(e.sleepT,4,'Repeated sleep refreshes duration');
 e.arceus=true;e.sleepT=0;e.applySleep(3);
 assert.equal(e.sleepT,0,'Arceus remains immune');
});

test('Guaranteed first Orb spawns only at eight learned skills and only once per run',()=>{
 const received=[];
 const G={
  Game:{state:'playing'},Camera:{zoom:1,zoomTo:1},Coop:{active:false},
  I18n:{lang:'vi'},U:{pick:xs=>xs[0]},
  Pickups:{dropFirstOrb(x,y,id){received.push({x,y,id});return true;}},
  Spawner:{say(){}},FX:{ring(){},dmgText(){}},Audio:{sfx(){}}
 };
 vm.runInNewContext(read('src/v14/orbs.js'),{G,Math,Date});
 const pl={x:12,y:34,maxMoves:8,slots:new Array(7).fill(1),dead:false};
 G.Orbs.update(.1,pl);assert.equal(received.length,0,'not before skill eight');
 pl.slots.push(1);G.Orbs.update(.1,pl);
 assert.equal(received.length,1,'guaranteed first Orb at skill eight');
 assert.equal(received[0].x,50);
 assert.ok(G.Orbs.BY[received[0].id]);
 for(let i=0;i<50;i++)G.Orbs.update(.1,pl);
 assert.equal(received.length,1,'must not spam Orbs every frame');
 G.Orbs.reset();G.Orbs.update(.1,pl);
 assert.equal(received.length,2,'new run may provide one tutorial Orb');
});
test('All six Orb sprites are bundled and drawn in world + HUD',t=>{
 const ids=['slumber','slow','blowback','focus','luminous','quick'];
 for(const id of ids){
  const xml=read('src/v14/orb-art/'+id+'.svg');
  assert.match(xml,/viewBox="0 0 32 32"/);
  assert.match(xml,/<svg/);
 }
 assert.match(read('scripts/prepare-game.cjs'),/patch-v14-orb-visuals.cjs/);
 const file='vendor/pokesurvivor/js/entities/pickup.js';
 if(!fs.existsSync(path.join(root,file))){t.skip('Pinned game not prepared');return;}
 const world=read(file),html=read('vendor/pokesurvivor/dev.html'),hud=read('vendor/pokesurvivor/js/ui/hud.js');
 assert.match(world,/function dropFirstOrb\(/);
 assert.match(world,/G\.OrbSprites\.draw\(ctx,p\.value/);
 assert.match(world,/dropFirstOrb, update/);
 assert.match(html,/pkmsvv-orb-sprites\.js/);
 assert.match(hud,/G\.OrbSprites\.draw\(ctx,id/);
 for(const id of ids)assert.ok(fs.existsSync(path.join(root,'vendor/pokesurvivor/assets/orbs/'+id+'.svg')));
});

test('Milestones fire once at minutes 10 and 20, then Judgment at minute 30',()=>{
 const src=read('src/v14/milestones.js');const spawned=[];
 const G={I18n:{lang:'vi'},Coop:{active:false},Rift:{inArena:false},Judgment:{active:false},
  DEX:[{dex:149,rarity:4,types:['dragon'],name:'Dragonite'},{dex:150,rarity:5,leg:true,types:['psychic'],name:'Mewtwo'}],
  SPRITE_META:{149:{},150:{}},Game:{player:{x:0,y:0}},
  Enemy:function(def,x,y,scale,boss){Object.assign(this,def,{x,y,boss});},
  EnemyMgr:{bossAlive:()=>false,add:x=>spawned.push(x)},
  U:{pick:a=>a[0]},Sprites:{preload(){}},Spawner:{say(){}},Audio:{sfx(){}}};
 vm.runInNewContext(src,{G,Math});
 G.PKMSVV14.update(599,[G.Game.player]);assert.equal(spawned.length,0);
 G.PKMSVV14.update(600,[G.Game.player]);assert.equal(spawned.length,1);
 G.PKMSVV14.update(600,[G.Game.player]);assert.equal(spawned.length,1);
 G.PKMSVV14.update(1200,[G.Game.player]);assert.equal(spawned.length,2);
 G.PKMSVV14.update(1800,[G.Game.player]);assert.equal(spawned.length,2);
 G.PKMSVV14.reset();G.PKMSVV14.update(600,[G.Game.player]);assert.equal(spawned.length,3);
});
test('Controller uses Y to spend first queued Orb and X for Dash',t=>{
 const G={I18n:{lang:'vi'},Settings:{get(){return null;},set(){}}};
 vm.runInNewContext(read('src/v14/pad-orb-map.js'),{G,Number,Set});
 assert.equal(G.PKMSVVPadOrb.describe('dash'),'X / □');
 assert.equal(G.PKMSVVPadOrb.describe('use'),'Y / △');
 assert.equal(G.PKMSVVPadOrb.valid({dash:2,use:2}),false);
 assert.equal(G.PKMSVVPadOrb.valid({dash:10,use:11}),true);
 const file='vendor/pokesurvivor/js/core/gamepad.js';
 if(!fs.existsSync(path.join(root,file))){t.skip('Pinned game not prepared');return;}
 const pad=read(file),game=read('vendor/pokesurvivor/js/game.js');
 assert.match(pad,/hit\(orbital\.dash\).*virtual\('keyf'\)/);
 assert.match(pad,/hit\(orbital\.use\).*virtual\('pkmsvv-orb-use'\)/);
 assert.doesNotMatch(pad,/orbital\.next/);
 assert.match(game,/G\.Input\.tap\('pkmsvv-orb-use'\).*G\.Orbs\.useNext/);
 assert.doesNotMatch(game,/G\.Input\.tap\('pkmsvv-orb-next'\)/);
});

test('Chapter 2 only after all eight learned skills; replayable narrative and title order',t=>{
 const story=read('src/pkmsvv-story.js'),patch=read('scripts/patch-v14-story-chapters.cjs');
 const orb=read('src/v14/orbs.js');
 assert.match(story,/chapter2:\[/);
 assert.match(story,/CHƯƠNG 2 · TIẾNG VỌNG THỨ TÁM/);
 assert.match(story,/function markChapter2/);
 assert.match(story,/function chapter2Pending/);
 assert.match(orb,/p\.maxMoves>=8&&p\.slots\.length>=8/);
 assert.match(patch,/pkmsvvChapter2Pending/);
 assert.match(patch,/G\.PKMSVVStory\.chapter2Pending\(\)/);
 assert.match(patch,/G\.PKMSVVStory\.memories\(\)/);
 const html='vendor/pokesurvivor/dev.html';
 if(!fs.existsSync(path.join(root,html))){t.skip('Pinned game not prepared');return;}
 const str=read(html);
 assert.match(str,/<div class="splash pkmsvv-credit"/);
 assert.match(str,/<div class="t1 pkmsvv-logo pkmsvv-one-line" translate="no"><span>Pokemon Chuyển sinh<\/span><\/div>/);
 assert.match(read('vendor/pokesurvivor/js/net/coop.js'),/orbReady:a\[15\]===1\?1:0/);
 assert.match(read('vendor/pokesurvivor/js/net/coop.js'),/G\.Orbs\.ready\(local\)\?1:0/);
});

test('Web build implements Arceus damage tracking and Meteor Mash balance',t=>{
 const file='vendor/pokesurvivor/js/systems/judgment.js';
 if(!fs.existsSync(path.join(root,file))){t.skip('Pinned game not prepared');return;}
 const judgment=read(file),combat=read('vendor/pokesurvivor/js/systems/combat.js'),game=read('vendor/pokesurvivor/js/game.js');
 const moves=read('vendor/pokesurvivor/js/data/moves.js'),enemy=read('vendor/pokesurvivor/js/entities/enemy.js');
 assert.match(judgment,/HP_GROW = 1\.25, DMG_GROW = 1\.15/);
 assert.match(judgment,/hitArceus/);assert.match(judgment,/const PLATES =/);
 assert.match(judgment,/BREAK_AT = 35 \* 60/);
 assert.match(combat,/e\.arceus\?G\.Judgment\.dmgK\(\)/);
 assert.match(enemy,/G\.Judgment\.hitArceus/);
 assert.match(game,/arceusDamageBest/);
 assert.match(moves,/id: 'meteor-mash'[\s\S]{0,220}dmg: 24, count: 2, radius: 48, knock: 70/);
});


test('Skill and Orb achievements remain bilingual with persistent counters',()=>{
 const saved={stats:{pkmsvvEightSkills:0,pkmsvvOrbsPicked:0,pkmsvvOrbsUsed:0,pkmsvvOrbTypeMask:0},pkmsvvSkillMarks:{}};
 const G={I18n:{lang:'vi'},PKMSVVSkillTrack:{progress:s=>({count:s.pkmsvvSkillMarks.complete?8:3})},AchDefs:{LIST:[],BY:{}}};
 vm.runInNewContext(read('src/v14/orb-achievements.js'),{G,Math,Number});
 const defs=G.PKMSVVAchievements.defs;
 assert.equal(defs.length,6);
 assert.equal(Object.keys(G.AchDefs.BY).length,6);
 assert.equal(G.AchDefs.BY['pkmsvv-slot8'].value(saved),3);
 saved.pkmsvvSkillMarks.complete=true;
 assert.equal(G.AchDefs.BY['pkmsvv-slot8'].value(saved),8);
 saved.stats.pkmsvvEightSkills=1;saved.stats.pkmsvvOrbsPicked=10;saved.stats.pkmsvvOrbsUsed=10;
 saved.stats.pkmsvvOrbTypeMask=63;
 for(const def of defs)assert.ok(def.value(saved)>=def.goal,'achievement '+def.id+' must qualify');
 const vietnamese=G.AchDefs.BY['pkmsvv-orb-first'].name;
 G.I18n.lang='en';assert.notEqual(vietnamese,G.AchDefs.BY['pkmsvv-orb-first'].name);
 assert.equal(G.AchDefs.BY['pkmsvv-orb-first'].name,'First Memory');
 assert.match(read('scripts/patch-v14-orb-achievements.cjs'),/pkmsvvOrbTypeMask/);
 const file='vendor/pokesurvivor/js/data/pkmsvv-orb-achievements.js';
 if(fs.existsSync(path.join(root,file))){
  assert.match(read('vendor/pokesurvivor/dev.html'),/js\/data\/pkmsvv-orb-achievements.js/);
  assert.match(read('vendor/pokesurvivor/js/core/db.js'),/r.stats.pkmsvvOrbTypeMask/);
 }
});
test('Missions visually prioritize unclaimed completions and highlight new tasks',()=>{
 const src=read('src/pkmsvv-mission-cues.js');
 assert.match(src,/priority.appendChild\(row\)/);
 assert.match(src,/priority.appendChild\(el\)/);
 assert.match(src,/row.classList.toggle\('pkmsvv-mission-claimed'/);
 assert.match(src,/markSeen\(\)/);
 const G={I18n:{lang:'vi'},DB:{save:{
  created:123,missions:{day:'2026-10-24',week:'2026-43',
   daily:[{id:'a',goal:2,prog:2,claimed:false},{id:'b',goal:3,prog:1,claimed:false}],
   weekly:[{id:'c',goal:5,prog:5,claimed:true}]},
  pkmDaily:{claimed:false,complete:true},
  pkmWeekly:{claimed:false,dexes:[1,2],done:[1]}}},
  Progress:{done:m=>m.prog>=m.goal}};
 const store={};
 vm.runInNewContext(src,{G,localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},
  document:{querySelector:()=>null,createElement:()=>({})}});
 const d=G.PKMSVVMissionCue.data();
 assert.equal(d.ready,2);assert.equal(d.active,4);
 G.PKMSVVMissionCue.markSeen();
 assert.ok(Object.keys(store).some(k=>k.includes('123')));
 assert.match(read('scripts/prepare-game.cjs'),/patch-v14-mission-attention.cjs/);
});
test('Chapter 2 images use dedicated WebP assets without replacing Chapter 0',()=>{
 const story=read('src/pkmsvv-story.js');
 assert.match(story,/6:'chapter2-orbs', 7:'chapter2-shadow'/);
 assert.equal((story.match(/\{art:6,/g)||[]).length,8);
 assert.equal((story.match(/\{art:7,/g)||[]).length,4);
 assert.match(read('scripts/patch-story.cjs'),/chapter2-orbs/);
 assert.match(read('scripts/patch-story.cjs'),/chapter2-shadow/);
 const rootArt='vendor/pokesurvivor/assets/story/';
 if(fs.existsSync(path.join(root,rootArt))){
  for(const name of ['chapter2-orbs.webp','chapter2-shadow.webp','eyes.webp','gate.webp'])
   assert.ok(fs.existsSync(path.join(root,rootArt,name)),name);
 }
});
