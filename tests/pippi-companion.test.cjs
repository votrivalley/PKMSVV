'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../src/pkmsvv-pippi.js');
function save(xp=0){return {coins:711,globalUpgrades:{power:2,revive:1},
 globalSpent:{power:900,revive:50000},pkmsvvPippi:{xp}};}
function game(s=save(54)){
 const player={x:100,y:120,hp:0,maxHp:100,dead:false,invuln:0,
  atkMul:1,extraRevives:1,revive(f){this.hp=this.maxHp*f;this.dead=false;}};
 const G={DB:{save:s,commit(){return true;}},Game:{state:'playing',player,st:{time:100}},
  PKMSVVQuickRegion:{active:true},Coop:{active:false},Royale:{active:false},
  EggRush:{active:false},Social:{room:{mode:'explore'}},EnemyMgr:{all:()=>[]}};
 return {G,player};
}
test('Bond 1–10 is persistent, monotonic and capped',()=>{
 assert.equal(P.rank(0),1);assert.equal(P.rank(2),2);
 assert.equal(P.rank(44),9);assert.equal(P.rank(54),10);assert.equal(P.rank(99999),10);
 const s={};assert.equal(P.data(s).bond,1);
 assert.deepEqual(P.earn(s,2),{level:2,leveled:true,xp:2});
 assert.equal(P.earn(s,0).leveled,false);
 assert.equal(P.earn(s,999).level,10);
});
test('revive refund is exactly paid 50,000 once, never other upgrades',()=>{
 const s=save();const money=s.coins;
 assert.equal(P.refund(s),50000);
 assert.equal(s.coins,money+50000);
 assert.deepEqual(s.globalUpgrades,{power:2});
 assert.deepEqual(s.globalSpent,{power:900});
 assert.equal(s.pkmsvvPippi.refundReviveV1,true);
 assert.equal(P.refund(s),0);assert.equal(s.coins,money+50000);
});
test('pre-ledger old saves get 50k, nonowners get zero; arbitrary ledger values cannot mint money',()=>{
 const old={coins:8,globalUpgrades:{revive:1}};
 assert.equal(P.refund(old),50000);assert.equal(old.coins,50008);
 const unknown={coins:8,globalUpgrades:{},globalSpent:{revive:50000}};
 assert.equal(P.refund(unknown),0);assert.equal(unknown.coins,8);
 const capped={coins:3,globalUpgrades:{revive:1},globalSpent:{revive:99999999}};
 assert.equal(P.refund(capped),50000);
});
test('Pippi never plays in Co-op, Arena, Royale, Egg Rush or normal nonregion runs',()=>{
 const {G}=game();assert.equal(P.eligible(G),true);
 G.Coop.active=true;assert.equal(P.eligible(G),false);G.Coop.active=false;
 G.PKMSVVArenaSolo={active:true};assert.equal(P.eligible(G),false);delete G.PKMSVVArenaSolo;
 G.Royale.active=true;assert.equal(P.eligible(G),false);G.Royale.active=false;
 G.EggRush.active=true;assert.equal(P.eligible(G),false);G.EggRush.active=false;
 G.PKMSVVQuickRegion.active=false;assert.equal(P.eligible(G),false);
});
test('AI heal respects HP cap and danger threshold',()=>{
 const p={hp:20,maxHp:100};
 assert.equal(P.heal(p,1),true);assert.ok(p.hp>20&&p.hp<45);
 p.hp=90;assert.equal(P.heal(p,10),false);assert.equal(p.hp,90);
 p.hp=60;assert.equal(P.heal(p,10),true);assert.ok(p.hp<=100);
});
test('temporary attack buff and enemy slow restore exactly on expiry or exit',()=>{
 const {G,player}=game();const run=P.newRun(player);
 assert.equal(P.buff(player,run,10,5),true);
 assert.equal(P.buff(player,run,11,5),false);
 assert.ok(player.atkMul>1);
 P.endEffects(run,19);assert.ok(Math.abs(player.atkMul-1)<1e-12);
 const enemy={x:102,y:121,spd:100,dead:false};
 G.EnemyMgr.all=()=>[enemy];
 assert.equal(P.slow(G,run,20,4),true);assert.equal(enemy.spd,65);
 P.finish(run);assert.equal(enemy.spd,100);
});
test('Moon Miracle triggers only at Bond 10 once per Explore run, then Pippi sleeps',()=>{
 const {G,player}=game(save(54)),run=P.newRun(player,90);
 assert.equal(P.tryRevive(G,run,player,100),true);
 assert.equal(player.hp,40);assert.equal(player.invuln,3);
 assert.equal(run.revived,true);assert.equal(run.sleepUntil,175);assert.equal(player.extraRevives,0);
 player.hp=0;assert.equal(P.tryRevive(G,run,player,110),false);
 const lower=game(save(44));assert.equal(P.tryRevive(lower.G,P.newRun(lower.player),lower.player,10),false);
 const coop=game(save(54));coop.G.Coop.active=true;
 assert.equal(P.tryRevive(coop.G,P.newRun(coop.player),coop.player,10),false);
});
test('production Android overlays Pippi and swaps the obsolete compiled GlobalPower hook',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
 const prod=read('scripts/patch-v20-android-production.cjs');
 const compiled=read('scripts/patch-qa-compiled-modules.cjs');
 const build=read('scripts/prepare-game.cjs');
 const power=read('src/pkmsvv-global-power.js');
 const ui=read('src/pkmsvv-global-power-ui.js');
 assert.ok(prod.includes("'pkmsvv-pippi.js'"));
 assert.ok(prod.includes("'pkmsvv-pippi.css'"));
 assert.ok(compiled.includes("['GlobalPower','src/pkmsvv-global-power.js']"));
 assert.ok(build.includes('js/ui/pkmsvv-pippi.js'));
 assert.match(power,/retired:true/);
 assert.match(power,/return !!G\.PKMSVVPippi\?\.tryRevive/);
 assert.match(ui,/filter\(u=>!u\.retired\)/);
});
