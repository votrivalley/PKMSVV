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
 assert.equal(data.nativeAlpha.specialEvolutions.length,20);
 assert.ok(data.nativeAlpha.trialEnemies.every(e=>e.dex>=1&&e.dex<=151));
 assert.equal(data.nativeAlpha.testOnly,true);
});
test('Native battle draws eight bounded cooldown cards with the current starter skills',()=>{
 const t=boot();t.frame(1000);
 t.ops.fillRect=0;t.frame(1016);
 assert.ok(t.ops.fillRect>=24,'eight skill slots and cooldown tracks render each frame');
 assert.equal(t.get('alpha.moves.length'),2,'starter has two genuine skills');
 assert.equal(t.get('lastError'),'');
});
test('Kanto native boots HUD, auto-combat and ten controller tabs',()=>{
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
test('ZL toggles x1.5 native simulation without entering QA',()=>{
 const t=boot();t.frame(1000);
 assert.equal(t.get('alpha.speedMultiplier'),1);
 t.press(6,1016);
 assert.equal(t.get('alpha.speedMultiplier'),1.5);
 assert.equal(t.get('alpha.runUsedQA'),false);
 t.frame(1032);t.press(6,1048);
 assert.equal(t.get('alpha.speedMultiplier'),1);
 t.press(9,1064);t.frame(1080);t.press(6,1096);
 assert.equal(t.get('alpha.speedMultiplier'),1,'ZL cannot toggle speed inside menu');
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
 const key=[...files.keys()].find(k=>k.endsWith('progress-v030-2.json'));
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
test('R+A turns page and direct B selects third skill on page two',()=>{
 const t=boot();t.frame(1000);
 t.get("alpha.offersForLevel()");
 const page2=t.get('alpha.offers[5]');
 assert.equal(t.get('skillPage'),0);
 t.press(1,1016);
 assert.equal(t.get('skillPage'),0,'A alone is reserved for dash');
 t.frame(1032);t.buttons[5].pressed=true;t.press(1,1048);t.buttons[5].pressed=false;
 assert.equal(t.get('skillPage'),1);
 assert.equal(t.get('pickOpen'),true);
 t.frame(1064);
 t.press(0,1080);
 assert.equal(t.get('pickOpen'),false);
 if(page2.kind==='new')assert.equal(t.get('alpha.moves.some(m=>m.id==='+JSON.stringify(page2.id)+')'),true);
 assert.equal(t.get('paused'),false);
 assert.equal(t.get('lastError'),'');
});
test('A dash, R+Y Orb and R+B pause',()=>{
 const t=boot();t.frame(1000);
 t.get("alpha.orbQueue.push('quick')");
 t.press(1,1008);assert.ok(t.get('dashReady')>0,'A triggers dash cooldown in battle');
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
 assert.equal(JSON.stringify(t.get('SWITCH_PAD_BINDINGS.page')),JSON.stringify([5,1]));
 assert.equal(t.get('SWITCH_PAD_BINDINGS.dash'),1);
 assert.equal(t.get('SWITCH_PAD_BINDINGS.speed'),6);
 assert.equal(JSON.stringify(t.get('SWITCH_PAD_BINDINGS.orb')),JSON.stringify([5,2]));
 assert.equal(JSON.stringify(t.get('SWITCH_PAD_BINDINGS.pause')),JSON.stringify([5,0]));
 const compiled=fs.readFileSync(path.join(__dirname,'alpha-runtime.js'),'utf8');
 assert.match(compiled,/CONTROLLER BINDINGS - Nintendo Switch only/);
 assert.match(compiled,/LEVEL UP: X = SKILL 1\s+Y = SKILL 2\s+B = SKILL 3/);
 assert.match(compiled,/R\+Y = USE ORB\s+R\+B = PAUSE/);
 t.press(9,1016);
 assert.equal(t.get('alpha.menu'),true);
 for(let i=0;i<7;i++){t.frame(1032+i*40);t.press(5,1048+i*40)}
 assert.equal(t.get('alpha.menuTab'),7);
 t.frame(1250);t.press(0,1266);
 assert.equal(t.get('alpha.menu'),false,'B still backs out of menu');
});

test('Real meteor and stun skills telegraph before dealing damage, stun suspends movement',()=>{
 const t=boot();t.frame(1000);
 const meteor=t.get('alpha.data.realMoves.find(m=>m.kind==="meteor")?.id');
 const stun=t.get('alpha.data.realMoves.find(m=>m.kind==="stun")?.id');
 assert.ok(meteor&&stun);
 t.get("spawnAt=Infinity;enemies=[{x:px+90,y:py,species:'rattata',dex:19,hp:1000,r:16,speed:0}]");
 t.get('alpha.castMove({id:'+JSON.stringify(meteor)+',lvl:1})');
 assert.equal(t.get('enemies[0].hp'),1000,'meteor must show warning before impact');
 assert.equal(t.get('alpha.zoneCount'),1);
 t.get('alpha.advanceZones(.2)');
 assert.equal(t.get('enemies[0].hp'),1000);
 t.get('alpha.advanceZones(.4)');
 assert.ok(t.get('enemies[0].hp')<1000,'meteor delivers delayed damage');
 assert.equal(t.get('alpha.zoneCount'),0,'one-shot impact must expire');
 t.get('alpha.castMove({id:'+JSON.stringify(stun)+',lvl:1})');
 assert.equal(t.get('enemies[0].sleepLeft||0'),0);
 t.get('alpha.advanceZones(.30)');
 assert.ok(t.get('enemies[0].sleepLeft')>=1);
});
test('Mine stays on the ground and triggers when an enemy enters its zone',()=>{
 const t=boot();t.frame(1000);
 const id=t.get('alpha.data.realMoves.find(m=>m.kind==="mine")?.id');
 assert.ok(id);
 t.get("spawnAt=Infinity;enemies=[{x:px+120,y:py,species:'rattata',dex:19,hp:1000,r:16,speed:0}]");
 assert.equal(t.get('alpha.castMove({id:'+JSON.stringify(id)+',lvl:1})'),true);
 t.get('alpha.advanceZones(.5)');
 assert.equal(t.get('enemies[0].hp'),1000);
 assert.equal(t.get('alpha.zoneCount'),1);
 t.get('enemies[0].x=px+60');
 t.get('alpha.advanceZones(.5)');
 assert.ok(t.get('enemies[0].hp')<1000);
 assert.equal(t.get('alpha.zoneCount'),0);
});
test('Real turret persists, attacks independently and stops at expiry',()=>{
 const t=boot();t.frame(1000);
 const id=t.get('alpha.data.realMoves.find(m=>m.kind==="turret")?.id');
 assert.ok(id);
 t.get("spawnAt=Infinity;enemies=[{x:px+160,y:py,species:'rattata',dex:19,hp:1000,r:16,speed:0}]");
 t.get('alpha.castMove({id:'+JSON.stringify(id)+',lvl:1})');
 const h=t.get('enemies[0].hp');
 for(let i=0;i<8;i++)t.get('alpha.advanceZones(.55)');
 assert.ok(t.get('enemies[0].hp')<h);
 assert.equal(t.get('alpha.zoneCount'),1);
 t.get('alpha.advanceZones(1.2)');
 assert.equal(t.get('alpha.zoneCount'),0);
});
test('Vortex pulls toward source center without teleporting out of battle bounds',()=>{
 const t=boot();t.frame(1000);
 const id=t.get('alpha.data.realMoves.find(m=>m.kind==="vortex")?.id');
 assert.ok(id);
 t.get("spawnAt=Infinity;enemies=[{x:px+180,y:py,species:'rattata',dex:19,hp:1000,r:16,speed:0},{x:px+235,y:py,species:'pidgey',dex:16,hp:1000,r:16,speed:0}]");
 t.get('alpha.castMove({id:'+JSON.stringify(id)+',lvl:1})');
 const before=t.get('enemies[1].x');
 t.get('alpha.advanceZones(.5)');
 assert.ok(t.get('enemies[1].x')<before);
 assert.ok(t.get('enemies.every(e=>e.x>=15&&e.x<=W-15)'));
});
test('Persistent effects budget is capped at 12 across crowded fights and reset',()=>{
 const t=boot();t.frame(1000);
 const id=t.get('alpha.data.realMoves.find(m=>m.kind==="mine")?.id');
 t.get("spawnAt=Infinity;enemies=[{x:px+80,y:py,species:'rattata',dex:19,hp:100000,r:16,speed:0}]");
 for(let i=0;i<42;i++)t.get('alpha.castMove({id:'+JSON.stringify(id)+',lvl:1})');
 assert.equal(t.get('alpha.zoneCount'),12);
 assert.equal(t.get('alpha.zoneLimit'),12);
 assert.ok(t.get('alpha.effectCount')<=14);
 t.get('alpha.advanceZones(.5)');
 assert.equal(t.get('alpha.zoneCount'),0,'mines all detonate safely on nearby enemy');
 t.get('alpha.castMove({id:'+JSON.stringify(id)+',lvl:1})');
 assert.equal(t.get('alpha.zoneCount'),1);
 t.get('alpha.resetBattle()');
 assert.equal(t.get('alpha.zoneCount'),0,'changing starter clears old skill zones');
 assert.equal(t.get('lastError'),'');
});

test('Kanto 30-minute boss waits while the 15-minute boss is still alive',()=>{
 const t=boot();t.frame(1000);
 t.get('time=901;spawnAt=Infinity;enemies.length=0');
 t.frame(1016);
 assert.equal(t.get('enemies.filter(e=>e.boss===15).length'),1);
 t.get('time=1801;spawnAt=Infinity');
 t.frame(1032);
 assert.equal(t.get('alpha.boss30'),false,'Final boss must not overlap undefeated opener');
 t.get('enemies.splice(enemies.findIndex(e=>e.boss===15),1);alpha.onKill({dex:150,boss:15})');
 t.frame(1048);
 assert.equal(t.get('alpha.boss30'),true);
 assert.equal(t.get('enemies.filter(e=>e.boss===30).length'),1);
 assert.equal(t.get('lastError'),'');
});
test('Final boss victory ends the match, records official Kanto clear and stays frozen until A restart',()=>{
 const files=new Map(),t=boot(files);t.frame(1000);
 t.get('time=1801;spawnAt=Infinity;enemies.length=0;alpha.onKill({dex:150,boss:30})');
 assert.equal(t.get('alpha.matchResult'),'victory');
 assert.equal(t.get('alpha.gameWon'),true);
 assert.equal(t.get('alpha.profile.kantoClears'),1);
 assert.equal(t.get('alpha.profile.bestKantoClearSec'),1801);
 assert.equal(t.get('alpha.profile.bestSurvivalSec'),1801);
 assert.equal(t.get('alpha.saveStatus'),'SAVED');
 assert.equal(files.size,1);
 const frozen=t.get('time');t.frame(1016);t.frame(1032);
 assert.equal(t.get('time'),frozen,'battle does not continue spawning after victory');
 assert.equal(t.get('alpha.profile.kantoClears'),1,'no duplicate finish rewards');
 t.press(1,1048);
 assert.equal(t.get('alpha.matchResult'),null,'A restarts Kanto cleanly');
 assert.equal(t.get('alpha.profile.kantoClears'),1,'permanent clear survives replay');
 assert.equal(t.get('alpha.boss15'),false);
 assert.equal(t.get('alpha.boss30'),false);
 const restored=boot(files);restored.frame(1000);
 assert.equal(restored.get('alpha.profile.kantoClears'),1,'native dual-save restores cleared records');
 assert.equal(restored.get('alpha.profile.bestKantoClearSec'),1801);
});
test('HP zero opens defeat results rather than respawning forever; + opens menu',()=>{
 const t=boot();t.frame(1000);
 t.get('hp=0;spawnAt=Infinity;spawnShield=Infinity');
 t.frame(1016);
 assert.equal(t.get('alpha.matchResult'),'defeat');
 assert.equal(t.get('hp'),0,'defeat must not auto-respawn full HP');
 const frozen=t.get('time');t.frame(1032);
 assert.equal(t.get('time'),frozen);
 t.press(9,1048);
 assert.equal(t.get('alpha.menu'),true);
 t.frame(1064);t.press(0,1080);
 assert.equal(t.get('alpha.menu'),false);
 assert.equal(t.get('alpha.matchResult'),'defeat','closing menu returns to result');
 t.frame(1096);t.press(1,1112);
 assert.equal(t.get('alpha.matchResult'),null,'A restarts after defeat');
 assert.equal(t.get('hp'),100);
 assert.equal(t.get('level'),1);
});
test('Once QA x12 was used, turning it off cannot unlock Dex, badge, clear or best score',()=>{
 const files=new Map(),t=boot(files);t.frame(1000);
 t.buttons[6].pressed=true;t.buttons[5].pressed=true;t.frame(1016);
 assert.equal(t.get('alpha.accelerated'),true);
 assert.equal(t.get('alpha.runUsedQA'),true);
 t.buttons[6].pressed=false;t.frame(1032);
 t.buttons[6].pressed=true;t.frame(1048);
 assert.equal(t.get('alpha.accelerated'),false);
 assert.equal(t.get('alpha.runUsedQA'),true);
 t.get('time=1801;alpha.onKill({dex:19});alpha.onKill({dex:150,boss:15});alpha.onKill({dex:150,boss:30})');
 assert.equal(t.get('alpha.matchResult'),'victory');
 assert.equal(t.get('alpha.profile.pokedex[19]'),undefined);
 assert.equal(t.get('alpha.profile.pokedex[150]'),undefined);
 assert.equal(t.get('alpha.profile.badges.kanto'),undefined);
 assert.equal(t.get('alpha.profile.kantoClears'),0);
 assert.equal(t.get('alpha.profile.bestKantoClearSec'),0);
 assert.equal(t.get('alpha.profile.bestKO'),0);
 assert.equal(t.get('alpha.profile.bestSurvivalSec'),0);
 assert.equal(files.size,0,'no QA-only progression should create a save');
 t.buttons[5].pressed=false;t.buttons[6].pressed=false;
 t.frame(1056);
 t.press(1,1064);
 assert.equal(t.get('alpha.runUsedQA'),false,'QA flag clears only on new run');
});

test('Native recruitment only rolls species already discovered in real Kanto Pokédex',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.profile.recruitTickets=20;alpha.profile.pokedex[19]=1;alpha.profile.pokedex[16]=1');
 const outcomes=t.get('alpha.recruitMany(10)');
 assert.equal(outcomes.length,10);
 assert.ok(outcomes.every(x=>x.dex===19||x.dex===16));
 assert.equal(t.get('alpha.profile.recruitTickets'),10);
 assert.equal(t.get('alpha.profile.box[150]'),undefined);
 assert.equal(t.get('alpha.recruitableCount'),2);
 assert.equal(t.get('alpha.ownedIds().includes(19)||alpha.ownedIds().includes(16)'),true);
 assert.equal(t.get('lastError'),'');
});
test('No discovered Pokémon blocks recruitment without charging a ticket',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.profile.recruitTickets=10;alpha.profile.pokedex={}');
 assert.equal(t.get('alpha.recruitMany(10).length'),0);
 assert.equal(t.get('alpha.profile.recruitTickets'),10);
 assert.equal(t.get('alpha.profile.box[19]'),undefined);
 assert.equal(t.get('alpha.lastRecruitOutcome'),'NO DISCOVERED POKEMON');
});
test('30 real native KOs award one trial ticket, bosses 2 and 3, QA awards none',()=>{
 const t=boot();t.frame(1000);
 for(let i=0;i<30;i++)t.get('alpha.onKill({dex:19})');
 assert.equal(t.get('alpha.profile.recruitKO'),30);
 assert.equal(t.get('alpha.profile.recruitTickets'),1);
 t.get('alpha.onKill({dex:150,boss:15})');
 assert.equal(t.get('alpha.profile.recruitTickets'),3);
 t.get('alpha.onKill({dex:150,boss:30})');
 assert.equal(t.get('alpha.profile.recruitTickets'),6);
 const t2=boot();t2.frame(1000);
 t2.buttons[6].pressed=true;t2.buttons[5].pressed=true;t2.frame(1016);
 for(let i=0;i<30;i++)t2.get('alpha.onKill({dex:19})');
 assert.equal(t2.get('alpha.profile.recruitTickets'),0);
 assert.equal(t2.get('alpha.profile.recruitKO'),0);
});
test('Real 5-star pity guarantees an unlocked Legendary at ceiling, never undiscovered',()=>{
 const t=boot();t.frame(1000);
 const star=t.get('alpha.data.realPokedex.find(p=>p.rarity===5)?.dex');
 assert.ok(Number.isInteger(star));
 t.get('alpha.profile.recruitTickets=2;alpha.profile.pokedex['+star+']=1;alpha.profile.recruitPity=99');
 const result=t.get('alpha.recruitMany(1)');
 assert.equal(result.length,1);
 assert.equal(result[0].dex,star);
 assert.equal(result[0].star,5);
 assert.equal(t.get('alpha.profile.recruitPity'),0);
 const noLegend=boot();noLegend.frame(1000);
 noLegend.get('alpha.profile.recruitTickets=2;alpha.profile.pokedex[19]=1;alpha.profile.recruitPity=99');
 const q=noLegend.get('alpha.recruitMany(1)');
 assert.equal(q.length,1);
 assert.equal(q[0].dex,19);
 assert.equal(noLegend.get('alpha.profile.box['+star+']'),undefined);
});
test('Ten-pull guarantees one accessible 4+ star and duplicates accumulate copies',()=>{
 const t=boot();t.frame(1000);
 const p4=t.get('alpha.data.realPokedex.find(p=>p.rarity===4)?.dex');
 const p1=t.get('alpha.data.realPokedex.find(p=>p.rarity===1)?.dex');
 assert.ok(p4&&p1);
 t.get('alpha.profile.pokedex['+p4+']=1;alpha.profile.pokedex['+p1+']=1;alpha.profile.recruitTickets=30');
 const result=t.get('alpha.recruitMany(10)');
 assert.equal(result.length,10);
 assert.ok(result.some(p=>p.star>=4));
 const copies=t.get('alpha.profile.box['+p4+']||0')+t.get('alpha.profile.box['+p1+']||0');
 assert.equal(copies,10);
 assert.equal(t.get('alpha.profile.recruitTickets'),20);
 assert.equal(t.get('alpha.teamOptions().includes('+p4+')'),true);
});
test('Recruited non-starter becomes selectable in PokéBox, uses authentic sprite/moves',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.profile.pokedex[19]=1;alpha.profile.recruitTickets=1');
 assert.equal(t.get('alpha.recruitMany(1)[0].dex'),19);
 t.press(9,1016);t.frame(1032);t.press(5,1048);
 assert.equal(t.get('alpha.menuTab'),1,'PokéBox tab');
 assert.equal(t.get('alpha.ownedIds().includes(19)'),true);
 // Owned list sorts by National Dex: #19 first, #25 second. Select #19 directly.
 t.frame(1064);t.press(1,1080);
 assert.equal(t.get('alpha.menu'),false);
 assert.equal(t.get('alpha.profile.selected'),19);
 assert.equal(t.get('alpha.chooseBattleSprite()'),'rattata');
 assert.equal(t.get('alpha.moves.length'),2);
 assert.ok(t.get('alpha.moves.every(m=>alpha.data.realMoves.some(x=>x.id===m.id))'));
 assert.equal(t.get('lastError'),'');
});
test('Native recruitment selection persists through two-checksum saves without touching browser save',()=>{
 const files=new Map(),t=boot(files);t.frame(1000);
 t.get('alpha.profile.pokedex[19]=1;alpha.profile.recruitTickets=12');
 t.get('alpha.recruitMany(10)');
 assert.equal(t.get('alpha.profile.recruitTickets'),2);
 assert.equal(t.get('alpha.profile.box[19]'),10);
 assert.equal(files.size,1);
 t.get('alpha.recruitMany(1)');
 assert.equal(files.size,2);
 const restored=boot(files);restored.frame(1000);
 assert.equal(restored.get('alpha.profile.recruitTickets'),1);
 assert.equal(restored.get('alpha.profile.box[19]'),11);
 assert.ok([...files.keys()].every(x=>x.includes('pkmsvv-native-alpha')));
});
test('Recruitment menu A one/Y ten handles controller, prevents unaffordable ten-pull',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.profile.pokedex[19]=1;alpha.profile.recruitTickets=11');
 t.press(9,1016);
 for(let i=0;i<4;i++){t.frame(1032+i*42);t.press(5,1048+i*42)}
 assert.equal(t.get('alpha.menuTab'),4);
 t.frame(1170);t.press(1,1186);
 assert.equal(t.get('alpha.profile.recruitTickets'),10);
 t.frame(1202);t.press(2,1218);
 assert.equal(t.get('alpha.profile.recruitTickets'),0);
 assert.equal(t.get('alpha.profile.box[19]'),11);
 t.frame(1234);t.press(2,1250);
 assert.equal(t.get('alpha.profile.recruitTickets'),0);
 assert.equal(t.get('alpha.lastRecruitOutcome'),'NOT ENOUGH TICKETS');
});

