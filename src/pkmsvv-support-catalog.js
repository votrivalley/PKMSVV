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
  ditto:['Biến hình','Transform','Hóa thành Pokémon chính, sao chép tối đa 3 chiêu ngẫu nhiên.','Transforms into your lead Pokémon and copies up to three random combat moves.'],
  mew:['AOE ngẫu nhiên','Random AOE','Tung AOE ngẫu nhiên mỗi 1 giây.','Casts a random area attack every 1 second.']
 };
 function level(count){
  if(!count)return 0;
  return count>=60?5:count>=30?4:count>=15?3:count>=5?2:1;
 }
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
   'Trứng nở càng nhiều lần, tình thân càng cao: +2% hiệu lực kỹ năng cho mỗi lần nở thêm, tối đa +30%. Shiny chỉ tồn tại trong trận. Ditto 8%, Mew 4%, Shiny 3%.',
   'Each additional hatch adds +2% skill strength for the same species, up to +30%. Shiny is run-only. Ditto 8%, Mew 4%, Shiny 3%.');
  const grid=$('pkmsvv-support-entries');grid.replaceChildren();
  const species=G.PKMSVVEggs?.SPECIES||[];
  for(const mon of species){
   const n=G.PKMSVVEggs.affinityFor(mon.dex),lv=level(n);
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
   stat.textContent=t('Thân thiết','Bond')+' '+lv+'/5 · '+n+' '+t('lần nở','hatches')+
    ' · '+t('Kỹ năng','Skill')+' +'+Math.round((G.PKMSVVEggs.affinityMultiplier(mon.dex)-1)*100)+'%';
   const track=document.createElement('div');track.className='pkmsvv-bond-track';
   const fill=document.createElement('div');fill.style.width=(lv*20)+'%';track.append(fill);
   card.append(skill,stat,track);grid.append(card);
  }
  wrap.hidden=false;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});
 else ensure();
 return {open,level,ensure};
})();
