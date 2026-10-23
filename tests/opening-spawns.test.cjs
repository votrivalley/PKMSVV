'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const src = path.join(root, 'vendor/pokesurvivor/js/systems/spawner.js');

function spawner() {
  const pl = {x:0,y:0,dead:false};
  const mgr = {
    count:0, instances:[],
    all:()=>[],
    bossAlive:()=>false,
    add(e){this.count++;this.instances.push(e);}
  };
  const G = {
    EnemyMgr:mgr,
    Enemy: class {
      constructor(def,x,y,stats) {
        this.name='Test Pokémon'; this.x=x;this.y=y;this.hp=this.maxHp=stats.hp;
        this.dmg=10;this.xp=10;this.dead=false;
      }
    },
    Enemies:{BOSSES:[],rollRun(){},upcomingDex:()=>[],bagAt:()=>[{dex:25}],scale:()=>({hp:10}),bossScale:()=>({hp:100,dmg:1,spd:1})},
    Sprites:{preload(){},hovers:()=>false,hasShiny:()=>false},
    Camera:{outerRadius:()=>100,kick(){}},
    Coop:{scaleRate:()=>1,scaleHp:()=>1,isHost:false},
    U:{rand:(a)=>a,pick:(arr)=>arr[0],dist2:()=>999999},
    Rift:{inArena:false,leftBehind:()=>false},
    Judgment:{active:false},
    World:{isFree:()=>true},
    Audio:{sfx(){}},
    Events:{golden:false},
    Game:{player:pl,st:{time:0}}
  };
  vm.runInNewContext(fs.readFileSync(src,'utf8'),{G,Math,Set,Array,Object,Number}, {timeout:4000});
  G.Spawner.reset();
  return {G,pl,mgr};
}

const config = JSON.parse(fs.readFileSync(path.join(root,'config/gameplay.json'),'utf8'));
const baseRate = t => (1.6 + t*0.028 + Math.pow(t/60,1.6)*0.5) * config.enemies.density;
const pacing = t => t<=180 ? 2/3 : t>=600 ? 1 : 2/3+(t-180)/1260;
const hpFactor = t => 1.65 + Math.min(1.55,Math.max(0,t)/360);
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-9,String(a)+' versus '+String(b));

test('0–3 min remains 2/3, then climbs smoothly to 100% at 10 min with no cliff',()=>{
 if(!fs.existsSync(src))return;
 const {G}=spawner();
 for(const t of [0,60,179,180,181,240,360,480,599,600,900]){
  close(G.Spawner.rate(t),baseRate(t)*pacing(t));
 }
 const eps=0.001;
 assert.ok(Math.abs(G.Spawner.rate(180-eps)-G.Spawner.rate(180+eps))<0.001);
 assert.ok(Math.abs(G.Spawner.rate(600-eps)-G.Spawner.rate(600+eps))<0.001);
 for(const t of [0,179,180,240,360,480,600]){
  const newer=G.Spawner.rate(t+1);
  assert.ok(newer>=G.Spawner.rate(t),'nondecreasing '+t);
 }
});
test('Surge/burst enemy amounts respect same gradual ramp from minute 3 to 10',()=>{
 if(!fs.existsSync(src))return;
 for(const [time,expected] of [[0,20],[179,20],[180,20],[240,21],[360,24],[480,27],[600,30],[900,30]]){
  const {G,mgr}=spawner();G.Game.st.time=time;
  G.Spawner.burst(30);
  assert.equal(mgr.count,expected,'run time '+time);
 }
});
test('Opening tidal wave is reduced as well as steady spawns',()=>{
 if(!fs.existsSync(src))return;
 const {G,pl,mgr}=spawner();
 G.Spawner.update(32,pl,0);
 // 8 ordinary spawns plus 4 tide spawns = 12.
 assert.equal(mgr.count,12);
});
test('At 4 min enemies have less HP and damage but still grant useful XP',()=>{
 if(!fs.existsSync(src))return;
 const {G,mgr}=spawner();
 G.Game.st.time=240;
 G.Spawner.burst(1);
 assert.equal(mgr.count,1);
 const mob=mgr.instances[0];
 close(mob.hp,10*hpFactor(240));
 close(mob.dmg,10*config.enemies.damageMultiplier);
 assert.equal(mob.xp,Math.round(10*config.enemies.xpMultiplier));
 assert.equal(G.Spawner.CAP,60);
 assert.ok(mob.hp < 10*(3.3+240/210));
 assert.ok(mob.dmg<24);
});
test('First boss still spawns at minute 3 with softer HP and damage',()=>{
 if(!fs.existsSync(src))return;
 const {G,pl,mgr}=spawner();
 G.Enemies.BOSSES.push({at:180,dex:25,hp:100,dmg:10});
 G.Spawner.update(0,pl,179.999);
 assert.equal(mgr.count,0);
 G.Spawner.update(0,pl,180);
 assert.equal(mgr.count,1);
 const e=mgr.instances[0];
 close(e.hp,100*(0.8+0.2*180/600));
 close(e.dmg,10*(0.8+0.2*180/600));
});
test('Difficulty config does not erase earned upgrades, save progress or base rewards',()=>{
 assert.equal(config.enemies.maxAlive,60);
 assert.ok(config.enemies.damageMultiplier<=1.5);
 assert.ok(config.enemies.density<=0.24);
 assert.ok(config.enemies.xpMultiplier>=5.6);
 const patch=fs.readFileSync(path.join(root,'scripts/prepare-game.cjs'),'utf8');
 assert.match(patch,/const SUPPORT_MAX = 2/);
 assert.match(patch,/openingSpawnFactor/);
 assert.match(patch,/t < 600/);
 assert.doesNotMatch(patch,/s\.globalUpgrades\s*=\s*\{\}/);
});
