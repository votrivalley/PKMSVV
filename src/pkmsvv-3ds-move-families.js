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
      // Latest native 3DS generated catalog: Earthquake uses K_TREMOR,
      // NOT K_QUAKE (Magnitude already owns the original quake family).
      id:'earthquake', name:'Earthquake', type:'ground', kind:'tremor',
      desc:'Tâm chấn lan thành vòng tròn từ Pokémon, trúng mỗi mục tiêu một lần.',
      cd:3.05, dmg:18, radius:175, dur:0.55, knock:65,
      ups:[
        {t:'+20% phạm vi địa chấn',m:{radius:1.20}},
        {t:'+35% sát thương',m:{dmg:1.35}},
        {t:'+25% lực đẩy',m:{knock:1.25}},
        {t:'-20% hồi chiêu và +15% phạm vi',m:{cd:0.80,radius:1.15}}
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
      // addDefs() reruns install over all prior source definitions: previously
      // registered 3DS moves are NOT legacy PKMSVV baseline IDs.
      if(registered.includes(def.id))continue;
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
      // Live reference, not a snapshot: future Stage 3 additions must be
      // isolated from Co-op just like Surf and Earthquake.
      const extra=registered;
      function poolFor(mon) {
        const list=original.call(moves,mon);
        // Native legendary-exclusive skills must never be offered to a
        // different species, including Normal-type Judgment on all Pokémon.
        const dex=Number(mon?.dex);
        return list.filter(id=>{
          const def=moves.BY_ID[id];
          if (def?.pkmsvv3dsNative && def.only?.length && !def.only.includes(dex))
            return false;
          return !(G.Coop?.active && extra.includes(id));
        });
      }
      poolFor._pkmsvv3dsSoloOnly=true;
      moves.poolFor=poolFor;
    }
    return additions;
  }
  function addDefs(next) {
    if (!Array.isArray(next) || next.some(d=>!d || typeof d.id!=='string' ||
      !d.type || !d.kind || !Array.isArray(d.ups) || d.ups.length!==4))
      throw Error('PKMSVV 3DS Stage3: move definitions need complete four-step ladder');
    for(const d of next){
      if(defs.some(existing=>existing.id===d.id))
        throw Error('PKMSVV 3DS duplicate staged ID: '+d.id);
      defs.push(d);
    }
    return install();
  }
  install();
  return { defs, registered, alreadyInGame, install, addDefs, isNativeMove:id=>registered.includes(id) };
})();
