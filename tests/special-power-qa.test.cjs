'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-special-power-qa.js'),'utf8');
function fixture(){
 const s={partner:25,owned:{25:1,6:1},megaStones:{charizarditex:1},arenaPoints:240,pkmsvvChapter7Seen:true};
 const p={dex:25,hp:75,maxHp:100,atkMul:2,_megaEnergy:100,dead:false};
 const G={DB:{save:s,commit:()=>true},Game:{player:p,state:'ui'},Coop:{active:false},PKMSVVQuickRegion:{active:true},PKMSVVMegaPhase3:{energy:p=>p._megaEnergy}};
 vm.runInNewContext(src,{G,console});return {G,p,s,api:G.PKMSVVSpecialPowerQA};
}
test('old save defaults to Mega; select per species without altering stones or Arena points',async()=>{
 const {G,p,s,api}=fixture(),before=JSON.stringify(s.megaStones);
 assert.equal(api.selected(s,25),'mega');
 assert.equal(await api.equip('dynamax',25),true);
 assert.equal(api.selected(s,25),'dynamax');assert.equal(api.selected(s,6),'mega');
 assert.equal(await api.equip('terastal',25),false);assert.equal(await api.equip('zmove',25),false);
 assert.equal(await api.equip('dynamax',999),false);
 assert.equal(JSON.stringify(s.megaStones),before);assert.equal(s.arenaPoints,240);
 G.DB.commit=()=>false;assert.equal(await api.equip('mega',25),false);assert.equal(api.selected(s,25),'dynamax');
 G.Game.state='playing';assert.equal(await api.equip('mega',25),false);assert.equal(api.allowsMega(p),false);
 G.Coop.active=true;assert.equal(api.allowsMega(p),true);assert.equal(api.activate(p),false);
});
test('Dynamax real HP and attack multipliers, cooldown, pause, no healing exploit, preserves other buffs',async()=>{
 const {G,p,api}=fixture();await api.equip('dynamax');G.Game.state='playing';
 assert.equal(api.activate(p),true);assert.equal(p.maxHp,200);assert.equal(p.hp,150);assert.equal(p.atkMul,2.8);
 assert.equal(api.activate(p),false);assert.equal(p._megaEnergy,0);
 p.hp=80;p.atkMul*=1.25;p.maxHp+=20;
 G.Game.state='levelup';api.tick(p,20);assert.equal(api.state(p).remaining,12);
 G.Game.state='playing';api.tick(p,12);
 assert.equal(p.maxHp,120);assert.ok(Math.abs(p.hp-120*80/220)<1e-8);assert.ok(Math.abs(p.atkMul-2.5)<1e-8);
 assert.equal(api.state(p).cooldown,80);p._megaEnergy=100;assert.equal(api.canActivate(p),false);
 api.tick(p,80);assert.equal(api.activate(p),true);
 p.dead=true;p.hp=0;api.tick(p,1);assert.equal(p.hp,0);assert.equal(p.maxHp,120);assert.equal(p._pkmsvvSpecialPowerActive,undefined);
});
test('Chapter 7 gate and Mega remain compatible, save data not mutated by run state',async()=>{
 const {G,p,s,api}=fixture();s.pkmsvvChapter7Seen=false;assert.equal(await api.equip('dynamax'),false);
 G.Game.state='playing';assert.equal(api.allowsMega(p),true);assert.equal(api.activate(p),false);
 assert.equal(s.pkmsvvPowerLoadout,undefined);
});
