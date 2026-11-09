'use strict';
/* Normalize RANDOM ground item drops to 2/3 of the previous rate.
 * XP, 2% Orbs, guaranteed bosses rewards, rewards from events and saves
 * are deliberately excluded. Refuse to modify unrecognized native bundles.
 */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function count(src,needle){return src.split(needle).length-1}
function patchPickupDrops(bundle){
 const start=bundle.indexOf('G.Pickups=');
 if(start<0||bundle.indexOf('G.Pickups=',start+9)!==-1)
  throw Error('Expected exactly one native Pickup module');
 const end=Math.min(bundle.length,start+32000);
 let chunk=bundle.slice(start,end);
 // Native ordinary-enemy ticket roll (0.25% -> 0.1667%).
 const ticket=/Math\.random\(\)<\.0025&&([a-zA-Z_$][\w$]*)\(([a-zA-Z_$][\w$]*)\("ticket"/g;
 const found=[...chunk.matchAll(ticket)];
 if(found.length!==1)throw Error('Expected exactly one ordinary ticket chance in Pickup module: '+found.length);
 const match=found[0];
 const from='Math.random()<.0025',to='Math.random()<.0016666666666666668';
 chunk=chunk.slice(0,match.index)+
  chunk.slice(match.index).replace(from,to);
 // A single random value selects one of heal/magnet/bomb. These are
 // cumulative odds; multiply ALL THREE thresholds by 2/3.
 const rolls=[...chunk.matchAll(/const ([a-zA-Z_$][\w$]*)=Math\.random\(\);\1<\.012\?/g)];
 if(rolls.length!==1)throw Error('Expected one ordinary heal/magnet/bomb roll: '+rolls.length);
 const at=rolls[0].index,variable=rolls[0][1];
 let local=chunk.slice(at,at+550);
 for(const [before,after] of [
  [variable+'<.012?',variable+'<.008?'],
  [variable+'<.02?',variable+'<.013333333333333334?'],
  [variable+'<.026&&',variable+'<.017333333333333333&&']
 ]){
  if(count(local,before)!==1)throw Error('Missing native item threshold: '+before);
  local=local.replace(before,after);
 }
 if(!/["']heal["']/.test(local)||!/["']magnet["']/.test(local)||!/["']bomb["']/.test(local))
  throw Error('Native ordinary item roll is not heal/magnet/bomb');
 chunk=chunk.slice(0,at)+local+chunk.slice(at+550);
 const output=bundle.slice(0,start)+chunk+bundle.slice(end);
 new vm.Script(output,{filename:'pkmsvv-item-drop-two-thirds.js'});
 return output;
}
function patchFile(filename){
 const dest=path.resolve(filename);
 const rel=path.relative(root,dest).replace(/\\/g,'/');
 if(!['dist/cloudflare-v20-release/game/js/app.min.js',
  'dist/cloudflare-v20-release/ai/game/js/app.min.js'].includes(rel))
  throw Error('Refusing non-staged Web file '+rel);
 const src=fs.readFileSync(dest,'utf8');
 const patched=patchPickupDrops(src);
 fs.writeFileSync(dest,patched,'utf8');
 console.log('PKMSVV_DROP_TWO_THIRDS',rel,patched.length);
}
if(require.main===module){
 if(process.argv.length<3)throw Error('Provide staged Web app.min.js');
 for(const item of process.argv.slice(2))patchFile(item);
}
module.exports={patchPickupDrops,patchFile};
