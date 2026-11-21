'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const moduleCode=fs.readFileSync(path.join(root,'src/pkmsvv-3ds-skill-port.js'),'utf8');
const patchCode=fs.readFileSync(path.join(root,'scripts/patch-3ds-skill-effects-passives.cjs'),'utf8');
const prepCode=fs.readFileSync(path.join(root,'scripts/prepare-game.cjs'),'utf8');

function setup() {
 const called=[];
 const G={
  I18n:{lang:'vi'},
  LevelUp:{STATS:[{id:'hp',title:'Vigor',apply(){}}]},
  FX:{
   ring(...args){called.push(['ring',...args]);},
   burst(...args){called.push(['burst',...args]);},
   dmgText(...args){called.push(['text',...args]);},
   sp(...args){called.push(['sp',...args]);},
   spark(...args){called.push(['spark',...args]);}
  }
 };
 let clock=1000;
 vm.runInNewContext(moduleCode,{G,performance:{now:()=>clock},Date,Math});
 return {G,called,port:G.PKMSVV3DSSkillPort,setClock(v){clock=v}};
}
test('3DS passive card pack is additive, idempotent and keeps original run stats',()=>{
 const f=setup(),ids=f.G.LevelUp.STATS.map(x=>x.id);
 assert.equal(ids.join(','),'hp,crit,critd,hunt,dodge,luck,coin');
 assert.equal(f.port.register(),0,'reinstall must not duplicate cards');
 assert.equal(f.G.LevelUp.STATS.length,7);
 assert.ok(f.G.LevelUp.STATS.every(c=>c.id==='hp'||c.pkmsvv3ds===true));
});
test('4 choices only after 25 levels or 8 learned skills; 2 stat cards guaranteed in port contract',()=>{
 const f=setup();
 assert.equal(f.port.offerCount({level:24,moves:Array(7)}),3);
 assert.equal(f.port.minimumPassiveCards({level:24,moves:Array(7)}),0);
 assert.equal(f.port.offerCount({level:25,moves:Array(2)}),4);
 assert.equal(f.port.offerCount({level:5,moves:Array(8)}),4);
 assert.equal(f.port.minimumPassiveCards({level:25,moves:Array(2)}),2);
 assert.equal(f.port.minimumPassiveCards({level:5,moves:Array(8)}),2);
});
test('native stat changes modify actual combat/player fields; no permanent save writes',()=>{
 const f=setup(),by=Object.fromEntries(f.G.LevelUp.STATS.map(x=>[x.id,x]));
 const p={x:10,y:20,bodyH:16,statsTaken:{},critChance:0.04,coinMul:1.1,coins:5};
 by.crit.apply(p);assert.equal(Number(p.critChance.toFixed(4)),0.06);
 by.critd.apply(p);assert.equal(p.pkmsvv3dsCritDmg,0.05);
 by.hunt.apply(p);assert.equal(p.pkmsvv3dsBossDmg,0.06);
 assert.equal(f.port.bossMultiplier(p,{boss:true}),1.06);
 assert.equal(f.port.bossMultiplier(p,{boss:false}),1);
 assert.equal(f.port.critMultiplier(p),1.55);
 by.dodge.apply(p);assert.equal(p.pkmsvv3dsDodge,0.03);
 by.luck.apply(p);assert.equal(Number(p.coinMul.toFixed(4)),1.21);
 p.statsTaken.luck=1;
 by.luck.apply(p);assert.equal(Number(p.coinMul.toFixed(4)),1.32);
 by.coin.apply(p);assert.equal(p.coins,65);
 assert.ok(f.called.some(x=>x[0]==='ring'),'native effect feedback must use real existing FX API');
});
test('dodge is bounded to 15%; crit effects throttled under eight concurrent auto moves',()=>{
 const f=setup(),p={x:4,y:3,bodyH:22,pkmsvv3dsDodge:0.3};
 assert.equal(f.port.rollDodge(p,()=>0.10),true);
 assert.equal(f.port.rollDodge(p,()=>0.16),false);
 f.port.onDodge(p);
 assert.ok(f.called.some(x=>x[0]==='sp'));
 const e={x:30,y:40,bodyH:10};
 f.port.onCrit(p,e);
 const first=f.called.filter(x=>x[0]==='spark').length;
 f.setClock(1080);f.port.onCrit(p,e);
 assert.equal(f.called.filter(x=>x[0]==='spark').length,first);
 f.setClock(1170);f.port.onCrit(p,e);
 assert.equal(f.called.filter(x=>x[0]==='spark').length,first+1);
});
test('shared build integration keeps original combat effects and controller's three-card pages',()=>{
 assert.match(prepCode,/patch-3ds-skill-effects-passives\.cjs/);
 assert.match(patchCode,/js\/systems\/levelup\.js/);
 assert.match(patchCode,/js\/entities\/player\.js/);
 assert.match(patchCode,/js\/systems\/combat\.js/);
 assert.match(patchCode,/pkmsvv-3ds-skill-port\.js/);
 assert.match(patchCode,/minimumPassiveCards/);
 assert.match(patchCode,/bossMultiplier/);
 assert.match(patchCode,/onCrit/);
 assert.doesNotMatch(patchCode,/save\.json|save\.bak|pokedex\.json|Title ID/);
 const ctrl=fs.readFileSync(path.join(root,'src/pkmsvv-modal-navigation-qa.js'),'utf8');
 assert.match(ctrl, /session\.offers\.slice\(session\.page\*3,session\.page\*3\+3\)/);
});
