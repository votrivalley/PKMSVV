'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('Chapter 3 continues existing arc, unlocks on six USED types, and preserves replay',()=>{
 const source=read('src/pkmsvv-story.js');
 for(const n of ['chapter1','chapter2','chapter3','pkmsvvChapter3Seen','pkmsvvChapter3Pending','pkmsvvOrbTypeMask','Arceus','MẦM SỐNG BỊ LÃNG QUÊN']){
  assert.ok(source.includes(n),n);
 }
 assert.doesNotMatch(source,/Giáo sư Korrin|Professor Korrin|phòng thí nghiệm/);
 assert.match(read('scripts/patch-v15-story.cjs'),/for\(const ch of \[1,2,3\]\)/);
 assert.match(read('src/v14/orbs.js'),/pkmsvvOrbTypeMask&63\)===63/);
 const save={pkmsvvChapter2Seen:false,stats:{pkmsvvOrbTypeMask:63}};
 let commits=0;
 const G={I18n:{lang:'vi'},DB:{save,commit:()=>commits++}};
 vm.runInNewContext(source,{G,document:{getElementById:()=>null}});
 assert.equal(G.PKMSVVStory.markChapter3(),false,'Chapter 2 must be completed');
 save.pkmsvvChapter2Seen=true;
 assert.equal(G.PKMSVVStory.markChapter3(),true);
 assert.equal(save.pkmsvvChapter3Pending,true);
 assert.equal(G.PKMSVVStory.markChapter3(),false,'Do not re-trigger pending story');
 assert.equal(commits,1);
});

test('Egg Rush is online-only, host owns score, exactly ten nests spawn over five waves',()=>{
 const source=read('src/web/pkmsvv-egg-rush.js');
 let events=[],end=null;
 const members=[0,1,2,3].map(i=>({uid:'p'+i,name:'Player'+i,dex:25+i}));
 const players=members.map(m=>({uid:m.uid,x:1000,y:1000,dead:false,level:1}));
 const G={
  I18n:{lang:'vi'},Sprites:{preload(){},Animator:class{update(){}draw(){}}},
  World:{isFree:()=>true,isLiquid:()=>false},U:{dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2},
  Coop:{isHost:true,broadcast:e=>events.push(e)},
  Game:{player:players[0]},Social:{uid:'p0'},
  Spawner:{say(){}},FX:{ring(){}},
  Moves:{BY_ID:{}},EnemyMgr:{all:()=>[]}
 };
 vm.runInNewContext(source,{G,Math,Map,Object,Number});
 G.EggRush.begin({mode:'eggrush',seed:117,members});
 assert.equal(G.EggRush.active,true);
 for(let wave=0;wave<5;wave++){
  const time=8+wave*132;
  G.EggRush.update(.05,time,players,r=>{end=r;});
  const unclaimed=events.filter(e=>e[0]==='er'&&e[1]==='spawn');
  assert.equal(unclaimed.length,(wave+1)*2);
  // Give six separate eggs to player zero: all awards require the host to see proximity.
  if(wave<3){
   const targets=unclaimed.slice(wave*2,wave*2+2);
   for(const t of targets){players[0].x=t[3];players[0].y=t[4];
    G.EggRush.update(.05,time+.1,players,r=>{end=r;});}
  }
  if(end)break;
 }
 assert.equal(G.EggRush.collected,6);
 assert.equal(end.winner,'p0');
 assert.equal(end.standings[0].eggs,6);
 assert.equal(events.filter(e=>e[1]==='take').length,6);
 assert.equal(G.EggRush.standings().length,4);
 assert.match(source,/Egg Rush/);
 assert.match(read('scripts/patch-v15-egg-rush-web.cjs'),/room.mode==='eggrush'\?4:2/);
});

