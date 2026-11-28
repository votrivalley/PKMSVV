'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {bundleUrls,inspect}=require('../scripts/audit-pokesurvivor-web-gmax.cjs');
test('only same-origin public app bundles, no guessed paths',()=>{
 assert.deepEqual(bundleUrls('<script src="js/app.min.js?v=abc"></script><script src="https://other.invalid/app.min.js"></script>'),['https://pokesurvivor.com/js/app.min.js?v=abc']);
});
test('literal inspection never exports complete executable source',()=>{
 const r=inspect('const a="assets/pokemon/gmax/Idle.png";const b="Gigantamax";');
 assert.equal(r.counts.gigantamax,1);assert.deepEqual(r.explicitLocalAssetReferences,['/assets/pokemon/gmax/Idle.png']);assert.equal(r.body,undefined);
});
