'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const script=fs.readFileSync(path.join(__dirname,'romfs/main.js'),'utf8');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'romfs/kanto-config.json'),'utf8'));
function boot(files=new Map()){
 const ops={drawImage:0,fillText:0,arc:0,stroke:0};
 const ctx=new Proxy({},{get(o,k){if(k in o)return o[k];return (...a)=>{
  if(k in ops)ops[k]++}},set(o,k,v){o[k]=v;return true}});
 const buttons=Array.from({length:18},()=>({pressed:false,value:0}));
 const pad={connected:true,buttons,axes:[0,0]};
 let next=null,images=[];
 class Image{constructor(){this.onload=null;this.onerror=null;images.push(this)}
  set src(value){this._src=value;this.onload?.()}
 }
 const Switch={
  readFileSync(path){const content=files.get(String(path));return content===undefined?null:new TextEncoder().encode(content).buffer},
  writeFileSync(path,value){files.set(String(path),String(value))}
 };
 const c=vm.createContext({screen:{getContext:()=>ctx},navigator:{getGamepads:()=>[pad]},
  requestAnimationFrame(cb){next=cb},console:{error(){}},Switch,Image,TextDecoder,TextEncoder});
 vm.runInContext(script,c,{timeout:7000});
 function frame(t){assert.equal(typeof next,'function');const cb=next;next=null;cb(t)}
 const get=expression=>vm.runInContext(expression,c);
 function press(index,t){buttons[index].pressed=true;frame(t);buttons[index].pressed=false}
 return {c,get,frame,press,buttons,ops,files,images};
}
test('Compiled game uses real Kanto, Orb, Fusion, Mega and Evolution sources',()=>{
 assert.equal(data.region,'Kanto');
 assert.equal(data.gen,1);
 assert.equal(data.mascotDex,150);
 assert.equal(data.sealSeconds,900);
 assert.equal(data.finalBossSeconds,1800);
 assert.equal(data.nativeAlpha.orbs.length,6);
 assert.equal(data.nativeAlpha.fusions.length,10);
 assert.equal(data.nativeAlpha.nativeMoves.length,18);
 assert.equal(Object.keys(data.nativeAlpha.cooldownFloors).length,23);
 assert.equal(data.nativeAlpha.cooldownFloors.melee,.48);
 assert.equal(data.nativeAlpha.cooldownFloors.chain,.85);
 assert.equal(data.nativeAlpha.cooldownFloors.nova,.9);
 assert.equal(JSON.stringify(data.nativeAlpha.fusionOfferRates),JSON.stringify([.8,.7,.6,.5,.4,.3]));
 assert.equal(data.nativeAlpha.evolutionSprites.length,6);
 assert.equal(data.nativeAlpha.mega.cooldown,200);
 assert.equal(data.nativeAlpha.mega.duration,30);
 assert.equal(data.nativeAlpha.mega.cdFactor,.7);
 assert.ok(data.nativeAlpha.evolutions.some(e=>e.from===4&&e.to===5&&e.level===16));
 assert.ok(data.nativeAlpha.evolutions.some(e=>e.from===5&&e.to===6&&e.level===36));
 assert.ok(data.nativeAlpha.trialEnemies.every(e=>e.dex>=1&&e.dex<=151));
 assert.equal(data.nativeAlpha.testOnly,true);
});
test('Kanto Alpha boots HUD, auto-combat, menu and six controller tabs',()=>{
 const t=boot();t.frame(1000);t.frame(1016);
 assert.equal(t.get('alpha.profile.selected'),25);
 assert.equal(t.get('alpha.menu'),false);
 assert.ok(t.ops.fillText>0&&t.ops.arc>0);
 t.press(9,1032);assert.equal(t.get('alpha.menu'),true);
 t.frame(1048);t.press(5,1064);assert.equal(t.get('alpha.menuTab'),1);
 t.press(5,1080);assert.equal(t.get('alpha.menuTab'),1,'shoulder is edge triggered');
 t.frame(1096);t.press(0,1112);
 assert.equal(t.get('alpha.menu'),false);
 assert.equal(t.get('lastError'),'');
});
test('Trial roster selection changes visual lead only, never grants Box ownership',()=>{
 const t=boot();t.frame(1000);
 t.press(9,1016);
 t.frame(1032);t.press(2,1048);
 assert.equal(t.get('alpha.menuIndex'),1);
 t.frame(1064);t.press(1,1080);
 assert.equal(t.get('alpha.profile.selected'),4);
 assert.equal(t.get('alpha.profile.box[4]'),undefined);
 assert.equal(t.get('alpha.profile.box[25]'),1);
 assert.equal(t.get('alpha.menu'),false);
 assert.equal(t.get('alpha.chooseBattleSprite()'),'charmander');
 t.get('level=36');
 assert.equal(t.get('alpha.chooseBattleSprite()'),'charizard');
});
test('Real native Alpha Kanto boss gates at 900 and 1800 seconds',()=>{
 const t=boot();t.frame(1000);
 t.get('time=900;spawnAt=Infinity;enemies.length=0');
 t.frame(1016);
 assert.equal(t.get('alpha.boss15'),true);
 assert.equal(t.get('enemies.filter(e=>e.boss===15).length'),1);
 assert.equal(t.get('enemies.some(e=>e.dex===150)'),true);
 t.get('alpha.onKill({dex:150,boss:15})');
 assert.equal(t.get('alpha.profile.badges.kanto'),1);
 t.get('time=1800;spawnAt=Infinity;enemies.length=0');
 t.frame(1032);
 assert.equal(t.get('alpha.boss30'),true);
 assert.equal(t.get('enemies.filter(e=>e.boss===30).length'),1);
 t.get('alpha.onKill({dex:150,boss:30})');
 assert.equal(t.get('alpha.gameWon'),true);
});
test('First KO unlocks Pokédex but not gacha, awards first source Orb',()=>{
 const t=boot();t.frame(1000);
 t.get("alpha.onKill({dex:19,species:'rattata'})");
 assert.equal(t.get('alpha.profile.pokedex[19]'),1);
 assert.equal(t.get('alpha.profile.box[19]'),undefined);
 assert.equal(t.get('alpha.orbQueue.length'),1);
 assert.ok(data.nativeAlpha.orbs.map(o=>o.id).includes(t.get('alpha.orbQueue[0]')));
});
test('Fusion requires MAX+MAX and respects source rates, one roll per level, once per run',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.offersForLevel()');
 assert.equal(t.get('alpha.offers[0].kind'), 'upgrade');
 assert.equal(t.get('alpha.fusionOfferAttempts'),0);
 t.get("alpha.moves.find(x=>x.id==='thunder-shock').lvl=5");
 t.get("alpha.moves.find(x=>x.id==='quick-attack').lvl=5");
 t.get('alpha.offersForLevel()');
 assert.equal(t.get('alpha.fusionOfferAttempts'),0,'no reroll at same level');
 let hasOffer=false;
 for(let i=0;i<16;i++){
  t.get('level++');t.get('alpha.offersForLevel()');
  const first=t.get('alpha.offers[0]');
  if(first?.kind==='fusion'){hasOffer=true;break}
 }
 assert.equal(hasOffer,true,'seeded RNG must eventually offer Fusion');
 const attempts=t.get('alpha.fusionOfferAttempts');
 t.get('alpha.offersForLevel()');
 assert.equal(t.get('alpha.fusionOfferAttempts'),attempts,'one roll per level only');
 assert.equal(t.get('alpha.offers[0].id'),'spark-quick');
 assert.equal(t.get('alpha.pickOffer(0)'),true);
 assert.equal(t.get('alpha.fusionUsed'),true);
 assert.equal(t.get('alpha.moves.some(x=>x.id==="fusion:spark-quick")'),true);
 t.get('level++');t.get('alpha.offersForLevel()');
 assert.notEqual(t.get('alpha.offers[0].kind'),'fusion');
});
test('Orb queue uses first-in-first-out and quick speed from PKMSVV source',()=>{
 const t=boot();t.frame(1000);
 t.get("alpha.orbQueue.push('quick','slumber')");
 t.buttons[5].pressed=true;t.press(2,1016);
 assert.equal(t.get('alpha.orbQueue[0]'),'slumber');
 assert.equal(t.get('alpha.moveMultiplier'),1.25);
 assert.ok(t.get('alpha.orbCooldown')>4.9&&t.get('alpha.orbCooldown')<=5);
 t.frame(1032);t.press(2,1048);
 assert.equal(t.get('alpha.orbQueue.length'),1,'cooldown prevents second use');
});
test('Diagnostic acceleration requires explicit ZL+R, does not persist Mega unlock',()=>{
 const t=boot();t.frame(1000);
 t.buttons[6].pressed=true;t.buttons[5].pressed=true;t.frame(1016);
 assert.equal(t.get('alpha.clockScale'),12);
 assert.equal(t.get('alpha.accelerated'),true);
 assert.equal(t.get('alpha.megaPreview'),false);
 t.buttons[6].pressed=false;t.frame(1032);
 assert.equal(t.get('lastError'),'');
});
test('Dual rotating save files survive reload, remain isolated from Web and Android',()=>{
 const files=new Map(),t=boot(files);t.frame(1000);
 t.get("alpha.onKill({dex:19})");
 assert.equal(t.get('alpha.persist()'),true);
 assert.equal(files.size,1);
 t.get("alpha.onKill({dex:16})");
 assert.equal(t.get('alpha.persist()'),true);
 assert.equal(files.size,2);
 assert.ok([...files.keys()].every(p=>p.startsWith('sdmc:/switch/pkmsvv-native-alpha/')));
 const t2=boot(files);t2.frame(1000);
 assert.equal(t2.get('alpha.profile.pokedex[19]'),1);
 assert.equal(t2.get('alpha.profile.pokedex[16]'),1);
 assert.equal(t2.get('alpha.profile.seq'),2);
 const key=[...files.keys()].find(k=>k.endsWith('progress-2.json'));
 files.set(key,'CORRUPT');
 const t3=boot(files);t3.frame(1000);
 assert.equal(t3.get('alpha.profile.pokedex[19]'),1);
 assert.equal(t3.get('alpha.profile.seq'),1,'fallback to earlier healthy save');
});
test('Sustained 3 minute native Alpha simulation has capped enemies and projectiles',()=>{
 const t=boot();t.get('spawnShield=Infinity');
 t.frame(1000);
 for(let i=1;i<=10800;i++)t.frame(1000+i*16.6667);
 assert.equal(t.get('lastError'),'');
 assert.ok(t.get('enemies.length')<=32);
 assert.ok(t.get('shots.length')<=32);
 assert.ok(t.get('time')>170);
});