test('Solo egg nest requires 4 seconds, interruption resets progress, and hit delays hatching 3s',()=>{
 const source=read('src/v15/eggs.js');
 const player={x:0,y:0,dead:false,kills:0,level:1,maxHp:150,hp:150,heal(v){this.hp=Math.min(this.maxHp,this.hp+v);}};
 const save={pkmsvvChapter3Seen:true,pkmsvvEggSlot3:false,stats:{}};
 const visuals=[];
 const G={I18n:{lang:'vi'},DB:{save,commit(){}},
  Sprites:{preload(){},dirFromAngle:()=>0,Animator:class{loop(){}update(){}draw(){}}},
  U:{dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2},
  World:{isFree:()=>true,isLiquid:()=>false},
  Spawner:{say(){}},FX:{ring(){},dmgText(...a){visuals.push(a);}},
  Coop:{active:false},EnemyMgr:{all:()=>[]}};
 vm.runInNewContext(source,{G,document:{createElement:()=>({})},Math,Number,Object});
 G.PKMSVVEggs.begin(player,false);
 G.PKMSVVEggs.update(.1,player,60,false);
 assert.equal(G.PKMSVVEggs.nests.length,1);
 const nest=G.PKMSVVEggs.nests[0];
 player.x=nest.x;player.y=nest.y;
 for(let i=0;i<19;i++)G.PKMSVVEggs.update(.1,player,60+i*.1,false);
 assert.equal(G.PKMSVVEggs.followers.length,0,'Cannot collect by touching or waiting less than four seconds');
 assert.ok(nest.collecting>1.7&&nest.collecting<2.1);
 player.x+=70;
 G.PKMSVVEggs.update(.1,player,64,false);
 assert.equal(nest.collecting,0,'Leaving capture radius resets the channel');
 player.x=nest.x;player.y=nest.y;
 for(let i=0;i<41;i++)G.PKMSVVEggs.update(.1,player,65+i*.1,false);
 assert.equal(G.PKMSVVEggs.nests.length,0);
 assert.equal(G.PKMSVVEggs.followers.length,1);
 const egg=G.PKMSVVEggs.followers[0];
 const before=G.PKMSVVEggs.remaining(egg);
 G.PKMSVVEggs.onHurt(0);
 assert.equal(G.PKMSVVEggs.remaining(egg),before,'Zero HP damage must not delay');
 G.PKMSVVEggs.onHurt(12);
 assert.equal(G.PKMSVVEggs.remaining(egg),before+3);
 assert.equal(egg.penalty,3);
 assert.ok(visuals.some(v=>v.includes('+3s')),'Delay must be signposted');
 for(let i=0;i<245;i++){player.kills++;G.PKMSVVEggs.update(.1,player,74+i*.1,false);}
 assert.equal(egg.hatched,true,'Combat-accelerated incubation still hatches');
 assert.equal(G.PKMSVVEggs.limit(),1);
 save.pkmsvvEggSlot2=true;assert.equal(G.PKMSVVEggs.limit(),2);
 save.pkmsvvEggSlot3=true;assert.equal(G.PKMSVVEggs.limit(),2);
});

test('Igglybuff support slows targets and emits target/support VFX only on successful cast',()=>{
 const source=read('src/v15/eggs.js');
 const player={x:0,y:0,dead:false,kills:0,level:1,maxHp:100,hp:100,heal(){}};
 const save={pkmsvvChapter3Seen:true,stats:{}};
 const enemy={x:0,y:0,dead:false,remote:false,applySlow(k,d){this.slow=(this.slow||0)+1;this.slowPower=k;this.duration=d;}};
 let rings=0,bursts=0,damageTexts=[];
 const G={I18n:{lang:'vi'},DB:{save,commit(){}},
  Sprites:{preload(){},dirFromAngle:()=>0,Animator:class{loop(){}update(){}draw(){}}},
  U:{dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2},
  World:{isFree:()=>true,isLiquid:()=>false},
  Spawner:{say(){}},FX:{ring(){rings++;},burst(){bursts++;},dmgText(...a){damageTexts.push(a);}},
  Coop:{active:false},EnemyMgr:{all:()=>[enemy]}};
 const fixedMath=Object.create(Math);fixedMath.random=()=>.91; // top end of ordinary 88% pool = Igglybuff (#174)
 vm.runInNewContext(source,{G,document:{createElement:()=>({})},Math:fixedMath,Number,Object});
 G.PKMSVVEggs.begin(player,false);
 G.PKMSVVEggs.update(.1,player,60,false);
 const nest=G.PKMSVVEggs.nests[0];player.x=nest.x;player.y=nest.y;
 for(let i=0;i<41;i++)G.PKMSVVEggs.update(.1,player,61+i*.1,false);
 const egg=G.PKMSVVEggs.followers[0];
 assert.equal(egg.dex,174);
 for(let i=0;i<205;i++){player.kills++;G.PKMSVVEggs.update(.1,player,70+i*.1,false);}
 assert.equal(egg.hatched,true);
 assert.equal(egg.active,true);
 enemy.x=egg.x;enemy.y=egg.y;
 for(let i=0;i<42;i++)G.PKMSVVEggs.update(.25,player,100+i*.25,false);
 assert.ok(enemy.slow>0,'Igglybuff must apply a real debuff');
 assert.ok(enemy.slowPower>0&&enemy.duration>0);
 assert.ok(rings>=2&&bursts>=1,'Visual rings and particles mark successful slow');
 assert.ok(damageTexts.some(args=>args.includes('CHẬM!')),'Slow effect is visible to the player');
});

test('egg direction indicator, reverse timer bars, walking animation and shield-safe damage are bundled',()=>{
 const src=read('src/v15/eggs.js');
 assert.match(src,/function arrow\(ctx,w,h\)/);
 assert.match(src,/ctx\.fillRect\(x-width\/2,y,width\*ratio,2\)/);
 assert.match(src,/follow\(it,j,pl,dt\)/);
 assert.match(src,/it\.anim\.loop\(moved>\.6\?'Walk':'Idle'/);
 assert.match(src,/it\.penalty=\(it\.penalty\|\|0\)\+3/);
 const patch=read('scripts/patch-v15-eggs.cjs');
 assert.match(patch,/PKMSVVEggs\?\.onHurt\?\./);
 assert.match(patch,/d-absorbed/);
});
test('real pixel egg/nest sprites are bundled for solo and Web Egg Rush',()=>{
 const script=read('scripts/patch-v15-eggs.cjs');
 const solo=read('src/v15/eggs.js');
 const online=read('src/web/pkmsvv-egg-rush.js');
 const renderer=read('src/v15/egg-sprites.js');
 const license=read('src/v15/sprites/LICENSE-SOURCE.md');
 for(const p of ['egg_follow.svg','egg_crack.svg','egg_nest.svg']){
  const asset=read('src/v15/sprites/'+p);
  assert.match(asset,/<svg\b/);
  assert.match(asset,/shape-rendering="crispEdges"/);
  assert.match(script,new RegExp(p.replace('.','\\.')));
 }
 assert.match(script,/pkmsvv-egg-sprites\.js/);
 assert.match(script,/assets','eggs'/);
 assert.match(solo,/PKMSVVEggArt\?\.egg/);
 assert.match(solo,/PKMSVVEggArt\?\.nest/);
 assert.match(online,/PKMSVVEggArt\?\.egg/);
 assert.match(online,/PKMSVVEggArt\?\.nest/);
 assert.match(renderer,/imageSmoothingEnabled=false/);
 assert.match(license,/MIT License/);
});

test('v1.5 release identity and completed egg gameplay are both packaged',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.version,'1.5.11');
 assert.equal(pkg.build.productName,'Pokemon Chuyển sinh');
 assert.ok(read('scripts/prepare-game.cjs').includes('patch-v15-eggs.cjs'));
 assert.ok(read('scripts/prepare-web.cjs').includes('patch-v15-egg-rush-web.cjs'));
});


