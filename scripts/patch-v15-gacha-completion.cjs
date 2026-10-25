'use strict';
/* v1.5: regional collection gap protection. Keep exact star rates, 5-star pity,
 * ten-pull guarantees, ALL GEN selection and old save structure unchanged.
 * If a chosen region yields rarity X, pick among missing Pokemon of rarity X.
 * This makes Arcanine #59 obtainable without special-case gifting.
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
 `      // v1.5: in regional banners, avoid duplicates while this SAME star
      // tier still contains an unowned Pokémon. Does not touch rarity odds,
      // legendary hard pity, Shiny rates or the ALL GEN free-for-all.
      const notOwnedInTier = gen >= 1 && gen <= 9
        ? list.filter(p => !(save.owned && save.owned[p.dex])) : [];
      let mon = G.U.pick(notOwnedInTier.length ? notOwnedInTier : list);`);
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
console.log('PKMSVV v1.5: missing Pokémon prioritized within the SAME rarity on a regional banner; Arcanine #59 stays 4★.');