test('QA time acceleration cannot grant permanent Kanto badge',()=>{
 const t=boot();t.frame(1000);
 t.buttons[6].pressed=true;t.buttons[5].pressed=true;t.frame(1016);
 assert.equal(t.get('alpha.accelerated'),true);
 assert.equal(t.get('alpha.incomingDamageMultiplier'),.01);
 assert.equal(t.get('alpha.bossDamageMultiplier'),6);
 t.get('alpha.onKill({dex:150,boss:15})');
 assert.equal(t.get('alpha.profile.badges.kanto'),undefined);
 assert.equal(t.get('lastError'),'');
});

test('Kanto starter-specific moves and actual two-step evolved sprite selection',()=>{
 const choices=[
  {dex:25,moves:['thunder-shock','quick-attack'],levels:[[1,'pikachu']]},
  {dex:4,moves:['ember','quick-attack'],levels:[[1,'charmander'],[16,'charmeleon'],[36,'charizard']]},
  {dex:1,moves:['vine-whip','tackle'],levels:[[1,'bulbasaur'],[16,'ivysaur'],[32,'venusaur']]},
  {dex:7,moves:['water-gun','tackle'],levels:[[1,'squirtle'],[16,'wartortle'],[36,'blastoise']]}
 ];
 for(const c of choices){
  const t=boot();t.frame(1000);
  t.get('alpha.profile.selected='+c.dex+';alpha.resetBattle()');
  assert.equal(JSON.stringify(t.get('alpha.moves.map(x=>x.id)')),JSON.stringify(c.moves));
  for(const [lvl,sprite] of c.levels){
   t.get('level='+lvl);
   assert.equal(t.get('alpha.chooseBattleSprite()'),sprite);
   assert.ok(t.get('alpha.spriteNames.has("'+sprite+'")'));
  }
  assert.equal(t.get('alpha.profile.box[4]'),undefined);
 }
});
test('Extra sprite loads are staggered, not decoded in a single game frame',()=>{
 const t=boot();t.frame(1000);
 t.get('spritesEnabled=true;alpha.profile.selected=4;alpha.resetBattle();spawnAt=Infinity');
 t.get("enemies=[{species:'pidgey',x:120,y:350,r:14,hp:1000,speed:0},{species:'zubat',x:200,y:350,r:14,hp:1000,speed:0}]");
 for(let i=1;i<=12;i++)t.frame(1000+i*16.6667);
 assert.equal(t.images.length,1,'only Charmander may load after first 12 ticks');
 for(let i=13;i<=24;i++)t.frame(1000+i*16.6667);
 assert.equal(t.images.length,2,'second visible species loads after 24 ticks');
 for(let i=25;i<=36;i++)t.frame(1000+i*16.6667);
 assert.equal(t.images.length,3,'third visible species loads after 36 ticks');
 assert.ok(t.images.some(x=>x._src==='romfs:/sprites/4.png'));
 assert.ok(t.images.some(x=>x._src==='romfs:/sprites/16.png'));
 assert.ok(t.images.some(x=>x._src==='romfs:/sprites/41.png'));
});

