'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {pressureAt,bossPressure,scaleEnemy}=require('../scripts/patch-native-passive-pressure.cjs');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,a+' != '+b);
test('Approved 0–30 min HP and damage ramp is continuous, monotonic, bounded',()=>{
 const hp=[1,1.1,1.25,1.4,1.55,1.75,2],dmg=[1,1.05,1.15,1.25,1.35,1.45,1.5];
 for(let i=0;i<7;i++){const p=pressureAt(i*300);close(p.hp,hp[i]);close(p.dmg,dmg[i]);}
 for(let t=1;t<=1800;t++){const p=pressureAt(t),q=pressureAt(t-1);assert.ok(p.hp>=q.hp&&p.dmg>=q.dmg);assert.ok(p.hp-q.hp<.001);}
 assert.deepEqual(pressureAt(99999),{hp:2,dmg:1.5});
 assert.deepEqual(pressureAt(-10),{hp:1,dmg:1});
});
test('Boss 15/30 minute bonuses preserve early bosses and cap progression',()=>{
 assert.deepEqual(bossPressure(180),{hp:1,dmg:1});
 assert.deepEqual(bossPressure(900),{hp:1.5,dmg:1.25});
 assert.deepEqual(bossPressure(1800),{hp:2,dmg:1.35});
});
test('Scaling does not change XP, speed, spawn population or saved progression',()=>{
 const e={hp:100,maxHp:100,dmg:20,spd:90,xp:12};
 scaleEnemy(e,{hp:1.4,dmg:1.2});
 assert.deepEqual(e,{hp:140,maxHp:140,dmg:24,spd:90,xp:12});
});
test('Compiled Beta contains real spawner scaling and all three shortened control timers',()=>{
 if(process.env.PKMSVV_BETA_176_SKILLS_QA!=='1')return;
 const read=p=>fs.readFileSync(path.join(__dirname,'../vendor/pokesurvivor',p),'utf8');
 const spawn=read('js/systems/spawner.js'),enemy=read('js/entities/enemy.js');
 assert.match(spawn,/scaleEnemy\(e,\{hp:m\.hp\*\(e\.pkmsvvPressureElite\?1\.4:1\),dmg:m\.dmg\*\(e\.pkmsvvPressureElite\?1\.2:1\)\}\)/);
 assert.match(spawn,/scaleEnemy\(e,bossPressure/);
 assert.match(spawn,/G\.PKMSVVFossilExpedition\?\.session/);
 assert.match(spawn,/G\.Social\?\.room\?\.mode==='coop'/);
 for(const status of ['stunT','slowT','sleepT']){
  const line=enemy.split('\n').find(s=>s.includes('this.'+status+' = Math.max')&&s.includes('pkmsvvPressureBoss'));
  assert.ok(line,status+' must apply boss resistance at status application');
 }
});
