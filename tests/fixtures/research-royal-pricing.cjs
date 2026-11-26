'use strict';
// Proposed prices exclusively for automated QA. Never imported by game runtime.
const prices=Object.freeze({
  "support_royal": 320,
  "mega_royal": 480,
  "berry_royal": 320,
  "companion_royal": 400,
  "fossil_royal": 640
});
const total=Object.values(prices).reduce((a,b)=>a+b,0);
function pricedRoyalFixture(registry){
 if(registry.purchaseEnabled!==false)throw Error('Expected closed catalog');
 return {...registry,purchaseEnabled:true,variants:registry.variants.map(x=>Object.hasOwn(prices,x.id)?{...x,artApproved:true,price:prices[x.id]}:{...x,artApproved:false,price:null})};
}
module.exports={prices,total,pricedRoyalFixture};