test('Native move adapter targets different enemy geometries, not one global damage circle',()=>{
 const t=boot();t.frame(1000);
 t.get('spawnAt=Infinity;enemies=[{x:px+190,y:py,species:"rattata",dex:19,hp:60,r:16,speed:0},{x:px+230,y:py+25,species:"rattata",dex:19,hp:60,r:16,speed:0},{x:px+450,y:py-180,species:"zubat",dex:41,hp:60,r:16,speed:0}]');
 assert.equal(t.get('alpha.castMove({id:"tackle",lvl:1})'),false,'melee cannot hit an enemy 190px away');
 assert.equal(t.get('enemies.every(e=>e.hp===60)'),true);
 assert.equal(t.get('alpha.castMove({id:"ember",lvl:1})'),true,'projectile targets nearest enemy');
 assert.equal(t.get('enemies[0].hp<60'),true);
 assert.equal(t.get('enemies[1].hp'),60,'projectile must not become global AoE');
 const actualChain=t.get('alpha.data.realMoves.find(m=>m.kind==="chain")?.id')||'thunder-shock';
 assert.equal(t.get('alpha.castMove({id:'+JSON.stringify(actualChain)+',lvl:1})'),true,'actual PKMSVV chain move hits nearby secondary targets');
 assert.equal(t.get('enemies[1].hp<60'),true);
 assert.equal(t.get('enemies[2].hp'),60,'distant out-of-chain enemy untouched');
 assert.equal(t.get('lastError'),'');
});
test('Per-skill cooldowns are preserved and combat effects stay bounded over 3 minutes',()=>{
 const t=boot();t.frame(1000);
 t.get('spawnAt=Infinity;enemies=[{x:px+190,y:py,species:"rattata",dex:19,hp:500,r:16,speed:0}];alpha.moves.splice(0,alpha.moves.length,{id:"ember",lvl:1})');
 t.frame(1016);
 assert.ok(t.get('alpha.castCount')>=1);
 const casts=t.get('alpha.castCount'),cd=t.get('alpha.moves[0].cooldown');
 assert.ok(cd>=data.nativeAlpha.cooldownFloors.projectile-.03);
 t.frame(1032);
 assert.equal(t.get('alpha.castCount'),casts,'cannot cast every native frame');
 t.get('alpha.moves.push({id:"thunder-shock",lvl:1})');
 for(let i=3;i<10800;i++)t.frame(1000+i*16.6667);
 assert.ok(t.get('alpha.effectCount')<=14);
 assert.ok(t.get('alpha.castCount')>casts);
 assert.equal(t.get('lastError'),'');
});