test('First v0.2.5 boot migrates legacy v0.2.3 save into separate slots without overwriting it',()=>{
 const files=new Map(),legacy={
  version:1,seq:7,pokedex:{19:1,16:1},box:{25:1},bestKO:42,
  badges:{kanto:1},selected:25,kantoClears:1,bestSurvivalSec:1800,bestKantoClearSec:1840
 };
 function fnv(src){let h=2166136261;for(let i=0;i<src.length;i++){h^=src.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
 const legacyText=JSON.stringify({app:'pkmsvv-switch-alpha',schema:1,
   checksum:fnv(JSON.stringify(legacy)),data:legacy});
 const legacyPath='sdmc:/switch/pkmsvv-native-alpha/progress-1.json';
 files.set(legacyPath,legacyText);
 const t=boot(files);t.frame(1000);
 assert.equal(t.get('alpha.profile.kantoClears'),1);
 assert.equal(t.get('alpha.profile.pokedex[19]'),1);
 assert.equal(t.get('alpha.profile.bestKO'),42);
 assert.equal(t.get('alpha.profile.recruitTickets'),0);
 assert.equal(t.get('alpha.saveStatus'),'MIGRATED');
 assert.equal(files.get(legacyPath),legacyText,'must preserve original rollback save byte-for-byte');
 assert.ok([...files.keys()].some(k=>k.endsWith('progress-v030-1.json')));
 assert.equal(t.get('alpha.profile.seq'),8);
 const migrated=boot(files);migrated.frame(1000);
 assert.equal(migrated.get('alpha.profile.seq'),8);
 assert.equal(migrated.get('alpha.saveStatus'),'RESTORED');
 migrated.get('alpha.profile.pokedex[19]=1;alpha.profile.recruitTickets=3;alpha.recruitMany(1)');
 assert.equal(files.get(legacyPath),legacyText,'native v024 recruitment cannot modify legacy v023 slot');
 assert.equal(migrated.get('alpha.profile.recruitTickets'),2);
});

test('Rank 0-5 costs 1,2,3,4,5 ordinary duplicates and protects the base copy',()=>{
 const files=new Map(),t=boot(files);t.frame(1000);
 const dex=25;
 t.get('alpha.profile.box[25]=16');
 assert.equal(t.get('alpha.rankOf(25)'),0);
 for(let rank=1;rank<=5;rank++){
  const p=t.get('alpha.rankPlan(25)');
  assert.equal(p.cost,rank);
  assert.equal(p.eligible,true);
  assert.equal(t.get('alpha.upgradeRank(25)'),true);
  assert.equal(t.get('alpha.rankOf(25)'),rank);
  assert.equal(t.get('alpha.profile.box[25]'),16-rank*(rank+1)/2);
 }
 assert.equal(t.get('alpha.profile.box[25]'),1,'one original always remains in Box');
 assert.equal(t.get('alpha.rankPlan(25).reason'),'RANK MAX');
 assert.equal(t.get('alpha.upgradeRank(25)'),false);
 assert.equal(t.get('alpha.profile.box[25]'),1);
 assert.equal(t.get('alpha.rankDamageMultiplier'),1.3);
 t.get('alpha.resetBattle()');
 assert.equal(t.get('hp'),130);
 assert.equal(t.get('alpha.rankMaxHp'),130);
 assert.equal(t.get('alpha.profile.ranks[25]'),5);
 assert.equal(files.size,2,'dual rotating checkpoints only');
 const restored=boot(files);restored.frame(1000);
 assert.equal(restored.get('alpha.rankOf(25)'),5);
 assert.equal(restored.get('alpha.profile.box[25]'),1);
});
test('Rank cannot use Shiny, other-species copies, missing Pokémon or Legendary clones',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.profile.box[25]=1;alpha.profile.box[19]=20');
 assert.equal(t.get('alpha.rankPlan(25).eligible'),false,'Rattata copies do not upgrade Pikachu');
 assert.equal(t.get('alpha.upgradeRank(25)'),false);
 assert.equal(t.get('alpha.profile.box[19]'),20);
 // Shiny cosmetic is not part of native box's ordinary copy ledger.
 t.get('alpha.profile.shiny={25:1}');
 assert.equal(t.get('alpha.rankPlan(25).available'),0);
 assert.equal(t.get('alpha.rankPlan(150).reason'),'NOT OWNED');
 t.get('alpha.profile.box[150]=20');
 assert.equal(t.get('alpha.rankPlan(150).eligible'),false);
 assert.equal(t.get('alpha.rankPlan(150).reason'),'LEGENDARY LOCKED');
 assert.equal(t.get('alpha.profile.box[150]'),20);
});
test('Rank upgrade is atomic: failed readback rolls back copies, rank and sequence',()=>{
 const files=new Map(),t=boot(files);t.frame(1000);
 t.get('alpha.profile.box[25]=2');
 const before=t.get('JSON.stringify(alpha.profile)');
 t.c.Switch.writeFileSync=()=>{throw Error('SD card unavailable')};
 assert.equal(t.get('alpha.upgradeRank(25)'),false);
 assert.equal(t.get('JSON.stringify(alpha.profile)'),before);
 assert.equal(t.get('alpha.lastRankOutcome'),'SAVE FAILED - MATERIALS KEPT');
 assert.equal(files.size,0);
 t.c.Switch.writeFileSync=(path,value)=>files.set(path,String(value));
 assert.equal(t.get('alpha.upgradeRank(25)'),true);
 assert.equal(t.get('alpha.rankOf(25)'),1);
 assert.equal(t.get('alpha.profile.box[25]'),1);
});
test('Rank 4 native cooldown is one 5% modifier, not cumulative per level',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.profile.ranks[25]=3;alpha.resetBattle()');
 assert.equal(t.get('alpha.rankCooldownMultiplier'),1);
 t.get('alpha.profile.ranks[25]=4;alpha.resetBattle()');
 assert.equal(t.get('alpha.rankCooldownMultiplier'),.95);
 t.get('alpha.profile.ranks[25]=5;alpha.resetBattle()');
 assert.equal(t.get('alpha.rankCooldownMultiplier'),.95);
 assert.equal(t.get('alpha.rankMaxHp'),130);
});
test('Native Rank tab follows PokéBox, uses Y to choose and A for immediate upgrade',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.profile.box[19]=2;alpha.profile.box[25]=2');
 t.press(9,1016);
 t.frame(1032);t.press(5,1048);
 t.frame(1064);t.press(5,1080);
 assert.equal(t.get('alpha.menuTab'),2);
 assert.equal(t.get('alpha.rankOf(19)'),0);
 t.frame(1096);t.press(1,1112);
 assert.equal(t.get('alpha.rankOf(19)'),1,'no confirmation prompt');
 assert.equal(t.get('alpha.menu'),true,'remain in menu');
 assert.equal(t.get('alpha.profile.box[19]'),1);
 t.frame(1128);t.press(2,1144);
 t.frame(1160);t.press(1,1176);
 assert.equal(t.get('alpha.rankOf(25)'),1,'Y selects next owned Pokémon');
 assert.equal(t.get('alpha.profile.box[25]'),1);
 assert.equal(t.get('alpha.menu'),true);
 assert.equal(t.get('lastError'),'');
});
test('Native v026 imports v024 recruitment and Box intact, never overwrites v024 slots',()=>{
 const files=new Map();
 const original=boot(files);original.frame(1000);
 original.get('alpha.onKill({dex:19});alpha.profile.box[19]=3;alpha.profile.recruitTickets=5;alpha.profile.recruitPity=47');
 assert.equal(original.get('alpha.persist()'),true);
 const v026Key=[...files.keys()].find(k=>k.includes('progress-v030-'));
 const oldValue=files.get(v026Key);
 const legacyKey=v026Key.replace('progress-v030-','progress-v024-');
 files.delete(v026Key);files.set(legacyKey,oldValue);
 const migrated=boot(files);migrated.frame(1000);
 assert.equal(migrated.get('alpha.saveStatus'),'MIGRATED');
 assert.equal(migrated.get('alpha.profile.box[19]'),3);
 assert.equal(migrated.get('alpha.profile.recruitTickets'),5);
 assert.equal(migrated.get('alpha.profile.recruitPity'),47);
 assert.equal(migrated.get('alpha.rankOf(19)'),0);
 assert.equal(files.get(legacyKey),oldValue,'v024 save remains untouched');
 assert.ok([...files.keys()].some(k=>k.includes('progress-v030-')));
 migrated.get('alpha.upgradeRank(19)');
 assert.equal(migrated.get('alpha.profile.box[19]'),2);
 assert.equal(migrated.get('alpha.rankOf(19)'),1);
 assert.equal(files.get(legacyKey),oldValue,'rank changes cannot modify v024 rollback copy');
});

