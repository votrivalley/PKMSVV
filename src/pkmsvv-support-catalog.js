/* Pokemon Chuyển sinh — dedicated Pokémon support encyclopedia inside Pokédex.
 * Hatched-per-species friendship is saved in DB.pkmsvvSupportBond, not collection.
 */
G.PKMSVVSupportCatalog=(()=>{
 const $=id=>document.getElementById(id);
 const t=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const roles={
  attack:['Tấn công','Attack','Tấn công quái gần nhất.','Hits the nearest enemy.'],
  heal:['Hồi máu','Healing','Hồi HP cho người chơi hoặc support.','Heals the player or a companion.'],
  shield:['Tạo khiên','Shield','Tăng khiên để hấp thụ sát thương.','Grants a damage-absorbing shield.'],
  magnet:['Hút vật phẩm','Magnet','Kéo vật phẩm lại gần.','Pulls pickups toward the player.'],
  slow:['Làm chậm','Slow','Làm chậm quái và báo hiệu trên mục tiêu.','Slows enemies with visual feedback.'],
  ditto:['Biến hình 7s / hồi 3s','Transform 7s / rest 3s','Biến thành Pokémon chính trong 7 giây, sử dụng tối đa 3 chiêu sao chép. Trở lại Ditto và hồi 3 giây trước khi lặp lại.','Copies up to three moves and transforms for 7 seconds, then returns to Ditto and rests 3 seconds before repeating.'],
  mew:['AOE ngẫu nhiên','Random AOE','Tung AOE ngẫu nhiên mỗi 1 giây.','Casts a random area attack every 1 second.']
 };
 function level(percent){return percent>=100?5:percent>=80?4:percent>=60?3:percent>=40?2:percent>=20?1:0;}
 const pc=v=>(100*v).toFixed(0)+'%';
 function ensure(){
  if($('pkmsvv-support-catalog'))return;
  const host=$('scr-dex');if(!host)return;
  const header=host.querySelector('.box .row.between');
  if(!header)return;
  const btn=document.createElement('button');
  btn.id='pkmsvv-support-entry';btn.type='button';
  btn.className='btn pkmsvv-support-entry-btn';
  btn.textContent=t('✦ Pokémon hỗ trợ','✦ Support Pokémon');
  btn.addEventListener('click',open);
  header.insertBefore(btn,header.lastElementChild);
  const overlay=document.createElement('div');
  overlay.id='pkmsvv-support-catalog';overlay.className='pkmsvv-support-overlay';
  overlay.hidden=true;
  const frame=document.createElement('div');frame.className='pkmsvv-support-modal';
  const head=document.createElement('div');head.className='pkmsvv-support-modal-head';
  const title=document.createElement('h2');title.id='pkmsvv-support-heading';
  const close=document.createElement('button');close.type='button';
  close.className='btn small ghost';close.textContent=t('Đóng','Close');
  close.addEventListener('click',()=>overlay.hidden=true);
  head.append(title,close);
  const intro=document.createElement('p');intro.id='pkmsvv-support-description';
  const grid=document.createElement('div');grid.id='pkmsvv-support-entries';
  frame.append(head,intro,grid);overlay.append(frame);
  overlay.addEventListener('click',event=>{if(event.target===overlay)overlay.hidden=true;});
  document.body.append(overlay);
 }
 function open(){
  ensure();const wrap=$('pkmsvv-support-catalog');if(!wrap)return;
  $('pkmsvv-support-heading').textContent=t('✦ Pokémon hỗ trợ','✦ Support Pokémon');
  $('pkmsvv-support-description').textContent=t(
   'Thân thiết tăng theo số lần nở: thường 100 lần, Ditto 50, Mew 25 = 100%. Khi tối đa, Shiny x2; Ditto/Mew còn x2 tỷ lệ ra loài. Shiny chỉ tồn tại trong trận.',
   'Friendship tracks hatch counts: normal 100, Ditto 50, Mew 25 = 100%. Maximum bond doubles Shiny odds and also doubles Ditto/Mew hatch odds. Shiny is run-only.');
  const grid=$('pkmsvv-support-entries');grid.replaceChildren();
  const species=G.PKMSVVEggs?.SPECIES||[];
  for(const mon of species){
   const n=G.PKMSVVEggs.affinityFor(mon.dex),percent=G.PKMSVVEggs.affinityPercent(mon.dex),goal=G.PKMSVVEggs.affinityGoal(mon.dex),lv=level(percent);
   const card=document.createElement('article');card.className='pkmsvv-bond-card';
   const top=document.createElement('div');top.className='pkmsvv-bond-card-top';
   const name=document.createElement('strong');
   name.textContent=(G.DEX_BY?.[mon.dex]?.name||'Pokémon')+'  #'+mon.dex;
   const tag=document.createElement('span');tag.className='pkmsvv-bond-role';
   tag.textContent=t(roles[mon.role]?.[0]||mon.role,roles[mon.role]?.[1]||mon.role);
   top.append(name,tag);card.append(top);
   const skill=document.createElement('p');
   skill.textContent=t(roles[mon.role]?.[2]||'',roles[mon.role]?.[3]||'')+
     ' · '+t('Hồi chiêu','Cooldown')+': '+mon.period+'s';
   const stat=document.createElement('p');stat.className='pkmsvv-bond-stats';
   stat.textContent=t('Thân thiết','Friendship')+' '+percent+'% · '+Math.min(n,goal)+'/'+goal+
    ' '+t('lần gặp','hatches')+' · '+t('Kỹ năng','Skill')+' +'+Math.round((G.PKMSVVEggs.affinityMultiplier(mon.dex)-1)*100)+'%';
   const odds=document.createElement('p');odds.className='pkmsvv-bond-odds';
   const shiny=pc(G.PKMSVVEggs.shinyChanceFor(mon.dex));
   const rare=G.PKMSVVEggs.speciesChanceFor(mon.dex);
   odds.textContent=t('Tỷ lệ Shiny','Shiny odds')+': '+shiny+
    (rare?' · '+t('Tỷ lệ nở','Hatch chance')+': '+pc(rare):'');
   const track=document.createElement('div');track.className='pkmsvv-bond-track';
   const fill=document.createElement('div');fill.style.width=percent+'%';track.append(fill);
   card.append(skill,stat,odds,track);grid.append(card);
  }
  wrap.hidden=false;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});
 else ensure();
 return {open,level,ensure};
})();
