/* PKMSVV Stage 4 — support move definitions, source-verified 3DS v1.0.0.
 * Five distinct new IDs; keeps all original 103 skills and saves untouched.
 * Stats and exact 4-rank family ladders: native src/gen/gamedata.cpp.
 */
G.PKMSVV3DSStage4Moves=(()=>{
 'use strict';
 const L={
  guard:[
   {t:'+25% thời gian Protect',m:{dur:1.25}},
   {t:'-15% hồi chiêu',m:{cd:.85}},
   {t:'+25% thời gian Protect',m:{dur:1.25}},
   {t:'-20% hồi chiêu và +20% thời gian',m:{cd:.8,dur:1.2}}
  ],
  screen:[
   {t:'+30% thời gian bảo vệ',m:{dur:1.3}},
   {t:'+15% hiệu quả giảm sát thương',m:{amount:1.15}},
   {t:'-15% hồi chiêu',m:{cd:.85}},
   {t:'+30% thời gian bảo vệ',m:{dur:1.3}}
  ],
  rest:[
   {t:'+15% lượng HP hồi',m:{amount:1.15}},
   {t:'-15% thời gian ngủ',m:{dur:.85}},
   {t:'-15% hồi chiêu',m:{cd:.85}},
   {t:'+20% lượng hồi và giảm 15% thời gian ngủ',m:{amount:1.2,dur:.85}}
  ],
  decoy:[
   {t:'+30% thời gian phân thân',m:{dur:1.3}},
   {t:'+1 phân thân',m:{count:1}},
   {t:'-15% hồi chiêu',m:{cd:.85}},
   {t:'+30% bán kính dụ quái',m:{radius:1.3}}
  ]
 };
 const defs=[
  {id:'protect',name:'Protect',type:'normal',kind:'guard',
   desc:'Khiên bất khả xâm phạm 1,5 giây; hồi chiêu không bao giờ dưới 5 giây.',
   cd:7,dur:1.5,minCd:5},
  {id:'reflect',name:'Reflect',type:'psychic',kind:'screen',
   desc:'Giảm 35% sát thương vật lý trong 8 giây.',
   cd:10,amount:.35,dur:8,shield:0},
  {id:'light-screen',name:'Light Screen',type:'psychic',kind:'screen',
   desc:'Giảm 35% sát thương đặc biệt trong 8 giây.',
   cd:10,amount:.35,dur:8,shield:1},
  {id:'rest',name:'Rest',type:'psychic',kind:'rest',
   desc:'Tự kích hoạt khi HP dưới 40%: hồi 60% HP tối đa, ngủ 2 giây (không di chuyển hay tấn công).',
   cd:18,amount:.6,dur:2},
  {id:'double-team',name:'Double Team',type:'normal',kind:'decoy',
   desc:'Để lại một phân thân hút quái thường trong bán kính 260, tồn tại 4 giây.',
   cd:8,count:1,radius:260,dur:4}
 ];
 for(const d of defs)d.ups=L[d.kind];
 const count=G.PKMSVV3DSMoveFamilies.addDefs(defs);
 return {defs,ladders:L,count};
})();
