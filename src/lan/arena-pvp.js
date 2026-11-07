'use strict';
/* Arena PvP: actual LAN/Wi-Fi human-v-human duels, not a renamed AI Enemy.
 * The Host is authoritative over health, cast validation, countdown and winner.
 * G.Coop still replicates sprites and actual skill casts to the other machine.
 * No cloud, ranked rewards, guessed remote identity or combat debug shortcuts.
 */
G.PKMSVVArenaPvp=(()=>{
 const SELECT=10,COUNTDOWN=3,DUEL=180,HP=320,RADIUS=18,FRAME_RATE=.13,RESYNC_COOLDOWN=1.2;
 const $=id=>document.getElementById(id);
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,Number.isFinite(Number(n))?Number(n):lo));
 const members=()=>G.Social?.room?.members||[];
 const isDuelMode=value=>value==='arena'||value==='champion';
 const actualRoom=()=>isDuelMode(G.Social?.room?.mode)&&
    members().length===2&&members().every(m=>!m.bot&&typeof m.uid==='string');
 let active=false,host=false,uid='',hostUid='',seed=null,people=[],hp={},stage='idle',matchType='arena',round=1,scores={};
 let elapsed=0,serial=0,received=-1,frameClock=0,winner=null,casts=new Map(),orbClock=0;
 let lastSyncRequest=-Infinity,lastSyncReply=-Infinity,lastSnapshotAt=-Infinity;
 let element=null,result=null;
 // The Host already repeats "apvp" result snapshots each frame. The only
 // fragile one-off was its exit packet. The lobby's authoritative open flag
 // provides a separate recovery signal when that packet is lost.
 let matchRoom='',startedWhileClosed=false;
 let pickReady=new Set(),pickedDex=null,pickPanel=null;
 // Keep duel isolation active after a rival disconnects; otherwise old
 // Survival spawners wake up as the room shrinks from two members to one.
 const mode=()=>!!(active&&G.Coop?.active);
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
  return isDuelMode(cfg?.mode)&&cfg.mode===G.Social?.room?.mode&&actualRoom()&&
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
  createPickPanel();
 }
 function cleanup(){
  active=false;host=false;stage='idle';winner=null;people=[];hp={};matchType='arena';round=1;scores={};casts.clear();
  frameClock=0;orbClock=0;elapsed=0;received=-1;matchRoom='';startedWhileClosed=false;
  lastSyncRequest=-Infinity;lastSyncReply=-Infinity;lastSnapshotAt=-Infinity;
  if(element){element.remove();element=null;}
  if(result){result.remove();result=null;}
  if(pickPanel){pickPanel.remove();pickPanel=null;}pickReady.clear();pickedDex=null;
  const count=$('pkmsvv-arena-pvp-count');if(count)count.remove();
  G.World?.setArena?.(null);
 }
 // Equal fixed PvP skill loadouts; never bring account upgrades to a duel.
 // All skills are real source moves, not guessed attack IDs. The Host can
 // validate a guest's cast against the same deterministic three-move loadout.
 function loadout(dex){
  const mon=G.DEX_BY?.[dex]||G.DEX_BY?.[25];
  const first=G.startMoveOf?.(dex);
  const pool=G.Moves?.poolFor?.(mon)||Object.keys(G.Moves?.BY_ID||{});
  return [...new Set([first,...pool].filter(id=>G.Moves?.BY_ID?.[id]&&
    G.Moves.BY_ID[id].kind!=='buff'))].slice(0,3);
 }
 function normalize(pl){
  if(!pl)return;
  pl.maxHp=HP;pl.hp=HP;pl.baseAtk=1.3;pl.atkMul=1;
  pl.baseSpd=112;pl.spdMul=1;pl.cdMul=1;pl.regenFlat=0;
  if(pl.buffs?.regen)pl.buffs.regen.n=0;
  pl.invuln=COUNTDOWN+.2;pl.dead=false;pl.frozen=true;
  const moves=loadout(pl.dex).map(id=>{
   const m=G.Moves?.instance?.(id,1);if(m)m.since=0;return m;
  }).filter(Boolean);
  if(moves.length){
   pl.moves=moves;pl.slots=moves.map(m=>[m]);pl.active=0;pl.maxMoves=4;
   pl.bonds=0;pl.critChance=0;pl.dmgReduce=0;
  }
  // Native Pokémon moves, no fabricated opponent AI or new attack definitions.
 }
 function begin(cfg,pl){
  cleanup();
  if(!validPair(cfg))return false;
  uid=G.Social.uid;hostUid=cfg.host;host=uid===hostUid;
  matchRoom=String(G.Social.room?.id||'');
  startedWhileClosed=G.Social.room?.open===false;
  if(!cfg.members.some(m=>m.uid===uid))return false;
  people=cfg.members.map(m=>({uid:m.uid,name:String(m.name||'Trainer').slice(0,24),dex:m.dex}));
  seed=cfg.seed;active=true;stage='select';elapsed=0;winner=null;
  pickReady.clear();pickedDex=Number(cfg.members.find(m=>m.uid===uid)?.dex)||Number(G.DB?.save?.partner)||25;
  serial=0;received=-1;lastSyncRequest=-Infinity;lastSyncReply=-Infinity;lastSnapshotAt=-Infinity;
  matchType=cfg.mode;round=1;scores=Object.fromEntries(people.map(m=>[m.uid,0]));
  hp=Object.fromEntries(people.map(m=>[m.uid,HP]));
  normalize(pl);
  const left=uid===hostUid;
  pl.x=left?-135:135;pl.y=0;pl.aim=left?0:Math.PI;pl.moveAngle=pl.aim;
  G.World?.setArena?.({tx:0,ty:0,r:RADIUS,type:'normal'});
  G.EnemyMgr?.clear?.();G.Pickups?.clear?.();G.Projectiles?.clear?.();
  G.Hazards?.clear?.();G.Combat?.clearFields?.();
  stageUi();
  renderPick();render();
  return true;
 }

 // The authenticated Host owns the 10s lobby and starts early only if both
 // human players confirm. Never mutate the player's permanent saved partner.
 function ownChoices(){
  const owned=G.DB?.save?.owned||{};
  const ids=Object.keys(owned).map(Number).filter(x=>x>0&&G.DEX_BY?.[x]);
  return ids.length?ids:[Number(G.DB?.save?.partner)||25];
 }
 function createPickPanel(){
  if(pickPanel)return;
  const panel=document.createElement('section');panel.id='pkmsvv-arena-pvp-pick';
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
  panel.setAttribute('translate','no');
  panel.innerHTML='<div class="pkmsvv-arena-pvp-pick-card">'+
   '<h2>'+tr('⚔ Chọn Pokémon trước Arena','⚔ Choose Pokémon before Arena')+'</h2>'+
   '<p id="pkmsvv-arena-pvp-pick-clock">10s</p>'+
   '<input id="pkmsvv-arena-pvp-pick-search" type="search" placeholder="'+tr('Tìm Pokémon / #Dex','Search Pokémon / #Dex')+'"/>'+
   '<div id="pkmsvv-arena-pvp-pick-options"></div>'+
   '<button type="button" class="btn gold" id="pkmsvv-arena-pvp-pick-confirm">'+tr('✓ Xác nhận','✓ Confirm')+'</button></div>';
  document.body.append(panel);pickPanel=panel;
  panel.querySelector('#pkmsvv-arena-pvp-pick-search').oninput=renderPickOptions;
  panel.querySelector('#pkmsvv-arena-pvp-pick-confirm').onclick=confirmPick;
 }
 function renderPickOptions(){
  if(!pickPanel||stage!=='select')return;
  const grid=pickPanel.querySelector('#pkmsvv-arena-pvp-pick-options');if(!grid)return;
  const query=(pickPanel.querySelector('#pkmsvv-arena-pvp-pick-search')?.value||'').trim().toLowerCase();
  grid.replaceChildren();
  for(const dex of ownChoices().filter(d=>String(d).includes(query)||String(G.DEX_BY[d]?.name||'').toLowerCase().includes(query)).slice(0,100)){
   const button=document.createElement('button');button.type='button';button.className='btn small';
   button.classList.toggle('gold',dex===pickedDex);
   button.textContent=(dex===pickedDex?'✓ ':'')+(G.DEX_BY[dex]?.name||'Pokémon')+' #'+dex;
   button.onclick=()=>{if(pickReady.has(uid))return;pickedDex=dex;renderPickOptions();};
   grid.append(button);
  }
 }
 function renderPick(){
  if(!pickPanel)return;
  pickPanel.hidden=stage!=='select'||!!G.PKMSVVBerry?.choosing;
  if(pickPanel.hidden)return;
  const clock=pickPanel.querySelector('#pkmsvv-arena-pvp-pick-clock');
  if(clock)clock.textContent=tr('Chọn trong ','Choose in ')+Math.max(0,Math.ceil(SELECT-elapsed))+'s · '+
   pickReady.size+'/'+people.length+' '+tr('người đã sẵn sàng','players ready');
  const confirm=pickPanel.querySelector('#pkmsvv-arena-pvp-pick-confirm');
  if(confirm){confirm.disabled=pickReady.has(uid);confirm.textContent=pickReady.has(uid)?
   tr('✓ Đã sẵn sàng','✓ Ready'):tr('✓ Xác nhận','✓ Confirm');}
  if(!pickPanel.dataset?.rendered){renderPickOptions();if(pickPanel.dataset)pickPanel.dataset.rendered='1';}
 }
 function confirmPick(){
  if(stage!=='select'||pickReady.has(uid))return false;
  const selected=ownChoices().includes(pickedDex)?pickedDex:Number(G.DB?.save?.partner)||25;
  const member=people.find(m=>m.uid===uid);if(member)member.dex=selected;
  pickReady.add(uid);renderPick();
  if(host){if(pickReady.size===people.length)finishPick();else sendState(true);}
  else G.Net?.toHost?.({k:'apvp-pick-ready',seed,room:matchRoom,matchType,dex:selected});
  return true;
 }
 function applyFighterChoice(){
  const member=people.find(m=>m.uid===uid),pl=local(),dex=member?.dex;
  if(!pl||!G.DEX_BY?.[dex])return;
  if(pl.dex!==dex){
   pl.dex=dex;pl.mon=G.DEX_BY[dex];
   if(G.Sprites?.Animator){
    try{pl.anim=new G.Sprites.Animator(dex,G.Sprites.playerScale?.(dex)||1,false);}catch(_){}
   }
  }
  normalize(pl);
 }
 function finishPick(){
  if(!active||stage!=='select'||!host)return false;
  stage='countdown';elapsed=0;frameClock=0;
  applyFighterChoice();if(pickPanel)pickPanel.hidden=true;
  sendState(true);return true;
 }
 function canCast(from,id,level,aim){
  if(!mode()||!host||stage!=='fight'||from!==uid&&!people.some(m=>m.uid===from))return null;
  const def=G.Moves?.BY_ID?.[id];if(!def||typeof id!=='string'||id.length>60)return null;
  const ownerMember=people.find(p=>p.uid===from);
  if(!ownerMember||!loadout(ownerMember.dex).includes(id))return null;
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
 // Solo invited PvP is a single duel. Champion invited PvP is a real
 // two-human best-of-three. Never create NPC stand-ins or award story seals.
 function settleRound(won){
  G.Projectiles?.clear?.();G.Combat?.clearFields?.();casts.clear();orbClock=0;
  if(matchType!=='champion'){winner=won;stage='result';return;}
  if(won&&Object.prototype.hasOwnProperty.call(scores,won))scores[won]++;
  if(Math.max(...Object.values(scores))>=2||round>=3){
   winner=won&&scores[won]>scores[peerId(won)]?won:
    scores[people[0].uid]>scores[people[1].uid]?people[0].uid:
    scores[people[1].uid]>scores[people[0].uid]?people[1].uid:null;
   stage='result';return;
  }
  round++;stage='countdown';elapsed=0;winner=null;
  for(const member of people)hp[member.uid]=HP;
  const p=local();if(p){p.hp=HP;p.dead=false;p.invuln=COUNTDOWN+.2;p.frozen=true;}
  const other=G.Coop?.mate?.(peerId(uid))?.pl;
  if(other){other.hp=HP;if(other.net)other.net.hp=HP;}
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
  if(hp[victim]<=0)settleRound(from);
  sendState(true);
  return true;
 }
 // App-switch, packet loss and returning from Android background may skip
 // result frames. Request a fresh Host snapshot for THIS room and match only.
 function requestSync(reason='resume'){
  if(!active||host||!mode()||!matchRoom||!hostUid)return false;
  const now=performance.now()/1000;
  if(now-lastSyncRequest<RESYNC_COOLDOWN)return false;
  lastSyncRequest=now;
  const request={k:'apvp-sync-request',seed,room:matchRoom,matchType,
   lastSeq:received,reason:String(reason).slice(0,20)};
  if(typeof G.Net?.toHost==='function')G.Net.toHost(request);
  else G.Net?.send?.(hostUid,request);
  return true;
 }
 function sendState(force=false){
  if(!mode()||!host)return;
  if(!force&&frameClock>0)return;
  frameClock=FRAME_RATE;
  const packet={k:'apvp',seed,seq:++serial,stage,time:elapsed,hp:{...hp},winner,matchType,round,scores:{...scores},
   dexes:Object.fromEntries(people.map(m=>[m.uid,m.dex])),ready:[...pickReady]};
  G.Net?.broadcast?.(packet);
  render();
 }
 function receive(from,data){
  if(!active||!data||from!==hostUid||host||data.k!=='apvp'||
     data.matchType!==matchType||
     data.seed!==seed||!Number.isSafeInteger(data.seq)||data.seq<=received)return;
  if(!['select','countdown','fight','result'].includes(data.stage))return;
  // A terminal result is immutable for this seed. Later packets cannot
  // resurrect a fight or change its winner even with a greater sequence.
  if(stage==='result'&&data.stage!=='result')return;
  received=data.seq;lastSnapshotAt=performance.now()/1000;
  const oldStage=stage;stage=data.stage;elapsed=clamp(data.time,0,DUEL+COUNTDOWN+SELECT+5);
  for(const person of people)if(Number.isInteger(Number(data.dexes?.[person.uid]))&&
    G.DEX_BY?.[Number(data.dexes[person.uid])])person.dex=Number(data.dexes[person.uid]);
  pickReady=new Set(Array.isArray(data.ready)?data.ready.filter(id=>people.some(m=>m.uid===id)):[]);
  if(oldStage==='select'&&stage!=='select')applyFighterChoice();
  round=clamp(data.round,1,3);
  for(const m of people)scores[m.uid]=clamp(data.scores?.[m.uid],0,3);
  for(const m of people)hp[m.uid]=clamp(data.hp?.[m.uid],0,HP);
  winner=data.winner&&people.some(m=>m.uid===data.winner)?data.winner:null;
  applyHp();renderPick();render();
 }
 function applyHp(){
  const p=local();if(!p)return;
  p.maxHp=HP;p.hp=Math.max(1,hp[uid]??HP);
  p.dead=false;p.regenFlat=0;
  if(p.buffs?.regen)p.buffs.regen.n=0;
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
  const heading=matchType==='champion'?'🏆 CHAMPION '+round+'/3 · '+
   people.map(m=>(scores[m.uid]||0)).join('–')+' · ':tr('⚔ ĐẤU TRƯỜNG · ','⚔ ARENA · ');
  txt.textContent=stage==='select'?heading+tr('CHỌN POKÉMON · ','POKÉMON PICK · ')+Math.max(0,Math.ceil(SELECT-elapsed))+'s':stage==='fight'?heading+Math.max(0,Math.ceil(DUEL-elapsed))+'s':stage==='countdown'?
   heading+tr('CHUẨN BỊ · ','READY · ')+Math.max(1,Math.ceil(COUNTDOWN-elapsed)):'';
  let count=$('pkmsvv-arena-pvp-count');
  if(!count){count=document.createElement('div');count.id='pkmsvv-arena-pvp-count';count.className='pkmsvv-arena-pvp-count';document.body.append(count);}
  count.hidden=stage==='select'||stage==='result'||stage==='fight'&&elapsed>.7;
  if(!count.hidden)count.textContent=stage==='countdown'?String(Math.max(1,Math.ceil(COUNTDOWN-elapsed))):tr('⚔ BẮT ĐẦU!','⚔ FIGHT!');
  if(result){
   result.hidden=stage!=='result';
   if(stage==='result'){
    const win=winner===uid;
    result.querySelector('#pkmsvv-arena-pvp-result-title').textContent=
      winner===null?tr('🤝 HÒA!','🤝 DRAW!'):win?tr('🏆 BẠN THẮNG!','🏆 VICTORY!'):tr('💥 BẠN THUA!','💥 DEFEAT!');
    result.querySelector('#pkmsvv-arena-pvp-result-details').textContent=
      (matchType==='champion'?'Champion PvP · '+people.map(m=>scores[m.uid]||0).join('–')+' · ':'Arena Solo 1v1 · ')+(people.find(p=>p.uid===winner)?.name||tr('Hòa','Draw'))+
      (winner?tr(' chiến thắng.',' wins.'):'');
   }
  }
 }
 function update(dt){
  if(!mode()||G.Game?.state!=='playing')return;
  const p=local();if(!p)return;
  if(host){
   const step=clamp(dt,0,.07);
   if(stage==='select'&&G.PKMSVVBerry?.choosing){renderPick();return;}
   elapsed+=step;frameClock-=step;
   if(stage==='select'&&(elapsed>=SELECT||pickReady.size===people.length))finishPick();
   if(stage==='countdown'&&elapsed>=COUNTDOWN){stage='fight';elapsed=0;casts.clear();sendState(true);}
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
     const win=hp[people[0].uid]===hp[people[1].uid]?null:
       hp[people[0].uid]>hp[people[1].uid]?people[0].uid:people[1].uid;
     settleRound(win);sendState(true);
    }
   }
   sendState();
  }
  applyHp();renderPick();
  if(!host)render();
 }
 function exit(notify=true){
  if(!active)return;
  const isHost=host,oldSeed=seed;
  if(isHost&&notify)G.Net?.broadcast?.({k:'apvp-exit',seed:oldSeed});
  else if(!isHost&&notify)G.Net?.toHost?.({k:'apvp-exit-request',seed:oldSeed});
  cleanup();
  G.Coop?.end?.();G.Social?.setPlaying?.(false);
  G.Game?.toUI?.();
  // Arena duel is not a Survival run: no automatic coin/time/quest rewards.
  const finished=isHost?G.Social?.finishMatch?.():null;
  Promise.resolve(finished).catch(()=>{}).then(()=>{
   if(G.Social?.room)G.LobbyUI?.open?.();
   else G.Flow?.goMenu?.();
  });
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
   if(data?.k==='apvp-pick-ready'&&host&&stage==='select'&&from===peerId(uid)&&
      data.seed===seed&&data.room===matchRoom&&data.matchType===matchType&&
      G.DEX_BY?.[Number(data.dex)]){
    const remote=people.find(m=>m.uid===from);
    if(remote){remote.dex=Number(data.dex);pickReady.add(from);
     if(pickReady.size===people.length)finishPick();else sendState(true);}
    return;
   }
   if(data?.k==='apvp-sync-request'){
    if(host&&from===peerId(uid)&&data.seed===seed&&data.room===matchRoom&&
       data.matchType===matchType&&['countdown','fight','result'].includes(stage)){
     const at=performance.now()/1000;
     if(at-lastSyncReply>=.15){lastSyncReply=at;sendState(true);}
    }
    return;
   }
   if(from===hostUid&&data?.k==='apvp-exit'&&data.seed===seed){
    exit(false);return;
   }
   if(host&&from===peerId(uid)&&data?.k==='apvp-exit-request'&&data.seed===seed){
    if(stage!=='result'){winner=uid;stage='result';sendState(true);}
    return;
   }
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
  const updateEvents=G.Events?.update;
  if(typeof updateEvents==='function')G.Events.update=function(...args){
   if(mode())return;return updateEvents.apply(this,args);
  };
  const updateJudge=G.Judgment?.update;
  if(typeof updateJudge==='function')G.Judgment.update=function(...args){
   if(mode())return;return updateJudge.apply(this,args);
  };
  const playerUpdate=G.Player?.prototype?.update;
  if(typeof playerUpdate==='function')G.Player.prototype.update=function(dt,...args){
   if(mode()&&this===local()&&stage!=='fight')this.frozen=true;
   return playerUpdate.call(this,dt,...args);
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
  G.Social?.on?.(what=>{
   // Host has returned this exact room to its open lobby. A guest that
   // missed apvp-exit must not remain stuck in an inactive Arena match.
   // Ignore initial/open lobbies, stale rooms, and the Host itself.
   const room=G.Social?.room;
   if(what==='room'&&active&&!host&&startedWhileClosed&&matchRoom&&
      room?.id===matchRoom&&room.mode===matchType&&room.open===true)
    exit(false);
   if(what==='room-closed'&&active&&!host)exit(false); // No stranded guest after Wi-Fi disconnect.
  });
  G.Net.onPeer?.((from,state)=>{
   if(!active||from!==peerId(uid))return;
   if(host&&['closed','failed'].includes(state)&&stage!=='result'){
    winner=uid;stage='result';sendState(true);render();
   }
   if(!host&&['direct','connected','open'].includes(state))requestSync('peer-connected');
  });
  // Hidden WebView/Android may freeze animation timers; request sync
  // immediately on resume rather than waiting for the next render tick.
  document.addEventListener?.('visibilitychange',()=>{
   if(!document.hidden)requestSync('visibility');
  });
  if(typeof window!=='undefined')window.addEventListener?.('pageshow',()=>requestSync('pageshow'));
  return true;
 }
 install();
 return {begin,cleanup,update,receive,strike,canCast,loadout,render,exit,requestSync,confirmPick,finishPick,SELECT,COUNTDOWN,DUEL,HP,
  get active(){return active},get stage(){return stage},get winner(){return winner},
  get health(){return {...hp}},get host(){return host},get matchType(){return matchType},get round(){return round},get scores(){return {...scores}}};
})();