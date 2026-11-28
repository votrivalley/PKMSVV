/* Conservative progression merge for the native DB cloud transaction.
 * Never add two device totals, fabricate egg IDs or choose an incompatible
 * history just because its timestamp is newer. Old save fields are optional.
 */
(function(root){
 'use strict';
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
 const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const copy=x=>JSON.parse(JSON.stringify(x));
 const conflict=()=>{throw Error('PKMSVV_PROGRESSION_CONFLICT: preserve both save exports');};
 const dex=n=>Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<=1025;
 const validKey=k=>/^[1-9][0-9]*$/.test(k)&&dex(k);
 function mastery(a,b){
  if(a===undefined&&b===undefined)return undefined;
  const out={};
  for(const row of [a,b]){
   if(row===undefined)continue;
   if(!obj(row))conflict();
   for(const [k,v] of Object.entries(row)){
    if(!validKey(k)||!Number.isSafeInteger(v)||v<0||v>1000000)conflict();
    out[k]=Math.max(out[k]||0,v);
   }
  }
  return out;
 }
 function evolutions(a,b){
  if(a===undefined&&b===undefined)return undefined;
  const out={};
  for(const row of [a,b]){
   if(row===undefined)continue;
   if(!obj(row))conflict();
   for(const [k,v] of Object.entries(row)){
    if(!validKey(k)||typeof v!=='boolean')conflict();
    if(v===true)out[k]=true;else if(!own(out,k))out[k]=false;
   }
  }
  return out;
 }
 function validate(i){
  if(i===undefined)return;
  if(!obj(i)||!Number.isSafeInteger(i.serial)||i.serial<0||!obj(i.eggs)||!obj(i.hatched)||Object.keys(i.eggs).length>6)conflict();
  const id=k=>/^egg-[1-9][0-9]*$/.test(k)&&Number.isSafeInteger(+k.slice(4))&&+k.slice(4)<=i.serial;
  for(const [k,e] of Object.entries(i.eggs)){
   if(!id(k)||!obj(e)||!dex(e.dex)||!Number.isInteger(e.kills)||e.kills<0||e.kills>500||own(i.hatched,k)||
      (e.shiny!==undefined&&typeof e.shiny!=='boolean'))conflict();
  }
  for(const [k,d] of Object.entries(i.hatched))if(!id(k)||!dex(d))conflict();
  if(i.active!==null&&!own(i.eggs,i.active))conflict();
 }
 function retains(next,old,merged){
  if(old===undefined)return true;if(next===undefined||next.serial<old.serial)return false;
  for(const [id,d] of Object.entries(old.hatched))if(Number(next.hatched[id])!==Number(d))return false;
  for(const [id,e] of Object.entries(old.eggs)){
   const n=next.eggs[id];
   if(n){
    if(Number(n.dex)!==Number(e.dex)||n.from!==e.from||n.region!==e.region||!!n.shiny!==!!e.shiny||n.kills<e.kills)return false;
   }else if(Number(next.hatched[id])!==Number(e.dex)||!merged.owned?.[e.dex]||(e.shiny===true&&!merged.shiny?.[e.dex]))return false;
  }
  return true;
 }
 function coopReceipts(a,b){
  if(a===undefined&&b===undefined)return undefined;
  const out={};
  for(const row of [a,b]){
   if(row===undefined)continue;
   if(!obj(row)||Object.keys(row).length>128)conflict();
   for(const [k,v] of Object.entries(row)){
    if(!/^[A-Za-z0-9_-]{1,128}$/.test(k)||['__proto__','constructor','prototype'].includes(k)||!obj(v)||!Number.isSafeInteger(v.serial)||v.serial<1||!Number.isSafeInteger(v.at)||v.at<0)conflict();
    if(!own(out,k)||v.serial>out[k].serial||(v.serial===out[k].serial&&v.at>out[k].at))Object.defineProperty(out,k,{value:copy(v),enumerable:true,writable:true,configurable:true});
   }
  }
  return Object.fromEntries(Object.entries(out).sort((a,b)=>b[1].at-a[1].at||a[0].localeCompare(b[0])).slice(0,128));
 }
 function apply(merged,newer,older){
  const a=newer?.pkmsvvIncubator,b=older?.pkmsvvIncubator;
  validate(a);validate(b);
  let eggs;
  if(a!==undefined||b!==undefined){
   if(retains(a,b,merged))eggs=a;
   else if(retains(b,a,merged))eggs=b;
   else conflict();
  }
  // Validate everything before modifying the draft passed by native DB.
  const m=mastery(newer?.pkmsvvMastery,older?.pkmsvvMastery),e=evolutions(newer?.pkmsvvEggEvolutions,older?.pkmsvvEggEvolutions);
  const c=coopReceipts(newer?.pkmsvvCoopProgress,older?.pkmsvvCoopProgress);
  if(c!==undefined)merged.pkmsvvCoopProgress=c;
  if(m!==undefined)merged.pkmsvvMastery=m;
  if(e!==undefined)merged.pkmsvvEggEvolutions=e;
  if(eggs!==undefined)merged.pkmsvvIncubator=copy(eggs);
  return merged;
 }
 const api={apply};if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(typeof G!=='undefined')G.PKMSVVProgressionMerge=api;
})(typeof globalThis!=='undefined'?globalThis:this);