test('Native compiled Rank branch/effect source matches Stage2/Stage4 without browser hooks',()=>{
 const rules=data.nativeAlpha.rankRules;
 assert.equal(rules.max,5);
 assert.equal(rules.traits.hitChance,.16);
 assert.equal(rules.traits.hitCooldownMs,3500);
 assert.equal(rules.traits.hybridCooldownMs,12000);
 assert.equal(rules.traits.hybridMaxTargets,6);
 assert.equal(rules.traits.hybridRadius,140);
 assert.equal(rules.traits.branchStatuses.fire,'burn');
 assert.equal(rules.traits.branchStatuses.defense,'guard');
 assert.equal(rules.traits.branchStatuses.ghost,'evade');
});
test('Rank3 dual-type branch and mono offense/defense are permanent and species-scoped',()=>{
 const t=boot();t.frame(1000);
 assert.equal(JSON.stringify(t.get('alpha.branchOptions(6)')),JSON.stringify(['fire','flying']));
 assert.equal(JSON.stringify(t.get('alpha.branchOptions(25)')),JSON.stringify(['offense','defense']));
 t.get('alpha.profile.box[6]=5;alpha.profile.ranks[6]=3');
 assert.equal(t.get("alpha.chooseRankBranch(6,'psychic')"),false,'invalid type rejected');
 assert.equal(t.get("alpha.chooseRankBranch(6,'flying')"),true);
 assert.equal(t.get('alpha.rankBranch(6)'),'flying');
 assert.equal(t.get("alpha.chooseRankBranch(6,'fire')"),false,'cannot silently reselect permanent branch');
 assert.equal(t.get('alpha.rankBranch(25)'),null);
 t.get('alpha.profile.ranks[25]=3');
 assert.equal(t.get("alpha.chooseRankBranch(25,'offense')"),true);
 assert.equal(t.get('alpha.rankBranch(25)'),'offense');
 assert.equal(t.get('alpha.rankBranch(6)'),'flying');
});
test('Rank3 branch modal X/Y consumes keys without switching Pokémon or using Orb',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.profile.box[6]=5;alpha.profile.ranks[6]=3');
 t.press(9,1016);t.frame(1032);t.press(5,1048);
 t.frame(1064);t.press(5,1080);
 assert.equal(t.get('alpha.menuTab'),2);
 t.frame(1096);t.press(1,1112);
 assert.equal(t.get('alpha.branchPromptDex'),6);
 const before=t.get('alpha.menuIndex');
 t.frame(1128);t.press(2,1144);
 assert.equal(t.get('alpha.branchPromptDex'),0);
 assert.equal(t.get('alpha.rankBranch(6)'),'flying','Y chooses second type, not next Box row');
 assert.equal(t.get('alpha.menuIndex'),before);
 assert.equal(t.get('alpha.menu'),true);
 assert.equal(t.get('alpha.profile.box[6]'),5);
});
test('Rank3 branch save error rolls back branch, the prompt remains retryable',()=>{
 const files=new Map(),t=boot(files);t.frame(1000);
 t.get('alpha.profile.box[6]=4;alpha.profile.ranks[6]=3');
 t.c.Switch.writeFileSync=()=>{throw Error('SD disconnected')};
 assert.equal(t.get("alpha.chooseRankBranch(6,'fire')"),false);
 assert.equal(t.get('alpha.rankBranch(6)'),null);
 assert.equal(t.get('alpha.profile.box[6]'),4);
 assert.equal(t.get('alpha.lastRankOutcome'),'SAVE FAILED - BRANCH NOT CHANGED');
 t.c.Switch.writeFileSync=(path,value)=>files.set(path,String(value));
 assert.equal(t.get("alpha.chooseRankBranch(6,'fire')"),true);
 assert.equal(t.get('alpha.rankBranch(6)'),'fire');
 const restored=boot(files);restored.frame(1000);
 assert.equal(restored.get('alpha.rankBranch(6)'),'fire');
 assert.equal(restored.get('alpha.rankOf(6)'),3);
});
test('Rank3 proc/status uses original 16% chance and 3.5s lock, not every hit',()=>{
 const t=boot();t.frame(1000);
 t.get("alpha.profile.box[6]=3;alpha.profile.ranks[6]=3;alpha.profile.rankBranches[6]='fire';alpha.profile.selected=6;alpha.resetBattle()");
 t.get("spawnAt=Infinity;enemies=[{x:px+70,y:py,species:'rattata',dex:19,hp:100000,r:16,speed:0}]");
 for(let i=0;i<100&&t.get('alpha.rankProcCount')===0;i++)t.get('alpha.onRankHit(enemies[0])');
 assert.equal(t.get('alpha.rankProcCount'),1,'proc eventually activates with actual chance');
 assert.ok(t.get('enemies[0].rankDotLeft')>0,'fire branch applies native burn');
 for(let i=0;i<100;i++)t.get('alpha.onRankHit(enemies[0])');
 assert.equal(t.get('alpha.rankProcCount'),1,'3.5s lock prevents repeated activation');
 t.get('alpha.advanceRankClock(3.6)');
 for(let i=0;i<100&&t.get('alpha.rankProcCount')===1;i++)t.get('alpha.onRankHit(enemies[0])');
 assert.equal(t.get('alpha.rankProcCount'),2);
});
test('Rank5 hybrid hits at most 6 other targets per 12s and triggers on fatal attack',()=>{
 const t=boot();t.frame(1000);
 t.get("alpha.profile.box[6]=3;alpha.profile.ranks[6]=5;alpha.profile.rankBranches[6]='fire';alpha.profile.selected=6;alpha.resetBattle()");
 t.get("spawnAt=Infinity;enemies=Array.from({length:12},(_,i)=>({x:px+70+(i%4)*12,y:py+(i%3)*17,species:'rattata',dex:19,hp:1000,r:16,speed:0}))");
 t.get('enemies[0].hp=0');
 const before=t.get('enemies.reduce((n,e)=>n+e.hp,0)');
 const first=t.get('alpha.onRankHit(enemies[0])');
 assert.equal(first.hybrid,6);
 assert.equal(t.get('alpha.rankHybridCount'),6);
 assert.ok(t.get('enemies.reduce((n,e)=>n+e.hp,0)')<before);
 const next=t.get('alpha.onRankHit(enemies[0])');
 assert.equal(next.hybrid,0,'12s lock active');
 t.get('alpha.advanceRankClock(12.1)');
 assert.equal(t.get('alpha.onRankHit(enemies[0]).hybrid'),6);
 assert.equal(t.get('alpha.rankHybridCount'),12);
 assert.ok(t.get('alpha.effectCount')<=14);
});
test('Rank defensive branch modifies incoming damage and resets between species',()=>{
 const t=boot();t.frame(1000);
 t.get("alpha.profile.ranks[25]=3;alpha.profile.rankBranches[25]='defense';alpha.resetBattle()");
 assert.equal(t.get('alpha.incomingDamageMultiplier'),.94);
 t.get('alpha.profile.ranks[25]=5');
 assert.equal(t.get('alpha.incomingDamageMultiplier'),.9);
 t.get('alpha.profile.rankBranches[25]="offense"');
 assert.equal(t.get('alpha.incomingDamageMultiplier'),1);
});
test('Native v026 preserves v025 rank/Box save and never overwrites its rollback file',()=>{
 const files=new Map(),source=boot(files);source.frame(1000);
 source.get('alpha.profile.box[19]=3;alpha.profile.ranks[19]=3;alpha.profile.recruitTickets=7;alpha.onKill({dex:19})');
 assert.equal(source.get('alpha.persist()'),true);
 const current=[...files.keys()].find(k=>k.includes('progress-v030-'));
 const old=files.get(current),prev=current.replace('progress-v030-','progress-v025-');
 files.delete(current);files.set(prev,old);
 const t=boot(files);t.frame(1000);
 assert.equal(t.get('alpha.saveStatus'),'MIGRATED');
 assert.equal(t.get('alpha.profile.box[19]'),3);
 assert.equal(t.get('alpha.rankOf(19)'),3);
 assert.equal(t.get('alpha.profile.recruitTickets'),7);
 assert.equal(t.get('alpha.rankBranch(19)'),null);
 assert.equal(files.get(prev),old);
 assert.ok([...files.keys()].some(k=>k.includes('progress-v030-')));
 assert.equal(t.get("alpha.chooseRankBranch(19,'defense')"),true);
 assert.equal(files.get(prev),old);
});

