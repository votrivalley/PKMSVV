/* PKMSVV Stage10 — the final 10 3DS v1.0.0 missing moves.
 * Native numeric MoveDef and four-rank kind ladders verified in
 * https://github.com/votrivalley/PKMSVV/actions/runs/45023655923
 * Add-only; preserve original 103 move IDs, the current save schema and
 * solo-only gate until full-game/network replay QA is possible.
 */
G.PKMSVV3DSStage10Moves=(()=>{
 'use strict';
 const ladders={
  shove:[
   {t:'+40% sát thương',m:{dmg:1.4}},
   {t:'+25% bán kính',m:{radius:1.25}},
   {t:'-25% hồi chiêu',m:{cd:.75}},
   {t:'+50% lực đẩy và +40% sát thương',m:{knock:1.5,dmg:1.4}}
  ],
  spin:[
   {t:'+40% sát thương',m:{dmg:1.4}},
   {t:'+25% bán kính',m:{radius:1.25}},
   {t:'+1 nhịp xoay',m:{count:1}},
   {t:'-25% hồi chiêu, +30% sát thương',m:{cd:.75,dmg:1.3}}
  ],
  stun:[
   {t:'+40% sát thương',m:{dmg:1.4}},
   {t:'+25% bán kính',m:{radius:1.25}},
   {t:'+50% thời gian choáng',m:{stun:1.5}},
   {t:'-25% hồi chiêu, +30% sát thương',m:{cd:.75,dmg:1.3}}
  ],
  tremor:[
   {t:'+40% sát thương',m:{dmg:1.4}},
   {t:'+25% bán kính',m:{radius:1.25}},
   {t:'-25% hồi chiêu',m:{cd:.75}},
   {t:'+50% sát thương và +20% bán kính',m:{dmg:1.5,radius:1.2}}
  ],
  bounce:[
   {t:'+1 mục tiêu bật tiếp',m:{bounce:1}},
   {t:'+45% sát thương',m:{dmg:1.45}},
   {t:'-25% hồi chiêu',m:{cd:.75}},
   {t:'+1 đạn, +1 lần bật và +30% độ tản',m:{count:1,bounce:1,spread:1.3}}
  ],
  buff:[
   {t:'+1 tầng cộng dồn',m:{stacks:1}},
   {t:'+40% sức mạnh buff',m:{amount:1.4}},
   {t:'+50% thời gian buff',m:{dur:1.5}},
   {t:'+1 tầng và +40% sức mạnh',m:{stacks:1,amount:1.4}}
  ],
  quake:[
   {t:'+2 sóng đá',m:{count:2}},
   {t:'+45% sát thương',m:{dmg:1.45}},
   {t:'+25% bán kính',m:{radius:1.25}},
   {t:'-25% hồi chiêu và +2 sóng đá',m:{cd:.75,count:2}}
  ]
 };
 const defs=[
  {id:'relic-song',name:'Relic Song',type:'normal',kind:'shove',cat:'special',
   cd:1.1,dmg:84.58,radius:110,knock:360,only:[648],
   desc:'Meloetta phát âm ba đẩy lùi kẻ địch xung quanh.'},
  {id:'clanging-scales',name:'Clanging Scales',type:'dragon',kind:'shove',cat:'special',
   cd:1.1,dmg:85.8,radius:100,knock:300,only:[784],
   desc:'Kommo-o tạo vòng sóng âm từ lớp vảy kim loại.'},
  {id:'mortal-spin',name:'Mortal Spin',type:'poison',kind:'spin',cat:'physical',
   cd:1,dmg:8.82,count:4,radius:72,poison:1.5,only:[970],
   desc:'Glimmora xoay bốn nhịp, làm trúng độc mục tiêu.'},
  {id:'darkest-lariat',name:'Darkest Lariat',type:'dark',kind:'spin',cat:'physical',
   cd:1,dmg:9.72,count:4,radius:78,knock:60,only:[727],
   desc:'Incineroar xoay người quét trúng quái ở quanh mình.'},
  {id:'waterfall',name:'Waterfall',type:'water',kind:'stun',cat:'physical',
   cd:1.4,dmg:23.01,radius:46,stun:.8,
   desc:'Thác nước được báo trước, rơi xuống sau 0,45 giây và gây choáng.'},
  {id:'dark-void',name:'Dark Void',type:'dark',kind:'stun',cat:'special',
   cd:2,dmg:25.3,radius:110,stun:1.8,only:[491],
   desc:'Darkrai mở vùng tối, làm choáng quái trong vòng ảnh hưởng.'},
  {id:'glaciate',name:'Glaciate',type:'ice',kind:'tremor',cat:'special',
   cd:1.5,dmg:24,radius:190,slow:.6,only:[646],
   desc:'Kyurem tung vòng băng lan dần, làm chậm kẻ địch.'},
  {id:'psyshock',name:'Psyshock',type:'psychic',kind:'bounce',cat:'special',
   cd:.7,dmg:26.17,speed:360,count:1,spread:.12,life:1.6,size:8,bounce:4,
   desc:'Đạn tâm linh tìm thêm tối đa bốn mục tiêu chưa trúng trong bán kính 220.'},
  {id:'geomancy',name:'Geomancy',type:'fairy',kind:'buff',cat:'status',
   cd:.85,amount:.18,dur:8,stacks:5,stat:'spa',only:[716],
   desc:'Xerneas tích lũy sức mạnh cho đòn đặc biệt, không buff vật lý.'},
  {id:'precipice-blades',name:'Precipice Blades',type:'ground',kind:'quake',cat:'physical',
   cd:1.25,dmg:12.87,count:8,radius:40,only:[383],
   desc:'Groudon tạo tám đợt gai đá liên tiếp ở hướng đối thủ.'}
 ];
 for(const d of defs)d.ups=ladders[d.kind];
 const count=G.PKMSVV3DSMoveFamilies.addDefs(defs);
 return {defs,ladders,count};
})();
