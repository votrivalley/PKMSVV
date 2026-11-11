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
 t.frame(1048);t.press(5,1064);assert.equal(t.get('menuTab'),1);
 t.press(5,1080);assert.equal(t.get('menuTab'),1,'shoulder is edge triggered');
 t.frame(1096);t.press(0,1112);
 assert.equal(t.get('alpha.menu'),false);
 assert.equal(t.get('lastError'),'');
});
test('Trial roster selection changes visual lead only, never grants Box ownership',()=>{
 const t=boot();t.frame(1000);
 t.press(9,1016);
 t.frame(1032);t.press(2,1048);
 assert.equal(t.get('menuIndex'),1);
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
test('Fusion strictly requires both original moves MAX and is once per run',()=>{
 const t=boot();t.frame(1000);
 t.get('alpha.offersForLevel()');
 assert.equal(t.get('offers[0].kind'), 'upgrade');
 t.get("alpha.moves.find(x=>x.id==='thunder-shock').lvl=5");
 t.get("alpha.moves.find(x=>x.id==='quick-attack').lvl=5");
 t.get('alpha.offersForLevel()');
 assert.equal(t.get('offers[0].id'),'spark-quick');
 assert.equal(t.get('alpha.pickOffer(0)'),true);
 assert.equal(t.get('alpha.fusionUsed'),true);
 assert.equal(t.get('alpha.moves.some(x=>x.id==="fusion:spark-quick")'),true);
 t.get('alpha.offersForLevel()');
 assert.notEqual(t.get('offers[0].kind'),'fusion');
});
test('Orb queue uses first-in-first-out and quick speed from PKMSVV source',()=>{
 const t=boot();t.frame(1000);
 t.get("alpha.orbQueue.push('quick','slumber')");
 t.press(2,1016);
 assert.equal(t.get('alpha.orbQueue[0]'),'slumber');
 assert.equal(t.get('alpha.moveMultiplier'),1.25);
 assert.equal(t.get('orbCooldown'),5);
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
