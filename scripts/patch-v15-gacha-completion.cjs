'use strict';
/* v1.5: soft regional catch-up (late collection only). Keep exact star rates, 5-star pity,
 * ten-pull guarantees, ALL GEN selection and old save structure unchanged.
 * At 80% completed Dex, 15% chance to favor missing Pokémon of the rolled
 * same star tier; duplicates remain. Arcanine #59 is in the normal 4-star pool.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..','vendor','pokesurvivor');
function once(file,from,to){
 const p=path.join(root,file),s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 if(s.split(from).length!==2)throw Error('Regional Gacha patch anchor changed '+file+': '+from.slice(0,110));
 fs.writeFileSync(p,s.replace(from,to),'utf8');
}
once('js/systems/gacha.js',
 '      let mon = G.U.pick(list);',
 `      // v1.5: small late-collection catch-up only. An 80%-complete
      // regional Dex gets a 15% chance to prioritize a missing species
      // AFTER rolling the star tier. Duplicates remain possible and common.
      // No boost on ALL GEN or on regions below 80% completion.
      const region = gen >= 1 && gen <= 9
        ? G.DEX.filter(p => p.gen === gen && !!G.SPRITE_META[p.dex]) : [];
      const ownedInRegion = region.filter(p => !!(save.owned && save.owned[p.dex])).length;
      const nearComplete = region.length > 0 && ownedInRegion / region.length >= 0.8;
      const notOwnedInTier = nearComplete
        ? list.filter(p => !(save.owned && save.owned[p.dex])) : [];
      const catchUp = notOwnedInTier.length > 0 && Math.random() < 0.15;
      let mon = G.U.pick(catchUp ? notOwnedInTier : list);`);
once('js/ui/gacha-ui.js',
 '      out.appendChild(sum);',
 `      // 100-pull animation displays only the 20 highlights. Never conceal
      // newly obtained Pokémon from the complete 100-pull summary.
      const acquired = res.filter(r=>r.isNew).map(r=>(G.DEX_BY[r.dex]||{}).name||('#'+r.dex));
      if(acquired.length){
        const names=acquired.slice(0,35).join(', ');
        sum.textContent+=' · '+(vi?'Đã nhận mới (đủ 100 lượt): ':'Newly obtained (all 100 pulls): ')+names+
          (acquired.length>35?' (+'+(acquired.length-35)+')':'');
      }
      out.appendChild(sum);`);
console.log('PKMSVV v1.5: 15% regional catch-up at >=80% Dex completion; duplicates and star probabilities unchanged.');
