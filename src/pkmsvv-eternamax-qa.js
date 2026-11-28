/* QA Galar solo 30-minute final: one actor, two forms, no duplicate drops. */
(function(){
 'use strict';
 if(typeof G==='undefined'||!G.Enemy?.prototype)return;
 const ID=90890,THRESHOLD=.55,TRANSITION=1.2,states=new WeakMap();
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const q=()=>G.PKMSVVQuickRegion;
 const active=e=>q()?.active&&q()?.selectedRegion===7&&q()?.finalBoss===e&&!G.Coop?.active&&!G.Rift?.inArena&&!G.Judgment?.active;
 const state=e=>states.get(e);
 function assetsReady(){const a=G.SPRITE_META?.[ID]?.a;return G.PKMSVV_ETERNAMAX_ASSET?.id===ID&&['Idle','Walk','Attack','Charge','Shoot'].every(k=>a?.[k]?.r===8);}
 function arm(e){
  if(!active(e)||e?.dex!==890||!e.pkmsvvExploreFinal||!e.pkmsvvExploreBoss||e.pkmsvvExploreRegion!==7||e.remote||e.dead||state(e)||!assetsReady()||
     !Number.isFinite(e.maxHp)||e.maxHp<=0)return false;
  states.set(e,{phase:1,threshold:Math.round(e.maxHp*THRESHOLD),lock:0,casts:0,signatures:0});
  G.Sprites?.preload?.([ID],10000);return true;
 }
 function transform(e,s){
  if(!active(e)||s.phase!==1)return false;
  s.phase=2;s.lock=TRANSITION;e.hp=s.threshold;
  // Preserve actual species, actor ID, max HP, reward ledger and kill counter.
  // Only the rendering key changes; it never appears in National Dex.
  const scale=1,dir=e.anim?.dir||0;e.anim=new G.Sprites.Animator(ID,scale,false);e.anim.dir=dir;
  e.scale=scale;e.r=Math.min(62,G.Sprites.bodyRadius(ID,scale));e.bodyH=G.Sprites.bodyHeight(ID,scale);
  e.name='Eternamax Eternatus';e.spd*=1.10;e.dmg*=1.20;e.atkType='dragon';
  e.stunT=0;e.slowT=0;e.slow=0;e.kx=0;e.ky=0;e.jump=null;e.shield=0;e.shieldT=0;
  e.bossInit?.();if(e.ai){e.ai.fury=true;e.ai.cast=null;e.ai.cd=1.3;}
  // Remove only this boss's unfinished telegraphs; not other enemies' hazards.
  for(const h of G.Hazards?.all||[])if(h.pkmsvvEternamaxOwner===e.id&&!h.hit){h.hit=true;h.end=0;}
  G.Spawner?.say?.(tr('ETERNAMAX! Giai đoạn 2 — Né vùng năng lượng!','ETERNAMAX! Phase 2 — Dodge the energy zones!'),3.5,true);
  G.FX?.ring?.(e.x,e.y,10,170,'#e687fa',1,5);G.Audio?.sfx?.('boss');return true;
 }
 const proto=G.Enemy.prototype;
 const wrap=(key,fn)=>{const prior=proto[key];if(typeof prior!=='function')return false;proto[key]=function(...args){return fn.call(this,prior,args);};return true;};
 wrap('hurt',function(prior,args){
  const s=state(this);
  if(!s||!active(this)||this.dead)return prior.apply(this,args);
  if(s.lock>0)return;
  const out=prior.apply(this,args);
  if(s.phase===1&&!this.dead&&this.hp<=s.threshold)transform(this,s);
  return out;
 });
 wrap('die',function(prior,args){
  const s=state(this);
  if(!s||!active(this)||this.dead)return prior.apply(this,args);
  if(s.phase===1){if(this.hp<=s.threshold)transform(this,s);return;}
  if(s.lock>0||this.hp>0)return;
  const out=prior.apply(this,args);
  if(this.dead&&this.hp<=0)s.completed=true;
  return out;
 });
 wrap('update',function(prior,args){
  const s=state(this),dt=Number(args[0]);
  if(s&&active(this)&&!this.dead&&s.lock>0&&Number.isFinite(dt)&&dt>0)s.lock=Math.max(0,s.lock-dt);
  return prior.apply(this,args);
 });
 wrap('bossMove',function(prior,args){
  const s=state(this);
  if(s&&active(this)&&s.lock>0)return [0,0,'Idle'];
  return prior.apply(this,args);
 });
 wrap('hazard',function(prior,args){
  if(state(this)&&active(this)&&args[0])args=[{...args[0],pkmsvvEternamaxOwner:this.id},...args.slice(1)];
  return prior.apply(this,args);
 });
 wrap('bossStart',function(prior,args){
  const s=state(this),pl=args[1];
  if(!s||!active(this)||s.phase!==2||s.lock>0||!pl||!this.ai||++s.casts%2!==1)return prior.apply(this,args);
  const ang=Math.atan2(pl.y-this.y,pl.x-this.x),beam=(++s.signatures%2===1);
  const c=this.ai.cast={id:'pkmsvv-eternamax',t:0,wind:1.25,after:.6,ang};
  const base={delay:c.wind,dmg:Math.max(1,this.dmg*1.15),cat:'special',pkmsvvEternamaxOwner:this.id};
  if(beam){
   this.hazard({...base,kind:'beam',x:this.x,y:this.y,angle:ang,len:430,w:62,type:'dragon',color:'#ef68be'});
   this.anim.play('Charge',{speed:1});
  }else{
   for(const offset of [-105,0,105])this.hazard({...base,kind:'zone',x:pl.x-Math.sin(ang)*offset,y:pl.y+Math.cos(ang)*offset,r:45,type:'poison',color:'#b978f4'});
   this.anim.play('Shoot');
  }
  G.Spawner?.say?.(beam?tr('Pháo Năng Lượng','Dynamax Cannon'):tr('Mưa Kịch Độc','Toxic Rain'),1.5);
 });
 // Bound control duration on phase two only, not immune to status damage.
 wrap('applyStun',function(prior,args){const s=state(this);if(s?.phase===2&&active(this))args[0]=Math.min(.5,Math.max(0,Number(args[0])||0));return prior.apply(this,args);});
 wrap('applySlow',function(prior,args){const s=state(this);if(s?.phase===2&&active(this)){args[0]=Math.min(.35,Math.max(0,Number(args[0])||0));args[1]=Math.min(1,Number(args[1]??1.2));}return prior.apply(this,args);});
 G.PKMSVVEternamaxQA=Object.freeze({ID,THRESHOLD,TRANSITION,arm,assetsReady,armed:e=>!!state(e),completed:e=>state(e)?.completed===true,status:e=>state(e)?{...state(e)}:null});
})();
