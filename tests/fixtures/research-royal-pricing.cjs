'use strict';
// Proposed prices exclusively for automated QA. Never imported by game runtime.
const prices=Object.freeze({
  "support_advanced": 320,
  "mega_advanced": 480,
  "berry_advanced": 320,
  "companion_advanced": 400,
  "fossil_advanced": 640
});
const total=Object.values(prices).reduce((a,b)=>a+b,0);
function pricedSpecializedFixture(registry){
 if(registry.purchaseEnabled!==false)throw Error('Expected closed catalog');
 return {...registry,purchaseEnabled:true,variants:registry.variants.map(x=>Object.hasOwn(prices,x.id)?{...x,artApproved:true,price:prices[x.id]}:{...x,artApproved:false,price:null})};
}
module.exports={prices,total,pricedSpecializedFixture};
