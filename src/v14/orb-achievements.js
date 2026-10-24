/* PKM SVV v1.4 — persistent skill and Mystery Orb achievements.
 * Uses existing achievement rewards and save schema; no extra Cloud writes.
 */
(()=>{
 const L=(vi,en)=>G.I18n&&G.I18n.lang==='vi'?vi:en;
 const stat=k=>s=>Math.max(0,Number(s&&s.stats&&s.stats[k])||0);
 const countBits=mask=>{let n=(Number(mask)||0)&63,c=0;while(n){c+=n&1;n>>=1;}return c;};
 const defs=[
  {id:'pkmsvv-slot8',cat:'supervivencia',tier:2,name:L('Tám Ô Thức Tỉnh','Eight Slots Awakened'),
   desc:L('Mở khóa vĩnh viễn toàn bộ 8 ô kỹ năng.','Permanently unlock all eight skill slots.'),
   value:s=>G.PKMSVVSkillTrack.progress(s).count,goal:8,reward:{coins:300}},
  {id:'pkmsvv-learn8',cat:'combate',tier:2,name:L('Bát Kỹ Toàn Năng','Master of Eight'),
   desc:L('Học đủ 8 kỹ năng trong một trận.','Learn all eight skills during one run.'),
   value:stat('pkmsvvEightSkills'),goal:1,reward:{t1:2},title:L('Bát Kỹ','Eightfold')},
  {id:'pkmsvv-orb-first',cat:'otros',tier:1,name:L('Ký Ức Đầu Tiên','First Memory'),
   desc:L('Nhặt Mystery Orb đầu tiên.','Collect your first Mystery Orb.'),
   value:stat('pkmsvvOrbsPicked'),goal:1,reward:{coins:150}},
  {id:'pkmsvv-orb-10',cat:'otros',tier:2,name:L('Người Nhặt Ký Ức','Memory Gatherer'),
   desc:L('Nhặt tổng cộng 10 Mystery Orb qua các trận.','Collect 10 Mystery Orbs across all runs.'),
   value:stat('pkmsvvOrbsPicked'),goal:10,reward:{t1:2}},
  {id:'pkmsvv-orb-use10',cat:'otros',tier:2,name:L('Cứu Nguy Đúng Lúc','Timely Rescue'),
   desc:L('Sử dụng tổng cộng 10 Mystery Orb.','Activate 10 Mystery Orbs across runs.'),
   value:stat('pkmsvvOrbsUsed'),goal:10,reward:{coins:400}},
  {id:'pkmsvv-orb-six',cat:'otros',tier:3,name:L('Chủ Nhân Lục Cầu','Master of Six Orbs'),
   desc:L('Dùng đủ cả 6 loại Mystery Orb, không cần trong cùng một trận.','Use all six Orb types across any number of runs.'),
   value:s=>countBits(s&&s.stats&&s.stats.pkmsvvOrbTypeMask),goal:6,reward:{t10:1},title:L('Chủ Nhân Orb','Orb Master')}
 ];
 for(const a of defs){if(G.AchDefs.BY[a.id])continue;G.AchDefs.LIST.push(a);G.AchDefs.BY[a.id]=a;}
 G.PKMSVVAchievements={defs,countBits};
})();