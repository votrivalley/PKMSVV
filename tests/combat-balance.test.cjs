'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require.resolve('../src/pkmsvv-combat-balance-qa.js'),'utf8');
function fixture(){
 class Enemy{
  constructor(boss=false){Object.assign(this,{boss,x:0,y:0,stunT:0,sleepT:0,slowT:0,slow:0,dead:false,hp:100});}
  applyStun(t){this.stunT=Math.max(this.stunT,t);}
  applySleep(t){this.sleepT=Math.max(this.sleepT,t);}
  applySlow(n,t=1.2){this.slow=Math.max(this.slow,n);this.slowT=Math.max(this.slowT,t);}
  update(dt){for(const k of ['stunT','sleepT','slowT'])this[k]=Math.max(0,this[k]-dt);}
  applyBurn(){this.burn=1;}applyPoison(){this.poison=1;}
 }
 const power={id:'atk',apply:p=>p.atkMul*=1.1};
 const G={Enemy,Coop:{active:false},Social:{room:{mode:'coop'}},PKMSVVQuickRegion:{active:true},World:{isWall:x=>x>10},LevelUp:{STATS:[power],offer:()=>[{key:'stat:atk',desc:'+10%'}]},PKMSVVBalance:{effectiveCooldown:(p,m)=>Math.max(.5,p.cdMul*m.cd),rewardRift:p=>{p.cdMul*=.96;p.pkmsvvResonance=Math.min(3,(p.pkmsvvResonance||0)+1);}}};
 vm.runInNewContext(source,{G});return {G,power,api:G.PKMSVVCombatBalanceQA};
}
test('power card keeps first ten and reduces late compounding; only survival',()=>{
 const {G,power,api}=fixture(),p={atkMul:1,statsTaken:{atk:0}};
 for(let i=0;i<40;i++){power.apply(p);p.statsTaken.atk++;assert.ok(Math.abs(p.atkMul-api.powerFactor(i+1))<1e-9);}
 assert.ok(p.atkMul<9&&p.atkMul>8);assert.equal(api.powerRate(9),.1);assert.equal(api.powerRate(10),.06);assert.equal(api.powerRate(20),.03);
 assert.match(G.LevelUp.offer(p)[0].desc,/3%/);G.EggRush={active:true};const old=p.atkMul;power.apply(p);assert.ok(Math.abs(p.atkMul-old*1.1)<1e-9);
});
test('boss and elite cannot chain stun into sleep; recovery ticks with simulation, damage unaffected',()=>{
 const {G,api}=fixture();
 for(const kind of ['boss','elite']){
  const e=new G.Enemy(kind==='boss');if(kind==='elite')e.pkmsvvPressureElite=true;
  const policy=api.POLICY[kind];e.applyStun(9);assert.equal(e.stunT,policy.hard);
  for(let j=0;j<10;j++){e.applySleep(9);e.applyStun(9);}assert.equal(e.sleepT,0);assert.equal(e.stunT,policy.hard);
  e.update(policy.hard+.01);e.applySleep(5);assert.equal(e.sleepT,0);
  e.update(policy.recover+.01);e.applySleep(5);assert.equal(e.sleepT,policy.hard);
  e.applySlow(.99,10);assert.equal(e.slow,policy.slow);assert.equal(e.slowT,policy.slowTime);
  e.applyBurn();e.applyPoison();assert.equal(e.burn,1);assert.equal(e.poison,1);assert.equal(e.hp,100);
  assert.equal(api.dragScale(e,'wave'),policy.wave);assert.equal(api.drag(e,9,0),true);assert.equal(api.drag(e,2,0),false);
 }
 const regular=new G.Enemy();regular.applyStun(9);regular.applySleep(9);assert.equal(regular.stunT,9);assert.equal(regular.sleepT,9);
 const remote=new G.Enemy(true);remote.remote=true;remote.applyStun(3);assert.equal(remote.stunT,3);assert.equal(api.dragScale(remote,'wave'),0);
});
test('mode boundaries and cooldown/Rift haste stop; no special objective changes',()=>{
 const {G,api}=fixture(),p={cdMul:.2,pkmsvvResonance:3};
 assert.equal(G.PKMSVVBalance.effectiveCooldown(p,{kind:'wave',cd:3}),1.5);
 assert.equal(G.PKMSVVBalance.effectiveCooldown(p,{kind:'vortex',cd:3}),1.8);
 G.PKMSVVBalance.rewardRift(p);assert.equal(p.cdMul,.2);
 p.pkmsvvResonance=2;G.PKMSVVBalance.rewardRift(p);assert.equal(p.cdMul,.192);
 G.Coop.active=true;assert.equal(api.enabled(),true);
 for(const mode of ['arena','eggrush','berry','fossil','royale']){G.Social.room.mode=mode;assert.equal(api.enabled(),false);const b=new G.Enemy(true);b.applyStun(5);assert.equal(b.stunT,5);assert.ok(G.PKMSVVBalance.effectiveCooldown(p,{kind:'wave',cd:3})<1.5);}
});