test('3% Shiny support exists only within run at 100% of main Pokemon stats; normal rolls 50-80%',()=>{
 function makeRoll(roll){
  const save={pkmsvvChapter3Seen:true,stats:{},owned:{},shiny:{}};
  const pl={x:0,y:0,hp:160,maxHp:160,atk:80,spd:140,reduction:.14,
    dead:false,kills:0,level:1,heal(n){this.hp=Math.min(this.maxHp,this.hp+n);}};
  const rolls=[.2,.3,.999,roll,.5];const math=Object.create(Math);
  math.random=()=>rolls.length?rolls.shift():.5;
  const G={I18n:{lang:'vi'},DB:{save,commit(){}},
   Sprites:{preload(){},dirFromAngle(){return 0;},Animator:class{
    constructor(dex,size,shiny){this.dex=dex;this.shiny=shiny;}
    loop(){}update(){}draw(){}
   }},
   U:{dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2},
   World:{isFree:()=>true,isLiquid:()=>false},
   Spawner:{say(){}},FX:{ring(){}},
   Coop:{active:false},EnemyMgr:{all:()=>[]}};
  vm.runInNewContext(read('src/v15/eggs.js'),{G,Math:math,Object,Number,document:{}});
  G.PKMSVVEggs.begin(pl,false);
  G.PKMSVVEggs.update(.1,pl,60,false);
  const nest=G.PKMSVVEggs.nests[0];pl.x=nest.x;pl.y=nest.y;
  for(let i=0;i<41;i++)G.PKMSVVEggs.update(.1,pl,61+i*.1,false);
  for(let i=0;i<210;i++){pl.kills++;G.PKMSVVEggs.update(.1,pl,70+i*.1,false);}
  assert.equal(G.PKMSVVEggs.followers.length,1);
  return {save,pl,G,it:G.PKMSVVEggs.followers[0]};
 }
 const shiny=makeRoll(.029);
 assert.equal(shiny.G.PKMSVVEggs.SHINY_CHANCE,.03);
 assert.equal(shiny.it.shiny,true);
 assert.equal(shiny.it.statScale,1);
 assert.equal(shiny.it.maxHp,160);
 assert.equal(shiny.it.hp,160);
 assert.equal(shiny.it.atk,80);
 assert.equal(shiny.it.spd,140);
 assert.equal(shiny.it.anim.shiny,true);
 assert.deepEqual(shiny.save.shiny,{},'Do not unlock permanent Shiny collection entries');
 assert.equal(shiny.save.pkmsvvSupportShiny?.[shiny.it.dex],true,'A hatched Shiny companion unlocks only its support variant');
 const regular=makeRoll(.03);
 assert.equal(regular.it.shiny,false,'Exactly .03 is outside the 3% range');
 assert.equal(regular.save.pkmsvvSupportShiny?.[regular.it.dex],undefined);
 assert.equal(regular.it.statScale,.65);
 assert.equal(regular.it.maxHp,104);
 assert.equal(regular.it.atk,52);
 assert.ok(Math.abs(regular.it.spd-119)<1e-8);
 assert.ok(Math.abs(regular.it.spdScale-.85)<1e-8);
 assert.equal(shiny.it.spdScale,1);
 assert.equal(regular.it.anim.shiny,false);
});

