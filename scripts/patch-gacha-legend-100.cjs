'use strict';
/* Balance hotfix: 5-star (Legend grade) 1% base odds, 100-pull hard pity.
 * Preserve 10-pull guaranteed >=4-star, ×100 batching and old save.pity.
 * The removed 0.5 percentage points go to 1★ to keep the sum at 100%.
 */
const fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'..','vendor','pokesurvivor','js','systems','gacha.js');
let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
function once(from,to){
 if(s.split(from).length!==2)throw Error('Gacha rarity balance source drift: '+from);
 s=s.replace(from,to);
}
once('const RATES = [[1, 45], [2, 30], [3, 17], [4, 6.5], [5, 1.5]];',
     'const RATES = [[1, 45.5], [2, 30], [3, 17], [4, 6.5], [5, 1]];');
once('const PITY_5 = 70;', 'const PITY_5 = 100;');
fs.writeFileSync(file,s,'utf8');
console.log('PKMSVV Gacha: 5★ base 1%, guaranteed by 100th roll without 5★; 10-pull and saved pity intact.');
