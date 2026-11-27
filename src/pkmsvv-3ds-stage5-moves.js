/* PKMSVV Stage 5 — native source-verified Scissor/Blitz/Leap/Boom/Weather.
 * Data extracted from 3DS v1.0.0 src/gen/gamedata.cpp via
 * scripts/extract-3ds-combat-profiles.cjs, 22 Nov 2026.
 * New IDs only; never replace the 103 existing PKMSVV move definitions.
 */
G.PKMSVV3DSStage5Moves=(()=>{
 'use strict';
 const L={
  scissor:[
   {t:'+40% sát thương',m:{dmg:1.4}},
   {t:'+25% phạm vi tấn công',m:{radius:1.25}},
   {t:'-25% hồi chiêu',m:{cd:.75}},
   {t:'+50% sát thương, +30% góc chém',m:{dmg:1.5,arc:1.3}}
  ],
  blitz:[
   {t:'+1 mục tiêu lướt qua',m:{count:1}},
   {t:'+45% sát thương',m:{dmg:1.45}},
   {t:'-25% hồi chiêu',m:{cd:.75}},
   {t:'+2 mục tiêu và +30% sát thương',m:{count:2,dmg:1.3}}
  ],
  leap:[
   {t:'+40% sát thương',m:{dmg:1.4}},
   {t:'+30% bán kính cú đáp',m:{radius:1.3}},
   {t:'-25% hồi chiêu',m:{cd:.75}},
   {t:'+50% sát thương và +30% tầm nhảy',m:{dmg:1.5,range:1.3}}
  ],
  boom:[
   {t:'+40% sát thương',m:{dmg:1.4}},
   {t:'+25% phạm vi nổ',m:{radius:1.25}},
   {t:'-25% hồi chiêu',m:{cd:.75}},
   {t:'+50% sát thương',m:{dmg:1.5}}
  ],
  weather:[
   {t:'+35% thời gian hiệu lực',m:{dur:1.35}},
   {t:'+35% thời gian hiệu lực',m:{dur:1.35}},
   {t:'+35% thời gian hiệu lực',m:{dur:1.35}},
   {t:'+50% thời gian hiệu lực',m:{dur:1.5}}
  ]
 };
 const defs=[
  {id:'x-scissor',name:'X-Scissor',type:'bug',kind:'scissor',
   desc:'Hai nhát chém chữ X, quái ở giao điểm nhận cả hai.',
   cd:.75,dmg:16.59,radius:70,arc:1.3},
  {id:'stone-axe',name:'Stone Axe',type:'rock',kind:'scissor',
   desc:'Kleavor vung hai nhát rìu đá chéo nhau.',
   cd:.8,dmg:18.55,radius:78,arc:1.3,only:[900]},
  {id:'extreme-speed',name:'Extreme Speed',type:'normal',kind:'blitz',
   desc:'Lướt nhanh qua ba đối thủ khác nhau, bất khả xâm phạm thoáng chốc.',
   cd:1.3,dmg:74.86,count:3,radius:220},
  {id:'acrobatics',name:'Acrobatics',type:'flying',kind:'leap',
   desc:'Nhảy lên cao, đập xuống gây sát thương diện rộng; không giữ item thì mạnh hơn.',
   cd:1.3,dmg:13.3,radius:70,range:220,noItem:1.5},
  {id:'shadow-force',name:'Shadow Force',type:'ghost',kind:'leap',
   desc:'Giratina biến mất và đáp xuống kẻ thù bằng sóng bóng tối.',
   cd:1.3,dmg:18.48,radius:90,range:260,only:[487]},
  {id:'explosion',name:'Explosion',type:'normal',kind:'boom',
   desc:'Nổ diện rộng, hy sinh 25% HP hiện tại mà không tự KO.',
   cd:2.5,dmg:38.57,radius:150,knock:220,cost:.25},
  {id:'sunny-day',name:'Sunny Day',type:'fire',kind:'weather',
   desc:'Gọi nắng 20 giây, tăng Fire và giảm Water.',
   cd:4,dur:20,wx:0},
  {id:'rain-dance',name:'Rain Dance',type:'water',kind:'weather',
   desc:'Gọi mưa 20 giây, tăng Water/Electric và giảm Fire.',
   cd:4,dur:20,wx:1},
  {id:'sandstorm',name:'Sandstorm',type:'rock',kind:'weather',
   desc:'Bão cát 20 giây, buff Rock/Ground/Steel và gây chip damage.',
   cd:4,dur:20,wx:2}
 ];
 for(const d of defs)d.ups=L[d.kind];
 const count=G.PKMSVV3DSMoveFamilies.addDefs(defs);
 return {defs,ladders:L,count};
})();
