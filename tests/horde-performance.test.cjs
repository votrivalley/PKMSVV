'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'src/pkmsvv-horde-performance.js'),'utf8');
function setup(amount=60){
 let now=1000;const v={burst:0,dmgText:0,ring:0},hits={damage:0,slows:0,loot:0};
 const G={Game:{state:'playing'},EnemyMgr:{count:amount},FX:{
  dmgText(){v.dmgText++;},burst(...args){v.burst++;v.lastBurst=args;},ring(){v.ring++;}},
  Enemy:{prototype:{hurt(){hits.damage++;},applySlow(){hits.slows++;},die(){hits.loot++;}}}};
 vm.runInNewContext(code,{G,performance:{now:()=>now},Date,console});
 return {G,v,hits,advance(ms){now+=ms;}};
}
test('high density caps ONLY numeric damage labels and cosmetic bursts, preserving damage, XP/drop pathways',()=>{
 const h=setup(65),p=h.G.PKMSVVHordePerformance;
 for(let i=0;i<400;i++){
  h.G.Enemy.prototype.hurt(1500);
  h.G.Enemy.prototype.applySlow(.5,1);
  h.G.FX.dmgText(20,30,'1.500','#fff');
  h.G.FX.burst(20,30,'#fff',3,15);
 }
 h.G.Enemy.prototype.die();
 assert.equal(h.hits.damage,400);
 assert.equal(h.hits.slows,400);
 assert.equal(h.hits.loot,1);
 assert.equal(h.v.dmgText,10);
 assert.equal(h.v.burst,7);
 assert.equal(p.stats.skipped.dmgText,390);
 assert.equal(p.stats.skipped.burst,393);
 assert.equal(h.v.lastBurst[3],3,'small cosmetic bursts retain their original size');
 h.G.FX.dmgText(20,30,'👑 Legendary defeated','#fff');
 h.G.FX.ring(20,30,12,200,'#fff',1,6);
 assert.equal(h.v.dmgText,11,'non-numeric boss/reward notices must always render');
 assert.equal(h.v.ring,1,'boss telegraphs may not be throttled');
 h.advance(101);
 h.G.FX.dmgText(20,30,500,'#fff');
 h.G.FX.burst(20,30,'#fff',3,15);
 assert.equal(h.v.dmgText,12,'budget renews rather than permanently hiding numbers');
 assert.equal(h.v.burst,8);
});
test('small Rift encounters and menu visuals remain fully unchanged',()=>{
 const h=setup(4);
 for(let i=0;i<80;i++){
  h.G.FX.dmgText(0,0,'500');h.G.FX.burst(0,0,'#fff',7,30);
 }
 assert.equal(h.v.dmgText,80);
 assert.equal(h.v.burst,80);
 h.G.EnemyMgr.count=60;h.G.Game.state='ui';
 for(let i=0;i<20;i++){h.G.FX.dmgText(0,0,'77');h.G.FX.burst(0,0,'#fff',3);}
 assert.equal(h.v.dmgText,100);assert.equal(h.v.burst,100);
 assert.equal(h.G.PKMSVVHordePerformance.stats.skipped.dmgText,0);
});
test('budget is idempotent and can be disabled for controlled A/B QA; no enemy array is scanned when count exists',()=>{
 const h=setup(64),p=h.G.PKMSVVHordePerformance;
 h.G.EnemyMgr.all=()=>{throw Error('A full horde scan on every FX frame is prohibited');};
 assert.equal(p.install(),true);
 assert.equal(p.install(),true);
 for(let i=0;i<50;i++)h.G.FX.dmgText(0,0,'200');
 assert.equal(h.v.dmgText,14);
 p.setEnabled(false);
 for(let i=0;i<50;i++)h.G.FX.dmgText(0,0,'200');
 assert.equal(h.v.dmgText,64,'QA can disable cosmetic budget to compare FPS');
 p.setEnabled(true);
});
test('Web / Android QA / Windows PC QA packages contain the SAME adaptive FX module',()=>{
 const read=p=>fs.readFileSync(path.join(root,p),'utf8');
 for(const p of ['scripts/promote-web-v20.cjs','scripts/patch-pokebox-stage4-apk-qa.cjs',
  'scripts/build-pokebox-stage1-pc-qa.cjs']){
  assert.match(read(p),/pkmsvv-horde-performance\.js/,p);
 }
 assert.match(read('.github/workflows/publish-web-v20.yml'),/horde-performance\.test\.cjs/);
 assert.match(read('.github/workflows/pokebox-stage4-android-qa.yml'),/horde-performance\.test\.cjs/);
 assert.match(read('.github/workflows/pokebox-stage2-pc-qa.yml'),/horde-performance\.test\.cjs/);
});
test('Lv20 at 12 enemies trims cosmetic explosions and preserves real damage',()=>{
 const h=setup(12),p=h.G.PKMSVVHordePerformance;
 for(let i=0;i<75;i++){
  h.G.Enemy.prototype.hurt(300);
  h.G.FX.burst(20,30,'#fff',28,120);
  h.G.FX.dmgText(20,30,'300','#fff');
 }
 assert.equal(h.hits.damage,75);
 assert.equal(h.v.burst,10);
 assert.equal(h.v.dmgText,14);
 assert.equal(h.v.lastBurst[3],6);
 assert.ok(p.stats.particlesReduced>=220);
 assert.equal(p.stats.threshold,8);
 h.G.FX.ring(1,2,15,250,'#fff',.7,4);
 assert.equal(h.v.ring,1,'boss telegraphs must never be suppressed');
});
test('Small fights remain visually identical, and FX budgets are opt-out for QA',()=>{
 const h=setup(7);
 for(let i=0;i<35;i++)h.G.FX.burst(1,2,'#fff',21,160);
 assert.equal(h.v.burst,35);
 assert.equal(h.v.lastBurst[3],21);
 assert.equal(h.G.PKMSVVHordePerformance.stats.particlesReduced,0);
 h.G.EnemyMgr.count=40;h.G.PKMSVVHordePerformance.setEnabled(false);
 h.G.FX.burst(1,2,'#fff',30,160);
 assert.equal(h.v.lastBurst[3],30);
});
