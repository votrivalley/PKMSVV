// PKMSVV Switch Native ALPHA — playable native subset, not the browser engine.
// Source-backed data is injected from Kanto, Orbs, Fusion, Mega and Evolution.
// Never write/overwrite Android, Web or PC saves. This is an isolated NRO save.
const alpha=(()=>{
 'use strict';
 const data=KANTO_CONFIG.nativeAlpha;
 if(!data)throw Error('Native Alpha compiled game data absent');
 const roster=data.trialRoster,rosterNames=roster.map(p=>p.name.toLowerCase());
 const foes=data.trialEnemies,foeNames=foes.map(p=>p.name.toLowerCase());
 const species=new Map([...roster,...foes].map(p=>[p.name.toLowerCase(),p]));
 const byDex=new Map([...roster,...foes].map(p=>[p.dex,p]));
 const spriteNames=new Set([...rosterNames,...foeNames,'mewtwo','charizard']);
 const SAVE_PATH='sdmc:/switch/pkmsvv-native-alpha/';
 const MOVE_MAX=5,MAX_MOVES=8;
 let profile={version:1,seq:0,pokedex:{},box:{25:1},bestKO:0,badges:{},selected:25};
 let saveStatus='UNAVAILABLE',saveDirty=false,lastSaveAt=0,saveSlot=0;
 let menu=false,menuTab=0,menuIndex=0,started=false,clockScale=1,accelerated=false;
 let lastStart=false,lastA=false,lastB=false,lastY=false,lastX=false,lastZR=false,lastZL=false;
 let lastLeft=false,lastRight=false,lastL=false,lastR=false;
 let orbQueue=[],orbCooldown=0,activeBuffs={},moveList=[],offers=[],fusionUsed=false,fusionName='';
 let effects=[],megEnergy=0,megaActive=0,megaCooldown=0,megaPreview=false;
 let boss15=false,boss30=false,badgeWon=false,gameWon=false,bossMessage='';
 let skillClock=0,killAward=0,alphaImageLoaded=false;
 const name=p=>p?.name||'Unknown';
 const getMon=dex=>roster.find(x=>x.dex===dex)||byDex.get(dex);
 const orbById=id=>data.orbs.find(o=>o.id===id);
 function fnv(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
 function readSlot(i){
  if(typeof Switch==='undefined'||typeof Switch.readFileSync!=='function'||typeof TextDecoder!=='function')return null;
  try{
   const bytes=Switch.readFileSync(SAVE_PATH+'progress-'+i+'.json');
   if(!bytes)return null;
   const row=JSON.parse(new TextDecoder().decode(bytes));
   if(row?.app!=='pkmsvv-switch-alpha'||row?.schema!==1||!row.data||
    fnv(JSON.stringify(row.data))!==row.checksum)return null;
   return row.data;
  }catch(_){return null}
 }
 function load(){
  const a=readSlot(1),b=readSlot(2),saved=(!a?b:!b?a:a.seq>b.seq?a:b);
  if(saved&&Number.isInteger(saved.seq)&&saved.seq>=0){
   const found=saved.pokedex&&typeof saved.pokedex==='object'?saved.pokedex:{};
   const kept={};
   for(const key of Object.keys(found))if(+key>=1&&+key<=151&&found[key]===1)kept[key]=1;
   profile={version:1,seq:saved.seq,pokedex:kept,
    box:saved.box&&typeof saved.box==='object'?saved.box:{25:1},
    bestKO:Math.max(0,Math.min(1000000,+saved.bestKO||0)),
    badges:saved.badges&&typeof saved.badges==='object'?saved.badges:{},
    selected:roster.some(r=>r.dex===saved.selected)?saved.selected:25};
   saveSlot=a&&a.seq===saved.seq?1:2;
   saveStatus='RESTORED';
  }else saveStatus=typeof Switch==='undefined'?'TEST ONLY':'NEW';
 }
 function persist(){
  if(!saveDirty)return false;
  if(typeof Switch==='undefined'||typeof Switch.writeFileSync!=='function')return false;
  const next=saveSlot===1?2:1,p={...profile,seq:profile.seq+1};
  const text=JSON.stringify(p);
  const payload=JSON.stringify({app:'pkmsvv-switch-alpha',schema:1,checksum:fnv(text),data:p});
  try{
   Switch.writeFileSync(SAVE_PATH+'progress-'+next+'.json',payload);
   // Read back and validate before declaring the rotating backup committed.
   const verify=readSlot(next);
   if(!verify||verify.seq!==p.seq)throw Error('Read-back failed');
   profile=p;saveSlot=next;saveDirty=false;saveStatus='SAVED';
   return true;
  }catch(err){saveStatus='SAVE FAILED';return false}
 }
 function markDirty(){saveDirty=true}
 function resetBattle(){
  px=W/2;py=H/2;hp=100;kills=0;time=0;xp=0;level=1;
  enemies.length=0;shots.length=0;
  spawnAt=0;fireAt=.2;spawnShield=2;
  attack=1;fireRate=.21;moveSpeed=230;
  paused=false;pickOpen=false;skillChoices=[];
  orbQueue.length=0;orbCooldown=0;activeBuffs={};moveList=[];
  moveList.push({id:'thunder-shock',lvl:1},{id:'quick-attack',lvl:1});
  offers=[];fusionUsed=false;fusionName='';
  effects.length=0;megEnergy=0;megaActive=0;megaCooldown=0;
  boss15=false;boss30=false;badgeWon=false;gameWon=false;bossMessage='';
  skillClock=0;killAward=0;started=true;
 }
 function selectSpecies(index){
  const pool=foes.filter(p=>p.minTier<=index);
  return pool[Math.floor(rng()*pool.length)]||foes[0];
 }
 function evolvedDex(){
  let id=profile.selected;
  for(let i=0;i<3;i++){
   const ev=data.evolutions.find(e=>e.from===id&&e.level<=level);
   if(!ev)break;
   id=ev.to;
  }
  return id;
 }
 function chooseBattleSprite(){
  const evolved=evolvedDex();
  if(evolved===6)return 'charizard';
  if(evolved!==profile.selected)return getMon(profile.selected)?.name.toLowerCase()||'pikachu';
  return getMon(profile.selected)?.name.toLowerCase()||'pikachu';
 }
 function loadExtraSprites(){
  if(alphaImageLoaded||typeof Image!=='function')return;
  alphaImageLoaded=true;
  for(const entry of [...roster,...foes,{name:'Mewtwo',sprite:'150.png'},
    {name:'Charizard',sprite:'6.png'}]){
   const key=entry.name.toLowerCase();
   if(key==='pikachu'||key==='rattata')continue; // loaded by proven baseline
   if(SPRITES[key])continue;
   try{
    const img=new Image();
    img.onload=()=>{SPRITES[key]=img;loaded[key]=true};
    img.onerror=()=>{loaded[key]=false};
    img.src='romfs:/sprites/'+entry.sprite;
   }catch(_){loaded[key]=false}
  }
 }
 function newOrb(){
  if(orbQueue.length>=10)return false;
  const entry=data.orbs[Math.floor(rng()*data.orbs.length)];
  orbQueue.push(entry.id);markDirty();return true;
 }
 function orbUse(){
  if(!orbQueue.length||orbCooldown>0)return false;
  const id=orbQueue.shift(),orb=orbById(id);
  if(!orb)return false;
  orbCooldown=5;
  if(id==='slumber')for(const e of enemies)e.sleepLeft=Math.max(e.sleepLeft||0,e.boss?.5:3);
  if(id==='slow')for(const e of enemies)e.slowLeft=Math.max(e.slowLeft||0,6);
  if(id==='blowback')for(const e of enemies){
   const dx=e.x-px,dy=e.y-py,dist=Math.hypot(dx,dy)||1;
   if(dist<215){e.x=clamp(e.x+(dx/dist)*(e.boss?40:120),15,W-15);e.y=clamp(e.y+(dy/dist)*90,80,H-18)}
  }
  if(id==='focus'||id==='quick'||id==='luminous')activeBuffs[id]=orb.duration;
  markDirty();return true;
 }
 function onKill(e){
  if(!e)return;
  const dex=Number(e.dex||species.get(e.species)?.dex);
  if(Number.isInteger(dex)&&dex>=1&&dex<=151){
   profile.pokedex[dex]=1;
   // Dex discoverability != gacha ownership: do not grant Pokémon to Box.
   markDirty();
  }
  profile.bestKO=Math.max(profile.bestKO,kills+1);
  megEnergy=Math.min(100,megEnergy+(e.boss?3:2));
  killAward++;
  if(killAward===1||rng()<.02)newOrb();
  if(e.boss===15){badgeWon=true;profile.badges.kanto=1;bossMessage='KANTO REGION BADGE';markDirty()}
  if(e.boss===30){gameWon=true;bossMessage='KANTO ALPHA COMPLETE';markDirty()}
 }
 function offersForLevel(){
  const maxed=id=>moveList.some(m=>m.id===id&&m.lvl>=MOVE_MAX);
  const canFuse=data.fusions.find(r=>!fusionUsed&&r.moves.every(maxed));
  offers=[];
  if(canFuse)offers.push({kind:'fusion',id:canFuse.id,name:canFuse.name});
  for(const m of moveList)if(m.lvl<MOVE_MAX&&offers.length<3)
   offers.push({kind:'upgrade',id:m.id,name:m.id+' LV '+(m.lvl+1)});
  const ids=['ember','tackle','water-gun','vine-whip','thunderbolt',
   'spark','gust','ice-shard','razor-leaf','rock-tomb','confusion','shadow-ball',
   'flamethrower','metal-claw','psychic','bubble-beam'];
  for(const id of ids)if(offers.length<3&&moveList.length<MAX_MOVES&&!moveList.some(m=>m.id===id))
   offers.push({kind:'new',id,name:id});
  while(offers.length<3)offers.push({kind:'heal',id:'heal',name:'HEAL 35 HP'});
  skillChoices=offers.map(o=>({name:o.name,description:o.kind}));
  skillPage=0;pickOpen=true;
 }
 function pickOffer(slot){
  if(!pickOpen||slot<0||slot>2)return false;
  const o=offers[slot];if(!o)return false;
  if(o.kind==='fusion'){
   if(fusionUsed)return false;
   const recipe=data.fusions.find(f=>f.id===o.id);
   if(!recipe||!recipe.moves.every(id=>moveList.some(m=>m.id===id&&m.lvl>=MOVE_MAX)))return false;
   moveList=moveList.filter(m=>!recipe.moves.includes(m.id));
   moveList.push({id:'fusion:'+recipe.id,lvl:MOVE_MAX});
   fusionUsed=true;fusionName=recipe.name;
  }else if(o.kind==='upgrade'){
   const move=moveList.find(m=>m.id===o.id);if(move)move.lvl=Math.min(MOVE_MAX,move.lvl+1);
  }else if(o.kind==='new'){
   if(moveList.length>=MAX_MOVES)return false;
   moveList.push({id:o.id,lvl:1});
  }else hp=Math.min(100,hp+35);
  pickOpen=false;xp=0;markDirty();return true;
 }
 function spawnBoss(which){
  const mon={x:W/2,y:90,species:'mewtwo',dex:KANTO_CONFIG.mascotDex,
   hp:which===15?360:950,r:35,speed:32,boss:which,slowLeft:0,sleepLeft:0};
  if(enemies.length>=MAX_ENEMIES)enemies.shift();
  enemies.push(mon);bossMessage=which===15?'REGION BOSS 15:00':'FINAL BOSS 30:00';
 }
 function activateMega(){
  // No fake official Mega unlock. Native preview requires explicit TEST mode,
  // a Charizard-compatible evolutionary line and 100 energy.
  if(!accelerated||evolvedDex()!==6||
     megEnergy<100||megaCooldown>0||megaActive>0)return false;
  megEnergy=0;megaActive=data.mega.duration;megaCooldown=data.mega.cooldown;
  megaPreview=true;return true;
 }
 function updateEffects(dt){
  for(const key of Object.keys(activeBuffs)){
   activeBuffs[key]-=dt;if(activeBuffs[key]<=0)delete activeBuffs[key];
  }
  for(const e of enemies){
   e.sleepLeft=Math.max(0,(e.sleepLeft||0)-dt);
   e.slowLeft=Math.max(0,(e.slowLeft||0)-dt);
  }
  for(let i=effects.length-1;i>=0;i--){
   effects[i].ttl-=dt;if(effects[i].ttl<=0)effects.splice(i,1);
  }
  orbCooldown=Math.max(0,orbCooldown-dt);
  megaActive=Math.max(0,megaActive-dt);
  megaCooldown=Math.max(0,megaCooldown-dt);
 }
 function extraCombat(dt){
  if(!moveList.length||pickOpen||paused)return;
  skillClock+=dt;
  const interval=megaActive>0?.7:1;
  if(skillClock<interval)return;
  skillClock=0;
  // Native subset: extra auto-skill impacts nearby enemies. These are NOT
  // the browser engine's 103 individual move implementations.
  const power=moveList.reduce((n,m)=>n+(m.id.startsWith('fusion:')?12:m.lvl),0);
  const radius=moveList.some(m=>m.id.startsWith('fusion:'))?185:110;
  effects.push({x:px,y:py,r:radius,ttl:.22});
  if(effects.length>6)effects.shift();
  for(let i=enemies.length-1;i>=0;i--){
   const e=enemies[i],dist=Math.hypot(e.x-px,e.y-py);
   if(dist>radius)continue;
   e.hp-=Math.max(1,Math.floor(power*.35))*(megaActive>0?1.5:1);
   megEnergy=Math.min(100,megEnergy+1);
   if(e.hp<=0){onKill(e);enemies.splice(i,1);kills++;xp++;if(xp>=12&&!pickOpen){level++;offersForLevel()}}
  }
 }
 function input(dt){
  const pad=navigator.getGamepads?.()?.find?.(p=>p?.connected)||navigator.getGamepads?.()?.[0];
  const btn=n=>!!pad?.buttons?.[n]?.pressed;
  const plus=btn(9),a=btn(1),b=btn(0),y=btn(2),x=btn(3),zr=btn(7),zl=btn(6),
   left=btn(14),right=btn(15),r=btn(5),l=btn(4);
  if(plus&&!lastStart){menu=!menu;menuIndex=0;if(menu){persist()}}
  if(zl&&r&&!lastZL){accelerated=!accelerated;clockScale=accelerated?12:1}
  let consumedMenuClose=false;
  if(menu){
   if((left&&!lastLeft)||(l&&!lastL))menuTab=(menuTab+5)%6;
   if((right&&!lastRight)||(r&&!lastR))menuTab=(menuTab+1)%6;
   if(menuTab===0){
    if(a&&!lastA){profile.selected=roster[menuIndex%roster.length].dex;markDirty();resetBattle();menu=false}
    if(y&&!lastY)menuIndex=(menuIndex+1)%roster.length;
   }
   if(b&&!lastB){menu=false;consumedMenuClose=true}
  }else{
   if(y&&!lastY&&!r)orbUse();
   if(zr&&!lastZR&&!r)activateMega();
   if(spritesEnabled)loadExtraSprites();
  }
  lastStart=plus;lastA=a;lastB=b;lastY=y;lastX=x;lastZR=zr;lastZL=zl;
  lastLeft=left;lastRight=right;lastL=l;lastR=r;
  return menu||consumedMenuClose||plus;
 }
 function preUpdate(dt){return input(dt)}
 function onRespawn(){
  boss15=false;boss30=false;bossMessage='';
  orbQueue.length=0;orbCooldown=0;activeBuffs={};effects.length=0;
  megaActive=0;megaCooldown=0;megEnergy=0;
 }
 function postUpdate(dt){
  if(paused||menu||!started)return;
  updateEffects(dt);
  extraCombat(dt);
  if(!boss15&&time>=KANTO_CONFIG.sealSeconds){boss15=true;spawnBoss(15)}
  if(!boss30&&time>=KANTO_CONFIG.finalBossSeconds){boss30=true;spawnBoss(30)}
  if(saveDirty&&time-lastSaveAt>30){persist();lastSaveAt=time}
 }
 function text(x,y,value,color='#eaf9f0',font='19px sans-serif'){
  ctx.fillStyle=color;ctx.font=font;ctx.fillText(String(value),x,y)
 }
 function draw(){
  text(820,44,'PKMSVV SWITCH ALPHA 0.1.0','#ffe39d');
  text(820,74,'KANTO • GEN 1 • '+(accelerated?'QA x12':'REAL TIME'),'#a7e7f6');
  text(820,103,'TEAM: '+name(getMon(profile.selected))+'   MOVE: '+moveList.length+'/8');
  text(820,132,'ORB: '+orbQueue.length+'/10   CD '+orbCooldown.toFixed(1)+'s');
  text(820,161,'MEGA: '+megEnergy+'/100  CD '+Math.ceil(megaCooldown)+'s');
  text(820,190,'DEX: '+Object.keys(profile.pokedex).length+'  BADGE: '+(badgeWon?'YES':'NO'));
  text(820,218,'SAVE: '+saveStatus,'#acc7ff');
  text(820,251,'Y ORB  ZR MEGA QA  + MENU','#ffe0ad','17px sans-serif');
  text(820,277,'ZL+R: QA CLOCK x12  L: SPRITE','#ffe0ad','17px sans-serif');
  if(moveList.length){
   const list=moveList.map(m=>m.id+(m.lvl<5?' '+m.lvl:' MAX'));
   for(let i=0;i<list.length;i++)text(840,322+i*25,list[i],'#caefcc','16px sans-serif');
  }
  for(const fx of effects){ctx.strokeStyle='#f9d977';ctx.lineWidth=2;
   ctx.beginPath();ctx.arc(fx.x,fx.y,fx.r,0,Math.PI*2);ctx.stroke()}
  if(pickOpen){
   for(let i=0;i<offers.length;i++)text(W-390,210+i*72,'R+'+['X','Y','B'][i]+' '+offers[i].name,'#ffe7b0','17px sans-serif');
  }
  if(bossMessage)text(455,123,bossMessage,'#fff0a2','bold 28px sans-serif');
  if(gameWon)text(390,355,'KANTO ALPHA CLEARED','#ffee88','bold 35px sans-serif');
  if(menu)drawMenu();
 }
 function drawMenu(){
  ctx.fillStyle='rgba(6,17,29,.97)';ctx.fillRect(95,65,1080,590);
  ctx.strokeStyle='#92dccb';ctx.strokeRect(95,65,1080,590);
  const tabs=['TEAM','BOX','POKEDEX','ORB','FUSION','INFO'];
  for(let i=0;i<6;i++)text(127+i*166,110,(i===menuTab?'[':'')+tabs[i]+(i===menuTab?']':''),
   i===menuTab?'#fff0a2':'#b8d5d6','20px sans-serif');
  if(menuTab===0){
   text(135,170,'Y NEXT • A TRIAL SELECT • L/R TABS • B BACK','#cfeadf');
   for(let i=0;i<roster.length;i++){
    const p=roster[i];text(160,230+i*65,(i===menuIndex?'▶ ':'   ')+p.name+' #'+p.dex+
     (p.dex===profile.selected?'  (ACTIVE)':''),i===menuIndex?'#ffdc94':'#dce9e7','23px sans-serif');
   }
  }
  if(menuTab===1){
   text(135,170,'BOX: actual native Alpha ownership, never grants trial Pokémon','#d6ede4');
   const owned=Object.keys(profile.box).filter(id=>profile.box[id]);
   for(let i=0;i<owned.length;i++)text(165,220+i*60,'OWNED #'+owned[i]+'  '+(getMon(+owned[i])?.name||''));
  }
  if(menuTab===2){
   text(135,170,'DEX: defeated species only, NOT owned Pokémon','#d6ede4');
   let ids=Object.keys(profile.pokedex).sort((a,b)=>Number(a)-Number(b));
   for(let i=0;i<Math.min(ids.length,18);i++)text(165+(i%3)*330,220+Math.floor(i/3)*60,'#'+ids[i]+'  DISCOVERED');
   if(!ids.length)text(165,235,'No Pokémon defeated yet','#fff0ad');
  }
  if(menuTab===3){
   text(135,170,'Orb queue (FIFO, max 10, 5s cooldown) • Y uses first');
   for(let i=0;i<orbQueue.length;i++)text(165,213+i*37,(i+1)+'. '+orbQueue[i],'#ffe5b2');
  }
  if(menuTab===4){
   text(135,170,'Fusion: 2 source moves MAX, once per match','#ffdfa4');
   for(let i=0;i<data.fusions.length;i++){
    const f=data.fusions[i],known=id=>moveList.some(m=>m.id===id&&m.lvl>=MOVE_MAX);
    text(145+(i%2)*510,220+Math.floor(i/2)*72,f.name+(f.moves.every(known)?' READY':' LOCKED'),
     f.moves.every(known)?'#a3ffc7':'#c5ccd1','16px sans-serif');
   }
  }
  if(menuTab===5){
   text(145,175,'Native Alpha QA: real Kanto waves, six source Orbs, 10 Fusion recipes');
   text(145,216,'Partial battle adapter: not yet the production browser gameplay engine.');
   text(145,257,'Save: sdmc:/switch/pkmsvv-native-alpha/ (two independent copies)');
   text(145,298,'No PC/Web/Android save import; no real gacha or permanent Mega unlock.');
   text(145,339,'Modes not ported: Co-op, Arena, Berry Rescue, 10 chapters.');
   text(145,380,'ZL+R accelerates QA clock only; QA Mega preview is never saved.');
  }
 }
 // Keep persistent progress isolated; no automatic ownership grants.
 load();resetBattle();
 return {enabled:true,data,spriteNames,preUpdate,postUpdate,onKill,offersForLevel,
  pickOffer,selectSpecies,draw,persist,loadExtraSprites,chooseBattleSprite,onRespawn,
  get profile(){return profile},get menu(){return menu},get accelerated(){return accelerated},
  get orbQueue(){return orbQueue},get moves(){return moveList},
  get boss15(){return boss15},get boss30(){return boss30},get gameWon(){return gameWon},
  get fusionUsed(){return fusionUsed},get megaPreview(){return megaPreview},
  get menuTab(){return menuTab},get menuIndex(){return menuIndex},
  get orbCooldown(){return orbCooldown},
  get offers(){return offers},
  get saveStatus(){return saveStatus},get clockScale(){return clockScale},
  get moveMultiplier(){return activeBuffs.quick>0?1.25:1}
 };
})();