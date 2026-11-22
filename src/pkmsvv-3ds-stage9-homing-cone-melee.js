/* Stage9 — native 3DS v1.0.0 Homing/Cone/Melee/Boomerang/Chain.
 * Exact source-derived move stats and four-rank ladders: 3DS audit
 * https://github.com/votrivalley/PKMSVV/actions/runs/45023655923
 * Add-only in the Draft. Preserve 103 original IDs, saves, and multiplayer gate.
 */
G.PKMSVV3DSStage9Moves=(()=>{
 'use strict';
 const ladders={
  homing:[
   {t:'+1 đạn đuổi và +30% kích thước',m:{count:1,size:1.3}},
   {t:'+45% sát thương',m:{dmg:1.45}},
   {t:'-25% hồi chiêu',m:{cd:.75}},
   {t:'+1 đạn và +40% sát thương',m:{count:1,dmg:1.4}}
  ],
  cone:[
   {t:'+3 luồng đạn',m:{count:3}},
   {t:'+40% sát thương',m:{dmg:1.4}},
   {t:'+30% tầm bay',m:{life:1.3}},
   {t:'+3 luồng đạn và +1 xuyên mục tiêu',m:{count:3,pierce:1}}
  ],
  melee:[
   {t:'+40% sát thương',m:{dmg:1.4}},
   {t:'+25% tầm chém',m:{radius:1.25}},
   {t:'-25% hồi chiêu',m:{cd:.75}},
   {t:'Chém 360° và +50% sát thương',m:{dmg:1.5}}
  ],
  boomerang:[
   {t:'+1 lưỡi kiếm bay',m:{count:1}},
   {t:'+45% sát thương',m:{dmg:1.45}},
   {t:'+30% tầm bay',m:{radius:1.3}},
   {t:'+1 lưỡi kiếm và +40% sát thương',m:{count:1,dmg:1.4}}
  ],
  chain:[
   {t:'+2 lần truyền mục tiêu',m:{count:2}},
   {t:'+45% sát thương',m:{dmg:1.45}},
   {t:'-25% hồi chiêu',m:{cd:.75}},
   {t:'+2 lần truyền và +40% sát thương',m:{count:2,dmg:1.4}}
  ]
 };
 const defs=[
  {id:'moonblast',name:'Moonblast',type:'fairy',kind:'homing',cat:'special',cd:.8,dmg:7.61,
   speed:280,count:1,spread:.12,life:2,size:10,homing:5,splash:56,
   desc:'Ánh trăng tự tìm mục tiêu rồi nổ lan sang quái xung quanh.'},
  {id:'attack-order',name:'Attack Order',type:'bug',kind:'homing',cat:'physical',cd:.75,dmg:22.69,
   speed:300,count:4,spread:.6,life:2,size:7,homing:6,only:[416],
   desc:'Vespiquen phái một đàn ong bám đuổi kẻ địch.'},
  {id:'flower-trick',name:'Flower Trick',type:'grass',kind:'homing',cat:'physical',cd:.8,dmg:22.54,
   speed:300,count:4,spread:.6,life:2,size:8,homing:5,critUp:.5,only:[908],
   desc:'Meowscarada tung hoa đuổi mục tiêu, cộng 50% tỉ lệ chí mạng cho chiêu.'},
  {id:'blizzard',name:'Blizzard',type:'ice',kind:'cone',cat:'special',cd:.9,dmg:15.74,
   speed:300,count:9,pierce:1,life:.55,size:7,arc:1.3,slow:.55,
   desc:'Quạt bão tuyết làm chậm kẻ địch trên đường.'},
  {id:'silver-wind',name:'Silver Wind',type:'bug',kind:'cone',cat:'special',cd:.75,dmg:10.60,
   speed:320,count:8,pierce:1,life:.5,size:6,arc:1.1,boost:.15,
   desc:'Gió bạc tung bụi cánh; 15% cơ hội tăng Attack và Speed trong 6 giây.'},
  {id:'crunch',name:'Crunch',type:'dark',kind:'melee',cat:'physical',cd:1,dmg:16.74,
   radius:63,arc:1.38,knock:60,shred:4,
   desc:'Cắn xé kẻ địch, khiến mục tiêu chịu thêm 25% sát thương trong 4 giây.'},
  {id:'behemoth-blade',name:'Behemoth Blade',type:'steel',kind:'melee',cat:'physical',cd:.9,dmg:24.82,
   radius:88,arc:3,knock:120,only:[888],
   desc:'Zacian vung lưỡi kiếm rộng, cấp cuối quét cả vòng 360°.'},
  {id:'secret-sword',name:'Secret Sword',type:'fighting',kind:'boomerang',cat:'special',cd:.85,dmg:11.70,
   speed:360,count:2,spread:.5,size:9,radius:240,only:[647],
   desc:'Keldeo phóng hai lưỡi kiếm năng lượng rồi thu hồi.'},
  {id:'malignant-chain',name:'Malignant Chain',type:'poison',kind:'chain',cat:'special',cd:1,dmg:34.30,
   count:6,radius:150,poison:2,only:[1025],
   desc:'Pecharunt tung chuỗi độc lan qua nhiều kẻ địch.'}
 ];
 for(const d of defs){
  d.ups=ladders[d.kind].map((u,i)=>({
   t:u.t,m:Object.assign({},u.m,i===3&&d.kind==='melee'?{arc:9/d.arc}:{})
  }));
 }
 const count=G.PKMSVV3DSMoveFamilies.addDefs(defs);
 return {defs,ladders,count};
})();