test('All 52 canonical Kanto level evolutions are compiled, and no item/trade form is auto-added',()=>{
 const rows=data.nativeAlpha.evolutions;
 assert.equal(rows.length,52);
 assert.ok(rows.every(r=>r.from>=1&&r.from<=151&&r.to>=1&&r.to<=151&&r.level>=2));
 assert.equal(rows.find(r=>r.from===4)?.to,5);
 assert.equal(rows.find(r=>r.from===5)?.to,6);
 assert.equal(rows.find(r=>r.from===16)?.to,17);
 assert.equal(rows.find(r=>r.from===17)?.to,18);
 assert.ok(!rows.some(r=>r.from===25||r.from===133||r.from===93),
  'stone and trade evolutions never trigger simply because of level');
});
test('Charmander evolves with actual Gen1 stats, correct sprites, HP fraction and Dex discovery',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.profile.selected=4;alpha.resetBattle();hp=50;level=16');
 assert.equal(t.get('alpha.onLevelUp()'),true);
 assert.equal(t.get('alpha.evolvedDex'),5);
 assert.equal(t.get('alpha.battleEvolutionDex'),5);
 assert.equal(t.get('alpha.chooseBattleSprite()'),'charmeleon');
 assert.equal(t.get('alpha.profile.pokedex[5]'),1);
 assert.equal(t.get('alpha.profile.pokedex[6]'),undefined);
 assert.equal(t.get('alpha.profile.selected'),4,'evolved Pokémon is a combat form; base stays in Box');
 assert.equal(t.get('alpha.profile.box[4]'),undefined,'trial starter does not grant permanent ownership');
 const grown=t.get('alpha.rankMaxHp');
 assert.ok(grown>100&&grown<=150);
 assert.ok(Math.abs(t.get('hp')-grown/2)<.0001,'preserve health percentage on transformation');
 assert.ok(t.get('alpha.rankDamageMultiplier')>1);
 assert.ok(t.get('alpha.moveMultiplier')>=1);
 assert.equal(t.get('alpha.onLevelUp()'),false,'same level never causes repeated evolution');
 assert.equal(t.get('alpha.evolutionEvents'),1);
 t.get('level=36');
 assert.equal(t.get('alpha.onLevelUp()'),true);
 assert.equal(t.get('alpha.evolvedDex'),6);
 assert.equal(t.get('alpha.chooseBattleSprite()'),'charizard');
 assert.equal(t.get('alpha.profile.pokedex[6]'),1);
 assert.equal(t.get('alpha.profile.selected'),4);
 assert.equal(t.get('alpha.evolutionEvents'),2);
 assert.match(t.get('alpha.evolutionNotice'),/Charmeleon.*Charizard/);
});
test('Skipped-level evolution unlocks each intermediate species without duplication',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.profile.selected=16;alpha.resetBattle();level=36');
 assert.equal(t.get('alpha.onLevelUp()'),true);
 assert.equal(t.get('alpha.evolvedDex'),18);
 assert.equal(t.get('alpha.chooseBattleSprite()'),'pidgeot');
 assert.equal(t.get('alpha.profile.pokedex[17]'),1,'Pidgeotto is discovered');
 assert.equal(t.get('alpha.profile.pokedex[18]'),1,'Pidgeot is discovered');
 assert.equal(t.get('alpha.evolutionEvents'),2);
 assert.equal(t.get('alpha.onLevelUp()'),false);
 assert.equal(t.get('alpha.evolutionEvents'),2);
});
test('Actual evolution rules apply across all source Kanto species at their required level',()=>{
 const t=boot();t.frame(1000);
 for(const row of data.nativeAlpha.evolutions){
  t.get('alpha.profile.selected='+row.from+';alpha.resetBattle();level='+row.level);
  assert.equal(t.get('alpha.onLevelUp()'),true,'failed evolution '+row.from+'->'+row.to);
  assert.equal(t.get('alpha.evolvedDex'),row.to,'wrong level evolution '+row.from);
  assert.equal(t.get('alpha.battleEvolutionDex'),row.to);
  assert.ok(t.get('alpha.chooseBattleSprite()').length>0);
 }
 assert.equal(t.get('lastError'),'');
});
test('Pikachu, Eevee, Gloom and Haunter do not auto-evolve via stones/trades',()=>{
 const t=boot();t.frame(1000);
 for(const dex of [25,133,44,93]){
  t.get('alpha.profile.selected='+dex+';alpha.resetBattle();level=90');
  assert.equal(t.get('alpha.onLevelUp()'),false);
  assert.equal(t.get('alpha.evolvedDex'),dex);
  assert.equal(t.get('alpha.evolutionEvents'),0);
 }
});
test('Evolved form battle bonuses keep original Rank5 and branch intact without creating extra Box copies',()=>{
 const t=boot();t.frame(1000);
 t.get("alpha.profile.box[16]=1;alpha.profile.ranks[16]=5;alpha.profile.rankBranches[16]='flying';alpha.profile.selected=16;alpha.resetBattle()");
 const baseHP=t.get('alpha.rankMaxHp');
 const baseDmg=t.get('alpha.rankDamageMultiplier');
 t.get('level=18;alpha.onLevelUp()');
 assert.ok(t.get('alpha.rankMaxHp')>baseHP);
 assert.ok(t.get('alpha.rankDamageMultiplier')>baseDmg);
 assert.equal(t.get('alpha.rankOf(16)'),5);
 assert.equal(t.get('alpha.rankBranch(16)'),'flying');
 assert.equal(t.get('alpha.profile.box[16]'),1);
 assert.equal(t.get('alpha.profile.box[17]'),undefined);
 assert.equal(t.get('alpha.rankCooldownMultiplier'),.95);
 const before=t.get('alpha.rankMaxHp');
 t.get('level=36;alpha.onLevelUp()');
 assert.ok(t.get('alpha.rankMaxHp')>=before);
 assert.equal(t.get('alpha.profile.box[18]'),undefined);
});
test('Evolution in accelerated QA still changes battle sprites but grants no official Pokédex',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.profile.selected=4;alpha.resetBattle()');
 t.buttons[6].pressed=true;t.buttons[5].pressed=true;t.frame(1016);
 assert.equal(t.get('alpha.runUsedQA'),true);
 t.get('level=36');
 assert.equal(t.get('alpha.onLevelUp()'),true);
 assert.equal(t.get('alpha.evolvedDex'),6);
 assert.equal(t.get('alpha.profile.pokedex[5]'),undefined);
 assert.equal(t.get('alpha.profile.pokedex[6]'),undefined);
 assert.equal(t.get('alpha.evolutionEvents'),2);
});
test('Evolution unlocks persist across native dual saves and retained Pokémon is still the original',()=>{
 const files=new Map(),t=boot(files);t.frame(1000);
 t.get('alpha.profile.selected=4;alpha.profile.box[4]=3;alpha.profile.ranks[4]=1;alpha.resetBattle();level=16;alpha.onLevelUp()');
 assert.equal(t.get('alpha.persist()'),true);
 assert.equal(files.size,1);
 t.get('level=36;alpha.onLevelUp()');
 assert.equal(t.get('alpha.persist()'),true);
 assert.equal(files.size,2);
 const restored=boot(files);restored.frame(1000);
 assert.equal(restored.get('alpha.profile.selected'),4);
 assert.equal(restored.get('alpha.profile.pokedex[5]'),1);
 assert.equal(restored.get('alpha.profile.pokedex[6]'),1);
 assert.equal(restored.get('alpha.profile.box[4]'),3);
 assert.equal(restored.get('alpha.profile.box[5]'),undefined);
 assert.equal(restored.get('alpha.profile.ranks[4]'),1);
 assert.ok([...files.keys()].every(k=>k.includes('progress-v030-')));
});
test('v0.3.0 migrates Rank3 branch and PokéBox from v0.2.9 without rewriting the old save',()=>{
 const files=new Map(),t=boot(files);t.frame(1000);
 t.get("alpha.profile.box[16]=2;alpha.profile.ranks[16]=3;alpha.profile.rankBranches[16]='flying';alpha.profile.recruitTickets=4;alpha.onKill({dex:19})");
 assert.equal(t.get('alpha.persist()'),true);
 const current=[...files.keys()].find(k=>k.includes('progress-v030-')),content=files.get(current);
 const legacy=current.replace('progress-v030-','progress-v029-');
 files.delete(current);files.set(legacy,content);
 const restored=boot(files);restored.frame(1000);
 assert.equal(restored.get('alpha.profile.box[16]'),2);
 assert.equal(restored.get('alpha.rankOf(16)'),3);
 assert.equal(restored.get('alpha.rankBranch(16)'),'flying');
 assert.equal(restored.get('alpha.profile.recruitTickets'),4);
 assert.equal(restored.get('alpha.saveStatus'),'MIGRATED');
 assert.equal(files.get(legacy),content,'old v026 rollback save remains byte-identical');
 assert.ok([...files.keys()].some(k=>k.includes('progress-v030-')));
});