test('full team blocks nests, teammate faint frees slot and new nest becomes possible',()=>{
 const save={pkmsvvChapter3Seen:true,stats:{}};
 const pl={x:0,y:0,dead:false,kills:0,level:1,maxHp:140,hp:140,atk:30,spd:130};
 let messages=[];
 const G={I18n:{lang:'vi'},DB:{save,commit(){}},
  Sprites:{preload(){},dirFromAngle(){return 0;},Animator:class{loop(){}update(){}draw(){}}},
  U:{dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2},
  World:{isFree:()=>true,isLiquid:()=>false},
  Spawner:{say(s){messages.push(s);}},FX:{ring(){},burst(){},dmgText(){}},
  Coop:{active:false},EnemyMgr:{all:()=>[]}};
 vm.runInNewContext(read('src/v15/eggs.js'),{G,Math,Number,Object,document:{}});
 G.PKMSVVEggs.begin(pl,false);
 const team=G.PKMSVVEggs.followers;
 save.pkmsvvEggSlot2=true; // After the Chapter 3 egg quest, full 2/2 team.
 const make=i=>({id:i,dex:172,hatched:true,active:true,x:0,y:0,anim:null,
  statScale:.6,maxHp:120,hp:120,spd:120,def:0,shield:0,
  hitCooldown:0,cooldown:99,effectFlash:0});
 team.push(make(1),make(2));
 G.PKMSVVEggs.update(.1,pl,60,false);
 assert.equal(G.PKMSVVEggs.occupied,2);
 assert.equal(G.PKMSVVEggs.nests.length,0);
 G.PKMSVVEggs.update(.1,pl,200,false);
 assert.equal(G.PKMSVVEggs.nests.length,0);
 const first=G.PKMSVVEggs.followers[0];
 for(let i=0;i<5;i++){first.hitCooldown=0;G.PKMSVVEggs.hurtSupport(first,1000);}
 assert.equal(first.hp,0);
 assert.equal(G.PKMSVVEggs.occupied,1);
 assert.equal(G.PKMSVVEggs.followers.length,1,'Fainted companion leaves the run');
 assert.ok(messages.some(s=>s.includes('hạ')),'Faint must be signposted');
 G.PKMSVVEggs.update(.1,pl,209,false);
 assert.equal(G.PKMSVVEggs.nests.length,1,'After a faint, nest spawns again');
 // A pending egg reserves the last slot, preventing over-spawning.
 G.PKMSVVEggs.followers.push({id:3,dex:174,hatched:false,active:false,x:0,y:0,
  age:0,boost:0,penalty:0,moving:false,hitCooldown:0,effectFlash:0});
 G.PKMSVVEggs.update(.1,pl,310,false);
 assert.equal(G.PKMSVVEggs.nests.length,0);
 assert.equal(G.PKMSVVEggs.occupied,2);
});