test('Out-of-range native skill does not consume cooldown before a target appears',()=>{
 const t=boot();t.frame(1000);
 t.get("spawnAt=Infinity;enemies=[{x:px+600,y:py,species:'rattata',dex:19,hp:1000,r:16,speed:0}];alpha.moves.splice(0,alpha.moves.length,{id:'tackle',lvl:1})");
 t.frame(1016);
 assert.equal(t.get('alpha.moves[0].cooldown||0'),0);
 t.get('enemies[0].x=px+45');
 t.frame(1032);
 assert.ok(t.get('alpha.moves[0].cooldown')>.4);
 assert.equal(t.get('lastError'),'');
});

test('Switch controller: X/Y/B directly choose skill 1/2/3 without holding R',()=>{
 for(const [btn,slot] of [[3,0],[2,1],[0,2]]){
  const t=boot();t.frame(1000);
  t.get("alpha.orbQueue.push('quick');alpha.offersForLevel()");
  assert.equal(t.get('alpha.offers.length'),6);
  const offered=t.get('alpha.offers['+slot+']');
  assert.ok(offered);
  t.press(btn,1016);
  assert.equal(t.get('pickOpen'),false,'skill should be picked by button '+btn);
  assert.equal(t.get('alpha.orbQueue.length'),1,'selecting with Y must not consume Orb');
  assert.equal(t.get('paused'),false,'selecting with B must not pause');
  assert.equal(t.get('lastError'),'');
 }
});
test('A turns page and direct B selects third skill on page two',()=>{
 const t=boot();t.frame(1000);
 t.get("alpha.offersForLevel()");
 const page2=t.get('alpha.offers[5]');
 assert.equal(t.get('skillPage'),0);
 t.press(1,1016);
 assert.equal(t.get('skillPage'),1);
 assert.equal(t.get('pickOpen'),true);
 t.frame(1032);
 t.press(0,1048);
 assert.equal(t.get('pickOpen'),false);
 if(page2.kind==='new')assert.equal(t.get('alpha.moves.some(m=>m.id==='+JSON.stringify(page2.id)+')'),true);
 assert.equal(t.get('paused'),false);
 assert.equal(t.get('lastError'),'');
});
test('Combat actions moved away from plain Y/B: R+Y Orb and R+B pause',()=>{
 const t=boot();t.frame(1000);
 t.get("alpha.orbQueue.push('quick')");
 t.press(2,1016);
 assert.equal(t.get('alpha.orbQueue.length'),1,'plain Y cannot use Orb');
 t.frame(1032);
 t.press(0,1048);
 assert.equal(t.get('paused'),false,'plain B cannot pause');
 t.frame(1064);
 t.buttons[5].pressed=true;
 t.press(2,1080);
 assert.equal(t.get('alpha.orbQueue.length'),0,'R+Y uses Orb');
 t.frame(1096);
 t.press(0,1112);
 assert.equal(t.get('paused'),true,'R+B pauses');
 t.frame(1128);t.press(0,1144);
 assert.equal(t.get('paused'),false,'R+B resumes');
 assert.equal(t.get('lastError'),'');
});
test('Switch controller settings tab shows direct bindings and does not affect menu navigation',()=>{
 const t=boot();t.frame(1000);
 assert.equal(JSON.stringify(t.get('SWITCH_PAD_BINDINGS.skill')),JSON.stringify([3,2,0]));
 assert.equal(t.get('SWITCH_PAD_BINDINGS.page'),1);
 assert.equal(JSON.stringify(t.get('SWITCH_PAD_BINDINGS.orb')),JSON.stringify([5,2]));
 assert.equal(JSON.stringify(t.get('SWITCH_PAD_BINDINGS.pause')),JSON.stringify([5,0]));
 const compiled=fs.readFileSync(path.join(__dirname,'alpha-runtime.js'),'utf8');
 assert.match(compiled,/CONTROLLER BINDINGS - Nintendo Switch only/);
 assert.match(compiled,/LEVEL UP: X = SKILL 1\s+Y = SKILL 2\s+B = SKILL 3/);
 assert.match(compiled,/R\+Y = USE ORB\s+R\+B = PAUSE/);
 t.press(9,1016);
 assert.equal(t.get('alpha.menu'),true);
 for(let i=0;i<5;i++){t.frame(1032+i*40);t.press(5,1048+i*40)}
 assert.equal(t.get('alpha.menuTab'),5);
 t.frame(1250);t.press(0,1266);
 assert.equal(t.get('alpha.menu'),false,'B still backs out of menu');
});