test('Real native projectile kill evolves Charmander at level 16 and keeps direct X skill choice',()=>{
 const t=boot();t.frame(1000);
 t.get("alpha.profile.selected=4;alpha.resetBattle();level=15;xp=11;spawnAt=Infinity;fireAt=Infinity;shots.push({x:px+90,y:py,vx:0,vy:0,ttl:1.3});enemies.push({x:px+90,y:py,dex:19,species:'rattata',hp:.5,r:16,speed:0})");
 t.frame(1016);
 assert.equal(t.get('level'),16);
 assert.equal(t.get('alpha.evolvedDex'),5);
 assert.equal(t.get('alpha.battleEvolutionDex'),5);
 assert.equal(t.get('alpha.profile.pokedex[5]'),1);
 assert.equal(t.get('pickOpen'),true,'evolution does not suppress skill popup');
assert.equal(t.get('alpha.evolutionSwapStage'),'old');
  t.press(0,1032); // B selects KEEP (third card)
  assert.equal(t.get('alpha.evolutionSwapStage'),'');
  assert.equal(t.get('pickOpen'),true,'normal upgrade remains selectable');
  t.frame(1048);t.press(3,1064);
  assert.equal(t.get('pickOpen'),false,'X still picks first normal upgrade');
 assert.equal(t.get('paused'),false);
 assert.equal(t.get('lastError'),'');
});
test('Real native skill KO evolves Pidgey through normal XP route',()=>{
 const t=boot();t.frame(1000);
 t.get("alpha.profile.selected=16;alpha.resetBattle();level=17;xp=11;spawnAt=Infinity;enemies.push({x:px+75,y:py,dex:19,species:'rattata',hp:1,r:16,speed:0})");
 assert.equal(t.get("alpha.castMove({id:'tackle',lvl:1})"),true);
 assert.equal(t.get('level'),18);
 assert.equal(t.get('alpha.evolvedDex'),17);
 assert.equal(t.get('alpha.chooseBattleSprite()'),'pidgeotto');
 assert.equal(t.get('alpha.profile.pokedex[17]'),1);
 assert.equal(t.get('lastError'),'');
});