test('support touch damage is bounded, shield is absorbed and HP bars exist',()=>{
 const s=read('src/v15/eggs.js');
 assert.match(s,/const SHINY_CHANCE=\.03/);
 assert.match(s,/HIT_COOLDOWN=1\.25/);
 assert.match(s,/function hitByEnemies\(dt\)/);
 assert.match(s,/function hurtSupport\(it,raw\)/);
 assert.match(s,/Math\.min\(it\.maxHp\*\.20/);
 assert.match(s,/it\.shield=Math\.max/);
 assert.match(s,/ctx\.fillRect\(bx,by,28\*hpRatio,2\)/);
 assert.doesNotMatch(s,/chooseReplace\(/);
});

test('Boss guardians spawn 1–3 at independently rolled 30–50% boss HP, stay attackable and no recursion',()=>{
 const vm=require('node:vm');
 function run(roll){
  let id=1,added=[],announcements=[],shots=[];
  class Enemy{
   constructor(def,x,y){
    this.id=id++;this.dex=def.dex;this.x=x;this.y=y;
    this.def=def;this.dmg=def.dmg;this.spd=def.spd;this.hp=def.hp;this.maxHp=def.hp;
    this.boss=false;this.bodyH=25;this.fade=0;this.dead=false;
    this.anim={dir:0,loop(){},update(){},play(){}};this.shield=0;
   }
   draw(){}
   hurt(d){this.hp-=d;if(this.hp<=0)this.dead=true;}
  }
  const G={I18n:{lang:'vi'},Enemy,
   DEX_BY:{172:{name:'Pichu'},447:{name:'Riolu'},173:{name:'Cleffa'},360:{name:'Wynaut'},174:{name:'Igglybuff'}},
   Coop:{active:false,isHost:true},PKMSVVEggs:{unlocked:()=>true},
   EnemyMgr:{add(e){added.push(e);return e;},get(n){return added.find(e=>e.id===n)},clear(){added=[];}},
   FX:{ring(){}},Spawner:{say(s){announcements.push(s);}},
   Sprites:{dirFromAngle:()=>0,preload(){}},
   Projectiles:{spawn(s){shots.push(s);return s;}},
   World:{isFree:()=>true}
  };
  vm.runInNewContext(read('src/v15/boss-support.js'),{G,Math:Object.assign(Object.create(Math),{random:()=>roll}),Map,Number});
  const b=new Enemy({dex:25,hp:1000,dmg:100},0,0);
  b.boss=true;b.maxHp=1000;b.hp=1000;b.rd=250;
  G.EnemyMgr.add(b);
  return {G,b,added,announcements,shots};
 }
 for(const [roll,number] of [[.1,1],[.7,2],[.99,3]]){
  const {G,b,added}=run(roll);
  const guards=G.PKMSVVBossSupport.getForBoss(b.id);
  assert.equal(guards.length,number);
  assert.equal(added.length,number+1);
  for(const g of guards){
   const expected=Math.round(1000*(.30+roll*.20));
   assert.equal(g.hp,expected);
   assert.equal(g.maxHp,expected);
   assert.ok(g.pkmsvvScale>=.30&&g.pkmsvvScale<=.50);
   assert.ok(g.pkmsvvSpeedScale>=.8&&g.pkmsvvSpeedScale<=.9);
   assert.equal(g.spd,100*g.pkmsvvSpeedScale);
   assert.equal(g.dmg,Math.round(100*g.pkmsvvScale));
   assert.equal(g.boss,false);
   assert.equal(g.pkmsvvBossGuard,true);
   assert.equal(g.pkmsvvGuardianOf,b.id);
  }
  guards[0].hurt(75);assert.equal(guards[0].hp,Math.round(1000*(.30+roll*.20))-75);
  guards[0].update(1,{x:0,y:0,dead:false,slowT:0});
  b.dead=true;guards[0].update(.1,{x:0,y:0,dead:false});
  assert.equal(guards[0].dead,true);
 }
});
test('Boss support is not enabled for players who cannot yet hatch eggs',()=>{
 const src=read('src/v15/boss-support.js');
 assert.ok(src.includes('G.PKMSVVEggs?.unlocked?.()'));
 assert.ok(src.includes('if(G.Coop?.active&&!G.Coop?.isHost)return []'));
});
test('Boss support runtime is bundled in shared Windows Android and Web game build',()=>{
 const patch=read('scripts/patch-v15-eggs.cjs');
 const source=read('src/v15/boss-support.js');
 assert.ok(patch.includes('pkmsvv-boss-support.js'));
 assert.ok(source.includes('.30+Math.random()*.20'));
 assert.ok(source.includes('.80+Math.random()*.10'));
 assert.ok(!source.includes('pkmsvvAngle+Math.sin'));
 assert.ok(!source.includes('const baseDraw=g.draw'));
 assert.ok(source.includes('b.rd||0'));
 assert.ok(source.includes('G.EnemyMgr.add=function'));
});

test('egg collection and incubation use only a thin white shrinking line',()=>{
 const code=read('src/v15/eggs.js');
 const bar=code.slice(code.indexOf(' function bar(ctx,'),code.indexOf(' function draw(ctx){'));
 assert.match(bar,/ctx\.fillStyle='#ffffff'/);
 assert.match(bar,/ctx\.fillRect\(x-width\/2,y,width\*ratio,2\)/);
 assert.doesNotMatch(bar.split('\n').filter(line=>!line.trim().startsWith('//')).join('\n'),/strokeRect|strokeText|fillText|label|background|shadow/);
 assert.ok(code.includes('bar(ctx,n.x,n.y-34,48,'));
 assert.ok(code.includes('bar(ctx,it.x,it.y-31,42,'));
 assert.ok(!code.includes("tr('Giữ 8 giây'"));
});

test('normal support receives actual enemy aggro, contact, hostile projectile and AoE damage',()=>{
 const save={pkmsvvChapter3Seen:true,stats:{}};
 const player={x:0,y:0,dead:false,kills:0,level:12,maxHp:100,hp:100,spd:120,atk:20};
 const enemy={x:22,y:0,dead:false,remote:false,boss:false,pkmsvvBossGuard:false,r:10,dmg:18,touchCd:0};
 const rand=Object.create(Math);rand.random=()=>0;
 const G={DB:{save,commit(){}},I18n:{lang:'vi'},Coop:{active:false},
  U:{dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2},
  EnemyMgr:{all:()=>[enemy]},World:{isLiquid:()=>false,isFree:()=>true},
  FX:{ring(){},burst(){},dmgText(){}},Spawner:{say(){}},
  Sprites:{preload(){},dirFromAngle:()=>0,Animator:class{loop(){}update(){}draw(){}}}};
 vm.runInNewContext(read('src/v15/eggs.js'),{G,Math:rand,Object,Number});
 G.PKMSVVEggs.begin(player,false);
 G.PKMSVVEggs.followers.push({id:1,dex:172,hatched:true,active:true,
  x:22,y:0,hp:100,maxHp:100,spd:108,statScale:.6,def:0,shield:0,
  cooldown:999,hitCooldown:0,effectFlash:0,anim:null});
 const it=G.PKMSVVEggs.followers[0];
 const target=G.PKMSVVEggs.enemyTarget(enemy,player,.1);
 assert.notEqual(target,player,'Some enemy AI must target a support');
 assert.equal(target.x,it.x);
 target.hurt(10);
 assert.equal(it.hp,90,'Enemy targeted hit consumes actual follower HP');
 it.hitCooldown=0;
 assert.equal(G.PKMSVVEggs.interceptProjectile({x:22,y:0,r:4,dmg:20,friendly:false}),true);
 assert.equal(it.hp,70,'Hostile projectile hits the follower');
 it.hitCooldown=0;
 G.PKMSVVEggs.hitHazard({kind:'zone',x:22,y:0,r:45,dmg:14});
 assert.equal(it.hp,56,'AOE zone damages the follower');
 it.hitCooldown=0;
 G.PKMSVVEggs.hitHazard({kind:'beam',x:0,y:0,angle:0,len:55,w:20,dmg:10});
 assert.equal(it.hp,46,'Hostile beam damages the follower');
});

test('support attack targeting and hits are injected into upstream combat, and bars are discreet',()=>{
 const patch=read('scripts/patch-v15-eggs.cjs');
 const egg=read('src/v15/eggs.js'),boss=read('src/v15/boss-support.js');
 for(const api of ['enemyTarget','interceptProjectile','hitHazard'])assert.ok(egg.includes('function '+api+'('));
 for(const hook of ['js/entities/enemy.js','js/systems/combat.js','js/systems/hazards.js'])
  assert.ok(patch.includes("patch('"+hook+"'"));
 assert.ok(!boss.includes('const baseDraw=g.draw'),'No redundant boss HP bar');
 assert.ok(!egg.includes('ctx.fillRect(bx-2,by-2,40,9)'),'No thick player support HP block');
});

test('Rift transitions relocate companions, suppress nests, and keep incubation',()=>{
 const save={pkmsvvChapter3Seen:true,stats:{}};
 const pl={x:0,y:0,kills:0,level:1,dead:false,maxHp:150,hp:150,spd:130};
 let arena=false;
 const G={DB:{save,commit(){}},I18n:{lang:'vi'},Rift:{get inArena(){return arena;}},
  U:{dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2},Coop:{active:false},
  World:{isFree:()=>true,isLiquid:()=>false},Sprites:{preload(){},dirFromAngle:()=>0},
  Spawner:{say(){}},FX:{ring(){}},EnemyMgr:{all:()=>[]}};
 vm.runInNewContext(read('src/v15/eggs.js'),{G,Math,Number,Object});
 G.PKMSVVEggs.begin(pl,false);
 G.PKMSVVEggs.update(.1,pl,60,false);
 assert.equal(G.PKMSVVEggs.nests.length,1);
 G.PKMSVVEggs.followers.push({id:1,dex:172,hatched:false,active:false,
  x:100,y:100,age:7,boost:0,penalty:0,cooldown:9});
 arena=true;pl.x=140000;pl.y=150000;
 G.PKMSVVEggs.update(.1,pl,70,false);
 const egg=G.PKMSVVEggs.followers[0];
 assert.equal(G.PKMSVVEggs.nests.length,0,'All map nests disappear on arena entry');
 assert.ok(Math.hypot(egg.x-pl.x,egg.y-pl.y)<120,'Support egg enters Rift with player');
 assert.ok(egg.age>7,'Incubation continues inside arena');
 G.PKMSVVEggs.update(.1,pl,300,false);
 assert.equal(G.PKMSVVEggs.nests.length,0,'No Rift nest even past spawn timer');
 arena=false;pl.x=60;pl.y=70;
 G.PKMSVVEggs.update(.1,pl,301,false);
 assert.ok(Math.hypot(egg.x-pl.x,egg.y-pl.y)<120,'Support returns with player');
});

test('Companions are drawn within Y-sorted scene with props and players',()=>{
 const patch=read('scripts/patch-v15-eggs.cjs');
 const src=read('src/v15/eggs.js');
 assert.match(patch,/G\.PKMSVVEggs\?\.drawables\?\.\(cam\)/);
 assert.match(src,/function drawables\(cam\)/);
 assert.match(src,/\.map\(it=>\(\{y:it\.y,draw\(ctx\)/);
 assert.match(src,/const moved=Math\.hypot/);
 assert.match(src,/it\.anim\.loop\(moved>\.6\?'Walk':'Idle'/);
 assert.match(src,/function syncArena\(pl\)/);
 assert.match(src,/COLLECT_TIME=4/);
 assert.doesNotMatch(src,/pkmsvvEggSlot3\?3:2/);
});

test('Changelog has one 1.5 entry and concise bilingual themes',()=>{
 const src=read('src/pkmsvv-changelog-v15.js');
 assert.equal((src.match(/G\.CHANGELOG\.unshift\(/g)||[]).length,1);
 assert.match(src,/Pokemon Chuyển sinh — v1\.5/);
 assert.doesNotMatch(src,/v1\.5\.[1-9]/);
 assert.match(src,/Thêm chế độ nhiều người chơi mới: Tranh Trứng/);
 assert.doesNotMatch(src,/Tranh Trứng Online/);
});


test('Ditto 8%, Mew 4%, all other supports 88%, Shiny 3% independently',()=>{
 const src=read('src/v15/eggs.js');
 const save={pkmsvvChapter3Seen:true,stats:{}};
 const G={DB:{save},I18n:{lang:'vi'}};
 vm.runInNewContext(src,{G,Math,Number,Object});
 const roll=G.PKMSVVEggs.rollSpecies;
 assert.equal(roll(.0).dex,132);
 assert.equal(roll(.07999).dex,132);
 assert.equal(roll(.08).dex,151);
 assert.equal(roll(.11999).dex,151);
 assert.notEqual(roll(.12).dex,132);
 assert.notEqual(roll(.999).dex,151);
 assert.equal(G.PKMSVVEggs.SHINY_CHANCE,.03);
 assert.equal(G.PKMSVVEggs.SPECIES.length,10);
});

test('Mew random AOE casts every 1 second and Ditto borrows exactly up to 3 moves',()=>{
 const s=read('src/v15/eggs.js'),patch=read('scripts/patch-v15-eggs.cjs');
 assert.match(s,/\{dex:151,role:'mew',period:1,power:1\}/);
 assert.match(s,/Math\.floor\(Math\.random\(\)\*3\)/);
 assert.match(s,/function mewCast\(it,pl\)/);
 assert.match(s,/it\.copiedSkills\.length<3/);
 assert.match(s,/function dittoCast\(it,pl\)/);
 assert.match(s,/G\.Combat\?\.pkmsvvSupportCast/);
 assert.match(patch,/function pkmsvvSupportCast\(pl,it,m\)/);
});

test('Hatch affinity saves per species without altering ownership and strengthens skills up to 30%',()=>{
 const save={pkmsvvChapter3Seen:true,stats:{},pkmsvvSupportBond:{172:4}};
 const G={DB:{save},I18n:{lang:'vi'}};
 vm.runInNewContext(read('src/v15/eggs.js'),{G,Math,Number,Object});
 assert.equal(G.PKMSVVEggs.affinityFor(172),4);
 assert.equal(G.PKMSVVEggs.affinityGoal(172),100);
 assert.equal(G.PKMSVVEggs.affinityPercent(172),4);
 assert.ok(Math.abs(G.PKMSVVEggs.affinityMultiplier(172)-1.012)<1e-8);
 save.pkmsvvSupportBond[172]=60;
 assert.equal(G.PKMSVVEggs.affinityPercent(172),60);
 assert.equal(G.PKMSVVEggs.affinityMultiplier(172),1.18);
 save.pkmsvvSupportBond[172]=100;
 assert.equal(G.PKMSVVEggs.affinityMultiplier(172),1.30);
 assert.ok(read('scripts/patch-v15-eggs.cjs').includes('older.pkmsvvSupportBond'));
});

test('Friendship goals and maximum bonuses are species-specific; no early double odds',()=>{
 const G={DB:{save:{pkmsvvSupportBond:{}}}};
 vm.runInNewContext(read('src/v15/eggs.js'),{G,Math,Number,Object});
 const e=G.PKMSVVEggs;
 for(const [dex,goal,baseShiny] of [[172,100,.03],[132,50,.10],[151,25,.10]]){
  assert.equal(e.affinityGoal(dex),goal);
  assert.equal(e.affinityFor(dex),0);
  assert.equal(e.affinityPercent(dex),0);
  assert.equal(e.shinyChanceFor(dex),baseShiny);
  G.DB.save.pkmsvvSupportBond[dex]=goal-1;
  assert.ok(e.affinityPercent(dex)<100);
  assert.equal(e.shinyChanceFor(dex),baseShiny);
  G.DB.save.pkmsvvSupportBond[dex]=goal;
  assert.equal(e.affinityPercent(dex),100);
  assert.ok(Math.abs(e.shinyChanceFor(dex)-baseShiny*2)<1e-12);
  G.DB.save.pkmsvvSupportBond[dex]=goal+100;
  assert.equal(e.affinityPercent(dex),100,'Progress is capped at 100%');
 }
 assert.equal(e.speciesChanceFor(132),.16);
 assert.equal(e.speciesChanceFor(151),.08);
 assert.equal(e.shinyChanceFor(132),.20);
 assert.equal(e.shinyChanceFor(151),.20);
 assert.equal(e.shinyChanceFor(172),.06);
 assert.equal(e.affinityMultiplier(151),1.3);
});

test('At max Mew/Ditto bond, special species have exact 16%/8% selection boundaries',()=>{
 const save={pkmsvvSupportBond:{132:50,151:25}};
 const G={DB:{save}};
 vm.runInNewContext(read('src/v15/eggs.js'),{G,Math,Number,Object});
 const roll=G.PKMSVVEggs.rollSpecies;
 assert.equal(roll(0).dex,132);
 assert.equal(roll(.15999).dex,132);
 assert.equal(roll(.16).dex,151);
 assert.equal(roll(.23999).dex,151);
 assert.notEqual(roll(.24).dex,151);
 assert.notEqual(roll(.999).dex,132);
});

test('Ditto cycles seven seconds transformed and three seconds resting, no casts during rest',()=>{
 const save={pkmsvvChapter3Seen:true,pkmsvvSupportBond:{132:0},stats:{}};
 const pl={x:0,y:0,spd:120,level:1,kills:0,hp:100,maxHp:100,dead:false,
  moves:[{id:'a',kind:'projectile',cd:1},{id:'b',kind:'nova',cd:1},
         {id:'c',kind:'beam',cd:1},{id:'d',kind:'melee',cd:1}]};
 let casts=0;
 const G={I18n:{lang:'vi'},DB:{save,commit(){}},
  Sprites:{preload(){},dirFromAngle:()=>0,Animator:class{
   constructor(dex,size,shiny){this.dex=dex;this.shiny=shiny;}
   loop(){}update(){}draw(){}
  }},
  Combat:{pkmsvvSupportCast(){casts++;return true;}},
  U:{dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2},
  World:{isFree:()=>true,isLiquid:()=>false},Spawner:{say(){}},
  FX:{ring(){},burst(){}},Coop:{active:false},EnemyMgr:{all:()=>[]}};
 vm.runInNewContext(read('src/v15/eggs.js'),{G,Math,Number,Object});
 G.PKMSVVEggs.begin(pl,false);
 const it={dex:132,id:5,hatched:true,active:true,x:10,y:10,hp:100,maxHp:100,
  cooldown:0,hitCooldown:0,effectFlash:0,penalty:0,age:0,statScale:.8,
  spd:100,copiedSkills:[],copyDex:25,dittoPhase:'transform',dittoTime:7,
  anim:new G.Sprites.Animator(25,.72,false)};
 G.PKMSVVEggs.followers.push(it);
 function tick(n){for(let j=0;j<n;j++)G.PKMSVVEggs.update(.25,pl,(j+1)*.25,false);}
 tick(27);
 assert.equal(it.dittoPhase,'transform');
 assert.equal(it.anim.dex,25);
 assert.ok(casts>0,'Ditto copied actual moves while transformed');
 assert.equal(it.copiedSkills.length,3);
 tick(1);
 assert.equal(it.dittoPhase,'rest');
 assert.equal(it.anim.dex,132,'Ditto sprite visible while its abilities are cooling');
 const before=casts;
 tick(11);
 assert.equal(it.dittoPhase,'rest');
 assert.equal(casts,before,'No copied attack can trigger during 3-second rest');
 tick(1);
 assert.equal(it.dittoPhase,'transform');
 assert.equal(it.anim.dex,25,'Return to cloned player form after exactly 3 seconds');
 tick(4);
 assert.ok(casts>before,'Casts resume when the 7-second transformed phase restarts');
});

test('Companion catalog shows actual Pokémon sprites and rarity labels without numerical odds',()=>{
 const code=read('src/pkmsvv-support-catalog.js');
 assert.ok(code.includes('G.UI?.spriteCanvas?.('));
 assert.ok(code.includes('G.UI?.sprite?.('));
 assert.ok(code.includes('silhouette:!owned'));
 assert.ok(code.includes('pkmsvv-upgrade-back'));
 for(const label of ['Thường','Hiếm','Siêu hiếm'])assert.ok(code.includes(label));
 assert.ok(code.includes('if(shinyUnlocked)'));
 for(const hidden of ['shinyChanceFor','speciesChanceFor','Shiny odds','Hatch chance','Tỷ lệ Shiny','Tỷ lệ nở'])
  assert.ok(!code.includes(hidden),'No numerical odds in support Pokédex: '+hidden);
});

test('Support Shiny is discovered only after hatch and its tab cannot unlock prematurely',()=>{
 const save={pkmsvvSupportBond:{},pkmsvvSupportShiny:{}};
 const doc={readyState:'loading',addEventListener(){}};
 const G={I18n:{lang:'vi'},DB:{save},
  PKMSVVEggs:{affinityFor:d=>Number(save.pkmsvvSupportBond[d])||0}};
 vm.runInNewContext(read('src/pkmsvv-support-catalog.js'),{G,document:doc});
 assert.equal(G.PKMSVVSupportCatalog.shinySeen(132),false);
 save.pkmsvvSupportShiny[132]=true;
 assert.equal(G.PKMSVVSupportCatalog.shinySeen(132),false,'Shiny variant cannot display before the species is discovered');
 save.pkmsvvSupportBond[132]=1;
 assert.equal(G.PKMSVVSupportCatalog.shinySeen(132),true);
 assert.equal(G.PKMSVVSupportCatalog.shinySeen(151),false);
 assert.equal(G.PKMSVVSupportCatalog.rarity(132)[0],'Hiếm');
 assert.equal(G.PKMSVVSupportCatalog.rarity(151)[0],'Siêu hiếm');
 assert.equal(G.PKMSVVSupportCatalog.rarity(172)[0],'Thường');
 assert.ok(read('scripts/patch-v15-eggs.cjs').includes('older.pkmsvvSupportShiny'));
});

// HP stays on-screen even when a companion is at full health and was never hit.
test('support HP draws a visible, thin single line at full and partial HP',()=>{
 const save={pkmsvvChapter3Seen:true,stats:{}};
 const G={DB:{save,commit(){}},Coop:{active:false},
  Sprites:{preload(){},dirFromAngle:()=>0},
  U:{dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2}};
 vm.runInNewContext(read('src/v15/eggs.js'),{G,Math,Number,Object});
 G.PKMSVVEggs.begin({x:0,y:0,level:1,kills:0,spd:120},false);
 const it={hatched:true,active:true,x:50,y:60,hp:100,maxHp:100,shiny:false,anim:null,
  effectFlash:0,hurtFlash:0,recentlyHit:0};
 G.PKMSVVEggs.followers.push(it);
 const rects=[];
 const ctx={save(){},restore(){},fillRect(x,y,w,h){rects.push([x,y,w,h]);}};
 let drawable=G.PKMSVVEggs.drawables({sees:()=>true})[0];
 drawable.draw(ctx);
 assert.equal(rects.length,2,'Full HP draws background and a visible foreground stroke');
 assert.deepEqual(rects.map(r=>[r[2],r[3]]),[[28,2],[28,2]]);
 it.hp=50;rects.length=0;drawable.draw(ctx);
 assert.deepEqual(rects.map(r=>[r[2],r[3]]),[[28,2],[14,2]]);
});
test('v1.5 log explicitly names the online Egg Rush mode in one consolidated release',()=>{
 const src=read('src/pkmsvv-changelog-v15.js');
 assert.equal((src.match(/G\.CHANGELOG\.unshift\(/g)||[]).length,1);
 assert.match(src,/Thêm chế độ nhiều người chơi mới: Tranh Trứng/);
 assert.match(src,/Added a new multiplayer mode: Egg Rush/);
});
