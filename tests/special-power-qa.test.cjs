'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-special-power-qa.js'),'utf8');
function fixture(){
 const s={partner:25,owned:{25:1,6:1},megaStones:{charizarditex:1},arenaPoints:240,arenaGacha:{points:240,pity:9,pulls:3},pkmsvvPowerItems:{dynamax:true,'zmove:electric':true,'terastal:fire':true,'terastal:flying':true},pkmsvvChapter7Seen:true};
 const p={dex:25,hp:75,maxHp:100,atkMul:2,_megaEnergy:100,dead:false};
 const G={DEX_BY:{25:{types:['electric']},6:{types:['fire','flying']}},DB:{save:s,commit:()=>true},Game:{player:p,state:'ui'},Coop:{active:false},PKMSVVQuickRegion:{active:true},PKMSVVMegaPhase3:{energy:p=>p._megaEnergy}};
 vm.runInNewContext(src,{G,console});return {G,p,s,api:G.PKMSVVSpecialPowerQA};
}
test('old save defaults to Mega; select per species without altering stones or Arena points',async()=>{
 const {G,p,s,api}=fixture(),before=JSON.stringify(s.megaStones);
 assert.equal(api.selected(s,25),'mega');
 assert.equal(await api.equip('dynamax',25),true);
 assert.equal(api.selected(s,25),'dynamax');assert.equal(api.selected(s,6),'mega');
 assert.equal(await api.equip('terastal',25),true);assert.equal(api.selected(s,25),'terastal');assert.equal(await api.equip('zmove',25),true);assert.equal(api.selected(s,25),'zmove');assert.equal(await api.equip('dynamax',25),true);
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

test('source-based Z-Power uses native wave/projectile, typed damage, natural expiry only',async()=>{
 const {G,p,api}=fixture(),hits=[],shots=[],rings=[];
 Object.assign(p,{x:0,y:0,aim:0,atk:2,level:10,mon:{types:['electric']},dmgDealt:0});
 const mob={x:30,y:0,types:['water'],hurt:(d,c,x,y,k)=>hits.push({d,k})};
 const far={x:300,y:0,types:['water'],hurt:(d,c,x,y,k)=>hits.push({d,k})};
 const friend={x:10,y:0,friendly:true,hurt:()=>{throw Error('friendly hit');}};
 G.EnemyMgr={queryCircle:(x,y,r)=>r<300?[mob,friend]:[mob,far,friend]};
 G.Types={mult:()=>2,label:()=> 'super'};
 G.FX={ring:(x,y,a,r)=>rings.push(r)};
 G.Projectiles={spawn:o=>{shots.push(o);return o;},all:()=>shots,remove:o=>shots.splice(shots.indexOf(o),1)};
 await api.equip('zmove');G.Game.state='playing';
 assert.equal(api.allowsMega(p),false);assert.equal(api.activate(p),true);
 assert.equal(p.maxHp,100);assert.equal(p.atkMul,2);assert.equal(hits.length,1);assert.ok(Math.abs(hits[0].d-336)<1e-8);
 api.tick(p,.2);assert.equal(shots.length,0);
 api.tick(p,.11);assert.equal(shots.length,1);assert.equal(shots[0].owner,p);assert.equal(shots[0].mtype,'electric');assert.equal(shots[0].pierce,999);assert.equal(shots[0].life,2.4);assert.equal(shots[0].vx,260);
 G.Game.state='choice';api.tick(p,2);assert.equal(shots.length,1);
 G.Game.state='playing';api.tick(p,1.2);assert.equal(shots.length,2);
 api.tick(p,14);assert.equal(p._pkmsvvSpecialPowerActive,undefined);assert.equal(api.state(p).cooldown,60);
 assert.deepEqual(rings,[220,420]);assert.equal(hits.length,3);assert.ok(Math.abs(hits[1].d-1075.2)<1e-8);
 assert.equal(api.stop(p),false);p._megaEnergy=100;api.tick(p,60);
 assert.equal(api.activate(p),true);api.tick(p,.4);p.dead=true;api.tick(p,.1);
 assert.equal(hits.length,4,'no terminal wave on death');assert.equal(shots.length,0);
 assert.equal(Object.keys(api.Z_NAMES).length,18);
});


test('Terastal matches only chosen crystal type, no global attack buff, pause, cooldown and cleanup',async()=>{
 const {G,p,api}=fixture();p.mon={types:['fire','flying']};
 assert.equal(await api.equip('terastal',25,'fire'),true);G.Game.state='playing';
 assert.equal(api.activate(p),true);assert.equal(api.allowsMega(p),false);assert.equal(p.atkMul,2);assert.equal(p.maxHp,100);assert.equal(p._megaEnergy,0);
 assert.equal(api.damageMultiplier(p,'fire'),1.8);assert.equal(api.damageMultiplier(p,'flying'),1);assert.equal(api.damageMultiplier(p,'water'),1);assert.equal(api.damageMultiplier(p,'fire',{}),1);
 G.Game.state='choice';api.tick(p,30);assert.equal(api.state(p).remaining,30);assert.equal(api.damageMultiplier(p,'fire'),1);
 G.Game.state='playing';api.tick(p,30);assert.equal(api.damageMultiplier(p,'fire'),1);assert.equal(api.state(p).cooldown,75);
 p._megaEnergy=100;assert.equal(api.activate(p),false);api.tick(p,75);assert.equal(api.activate(p),true);
 p.dead=true;api.tick(p,.1);assert.equal(api.damageMultiplier(p,'fire'),1);assert.equal(p._pkmsvvSpecialPowerActive,undefined);
});

 test('shared Arena wallet: paid permanent unlocks, no duplicates, no Mega pity mutation, save rollback',async()=>{
 const {G,s,api}=fixture();delete s.pkmsvvPowerItems;s.pkmsvvPowerLoadout={25:'dynamax'};const before=JSON.stringify(s.megaStones);
 assert.equal(api.selected(s,25),'mega');assert.equal(await api.equip('dynamax'),false);assert.equal(await api.buy('unknown'),null);
 assert.equal((await api.buy('dynamax')).key,'dynamax');assert.equal(s.arenaGacha.points,140);assert.equal(await api.buy('dynamax'),null);
 assert.equal(await api.equip('dynamax'),true);assert.equal(api.selected(s,25),'dynamax');
 const z=await api.buy('zmove',()=>0);assert.equal(z.type,'normal');assert.equal(s.arenaGacha.points,40);assert.equal(api.pool(s,'zmove').includes('zmove:normal'),false);assert.equal(await api.equip('zmove',25),false);
 assert.equal(await api.buy('terastal'),null);assert.equal(s.arenaGacha.pity,9);assert.equal(s.arenaGacha.pulls,3);assert.equal(JSON.stringify(s.megaStones),before);
 s.arenaGacha.points=200;G.DB.commit=()=>false;const original=JSON.stringify(s);assert.equal(await api.buy('terastal',()=>0),null);assert.equal(JSON.stringify(s),original);
 G.DB.commit=()=>true;assert.equal((await api.buy('terastal',()=>0)).type,'normal');assert.equal(await api.equip('terastal',6,'normal'),true);assert.equal(api.chosenType(s,'terastal',6),'normal');assert.equal(api.selected(s,25),'dynamax');
 G.Game.state='playing';assert.equal(await api.buy('zmove'),null);
 });

test('G-Max locked without verified distinct art, no Arena spending',async()=>{const {G,s,api}=fixture();s.pkmsvvPowerItems['gigantamax:25']=true;assert.equal(api.gmaxArt(25),null);assert.equal(await api.equip('gigantamax'),false);assert.equal(api.canBuy('gigantamax'),false);assert.equal(s.arenaGacha.points,240);G.PKMSVV_GMAX_ART={25:{dex:25,spriteId:25,verified:true}};assert.equal(api.gmaxArt(25),null);});
test('G-Max synthetic art fixture: animator swap, typed Volt Crash and restore',async()=>{const {G,p,s,api}=fixture();s.pkmsvvPowerItems['gigantamax:25']=true;G.PKMSVV_GMAX_ART={25:{dex:25,spriteId:5025,verified:true}};G.SPRITE_META={5025:{a:{Idle:1,Walk:1,Attack:1,Hurt:1}}};G.Sprites={Animator:class{constructor(dex,scale){this.dex=dex;this.scale=scale;}},bodyHeight:(d,scale)=>30*scale};Object.assign(p,{anim:{dex:25,scale:1,dir:2},bodyH:30,x:0,y:0,r:18,atk:2,level:10});const original=p.anim;const mob={x:5,y:0,hp:1000,hurt(d){this.hp-=d;},applyStun(t){this.stun=t;}},other={x:10,y:0,hp:1000,hurt(d){this.hp-=d;},applyStun(t){this.stun=t;}};G.EnemyMgr={queryCircle:()=>[mob,other]};assert.equal(await api.equip('gigantamax'),true);G.Game.state='playing';assert.equal(api.activate(p),true);assert.equal(p.anim.dex,5025);assert.equal(p.r,18);assert.equal(p.maxHp,200);api.afterHit(p,mob,100,'fire');assert.equal(mob.stun,undefined);api.afterHit(p,mob,100,'electric');assert.equal(mob.stun,.4);const hp=mob.hp;api.afterHit(p,mob,100,'electric');assert.equal(mob.hp,hp,'signature cooldown');api.stop(p);assert.equal(p.anim,original);assert.equal(p.maxHp,100);assert.equal(p.atkMul,2);});

test('G-Max synthetic Charizard Wildfire: three typed ticks, boss half damage, no pause ticks or late damage',async()=>{const {G,p,s,api}=fixture();p.dex=6;s.partner=6;s.pkmsvvPowerItems['gigantamax:6']=true;G.PKMSVV_GMAX_ART={6:{dex:6,spriteId:5006,verified:true}};G.SPRITE_META={5006:{a:{Idle:1,Walk:1,Attack:1,Hurt:1}}};G.Sprites={Animator:class{constructor(dex,scale){this.dex=dex;this.scale=scale;}},bodyHeight:(d,scale)=>30*scale};Object.assign(p,{anim:{dex:6,scale:1,dir:2},bodyH:30,x:0,y:0,r:18,atk:2,level:10});const make=(x,boss=false)=>({x,y:0,boss,hp:1000,hurt(d){this.hp-=d;}});const mob=make(200),boss=make(220,true);G.EnemyMgr={queryCircle:(x,y,r)=>[mob,boss].filter(e=>Math.hypot(e.x-x,e.y-y)<=r)};assert.equal(await api.equip('gigantamax',6),true);G.Game.state='playing';assert.equal(api.activate(p),true);api.afterHit(p,mob,100,'water');assert.equal(api.state(p).wildfire,null);api.afterHit(p,mob,100,'fire');const h=mob.hp,b=boss.hp;G.Game.state='levelup';api.tick(p,5);assert.equal(mob.hp,h);G.Game.state='playing';api.tick(p,.1);api.tick(p,1);api.tick(p,1);assert.ok(Math.abs(mob.hp-(h-105))<1e-8);assert.ok(Math.abs(boss.hp-(b-52.5))<1e-8);assert.equal(api.state(p).wildfire,null);api.stop(p);api.tick(p,5);assert.ok(Math.abs(mob.hp-(h-105))<1e-8);assert.equal(p.anim.dex,6);});
