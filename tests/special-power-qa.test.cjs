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

test('source-derived Dynamax size, crush cadence, prop destruction and splash exclusions',async()=>{
 const {G,p,api}=fixture(),hits=[];
 Object.assign(p,{x:0,y:0,r:18,bodyH:36,anim:{dex:25,scale:1},atk:2,level:10,dmgDealt:0});
 G.Sprites={bodyHeight:(dex,scale)=>36*scale};
 const enemy=(id,extra={})=>({id,x:15,y:0,hurt(d,col,dx,dy,knock){hits.push({id,d,knock});},...extra});
 const mob=enemy(1),boss=enemy(2,{boss:true}),legend=enemy(3,{legend:true}),friend=enemy(4,{friendly:true}),remote=enemy(5,{remote:true}),arceus=enemy(6,{arceus:true});
 G.EnemyMgr={queryCircle:()=>[mob,boss,legend,friend,remote,arceus]};
 const prop={destructible:true,hp:15},protectedProp={destructible:true,hp:15,pkmsvvMission:true},props=[];
 G.World={propsInCircle:()=>[prop,protectedProp],damageProp:(p,d)=>{props.push(d);p.hp=0;}};
 await api.equip('dynamax');G.Game.state='playing';
 assert.equal(api.activate(p),true);assert.equal(p.anim.scale,1.8);assert.equal(p.r,18);assert.ok(Math.abs(p.bodyH-64.8)<1e-9);
 api.tick(p,.1);assert.equal(hits.length,1);assert.equal(hits[0].id,1);assert.ok(Math.abs(hits[0].d-134.4)<1e-8);assert.equal(hits[0].knock,300);
 assert.deepEqual(props,[9999]);assert.equal(protectedProp.hp,15);
 api.tick(p,.2);assert.equal(hits.length,1);
 api.tick(p,.4);assert.equal(hits.length,2);
 hits.length=0;
 assert.equal(api.afterHit(p,mob,100),2);assert.deepEqual(hits.map(x=>[x.id,x.d]),[[2,40],[3,40]]);
 api.stop(p);assert.equal(p.anim.scale,1);assert.equal(p.bodyH,36);assert.equal(api.afterHit(p,mob,100),0);
});
