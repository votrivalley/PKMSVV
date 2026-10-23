/* PKMSVV: permanent account-wide skill slots, independent from individual moves. */
G.PKMSVVSkillTrack=(()=>{
 const milestones=[
  {id:'k50',vi:'Hạ 50 quái',en:'Defeat 50 enemies',type:'kills',value:50},
  {id:'k100',vi:'Hạ 100 quái',en:'Defeat 100 enemies',type:'kills',value:100},
  {id:'k200',vi:'Hạ 200 quái',en:'Defeat 200 enemies',type:'kills',value:200},
  {id:'u10',vi:'Tổng 10 cấp nâng cấp',en:'10 total upgrade ranks',type:'upgrades',value:10},
  {id:'u20',vi:'Tổng 20 cấp nâng cấp',en:'20 total upgrade ranks',type:'upgrades',value:20}
 ];
 const num=x=>Number.isFinite(+x)?Math.max(0,Math.floor(+x)):0;
 const clean=x=>Object.fromEntries(milestones.filter(m=>x&&x[m.id]===true).map(m=>[m.id,true]));
 const merge=(a,b)=>clean({...clean(a),...clean(b)});
 function ranks(s){
  if(!s)return 0;let sum=0;
  for(const row of Object.values(s.pupg||{})){
   if(!row||typeof row!=='object')continue;
   for(const [id,v] of Object.entries(row))if(!G.Upgrades||G.Upgrades.BY[id])sum+=num(v);
  }
  for(const [id,v] of Object.entries(s.globalUpgrades||{}))if(!G.GlobalPower||G.GlobalPower.BY[id])sum+=num(v);
  return Math.min(999999,sum);
 }
 function progress(s,runKills=0){
  const kills=num(s&&s.stats&&s.stats.totalKills)+num(runKills);
  const upgrades=ranks(s),marks=clean(s&&s.pkmsvvSkillMarks);
  for(const m of milestones)if((m.type==='kills'?kills:upgrades)>=m.value)marks[m.id]=true;
  return {count:3+milestones.filter(m=>marks[m.id]).length,kills,upgrades,marks,
   milestones:milestones.map((m,i)=>({...m,slot:i+4,done:!!marks[m.id],current:m.type==='kills'?kills:upgrades}))};
 }
 function refresh(s,pl=null,notify=false,runKills=null){
  if(!s)return {count:3};
  const old=clean(s.pkmsvvSkillMarks);
  const p=progress(s,runKills===null?(pl?num(pl.kills):0):runKills);
  s.pkmsvvSkillMarks=p.marks;
  if(pl)pl.maxMoves=Math.min(8,Math.max(pl.maxMoves||3,p.count));
  const gained=p.milestones.filter(m=>p.marks[m.id]&&!old[m.id]);
  if(gained.length){
   if(notify&&G.UI&&G.UI.toast){
    const en=G.I18n&&G.I18n.lang==='en';
    G.UI.toast(en?'Power awakened! '+p.count+'/8 slots — shared by ALL Pokémon':
       'Thức tỉnh! '+p.count+'/8 ô kỹ năng — áp dụng cho MỌI Pokémon.',4400);
    if(G.Audio&&G.Audio.sfx)G.Audio.sfx('levelup');
   }
   if(G.DB&&G.DB.save===s&&G.DB.commit)G.DB.commit();
  }
  return p;
 }
 function guide(s,lang){
  const p=progress(s),en=lang==='en';
  const headline=(en?'Skill Awakening':'Thức tỉnh kỹ năng')+' · '+p.count+'/8';
  const note=en?
   'Kills add up across runs. Individual upgrade ranks for ANY Pokémon and team ranks both count. Unlock once for ALL Pokémon, even after refunds. Slots limit moves learned during each run; they do not grant free moves.':
   'Quái hạ gục cộng dồn qua nhiều trận. Cấp Nâng lẻ của BẤT KỲ Pokémon nào và Nâng toàn đội đều được tính. Mở một lần, dùng vĩnh viễn cho MỌI Pokémon, kể cả sau khi hoàn trả. Ô kỹ năng là giới hạn học chiêu trong trận, không phải nhận sẵn chiêu.';
  const lines=p.milestones.map(m=>(m.done?'✓ ':'🔒 ')+'Ô '+m.slot+': '+(en?m.en:m.vi)+' ('+Math.min(m.current,m.value)+'/'+m.value+')');
  return {headline,note,lines,count:p.count};
 }
 return {milestones,clean,merge,ranks,progress,refresh,guide};
})();
