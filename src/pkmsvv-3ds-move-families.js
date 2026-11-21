/* PKMSVV — 3DS move families → shared Web/Android/PC engine, QA stage 2.
 * 4 real gameplay move definitions; original 103 moves and Bubble→Surf stay unchanged.
 * Mechanics adapt PokéSurvivor3DS native combat.cpp spin/quake/vortex.
 * Names retained in English per PKMSVV skill glossary.
 * Noncommercial fan work; upstream JPTER78 + 3DS port juanluismm521.
 */
G.PKMSVV3DSMoveFamilies = (() => {
  'use strict';
  const moves = G.Moves;
  // Each move has a four-step, five-level upgrade ladder, exactly like
  // original Web Moves.instance/levelUp/nextUpText expectations.
  const defs = [
    {
      id:'rapid-spin', name:'Rapid Spin', type:'normal', kind:'spin',
      desc:'Xoay liên tiếp, gây sát thương quanh mình theo từng nhịp.',
      cd:1.90, dmg:12, radius:66, count:3, knock:40,
      ups:[
        {t:'+1 nhịp xoay',m:{count:1}},
        {t:'+35% sát thương',m:{dmg:1.35}},
        {t:'+20% bán kính',m:{radius:1.20}},
        {t:'-20% hồi chiêu và +1 nhịp',m:{cd:0.80,count:1}}
      ]
    },
    {
      id:'earthquake', name:'Earthquake', type:'ground', kind:'quake',
      desc:'Gây các đợt chấn động nối tiếp theo hướng nhắm, đẩy lùi quái.',
      cd:3.05, dmg:18, radius:50, count:5, knock:35,
      ups:[
        {t:'+1 đợt chấn động',m:{count:1}},
        {t:'+35% sát thương',m:{dmg:1.35}},
        {t:'+20% phạm vi chấn động',m:{radius:1.20}},
        {t:'-20% hồi chiêu và +1 đợt',m:{cd:0.80,count:1}}
      ]
    },
    {
      id:'whirlpool', name:'Whirlpool', type:'water', kind:'vortex',
      desc:'Tạo lốc nước hút kẻ địch vào tâm và gây sát thương mỗi 0,4 giây.',
      cd:3.60, dmg:11, radius:72, dur:2.6, range:300, pull:125,
      ups:[
        {t:'+20% phạm vi',m:{radius:1.20}},
        {t:'+35% sát thương',m:{dmg:1.35}},
        {t:'+25% thời gian tồn tại',m:{dur:1.25}},
        {t:'-20% hồi chiêu và hút mạnh hơn',m:{cd:0.80,pull:145}}
      ]
    },
    {
      // Original Web uses the display name Surf only when Bubble evolves.
      // This is a separate 3DS-style *learnable* wave; do not alter the
      // existing Bubble evolution or any saved skill IDs.
      id:'surf', name:'Surf', type:'water', kind:'wave',
      desc:'Sóng nước khổng lồ quét từ sau ra trước, gây damage một lần và cuốn quái đi.',
      cd:3.20, dmg:24, radius:210, width:124, speed:280, knock:160,
      ups:[
        {t:'+20% bề ngang con sóng',m:{width:1.20}},
        {t:'+35% sát thương',m:{dmg:1.35}},
        {t:'+20% khoảng cách sóng',m:{radius:1.20}},
        {t:'-20% hồi chiêu và +15% tốc độ sóng',m:{cd:0.80,speed:1.15}}
      ]
    }
  ];
  const registered = [];
  const alreadyInGame = [];
  function install() {
    let additions=0;
    if (!moves || !moves.BY_ID || !moves.POOL || !Array.isArray(moves.ALL))
      throw Error('PKMSVV 3DS move families: Web moves catalogue missing');
    for (const def of defs) {
      if (moves.BY_ID[def.id]) {
        // PKMSVV's real 103-move catalog ALREADY has Rapid Spin and
        // Whirlpool. Do not re-register, mutate their damage/balance or
        // change any saved move ID. A conflicting kind is a hard stop.
        if (moves.BY_ID[def.id].kind !== def.kind)
          throw Error('3DS move kind conflicts with existing PKMSVV move: '+def.id);
        if(!alreadyInGame.includes(def.id))alreadyInGame.push(def.id);
        continue;
      }
      def.maxLvl=def.ups.length+1;
      def.pkmsvv3dsNative=true;
      moves.ALL.push(def);
      moves.BY_ID[def.id]=def;
      const pool=moves.POOL[def.type] || (moves.POOL[def.type]=[]);
      if (!pool.includes(def.id)) pool.push(def.id);
      registered.push(def.id);
      additions++;
    }
    if (!moves.poolFor._pkmsvv3dsSoloOnly) {
      const original=moves.poolFor;
      // Only hide IDs actually *added* on this source revision. Existing
      // Rapid Spin / Whirlpool must remain playable in all online modes.
      const extra=new Set(registered);
      function poolFor(mon) {
        const list=original.call(moves,mon);
        // Until Co-op/BR/Egg Rush authority and replay QA, do not roll these
        // native-inspired fields in networked rooms. No existing move lost.
        return G.Coop?.active ? list.filter(id=>!extra.has(id)) : list;
      }
      poolFor._pkmsvv3dsSoloOnly=true;
      moves.poolFor=poolFor;
    }
    return additions;
  }
  install();
  return { defs, registered, alreadyInGame, install, isNativeMove:id=>registered.includes(id) };
})();