test('Evolution swap offers three fixed source-authorized species moves',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.profile.selected=4;alpha.resetBattle();level=16;alpha.onLevelUp();alpha.offersForLevel()');
 assert.equal(t.get('alpha.evolutionSwapStage'),'old');
 assert.equal(t.get('alpha.evolutionSwapChoices.length'),3);
 const initial=t.get('JSON.stringify(alpha.evolutionSwapChoices)');
 assert.ok(t.get('alpha.evolutionSwapChoices.every(id=>alpha.naturalMovePool(5).includes(id))'));
 t.get('alpha.pickOffer(0)');
 assert.equal(t.get('alpha.evolutionSwapStage'),'new');
 assert.equal(t.get('JSON.stringify(alpha.evolutionSwapChoices)'),initial);
 assert.equal(t.get('alpha.offers.length'),4);
});
test('Evolution replaces exactly one skill, preserves level and Rank, and normal level-up remains',()=>{
 const t=boot();t.frame(1000);
 t.get("alpha.profile.selected=4;alpha.profile.box[4]=3;alpha.profile.ranks[4]=4;alpha.resetBattle();alpha.moves[0].lvl=4;alpha.moves[0].cooldown=.28;level=16;alpha.onLevelUp();alpha.offersForLevel()");
 const second=t.get('alpha.moves[1].id');
 assert.equal(t.get('alpha.pickOffer(0)'),true);
 const chosen=t.get('alpha.offers[0].id');
 assert.equal(t.get('alpha.pickOffer(0)'),true);
 assert.equal(t.get('alpha.moves[0].id'),chosen);
 assert.equal(t.get('alpha.moves[0].lvl'),4);
 assert.ok(t.get('alpha.moves[0].cooldown')>0);
 assert.equal(t.get('alpha.moves[1].id'),second);
 assert.equal(t.get('alpha.rankOf(4)'),4);
 assert.equal(t.get('alpha.profile.box[4]'),3);
 assert.equal(t.get('alpha.evolutionSwapCount'),1);
 assert.equal(t.get('alpha.evolutionSwapStage'),'');
 assert.equal(t.get('pickOpen'),true);
 assert.equal(t.get('alpha.pickOffer(0)'),true);
 assert.equal(t.get('pickOpen'),false);
});
test('Both KEEP stages preserve move list and consume no normal upgrade',()=>{
 for(const late of [false,true]){
  const t=boot();t.frame(1000);
  t.get('alpha.profile.selected=4;alpha.resetBattle();level=16;alpha.onLevelUp();alpha.offersForLevel()');
  const before=t.get('JSON.stringify(alpha.moves)');
  if(late){t.get('alpha.pickOffer(0)');t.get('skillPage=1')}
  t.get('alpha.pickOffer('+(late?0:2)+')');
  assert.equal(t.get('JSON.stringify(alpha.moves)'),before);
  assert.equal(t.get('alpha.evolutionSwapCount'),0);
  assert.equal(t.get('alpha.evolutionSwapStage'),'');
  assert.equal(t.get('pickOpen'),true);
 }
});
test('Two skipped-level evolutions each get a separate swap; original Box remains',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.profile.selected=10;alpha.profile.box[10]=2;alpha.resetBattle();level=12;alpha.onLevelUp();alpha.offersForLevel()');
 assert.equal(t.get('alpha.evolutionEvents'),2);
 for(let i=0;i<2;i++){
  assert.equal(t.get('alpha.evolutionSwapStage'),'old');
  t.get('skillPage=Math.floor((alpha.offers.length-1)/3)');
  t.get('alpha.pickOffer((alpha.offers.length-1)%3)');
 }
 assert.equal(t.get('alpha.evolutionSwapStage'),'');
 assert.equal(t.get('pickOpen'),true);
 assert.equal(t.get('alpha.profile.box[10]'),2);
 assert.equal(t.get('alpha.profile.box[11]'),undefined);
});
test('R+Y Orb, R+B Pause and + menu cannot override evolution popup',()=>{
 const t=boot();t.frame(1000);
 t.get("alpha.profile.selected=4;alpha.resetBattle();alpha.orbQueue.push('quick');level=16;alpha.onLevelUp();alpha.offersForLevel()");
 t.buttons[5].pressed=true;t.press(2,1016);
 assert.equal(t.get('alpha.evolutionSwapStage'),'new');
 assert.equal(t.get('alpha.orbQueue.length'),1);
 t.buttons[5].pressed=false;t.frame(1032);
 t.buttons[5].pressed=true;t.press(0,1048);
 assert.equal(t.get('paused'),false);
 t.buttons[5].pressed=false;t.frame(1064);t.press(9,1080);
 assert.equal(t.get('alpha.menu'),false);
 assert.equal(t.get('lastError'),'');
});
test('Move swap is run-only and only v030 save slots are written',()=>{
 const files=new Map(),t=boot(files);t.frame(1000);
 t.get('alpha.profile.selected=4;alpha.profile.box[4]=2;alpha.resetBattle();level=16;alpha.onLevelUp();alpha.offersForLevel()');
 const original=t.get('JSON.stringify(alpha.profile)');
 t.get('alpha.pickOffer(0);alpha.pickOffer(0)');
 assert.equal(t.get('JSON.stringify(alpha.profile)'),original);
 assert.equal(t.get('alpha.persist()'),true);
 assert.ok([...files.keys()].every(k=>k.includes('progress-v030-')));
 assert.ok([...files.values()].every(v=>!v.includes('evoQueue')));
});

