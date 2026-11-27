/* Fusion 2.0: one skill resonance per Solo Explore run; no consumed moves or extra skill slot. */
G.PKMSVVFusionPilot=(()=>{
 'use strict';
 const tr=(a,b)=>G.I18n?.lang==='en'?b:a;
 const WIND=new Set(['gust','air-cutter','air-slash','hurricane','twister','razor-wind','silver-wind']);
 const physical=m=>(m?.cat??m?.def?.cat)==='physical';
 const type=m=>m?.type??m?.def?.type;
 const damages=m=>{const d=m?.dmg??m?.def?.dmg;return d===undefined||Number(d)>0;};
 const RECIPES=Object.freeze([
  {id:'fire-wind',vi:'Bão Lửa',en:'Flame Gale',viPair:'Fire + kỹ năng gió',enPair:'Fire + wind move',viEffect:'Đòn gió trúng dấu lửa tạo vụ nổ lửa và làm chậm quanh mục tiêu.',enEffect:'Wind hits a fire mark to create a fiery burst and slow nearby foes.',a:m=>type(m)==='fire',b:m=>WIND.has(m?.id),color:'#ff8849',radius:120,scale:.45},
  {id:'water-electric',vi:'Lôi Vũ',en:'Thunderstorm',viPair:'Water + Electric',enPair:'Water + Electric',viEffect:'Điện đánh trúng dấu nước sẽ lan sát thương tới tối đa 4 quái khác.',enEffect:'Electric hits a water mark to chain damage to up to four other foes.',a:m=>type(m)==='water',b:m=>type(m)==='electric',color:'#ffe163',radius:180,scale:.55},
  {id:'ice-physical',vi:'Băng Toái',en:'Frost Shatter',viPair:'Ice + đòn vật lý',enPair:'Ice + physical move',viEffect:'Đòn vật lý phá dấu băng, gây sát thương lan và choáng ngắn.',enEffect:'Physical hits shatter an ice mark, splashing damage and briefly stunning.',a:m=>type(m)==='ice',b:physical,color:'#9eeaff',radius:110,scale:.5},
  {id:'poison-grass',vi:'Độc Hoa',en:'Toxic Bloom',viPair:'Poison + Grass',enPair:'Poison + Grass',viEffect:'Quái mang cả dấu độc và cỏ khi bị hạ sẽ phát tán sát thương độc.',enEffect:'Defeating a foe marked by both poison and grass spreads toxic damage.',a:m=>type(m)==='poison',b:m=>type(m)==='grass',color:'#bc83e8',radius:145,scale:.5},
  {id:'ghost-psychic',vi:'Tâm Ảnh',en:'Soul Collapse',viPair:'Ghost + Psychic',enPair:'Ghost + Psychic',viEffect:'Psychic kích nổ dấu linh hồn do Ghost tạo ra.',enEffect:'Psychic detonates a soul mark left by Ghost.',a:m=>type(m)==='ghost',b:m=>type(m)==='psychic',color:'#b99bff',radius:135,scale:.6}
 ]);
 const maxPerRun=1,COOLDOWN=3,MARK_LIFE=5,MAX_TARGETS=5;
 const states=new WeakMap();
 const moves=p=>Array.isArray(p?.moves)?p.moves:(p?.slots||[]).flat().filter(Boolean);
 const readyMove=m=>{const max=Number(m?.def?.maxLvl??G.Moves?.BY_ID?.[m?.id]?.maxLvl);return !!m&&!m.pkmsvvFusionId&&Number.isFinite(max)&&max>0&&Number(m.lvl)>=max;};
 const competitive=()=>!!(G.Coop?.active||G.Royale?.active||G.EggRush?.active||G.PKMSVVArenaSolo?.active||G.PKMSVVChampionArena?.active||G.PKMSVVArenaPvp?.active);
 const pilotEligible=p=>!!(p&&p===G.Game?.player&&!p.dead&&!p.remote&&!p.lanBot&&G.PKMSVVQuickRegion?.active===true&&!competitive());
 function pair(p,r,requireMax=true){const list=moves(p).filter(m=>damages(m)&&(!requireMax||readyMove(m)));for(const a of list)if(r.a(a))for(const b of list)if(a!==b&&a.id!==b.id&&r.b(b))return [a,b];return null;}
 function options(p){if(!pilotEligible(p)||states.has(p))return null;const recipes=RECIPES.filter(r=>pair(p,r));return recipes.length?{mode:'resonance',recipes}:null;}
 function activate(p,id){const r=RECIPES.find(x=>x.id===id);if(!pilotEligible(p)||states.has(p)||!r||!pair(p,r))return false;states.set(p,{r,marks:new WeakMap(),next:0});p._pkmsvvFusionUsed=1;G.UI?.toast?.(tr('Cộng hưởng: ','Resonance: ')+tr(r.vi,r.en));return true;}
 function progress(p){return RECIPES.map(r=>({id:r.id,name:tr(r.vi,r.en),unlocked:!!pair(p,r),learned:pair(p,r,false)?2:0,maxed:pair(p,r)?2:0,used:states.has(p)}));}
 function levelFusionCard(p){const recipes=options(p)?.recipes||[];if(!recipes.length)return null;const r=recipes[Math.max(0,Math.floor(Number(p.level)||0))%recipes.length];const source=pair(p,r)[0];return {icon:'move:'+source.id,type:'fusion',key:'pkmsvv:resonance:'+r.id,w:1000,color:r.color,tag:tr('CỘNG HƯỞNG','RESONANCE'),title:tr(r.vi,r.en),desc:tr(r.viEffect,r.enEffect)+' · '+tr('Giữ nguyên 2 kỹ năng.','Keep both skills.'),apply:target=>activate(target||p,r.id)};}
 function installSkillHints(){const old=G.LevelUp?.offer;if(typeof old!=='function'||old._pkmsvvResonance)return false;const wrapped=function(p,...args){const cards=old.call(this,p,...args),card=levelFusionCard(p);if(card&&Array.isArray(cards)&&cards.length)cards[cards.length-1]=card;return cards;};wrapped._pkmsvvResonance=true;G.LevelUp.offer=wrapped;return true;}
 function hostile(e){return !!(e&&!e.remote&&!e.friendly&&!e.pkmsvvFriendly&&!e.isSupport&&!e.arceus&&!e.judge&&typeof e.hurt==='function'&&Number.isFinite(e.x)&&Number.isFinite(e.y));}
 function nearby(e,r){const raw=G.EnemyMgr?.queryCircle?.(e.x,e.y,r)??G.EnemyMgr?.all?.()??[];const list=Array.isArray(raw)?raw:typeof raw.values==='function'?Array.from(raw.values()):[];return list.filter(x=>hostile(x)&&!x.dead&&(x.x-e.x)**2+(x.y-e.y)**2<=r*r).sort((a,b)=>(a.x-e.x)**2+(a.y-e.y)**2-((b.x-e.x)**2+(b.y-e.y)**2));}
 function emit(p,e,s,dmg){const r=s.r;let n=0;const list=nearby(e,r.radius).filter(x=>r.id!=='water-electric'||x!==e).slice(0,r.id==='water-electric'?4:MAX_TARGETS);for(const x of list){const boss=x.boss||x.legend||x.legendary;const amount=dmg*r.scale*(boss?.5:1);if(!(amount>0&&Number.isFinite(amount)))continue;x.hurt(amount,r.color,0,0,0);if(Number.isFinite(p.dmgDealt))p.dmgDealt+=amount;if(!x.dead&&r.id==='fire-wind')x.applySlow?.(.2,boss?.35:1);if(!x.dead&&r.id==='ice-physical')x.applyStun?.(boss?.12:.4);if(!x.dead&&r.id==='poison-grass')x.applySlow?.(.15,boss?.35:1);n++;}G.FX?.ring?.(e.x,e.y,8,r.radius,r.color,.45,4);G.FX?.burst?.(e.x,e.y,r.color,8,100);return n;}
 // Native post-hit hook: only actual learned source moves, no power/orb/ghost proc recursion.
 function afterHit(p,e,m,dmg,owner=p){
  if(!pilotEligible(p)||owner!==p||G.Game?.state!=='playing'||!hostile(e)||!Number.isFinite(dmg)||dmg<=0||!m?.id)return 0;
  const s=states.get(p);if(!s)return 0;
  const learned=moves(p).find(x=>x.id===m.id&&readyMove(x)&&damages(x));if(!learned||(!s.r.a(learned)&&!s.r.b(learned)&&s.r.id!=='poison-grass')||!pair(p,s.r))return 0;
  const now=Number(G.Game?.st?.time);if(!Number.isFinite(now))return 0;
  const a=s.r.a(learned),b=s.r.b(learned);const previous=s.marks.get(e);let mark=previous&&previous.until>=now&&(!previous.source||moves(p).some(x=>x.id===previous.source&&readyMove(x)))?previous:{a:false,b:false,until:now+MARK_LIFE};
  const poison=s.r.id==='poison-grass';
  const triggered=poison?e.dead&&((mark.a||a)&&(mark.b||b))&&!(!mark.a&&!mark.b):b&&mark.a&&mark.source!==learned.id;
  if(triggered&&now>=s.next){s.marks.delete(e);s.next=now+COOLDOWN;return emit(p,e,s,dmg);}
  if(!e.dead&&(a||b)){if(a){mark.a=true;mark.source=learned.id;}if(b)mark.b=true;mark.until=now+MARK_LIFE;s.marks.set(e,mark);}
  else if(e.dead)s.marks.delete(e);
  return 0;
 }
 function reset(p=G.Game?.player){if(p){states.delete(p);delete p._pkmsvvFusionUsed;}}
 for(const method of ['startRun','toUI','quit']){const old=G.Game?.[method];if(typeof old==='function')G.Game[method]=function(...args){reset();return old.apply(this,args);};}
 function showGuide(p=G.Game?.player){
  if(typeof document==='undefined'||!document.body)return false;
  document.getElementById('pkmsvv-fusion-guide')?.remove();
  const shade=document.createElement('div');shade.id='pkmsvv-fusion-guide';shade.className='pkmsvv-fusion-guide';shade.setAttribute('role','dialog');
  const panel=document.createElement('section');panel.className='pkmsvv-fusion-guide-panel';
  const head=document.createElement('h2');head.textContent=tr('CỘNG HƯỞNG KỸ NĂNG','SKILL RESONANCE');panel.append(head);
  const note=document.createElement('p');note.textContent=tr('Hai kỹ năng MAX. Giữ cả hai, chọn 1 cộng hưởng mỗi trận. Dấu tồn tại 5s, hồi phản ứng 3s.','Two MAX moves. Keep both, choose one resonance per run. Marks last 5s; reaction cooldown 3s.');panel.append(note);
  const list=document.createElement('div');list.className='pkmsvv-fusion-recipe-grid';
  for(const r of RECIPES){const btn=document.createElement('button');btn.type='button';btn.className='pkmsvv-fusion-recipe-choice';const ready=!!options(p)?.recipes.includes(r);btn.disabled=!ready;btn.textContent=tr(r.vi,r.en)+' · '+tr(r.viPair,r.enPair)+' — '+tr(r.viEffect,r.enEffect)+(states.get(p)?.r===r?' ✓':'');btn.onclick=()=>{if(activate(p,r.id)){shade.remove();sync();}};list.append(btn);}
  const close=document.createElement('button');close.type='button';close.className='btn small';close.textContent=tr('Đóng','Close');close.onclick=()=>shade.remove();panel.append(list,close);shade.append(panel);shade.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();shade.remove();return;}if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;const buttons=[...list.querySelectorAll('button:not(:disabled)'),close];const i=buttons.indexOf(document.activeElement),step=['ArrowUp','ArrowLeft'].includes(e.key)?-1:1;buttons[(i+step+buttons.length)%buttons.length]?.focus?.();e.preventDefault();});document.body.append(shade);(list.querySelector('button:not(:disabled)')||close).focus?.();return true;
 }
 let action=null;
 function sync(){if(!action)return;const p=G.Game?.player;action.hidden=!pilotEligible(p);action.textContent=states.has(p)?'FUSION ✓':options(p)?tr('CỘNG HƯỞNG SẴN SÀNG','RESONANCE READY'):'FUSION';}
 function mount(){if(action||typeof document==='undefined')return;const row=document.getElementById('scr-pause')?.querySelector('.pause-box .row');if(!row)return;action=document.createElement('button');action.id='pkmsvv-pause-fusion';action.className='btn';action.type='button';action.onclick=()=>showGuide();row.append(action);sync();if(typeof setInterval==='function')setInterval(sync,250);}
 installSkillHints();if(typeof document!=='undefined'){if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount,{once:true});}
 return {RECIPES,maxPerRun,COOLDOWN,MARK_LIFE,readyMove,pilotEligible,competitive,options,pairFor:options,progress,activate,afterHit,reset,levelFusionCard,installSkillHints,showGuide,openFusion:showGuide,openFromPause:showGuide,mount,sync};
})();
