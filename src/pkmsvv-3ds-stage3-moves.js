/* PKMSVV Stage 3 — source-verified 3DS v1.0.0 move profiles, 13 Nov update.
 * Native C++ source: src/gen/gamedata.cpp (extracted by GitHub Actions),
 * exact damage/cd/count/radius/type/cat/only and exactly copied kind ladders.
 * No original PKMSVV ID is changed. All status effects remain in the engine.
 */
G.PKMSVV3DSStage3Moves = (() => {
  'use strict';
  const L = {
    punch:[
      {t:'+40% sát thương',m:{dmg:1.4}},
      {t:'+1 cú đấm',m:{count:1}},
      {t:'-25% hồi chiêu',m:{cd:0.75}},
      {t:'+50% sát thương và +20% tầm đánh',m:{dmg:1.5,radius:1.2}}
    ],
    cross:[
      {t:'+40% sát thương',m:{dmg:1.4}},
      {t:'+30% chiều dài chữ thập',m:{radius:1.3}},
      {t:'-25% hồi chiêu',m:{cd:0.75}},
      {t:'+50% sát thương và +40% bề ngang',m:{dmg:1.5,width:1.4}}
    ],
    storm:[
      {t:'+2 tia sét',m:{count:2}},
      {t:'+45% sát thương',m:{dmg:1.45}},
      {t:'-25% hồi chiêu',m:{cd:0.75}},
      {t:'+2 tia sét và +30% bán kính',m:{count:2,radius:1.3}}
    ]
  };
  const D=[
    {id:'fire-punch',name:'Fire Punch',type:'fire',kind:'punch',cat:'physical',
     desc:'Ba cú đấm lửa liên tiếp; đòn cuối mạnh hơn, gây bỏng.',
     cd:0.85,dmg:10.37,count:3,radius:60,arc:1,burn:1},
    {id:'ice-punch',name:'Ice Punch',type:'ice',kind:'punch',cat:'physical',
     desc:'Ba cú đấm băng làm chậm quái, đòn cuối đóng băng ngắn.',
     cd:0.85,dmg:15.69,count:3,radius:60,arc:1,slow:0.4,stun:0.35},
    {id:'thunder-punch',name:'Thunder Punch',type:'electric',kind:'punch',cat:'physical',
     desc:'Ba cú đấm điện, đòn cuối phóng sét lan sang kẻ địch gần.',
     cd:0.85,dmg:11.98,count:3,radius:60,arc:1,zap:2},
    {id:'drain-punch',name:'Drain Punch',type:'fighting',kind:'punch',cat:'physical',
     desc:'Ba cú đấm hồi phục HP theo số lần đánh trúng.',
     cd:0.9,dmg:17.12,count:3,radius:60,arc:1,drain:1.5},
    {id:'plasma-fists',name:'Plasma Fists',type:'electric',kind:'punch',cat:'physical',
     desc:'Ba cú đấm plasma; đòn cuối sét lan. Đòn riêng của Zeraora.',
     cd:0.8,dmg:10.19,count:3,radius:64,arc:1.1,zap:3,only:[807]},
    {id:'fire-blast',name:'Fire Blast',type:'fire',kind:'cross',cat:'special',
     desc:'Lửa bùng nổ thành hình chữ thập ở chỗ kẻ địch, gây bỏng.',
     cd:1.6,dmg:15.9,radius:90,width:26,burn:1},
    {id:'seed-flare',name:'Seed Flare',type:'grass',kind:'cross',cat:'special',
     desc:'Hạt giống nổ hình chữ thập. Đòn riêng của Shaymin.',
     cd:1.4,dmg:23.2,radius:110,width:30,only:[492]},
    {id:'thunder',name:'Thunder',type:'electric',kind:'storm',cat:'special',
     desc:'Nhiều tia sét giáng ngẫu nhiên lên quái đang nhìn thấy.',
     cd:1.5,dmg:4.29,count:5,radius:34},
    {id:'judgment',name:'Judgment',type:'normal',kind:'storm',cat:'special',
     desc:'Cơn mưa tia sáng trừng phạt kẻ địch. Đòn riêng của Arceus.',
     cd:1.4,dmg:2.85,count:8,radius:40,only:[493]}
  ];
  for(const m of D)m.ups=L[m.kind];
  const count=G.PKMSVV3DSMoveFamilies.addDefs(D);
  return {defs:D,ladders:L,count};
})();