test('Native v029 acquired species start from original species pool, not type approximations',()=>{
 const t=boot();t.frame(1000);
 for(const dex of [10,16,19,37,63,94,115,133,150]){
  t.get('alpha.profile.selected='+dex+';alpha.resetBattle()');
  const eligible=t.get('alpha.naturalMovePool('+dex+')');
  const moves=t.get('alpha.moves.map(m=>m.id)');
  assert.ok(eligible.length>0,'missing source pool for '+dex);
  assert.ok(moves.every(id=>eligible.includes(id)||id==='tackle'||id==='quick-attack'),
   'wrong native species starter move #'+dex);
 }
});
test('Native v029 level-up offers follow currently evolved-form move pool',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.profile.selected=4;alpha.resetBattle();level=16;alpha.onLevelUp();alpha.offersForLevel()');
 if(t.get('alpha.evolutionSwapStage')){
  t.get('skillPage=Math.floor((alpha.offers.length-1)/3)');
  t.get('alpha.pickOffer((alpha.offers.length-1)%3)');
 }
 const source=t.get('alpha.naturalMovePool(5)');
 const choices=t.get("alpha.offers.filter(o=>o.kind==='new').map(o=>o.id)");
 assert.ok(choices.every(id=>source.includes(id)));
 assert.equal(t.get('pickOpen'),true);
});
test('Native v029 safely migrates v027 and v024 generations without changing rollback',()=>{
 for(const old of ['v027','v024']){
  const files=new Map(),base=boot(files);base.frame(1000);
  base.get('alpha.profile.box[10]=3;alpha.profile.ranks[10]=1;alpha.onKill({dex:19})');
  assert.equal(base.get('alpha.persist()'),true);
  const key=[...files.keys()][0],payload=files.get(key),legacy=key.replace('v030',old);
  files.delete(key);files.set(legacy,payload);
  const restored=boot(files);restored.frame(1000);
  assert.equal(restored.get('alpha.saveStatus'),'MIGRATED');
  assert.equal(restored.get('alpha.profile.box[10]'),3);
  assert.equal(files.get(legacy),payload);
  assert.ok([...files.keys()].some(k=>k.includes('progress-v030-')));
 }
});

