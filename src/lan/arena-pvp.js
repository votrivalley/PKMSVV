'use strict';
/* Arena PvP: actual LAN/Wi-Fi human-v-human duels, not a renamed AI Enemy.
 * The Host is authoritative over health, cast validation, countdown and winner.
 * G.Coop still replicates sprites and actual skill casts to the other machine.
 * No cloud, ranked rewards, guessed remote identity or combat debug shortcuts.
 */
G.PKMSVVArenaPvp=(()=>{
 const COUNTDOWN=3,DUEL=180,HP=320,RADIUS=18,FRAME_RATE=.13;
 const $=id=>document.getElementById(id);
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,Number.isFinite(Number(n))?Number(n):lo));
 const members=()=>G.Social?.room?.members||[];
 const actualRoom=()=>G.Social?.room?.mode==='arena'&&
    members().length===2&&members().every(m=>!m.bot&&typeof m.uid==='string');
 let active=false,host=false,uid='',hostUid='',seed=null,people=[],hp={},stage='idle';
 let elapsed=0,serial=0,received=-1,frameClock=0,winner=null,casts=new Map(),orbClock=0;
 let element=null,result=null;
 const mode=()=>!!(active&&G.Coop?.active&&actualRoom());
 const local=()=>G.Game?.player;
 const peerId=id=>people.find(m=>m.uid!==id)?.uid;
 const getPeer=id=>id===uid?local():G.Coop?.mate?.(id)?.pl;
 const coords=id=>{
  const p=getPeer(id),net=p?.remote?p.net:null;
  const x=Number(net?.x??p?.x),y=Number(net?.y??p?.y);
  return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
 };
 const kind=(m)=>m?.kind||'projectile';
 function validPair(cfg){
  return cfg?.mode==='arena'&&actualRoom()&&
   Array.isArray(cfg.members)&&cfg.members.length===2&&
   cfg.members.every(m=>members().some(r=>r.uid===m.uid&&!r.bot))&&
   cfg.host===G.Social.room.host;
 }
 function stageUi(){
  if(element)return;
  const hostEl=document.createElement('div');
  hostEl.id='pkmsvv-arena-pvp-hud';hostEl.className='pkmsvv-arena-pvp-hud';
  hostEl.setAttribute('role','status');document.body.append(hostEl);element=hostEl;
  const panel=document.createElement('div');
  panel.id='pkmsvv-arena-pvp-overlay';panel.className='pkmsvv-arena-pvp-overlay';
  panel.hidden=true;panel.innerHTML='<div class="pkmsvv-arena-pvp-overlay-card">'+
    '<h2 id="pkmsvv-arena-pvp-result-title"></h2><p id="pkmsvv-arena-pvp-result-details"></p>'+
    '<button class="btn gold" type="button" id="pkmsvv-arena-pvp-exit">Về sảnh</button></div>';
  document.body.append(panel);result=panel;
  panel.querySelector('#pkmsvv-arena-pvp-exit').onclick=exit;
 }
 function cleanup(){
  active=false;host=false;stage='idle';winner=null;people=[];hp={};casts.clear();
  frameClock=0;orbClock=0;elapsed=0;received=-1;
  if(element){element.remove();element=null;}
  if(result){result.remove();result=null;}
  const count=$('pkmsvv-arena-pvp-count');if(count)count.remove();
  G.World?.setArena?.(null);
 }
 function normalize(pl){
  if(!pl)return;
  pl.maxHp=HP;pl.hp=HP;pl.baseAtk=1.3;pl.atkMul=1;
  pl.baseSpd=112;pl.spdMul=1;pl.cdMul=1;pl.regen=0;
  pl.invuln=COUNTDOWN+.2;pl.dead=false;pl.frozen=true;
  // Native Pokémon moves, no fabricated opponent AI or new attack definitions.
 }
 function begin(cfg,pl){
  cleanup();
  if(!validPair(cfg))return false;
  uid=G.Social.uid;hostUid=cfg.host;host=uid===hostUid;
  if(!cfg.members.some(m=>m.uid===uid))return false;
  people=cfg.members.map(m=>({uid:m.uid,name:String(m.name||'Trainer').slice(0,24),dex:m.dex}));
  seed=cfg.seed;active=true;stage='countdown';elapsed=0;winner=null;
  hp=Object.fromEntries(people.map(m=>[m.uid,HP]));
  normalize(pl);
  const left=uid===hostUid;
  pl.x=left?-135:135;pl.y=0;pl.aim=left?0:Math.PI;pl.moveAngle=pl.aim;
  G.World?.setArena?.({tx:0,ty:0,r:RADIUS,type:'normal'});
  G.EnemyMgr?.clear?.();G.Pickups?.clear?.();G.Projectiles?.clear?.();
  G.Hazards?.clear?.();G.Combat?.clearFields?.();
  stageUi();
  render();
  return true;
 }
 function canCast(from,id,level,aim){
  if(!mode()||!host||stage!=='fight'||from!==uid&&!people.some(m=>m.uid===from))return null;
  const def=G.Moves?.BY_ID?.[id];if(!def||typeof id!=='string'||id.length>60)return null;
  const k=kind(def);if(k==='buff')return null;
  const owner=coords(from),enemy=coords(peerId(from));
  if(!owner||!enemy)return null;
  const lvl=clamp(level,1,Math.min(5,def.maxLvl||5));
  const m=G.Moves?.instance?.(id,lvl)||def;
  const key=from+':'+id,now=performance.now()/1000,previous=casts.get(key);
  const cooldown=clamp(m.cd||.7,.25,8);
  if(previous!==undefined&&now-previous<Math.max(.18,cooldown*.72))return null;
  casts.set(key,now);
  const dx=enemy.x-owner.x,dy=enemy.y-owner.y,d=Math.hypot(dx,dy);
  if(!Number.isFinite(d)||d>900)return null;
  // Each attack is validated using its real move family/range and source angle.
  const cone=['beam','projectile','boomerang','cone','charge','dash','quake',
              'homing','bounce','turret','chain'].includes(k);
  const radial=['nova','aura','spin','shove','meteor','vortex','stun','mine','trail','orbit'].includes(k);
  const range=k==='melee'?clamp(m.radius||58,35,175):
   radial?clamp(m.radius||125,75,260):
   k==='beam'||k==='charge'?clamp(m.radius||430,165,610):
   clamp((m.speed||260)*(m.life||1.3),145,580);
  if(d>range+28)return null;
  const direction=Number.isFinite(Number(aim))?Number(aim):0;
  const delta=Math.atan2(Math.sin(Math.atan2(dy,dx)-direction),Math.cos(Math.atan2(dy,dx)-direction));
  const spread=k==='melee'?Math.max(.85,Number(m.arc)||Math.PI*.8)/2:cone? k==='cone'?.8:.63:Math.PI;
  if(!radial&&Math.abs(delta)>spread)return null;
  return {move:m,distance:d,from,target:peerId(from),kind:k};
 }
 function strike(from,id,lvl,aim){
  const hit=canCast(from,id,lvl,aim);
  if(!hit)return false;
  const victim=hit.target;
  const damageBase=clamp(hit.move.dmg,0,90);
  if(!damageBase)return false;
  const type=G.DEX_BY?.[people.find(m=>m.uid===victim)?.dex]?.types||[];
  const typeEffect=clamp(G.Types?.mult?.(hit.move.type,type)||1,.35,2);
  const pulse=(hit.kind==='orbit'||hit.kind==='aura')?.34:1;
  const damage=clamp(damageBase*.72*typeEffect*pulse,2,46);
  hp[victim]=Math.max(0,hp[victim]-damage);
  if(victim===uid&&local())local().hp=Math.max(1,hp[victim]);
  const opponent=G.Coop?.mate?.(victim)?.pl;
  if(opponent?.net)opponent.net.hp=Math.max(1,hp[victim]);
  G.FX?.burst?.(coords(victim)?.x||0,coords(victim)?.y||0,'#ff8a92',5,70);
  if(hp[victim]<=0){winner=from;stage='result';G.Projectiles?.clear?.();G.Combat?.clearFields?.();}
  sendState(true);
  return true;
 }
 function sendState(force=false){
  if(!mode()||!host)return;
  if(!force&&frameClock>0)return;
  frameClock=FRAME_RATE;
  const packet={k:'apvp',seed,seq:++serial,stage,time:elapsed,hp:{...hp},winner};
  G.Net?.broadcast?.(packet);
  render();
 }
 function receive(from,data){
  if(!active||!data||from!==hostUid||host||data.k!=='apvp'||
     data.seed!==seed||!Number.isSafeInteger(data.seq)||data.seq<=received)return;
  received=data.seq;
  if(!['countdown','fight','result'].includes(data.stage))return;
  stage=data.stage;elapsed=clamp(data.time,0,DUEL+COUNTDOWN+5);
  for(const m of people)hp[m.uid]=clamp(data.hp?.[m.uid],0,HP);
  winner=data.winner&&people.some(m=>m.uid===data.winner)?data.winner:null;
  applyHp();render();
 }
 function applyHp(){
  const p=local();if(!p)return;
  p.maxHp=HP;p.hp=Math.max(1,hp[uid]??HP);
  p.dead=false;p.regen=0;
  p.frozen=stage!=='fight';
  const opponent=G.Coop?.mate?.(peerId(uid))?.pl;
  if(opponent){
   opponent.maxHp=HP;opponent.hp=Math.max(1,hp[peerId(uid)]??HP);
   if(opponent.net){opponent.net.maxHp=HP;opponent.net.hp=opponent.hp;opponent.net.dead=0;}
  }
 }
 function render(){
  if(!active||!element)return;
  const [one,two]=people;
  const bar=m=>{
   const val=hp[m.uid]??HP;
   const h=document.createElement('div');h.className='pkmsvv-arena-pvp-competitor';
   const name=document.createElement('b');name.textContent=(m.uid===uid?'★ ':'')+m.name;
   const meter=document.createElement('div');meter.className='pkmsvv-arena-pvp-meter';
   const fill=document.createElement('span');fill.style.width=(val/HP*100)+'%';
   meter.append(fill);const amount=document.createElement('small');
   amount.textContent=Math.ceil(val)+'/'+HP;
   h.append(name,meter,amount);return h;
  };
  element.replaceChildren(bar(one),bar(two));
  let txt=element.querySelector('.pkmsvv-arena-pvp-time');
  if(!txt){txt=document.createElement('div');txt.className='pkmsvv-arena-pvp-time';element.append(txt);}
  txt.textContent=stage==='fight'?tr('⚔ ĐẤU TRƯỜNG · ','⚔ ARENA · ')+
     Math.max(0,Math.ceil(DUEL-elapsed))+'s':stage==='countdown'?
     tr('⚔ CHUẨN BỊ · ','⚔ READY · ')+Math.max(1,Math.ceil(COUNTDOWN-elapsed)):'';
  let count=$('pkmsvv-arena-pvp-count');
  if(!count){count=document.createElement('div');count.id='pkmsvv-arena-pvp-count';count.className='pkmsvv-arena-pvp-count';document.body.append(count);}
  count.hidden=stage==='result'||stage==='fight'&&elapsed>.7;
  if(!count.hidden)count.textContent=stage==='countdown'?String(Math.max(1,Math.ceil(COUNTDOWN-elapsed))):tr('⚔ BẮT ĐẦU!','⚔ FIGHT!');
  if(result){
   result.hidden=stage!=='result';
   if(stage==='result'){
    const win=winner===uid;
    result.querySelector('#pkmsvv-arena-pvp-result-title').textContent=
      winner===null?tr('🤝 HÒA!','🤝 DRAW!'):win?tr('🏆 BẠN THẮNG!','🏆 VICTORY!'):tr('💥 BẠN THUA!','💥 DEFEAT!');
    result.querySelector('#pkmsvv-arena-pvp-result-details').textContent=
      tr('Arena 1v1 · ', 'Arena 1v1 · ')+(people.find(p=>p.uid===winner)?.name||tr('Hòa','Draw'))+
      (winner?tr(' chiến thắng.',' wins.'):'');
   }
  }
 }
 function update(dt){
  if(!mode()||G.Game?.state!=='playing')return;
  const p=local();if(!p)return;
  if(host){
   const step=clamp(dt,0,.07);
   elapsed+=step;frameClock-=step;
   if(stage==='countdown'&&elapsed>=COUNTDOWN){stage='fight';elapsed=0;casts.clear();}
   if(stage==='fight'){
    const a=coords(uid),b=coords(peerId(uid));
    // Orb damage uses the real owned orbit move on the Host; guests are
    // resolved from their authenticated cast packet, never from fake enemies.
    orbClock+=step;
    if(orbClock>=.8&&a&&b){
     orbClock=0;
     for(const m of p.activeGroup?.()||[]){
      if(m.kind==='orbit')strike(uid,m.id,m.lvl,Math.atan2(b.y-a.y,b.x-a.x));
     }
    }
    if(elapsed>=DUEL){
     winner=hp[people[0].uid]===hp[people[1].uid]?null:
       hp[people[0].uid]>hp[people[1].uid]?people[0].uid:people[1].uid;
     stage='result';
    }
   }
   sendState(stage==='result');
  }
  applyHp();
  if(!host)render();
 }
 function exit(){
  if(!active)return;
  cleanup();G.Game?.quit?.();G.Flow?.goMenu?.();
 }
 function install(){
  if(!G.Coop?.begin||!G.Net?.on)return false;
  const originalBegin=G.Coop.begin,originalEnd=G.Coop.end,originalLeave=G.Coop.leave;
  G.Coop.begin=function(cfg,pl,cb){
   const r=originalBegin.call(this,cfg,pl,cb);
   begin(cfg,pl);return r;
  };
  G.Coop.end=function(...args){cleanup();return originalEnd.apply(this,args);};
  G.Coop.leave=function(...args){cleanup();return originalLeave.apply(this,args);};
  const oldCast=G.Coop.cast;
  G.Coop.cast=function(pl,m){
   const result=oldCast.call(this,pl,m);
   if(active&&host&&pl===local())strike(uid,m.id,m.lvl,pl.aim);
   return result;
  };
  G.Net.on((from,data)=>{
   if(!active)return;
   if(data?.k==='apvp'){receive(from,data);return;}
   if(host&&stage==='fight'&&from===peerId(uid)&&data?.k==='f'&&Array.isArray(data.ev)){
    for(const e of data.ev.slice(0,28))
     if(Array.isArray(e)&&e[0]==='c'&&typeof e[1]==='string')
       strike(from,e[1],e[2],e[3]);
   }
  });
  const updateEnemy=G.EnemyMgr?.update;
  if(typeof updateEnemy==='function')G.EnemyMgr.update=function(...args){
   const result=updateEnemy.apply(this,args);update(args[0]);return result;
  };
  const updateSpawner=G.Spawner?.update;
  if(typeof updateSpawner==='function')G.Spawner.update=function(...args){
   if(mode())return;return updateSpawner.apply(this,args);
  };
  const updateRift=G.Rift?.update;
  if(typeof updateRift==='function')G.Rift.update=function(...args){
   if(mode())return;return updateRift.apply(this,args);
  };
  const updateJudge=G.Judgment?.update;
  if(typeof updateJudge==='function')G.Judgment.update=function(...args){
   if(mode())return;return updateJudge.apply(this,args);
  };
  const oldCombat=G.Combat?.tick;
  if(typeof oldCombat==='function')G.Combat.tick=function(dt,pl,now){
   if(mode()){
    if(stage!=='fight')return;
    const target=G.Coop?.mate?.(peerId(uid))?.pl;
    if(target&&!target.dead){
     pl.target=target;
     if(!pl.manualAim)pl.aim=Math.atan2(target.y-pl.y,target.x-pl.x);
    }
   }
   return oldCombat.call(this,dt,pl,now);
  };
  G.Net.onPeer?.((from,state)=>{
   if(active&&host&&from===peerId(uid)&&['closed','failed'].includes(state)){
    winner=uid;stage='result';sendState(true);
   }
  });
  return true;
 }
 install();
 return {begin,cleanup,update,receive,strike,canCast,render,exit,COUNTDOWN,DUEL,HP,
  get active(){return active},get stage(){return stage},get winner(){return winner},
  get health(){return {...hp}},get host(){return host}};
})();