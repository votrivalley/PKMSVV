/* One per-Pokemon skill reset offered through that Pokémon's own level-up cards.
 * Nothing is stored account-wide: a fresh battle actor has a fresh opportunity.
 */
G.PKMSVVForgetSkill=(()=>{
 'use strict';
 function full(p){return !!(p&&!p.dead&&!p.remote&&!p.lanBot&&p===G.Game?.player&&
   G.DB?.upgradesOf?.(p.dex)?.forget>0&&p.maxMoves>=2&&p.slots?.length>=p.maxMoves&&p.moves?.length>=2&&!p._pkmsvvForgetUsed);}
 function options(p,random=Math.random){
  const a=(p?.moves||[]).slice();
  for(let i=a.length-1;i>0;i--){const j=Math.max(0,Math.min(i,Math.floor(random()*(i+1))));[a[i],a[j]]=[a[j],a[i]];}
  return a.slice(0,2);
 }
 function remove(p,m){
  if(!p||!m||!p.moves?.includes(m))return false;
  p.moves.splice(p.moves.indexOf(m),1);
  const current=p.slots?.[p.active];
  for(let i=p.slots.length-1;i>=0;i--){
   const group=p.slots[i],idx=group.indexOf(m);
   if(idx>=0){group.splice(idx,1);if(!group.length)p.slots.splice(i,1);}
  }
  // A max-level passive buff can be infinite: forgetting it must remove
  // that effect, but never erase another learned move's shared buff stat.
  if(m.kind==='buff'&&m.stat&&p.buffs&&!p.moves.some(other=>other.kind==='buff'&&other.stat===m.stat))
   delete p.buffs[m.stat];
  if(p.slots.length){const keep=p.slots.indexOf(current);p.active=keep>=0?keep:Math.min(p.active,p.slots.length-1);}
  else p.active=0;
  G.UI?.toast?.('🧠 Đã quên '+(G.T?.(m.name,'move')||m.name||m.id)+' · Có thể học chiêu mới!',2900);
  return true;
 }
 function open(p){
  if(!full(p))return false;
  const choices=options(p);if(choices.length<2)return false;
  p._pkmsvvForgetUsed=true;
  const old=document.getElementById('pkmsvv-forget-skill');old?.remove?.();
  const shade=document.createElement('div');shade.id='pkmsvv-forget-skill';
  shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');
  shade.setAttribute('aria-label','Quên một kỹ năng');
  shade.className='pkmsvv-forget-skill';
  const panel=document.createElement('section');panel.className='pkmsvv-forget-panel';
  const title=document.createElement('h2');title.textContent='🧠 QUÊN KỸ NĂNG';
  const hint=document.createElement('p');hint.textContent='Chọn 1 trong 2 kỹ năng ngẫu nhiên để quên. Mỗi Pokémon chỉ có một lượt mỗi trận.';
  panel.append(title,hint);
  for(const m of choices){
   const button=document.createElement('button');button.type='button';button.className='pkmsvv-forget-choice';
   button.textContent=(G.T?.(m.name,'move')||m.name||m.id)+' · Lv.'+(m.lvl||1);
   button.onclick=()=>{if(remove(p,m))shade.remove();};
   panel.append(button);
  }
  shade.append(panel);document.body.append(shade);
  panel.querySelector?.('button')?.focus?.();
  return true;
 }
 const prior=G.LevelUp?.offer;
 if(typeof prior==='function'){
  G.LevelUp.offer=function(p,n=3){
   const out=prior.call(this,p,n);
   if(!full(p)||!Array.isArray(out)||!out.length)return out;
   const card={type:'forget',key:'pkmsvv:forget',w:1000,icon:'book',color:'#d7a6ff',
    tag:'1 LẦN / POKÉMON',title:'Quên Kỹ Năng',
    desc:'Chọn một trong 2 kỹ năng ngẫu nhiên để quên, mở chỗ học kỹ năng mới.',
    apply:target=>open(target||p)};
   out[Math.min(out.length-1,Math.max(0,n-1))]=card;
   return out;
  };
 }
 return {full,options,remove,open};
})();