test('Source-backed conditional Kanto evolutions include exactly 16 stone and four link branches',()=>{
 const rows=data.nativeAlpha.specialEvolutions;
 assert.equal(rows.length,20);
 assert.equal(rows.filter(x=>x.trigger==='3').length,16);
 assert.equal(rows.filter(x=>x.trigger==='2'&&x.item==='link-cable').length,4);
 assert.equal(JSON.stringify(rows.filter(x=>x.from===133).map(x=>x.to)),JSON.stringify([134,135,136]));
 assert.ok(rows.some(x=>x.from===93&&x.to===94));
});
test('One transient Evolution Shard per defeated Kanto boss, never regular KO',()=>{
 const t=boot();t.frame(1000);
 assert.equal(t.get('alpha.evolutionShards'),0);
 t.get('alpha.onKill({dex:19})');
 assert.equal(t.get('alpha.evolutionShards'),0);
 t.get('alpha.onKill({dex:150,boss:15})');
 assert.equal(t.get('alpha.evolutionShards'),1);
 t.get('alpha.onKill({dex:150,boss:15})');
 assert.equal(t.get('alpha.evolutionShards'),1);
 t.get('alpha.resetBattle()');
 assert.equal(t.get('alpha.evolutionShards'),0);
});
test('Manual Thunder Stone Raichu scales HP, consumes shard, retains original Rank & PokéBox',()=>{
 const t=boot();t.frame(1000);
 assert.equal(t.get('alpha.chooseSpecialEvolution(26)'),false);
 t.get('alpha.profile.ranks[25]=4;alpha.profile.box[25]=3;alpha.resetBattle();alpha.onKill({dex:150,boss:15})');
 t.get('hp=alpha.rankMaxHp*.60');
 const portion=t.get('hp/alpha.rankMaxHp');
 assert.equal(t.get('alpha.chooseSpecialEvolution(26)'),true);
 assert.equal(t.get('alpha.evolutionShards'),0);
 assert.equal(t.get('alpha.battleEvolutionDex'),26);
 assert.equal(t.get('alpha.evolvedDex'),26);
 assert.equal(t.get('alpha.chooseBattleSprite()'),'raichu');
 assert.ok(Math.abs(t.get('hp/alpha.rankMaxHp')-portion)<.002);
 assert.equal(t.get('alpha.profile.pokedex[26]'),1);
 assert.equal(t.get('alpha.rankOf(25)'),4);
 assert.equal(t.get('alpha.profile.box[25]'),3);
 assert.equal(t.get('alpha.profile.box[26]'),undefined);
 assert.equal(t.get('alpha.chooseSpecialEvolution(26)'),false);
});
test('Eevee has three separately selectable stone evolutions; branch locks after use',()=>{
 for(const target of [134,135,136]){
  const t=boot();t.frame(1000);
  t.get('alpha.profile.selected=133;alpha.resetBattle();alpha.onKill({dex:150,boss:15})');
  assert.equal(JSON.stringify(t.get('alpha.specialEvolutionOptions().map(r=>r.to)')),JSON.stringify([134,135,136]));
  assert.equal(t.get('alpha.chooseSpecialEvolution('+target+')'),true);
  assert.equal(t.get('alpha.battleEvolutionDex'),target);
  assert.equal(t.get('alpha.specialEvolutionOptions().length'),0);
  assert.equal(t.get('alpha.profile.pokedex['+target+']'),1);
 }
});
test('Haunter Link Cable unlocks Gengar but leveling up never reverts manually evolved form',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.profile.selected=93;alpha.resetBattle();level=95;alpha.onLevelUp()');
 assert.equal(t.get('alpha.evolvedDex'),93);
 t.get('alpha.onKill({dex:150,boss:15})');
 assert.equal(t.get('alpha.chooseSpecialEvolution(94)'),true);
 assert.equal(t.get('alpha.evolvedDex'),94);
 t.get('level=96;alpha.onLevelUp()');
 assert.equal(t.get('alpha.evolvedDex'),94);
 assert.equal(t.get('alpha.battleEvolutionDex'),94);
});
test('Manual item evolution skill exchange does not add a free normal level-up',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.onKill({dex:150,boss:15})');
 assert.equal(t.get('alpha.chooseSpecialEvolution(26)'),true);
 assert.equal(t.get('alpha.evolutionSwapStage'),'old');
 assert.equal(t.get('pickOpen'),true);
 t.get('skillPage=Math.floor((alpha.offers.length-1)/3)');
 t.get('alpha.pickOffer((alpha.offers.length-1)%3)');
 assert.equal(t.get('alpha.evolutionSwapStage'),'');
 assert.equal(t.get('pickOpen'),false);
 assert.equal(t.get('alpha.levelOffersAfterEvolution'),null);
});
test('Gamepad menu EVOLVE: L/R tabs, Y branch, A spends shard',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.profile.selected=133;alpha.resetBattle();alpha.onKill({dex:150,boss:15})');
 t.press(9,1016);
 for(let i=0;i<9;i++){t.frame(1032+i*32);t.press(5,1048+i*32)}
 assert.equal(t.get('alpha.menuTab'),9);
 t.frame(1336);t.press(2,1352);
 assert.equal(t.get('alpha.menuIndex'),1);
 t.frame(1368);t.press(1,1384);
 assert.equal(t.get('alpha.evolvedDex'),135);
 assert.equal(t.get('alpha.menu'),false);
 assert.equal(t.get('alpha.evolutionSwapStage'),'old');
 assert.equal(t.get('lastError'),'');
});
test('QA accelerated shard evolution cannot silently unlock permanent Pokédex',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.profile.selected=133;alpha.resetBattle()');
 t.buttons[6].pressed=true;t.buttons[5].pressed=true;t.frame(1016);
 assert.equal(t.get('alpha.runUsedQA'),true);
 t.get('alpha.onKill({dex:150,boss:15})');
 assert.equal(t.get('alpha.chooseSpecialEvolution(135)'),true);
 assert.equal(t.get('alpha.profile.pokedex[135]'),undefined);
 assert.equal(t.get('alpha.evolvedDex'),135);
});
test('v0.3.0 dual save migration preserves v029 original bytes and saves only new file name',()=>{
 const files=new Map(),t=boot(files);t.frame(1000);
 t.get('alpha.profile.selected=25;alpha.onKill({dex:19});alpha.persist()');
 const key=[...files.keys()][0],original=files.get(key),old=key.replace('v030','v029');
 files.delete(key);files.set(old,original);
 const migrated=boot(files);migrated.frame(1000);
 assert.equal(migrated.get('alpha.saveStatus'),'MIGRATED');
 assert.equal(files.get(old),original);
 assert.ok([...files.keys()].some(x=>x.includes('progress-v030-')));
 assert.equal(migrated.get('alpha.evolutionShards'),0);
});
