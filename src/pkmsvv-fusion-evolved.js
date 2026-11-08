/* PKMSVV evolved Fusion skills. Ten distinct real combat attacks, not a Bond
 * group and never a fake icon-only skill. Scoped per run and per actor.
 * Both source moves must be MAX; exactly one named Fusion per match.
 * Base game Rift Bonds, save format and account-owned Pokémon are untouched.
 */
G.PKMSVVFusionEvolved=(()=>{
 'use strict';
 const PREFIX='pkmsvv-fusion:';
 const COLORS={
  'ember-quick':'#ff7d47','water-tackle':'#67c9ff','grass-spin':'#85e56d',
  'spark-quick':'#ffe16e','mind-tackle':'#e89bff','fire-gust':'#ff914b',
  'bubble-ice':'#b4edff','leaf-rock':'#b0c968','shadow-mind':'#b98bff',
  'thunder-claw':'#ffdd6a'
 };
 const CONFIG={
  'ember-quick':{cd:2.9,r:110,power:1.15,kind:'fireTrail'},
  'water-tackle':{cd:3.3,r:130,power:1.1,kind:'waterWave'},
  'grass-spin':{cd:4,r:142,power:.56,kind:'vineVortex'},
  'spark-quick':{cd:3.5,r:210,power:.86,kind:'lightningChain'},
  'mind-tackle':{cd:3.7,r:148,power:1.08,kind:'psychicShock'},
  'fire-gust':{cd:3.4,r:175,power:1.05,kind:'fireTornado'},
  'bubble-ice':{cd:4,r:155,power:.76,kind:'iceBubble'},
  'leaf-rock':{cd:4.6,r:151,power:.57,kind:'stoneLeaves'},
  'shadow-mind':{cd:5,r:162,power:.82,kind:'darkOrb'},
  'thunder-claw':{cd:3.8,r:165,power:1.13,kind:'metalLightning'}
 };
 const EFFECTS=Object.freeze(Object.keys(CONFIG));
 const assets=Object.freeze(Object.fromEntries(EFFECTS.map(id=>[id,
  'assets/fusion-icons/'+id+'.webp'])));
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
 const getRec=id=>G.PKMSVVFusionPilot?.RECIPES?.find(x=>x.id===id);
 function maxed(m){
  if(!m||m.pkmsvvFusionId)return false;
  const max=Number(m.def?.maxLvl??G.Moves?.BY_ID?.[m.id]?.maxLvl);
  return Number.isFinite(max)&&max>0&&Number(m.lvl)>=max;
 }
 function eligible(player,recipe){
  if(!player||player.dead||player.remote||player.lanBot||
     Number(player._pkmsvvFusionUsed||0)>=1||!recipe||!CONFIG[recipe.id])return null;
  const moves=Array.isArray(player.moves)?player.moves:
   (player.slots||[]).flat().filter(Boolean);
  const pair=recipe.ids.map(id=>moves.find(m=>m?.id===id&&maxed(m)));
  return pair.every(Boolean)&&pair[0]!==pair[1]?pair:null;
 }
 function choices(player){return (G.PKMSVVFusionPilot?.RECIPES||[]).filter(r=>eligible(player,r));}
 function canUse(player,id){return eligible(player,getRec(id))!==null;}
 function newMove(source,recipe){
  const data=CONFIG[recipe.id],id=PREFIX+recipe.id;
  // TickMove already understands projectile autocast and CDR. The wrapper
  // on Player.cast below supplies the unique effect, not a fake beam/move.
  return {...source,id,name:tr(recipe.vi,recipe.en),
   kind:'projectile',type:source.type,pkmsvvFusionId:recipe.id,
   cd:data.cd,t:Math.min(.75,data.cd*.25),lvl:1,evolved:true,
   count:1,def:{...(source.def||{}),id,maxLvl:1,name:tr(recipe.vi,recipe.en),
    kind:'projectile',type:source.type,cd:data.cd,ups:[]}};
 }
 function evolve(player,recipeId){
  const recipe=getRec(recipeId),pair=eligible(player,recipe);
  if(!pair||!Array.isArray(player.moves)||!Array.isArray(player.slots))return null;
  const [a,b]=pair,oldMoves=player.moves.slice(),oldSlots=player.slots.map(g=>g.slice());
  const oldActive=player.active,oldBind=player.bind&&{...player.bind};
  const originalUsed=player._pkmsvvFusionUsed;
  try{
   const combined=newMove(a,recipe),at=player.moves.indexOf(a);
   if(at<0||player.moves.indexOf(b)<0)throw Error('Stale Fusion selection');
   player.moves=player.moves.filter(m=>m!==a&&m!==b);
   player.moves.splice(Math.min(at,player.moves.length),0,combined);
   const first=player.slots.findIndex(g=>g.includes(a)||g.includes(b));
   player.slots=player.slots.map(group=>group.filter(m=>m!==a&&m!==b)).filter(g=>g.length);
   player.slots.splice(clamp(first,0,player.slots.length),0,[combined]);
   player.active=clamp(oldActive,0,Math.max(0,player.slots.length-1));
   if(player.bind&&typeof player.bind==='object'){
    delete player.bind[a.id];delete player.bind[b.id];
    player.bind[combined.id]=player.slots.findIndex(g=>g.includes(combined));
   }
   player._pkmsvvFusionUsed=1;
   G.FX?.ring?.(player.x,player.y,12,145,COLORS[recipeId],.86,6);
   G.FX?.burst?.(player.x,player.y-12,COLORS[recipeId],16,105);
   G.Audio?.sfx?.('legend');
   return combined;
  }catch(error){
   player.moves=oldMoves;player.slots=oldSlots;player.active=oldActive;
   if(oldBind)player.bind=oldBind;
   player._pkmsvvFusionUsed=originalUsed;
   console.error('[PKMSVV Fusion] upgrade rolled back',error);
   return null;
  }
 }
 const imageCache=new Map();
 function imageFor(id){
  if(!assets[id]||typeof Image!=='function')return null;
  if(!imageCache.has(id)){
   const img=new Image();img.src=assets[id];imageCache.set(id,img);
  }
  return imageCache.get(id);
 }
 function installIcons(){
  const I=G.Icons;if(!I||I._pkmsvvFusionEvolved)return false;
  I._pkmsvvFusionEvolved=true;
  if(typeof I.html==='function'){
   const old=I.html;
   I.html=function(key,size,...rest){
    const id=typeof key==='string'&&key.startsWith('move:'+PREFIX)?
     key.slice(('move:'+PREFIX).length):null;
    if(assets[id])return '<img class="pkmsvv-fusion-skill-icon" src="'+assets[id]+
     '" alt="" width="'+(clamp(size,16,128)||24)+'" height="'+
      (clamp(size,16,128)||24)+'" draggable="false">';
    return old.call(this,key,size,...rest);
   };
  }
  if(typeof I.draw==='function'){
   const old=I.draw;
   I.draw=function(ctx,key,x,y,size,...rest){
    const id=typeof key==='string'&&key.startsWith('move:'+PREFIX)?
     key.slice(('move:'+PREFIX).length):null;
    if(!assets[id])return old.call(this,ctx,key,x,y,size,...rest);
    const img=imageFor(id);
    if(img?.complete&&img.naturalWidth>0){
     ctx.drawImage(img,x,y,size,size);return;
    }
    return old.call(this,ctx,'move:'+getRec(id)?.ids[0],x,y,size,...rest);
   };
  }
  return true;
 }
 function actors(){
  const raw=G.EnemyMgr?.all?.();
  const type=Object.prototype.toString.call(raw);
  const list=Array.isArray(raw)?raw:type==='[object Map]'||type==='[object Set]'?
   Array.from(raw.values()):[];
  return list.filter(e=>e&&!e.dead&&!e.remote&&!e.pkmsvvFriendly&&
   Number.isFinite(e.x)&&Number.isFinite(e.y)&&typeof e.hurt==='function');
 }
 function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
 function enemiesNear(x,y,r){
  return actors().filter(e=>Math.hypot(e.x-x,e.y-y)<=r);
 }
 function nearest(player,r=290){
  return enemiesNear(player.x,player.y,r).sort((a,b)=>distance(player,a)-distance(player,b))[0]||null;
 }
 function power(player,config){
  const atk=clamp(player.atkMul??1,.4,4);
  const base=clamp(player.baseAtk??1,.4,3);
  return Math.max(2,(9+clamp(player.level,1,90)*.68)*atk*base*config.power);
 }
 function hit(e,amount,col){
  if(!e||e.dead||e.remote||typeof e.hurt!=='function')return false;
  e.hurt(Math.max(1,amount),col,0,0,0);
  return true;
 }
 function slow(e,amount=0.25,duration=1.2){
  if(typeof e?.applySlow==='function')e.applySlow(clamp(amount,.05,.85),duration);
 }
 function stun(e,sec=.5){
  if(typeof e?.applyStun==='function')
   e.applyStun((e.boss||e.arceus||e.judge)?Math.min(.18,sec):sec);
 }
 function push(e,x,y,step,pull=false){
  if(!e||e.dead||e.boss||e.arceus)return;
  const dx=e.x-x,dy=e.y-y,len=Math.hypot(dx,dy)||1;
  const scale=(pull?-1:1)*Math.min(step,Math.max(0,len-8));
  const nx=e.x+dx/len*scale,ny=e.y+dy/len*scale;
  if(G.World?.isFree?.(nx,ny,e.r||12)===false)return;
  e.x=nx;e.y=ny;
 }
 function fx(x,y,r,color,burst=8){
  G.FX?.ring?.(x,y,8,r,color,.68,4);
  if(burst)G.FX?.burst?.(x,y-12,color,burst,Math.max(25,r*.7));
 }
 const zones=[];
 function zone(player,id,x,y,r,life,interval,potency,tag){
  // Crowded runs can carry hundreds of enemies. Cap active hazards so
  // per-tick AoE never scales with an unbounded series of skill casts.
  if(zones.length>=14)zones.shift();
  zones.push({player,id,x,y,r,life,total:life,interval,tick:0,
   potency,tag,marked:new Set()});
 }
 function cast(player,m){
  const id=m?.pkmsvvFusionId,cfg=CONFIG[id];
  if(!cfg||player.dead||player.remote)return false;
  const col=COLORS[id],dmg=power(player,cfg),t=nearest(player,300);
  if(!t){fx(player.x,player.y,cfg.r*.7,col,7);return true;}
  const x=t.x,y=t.y;const near=(r=cfg.r)=>enemiesNear(x,y,r);
  if(id==='ember-quick'){
   // Fast fire dash animation plus lingering scorched wake. No forced player
   // displacement into enemy collision (controller-safe auto-combat).
   fx(x,y,64,col,13);fx(player.x,player.y,45,col,5);
   for(const e of near(75)){hit(e,dmg,col);slow(e,.16,1.8);}
   zone(player,id,x,y,85,2.4,.45,dmg*.30,'burn');
  }else if(id==='water-tackle'){
   fx(x,y,105,col,15);
   for(const e of near(135)){hit(e,dmg,col);push(e,player.x,player.y,26);slow(e,.28,2.2);}
  }else if(id==='grass-spin'){
   fx(player.x,player.y,cfg.r,col,15);
   zone(player,id,player.x,player.y,145,3.2,.38,dmg*.52,'pull');
  }else if(id==='spark-quick'){
   const chain=[t],rest=enemiesNear(x,y,240).filter(e=>e!==t);
   while(chain.length<5&&rest.length){
    rest.sort((a,b)=>distance(a,chain[chain.length-1])-distance(b,chain[chain.length-1]));
    chain.push(rest.shift());
   }
   for(let i=0;i<chain.length;i++){
    const e=chain[i];hit(e,dmg*Math.pow(.8,i),col);
    if(i<3)stun(e,.26);fx(e.x,e.y,38,col,6);
   }
  }else if(id==='mind-tackle'){
   fx(x,y,138,col,19);
   for(const e of near(145)){hit(e,dmg*.95,col);push(e,player.x,player.y,20);slow(e,.5,2);}
  }else if(id==='fire-gust'){
   fx(x,y,175,col,12);
   // Immediate impact prevents the old Flame Gale feeling weaker than
   // the two MAX skills consumed. Subsequent burns retain continuous AoE.
   for(const e of near(145)){hit(e,dmg*1.35,col);slow(e,.35,1.5);}
   zone(player,id,x,y,175,3.8,.33,dmg*.85,'fire-pull');
  }else if(id==='bubble-ice'){
   fx(x,y,90,col,12);
   for(const e of near(135)){
    hit(e,dmg*.65,col);slow(e,.43,2.6);
    e.pkmsvvIceStacks=clamp((e.pkmsvvIceStacks||0)+1,0,3);
    if(e.pkmsvvIceStacks>=2){
     stun(e,.65);e.pkmsvvIceStacks=0;fx(e.x,e.y,37,col,8);
    }
   }
   zone(player,id,x,y,125,1.2,.6,dmg*.28,'shards');
  }else if(id==='leaf-rock'){
   fx(x,y,144,col,15);
   for(const e of near(142))slow(e,.67,2.4);
   zone(player,id,x,y,145,3.4,.48,dmg*.5,'stone');
  }else if(id==='shadow-mind'){
   fx(x,y,135,col,15);
   zone(player,id,x,y,163,2.25,.45,dmg*.38,'shadow');
  }else if(id==='thunder-claw'){
   fx(x,y,112,col,20);
   for(const e of near(160)){
    hit(e,dmg*1.20,col);
    e.pkmsvvFusionShredUntil=clock()+3;
    fx(e.x,e.y,28,'#c5d2eb',3);
   }
  }
  return true;
 }
 function clock(){
  return clamp(G.Game?.st?.time??0,0,1000000);
 }
 // Evolved armor break makes subsequent *normal* attacks hurt more, too,
 // instead of only changing this skill's own damage numbers.
 function installArmorShred(){
  const E=G.Enemy?.prototype;
  if(!E||typeof E.hurt!=='function'||E.hurt._pkmsvvFusionShred)return false;
  const prior=E.hurt;
  const wrapped=function(amount,...rest){
   if(Number(this.pkmsvvFusionShredUntil)>clock()&&!this.dead)
    amount=Number(amount)*1.16;
   return prior.call(this,amount,...rest);
  };
  wrapped._pkmsvvFusionShred=true;E.hurt=wrapped;return true;
 }
 function tickZones(player,dt){
  if(!zones.length)return;
  // Snapshot hostile actors ONLY when a zone is ready to hit. All due
  // zones share one snapshot; no per-zone EnemyMgr.all + filter allocation.
  let hostile=null;
  for(let i=zones.length-1;i>=0;i--){
   const z=zones[i];if(z.player!==player||!z.player||player.dead){
    if(z.player===player)zones.splice(i,1);continue;
   }
   z.life-=dt;z.tick-=dt;
   if(z.tick<=0){
    z.tick=Math.max(z.tick+z.interval,.05);
    if(hostile===null)hostile=actors();
    const c=COLORS[z.id],radius2=z.r*z.r;
    for(const e of hostile){
     const dx=e.x-z.x,dy=e.y-z.y;
     if(dx*dx+dy*dy>radius2)continue;
     if(z.tag==='pull'||z.tag==='fire-pull'){
      push(e,z.x,z.y,z.tag==='pull'?13:8,true);slow(e,.22,.55);
     }
     if(z.tag==='stone')slow(e,.65,.75);
     if(z.tag==='shadow'){z.marked.add(e);slow(e,.3,.6);}
     else hit(e,z.potency,c);
    }
    // Decorative particles are throttled; combat ticks and damage are not.
    z.visualTick=(z.visualTick||0)+1;
    if(z.visualTick%3===1)G.FX?.ring?.(z.x,z.y,8,z.r*.9,c,.23,2);
   }
   if(z.life<=0){
    if(z.tag==='shadow'){
     fx(z.x,z.y,z.r,COLORS[z.id],12);
     for(const e of z.marked)if(!e.dead&&distance(e,z)<z.r*1.3)
      hit(e,z.potency*3.3,COLORS[z.id]);
    }
    zones.splice(i,1);
   }
  }
 }
 function installCombat(){
  const P=G.Player?.prototype;
  if(!P||typeof P.cast!=='function'||P.cast._pkmsvvFusionEvolved)return false;
  const original=P.cast;
  const wrapped=function(m,...args){
   if(m?.pkmsvvFusionId)return cast(this,m);
   return original.call(this,m,...args);
  };
  wrapped._pkmsvvFusionEvolved=true;P.cast=wrapped;
  const C=G.Combat;if(typeof C?.tick==='function'&&!C.tick._pkmsvvFusionEvolved){
   const prior=C.tick;
   const tick=function(dt,pl,...rest){
    const result=prior.call(this,dt,pl,...rest);
    if(pl&&Number.isFinite(dt)&&dt>0)tickZones(pl,dt);
    return result;
   };
   tick._pkmsvvFusionEvolved=true;C.tick=tick;
  }
  return true;
 }
 // No client-only HP changes to NPCs in a nonhost LAN view.
 const applyCast=cast;
 function reset(){zones.length=0;}
 installIcons();installArmorShred();installCombat();
 return {PREFIX,CONFIG,EFFECTS,assets,maxed,eligible,choices,canUse,newMove,
  evolve,cast:applyCast,tickZones,reset,installIcons,installCombat,installArmorShred,
  get activeZones(){return zones.length;}};
})();
