'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('v1.4 release notes bilingual and native/cloud history preserved',()=>{
 const s=read('src/pkmsvv-changelog-v14.js');
 assert.match(s,/v1\.4/);assert.match(s,/10\/20\/30/);assert.match(s,/Mystery Dungeon Orbs/);
 assert.match(s,/Shiny Charm/);assert.match(s,/Gacha ×100/);assert.match(s,/Meteor Mash/);
 assert.match(read('scripts/prepare-game.cjs'),/patch-v14-gameplay.cjs/);
 assert.match(read('scripts/prepare-web.cjs'),/1\.4/);
 assert.equal(require('../package.json').version,'1.4.0');
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
 assert.equal(G.Gacha.shinyRate(s,1),1/90);
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
 assert.equal(G.Gacha.shinyRate(s,1),2/90);
 assert.equal(G.Gacha.hasCharm(s,0),false);
});
test('Orbs are run-only, four fixed slots, stacks of three and reset effects',t=>{
 const file='vendor/pokesurvivor/js/systems/orbs.js';
 if(!fs.existsSync(path.join(root,file))){t.skip('Pinned game not prepared');return;}
 const G={Camera:{zoomTo:1},I18n:{lang:'vi'},U:{pick:a=>a[0]}};
 vm.runInNewContext(read(file),{G,Math,Date,performance:{now:()=>0}});
 assert.equal(G.Orbs.LIST.length,6);
 assert.equal(G.Orbs.SLOTS,4);assert.equal(G.Orbs.STACK,3);
 const pl={};
 assert.equal(G.Orbs.add(pl,'focus'),true);
 assert.equal(G.Orbs.add(pl,'focus'),true);
 assert.equal(G.Orbs.add(pl,'focus'),true);
 assert.equal(G.Orbs.add(pl,'focus'),false);
 assert.equal(pl.orbs[0].n,3);
 assert.equal(G.Orbs.take(pl,'focus'),true);
 assert.equal(pl.orbs[0].n,2);
 G.Orbs.reset();assert.equal(G.Camera.zoomTo,1);
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
