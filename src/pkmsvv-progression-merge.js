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
 const caps=[6,8,10,12,15],slots=[1,1,2,2,3];
 const level=i=>i?.level??1;
 const goal=e=>e?.goal??500;
 const babyGoal=d=>[239,240,238,438,439,433,458].includes(Number(d))?750:[175,447,446,236,440,848].includes(Number(d))?1000:500;
 const babies=[172,173,174,175,236,238,239,240,298,360,406,433,438,439,440,446,447,458,848];
 function validate(i){
  if(i===undefined)return;
  if(!obj(i)||!Number.isSafeInteger(i.serial)||i.serial<0||!obj(i.eggs)||!obj(i.hatched)||!Number.isInteger(level(i))||level(i)<1||level(i)>5||Object.keys(i.eggs).length>caps[level(i)-1])conflict();
  const id=k=>/^egg-[1-9][0-9]*$/.test(k)&&Number.isSafeInteger(+k.slice(4))&&+k.slice(4)<=i.serial;
  for(const [k,e] of Object.entries(i.eggs)){
   if(!id(k)||!obj(e)||!dex(e.dex)||!Number.isInteger(e.kills)||e.kills<0||e.kills>goal(e)||own(i.hatched,k)||(e.goal!==undefined&&e.goal!==babyGoal(e.dex))||
      (e.shiny!==undefined&&typeof e.shiny!=='boolean'))conflict();
  }
  for(const [k,d] of Object.entries(i.hatched))if(!id(k)||!dex(d))conflict();
  if(i.extra!==undefined&&!Array.isArray(i.extra))conflict();
  const active=[...(i.active===null?[]:[i.active]),...(i.extra||[])];
  if(active.length>slots[level(i)-1]||new Set(active).size!==active.length||active.some(k=>typeof k!=='string'||!own(i.eggs,k))||(i.active===null&&active.length))conflict();
  if(i.prizes!==undefined&&!obj(i.prizes))conflict();
  const claimed=new Set();
  for(const [key,p] of Object.entries(i.prizes||{})){
   if(!/^[A-Za-z0-9_-]{1,128}\.[1-9][0-9]*$/.test(key)||!obj(p)||![1,2].includes(p.count)||!Array.isArray(p.claimed)||p.claimed.length>p.count)conflict();
   for(const k of p.claimed){
    if(!id(k)||claimed.has(k)||(!own(i.eggs,k)&&!own(i.hatched,k))||
       (own(i.eggs,k)&&(i.eggs[k].from!=='egg-rush-baby'||i.eggs[k].prize!==key))||
       (own(i.hatched,k)&&!babies.includes(Number(i.hatched[k]))))conflict();
    claimed.add(k);
   }
  }
  if(i.gacha!==undefined){
   const p=i.gacha;if(!obj(p)||!Number.isSafeInteger(p.pulls)||p.pulls<0||!Array.isArray(p.claimed)||p.claimed.length>Math.floor(p.pulls/100))conflict();
   for(const [j,k] of p.claimed.entries()){
    if(!id(k)||claimed.has(k)||(!own(i.eggs,k)&&!own(i.hatched,k))||
       (own(i.eggs,k)&&(i.eggs[k].from!=='gacha-baby'||i.eggs[k].gachaMilestone!==(j+1)*100||i.eggs[k].prize!==undefined))||
       (own(i.hatched,k)&&!babies.includes(Number(i.hatched[k]))))conflict();
    claimed.add(k);
   }
  }
  for(const [k,e] of Object.entries(i.eggs)){
   if(e.prize!==undefined&&(!claimed.has(k)||e.from!=='egg-rush-baby'))conflict();
   if((e.from==='gacha-baby'||e.gachaMilestone!==undefined)&&(!i.gacha?.claimed.includes(k)||e.from!=='gacha-baby'||!babies.includes(Number(e.dex))))conflict();
  }
 }
 function retains(next,old,merged){
  if(old===undefined)return true;if(next===undefined||next.serial<old.serial||level(next)<level(old))return false;
  for(const [k,p] of Object.entries(old.prizes||{})){
   const n=next.prizes?.[k];
   if(!n||n.count!==p.count||p.claimed.some((id,j)=>n.claimed[j]!==id))return false;
  }
  if(old.gacha&&(!next.gacha||next.gacha.pulls<old.gacha.pulls||old.gacha.claimed.some((id,j)=>next.gacha.claimed[j]!==id)))return false;
  for(const [id,d] of Object.entries(old.hatched))if(Number(next.hatched[id])!==Number(d))return false;
  for(const [id,e] of Object.entries(old.eggs)){
   const n=next.eggs[id];
   if(n){
    if(Number(n.dex)!==Number(e.dex)||n.from!==e.from||n.region!==e.region||!!n.shiny!==!!e.shiny||goal(n)!==goal(e)||n.prize!==e.prize||n.gachaMilestone!==e.gachaMilestone||n.kills<e.kills)return false;
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
  // A stale device must not receive a paid level from the other save while
  // retaining its pre-purchase Co-op wallet. No additive wallet merge exists.
  if(eggs===b&&level(b)>level(a)&&newer?.pkmsvvCoopLab?.coopCoins!==older?.pkmsvvCoopLab?.coopCoins)conflict();
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
