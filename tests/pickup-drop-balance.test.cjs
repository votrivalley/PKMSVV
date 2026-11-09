'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {patchPickupDrops}=require('../scripts/patch-v20-pickup-drops.cjs');
const base=path.resolve(__dirname,'..');
function fixture(variable='h',drop='o',item='s'){
 const body='function r(){Math.random()<.0025&&'+drop+'('+item+'("ticket",a,t,1));'+
  'const '+variable+'=Math.random();'+variable+'<.012?'+drop+'('+item+'("heal",a,t,0)):'+
  variable+'<.02?'+drop+'('+item+'("magnet",a,t,0)):'+
  variable+'<.026&&'+drop+'('+item+'("bomb",a,t,0))}';
 return 'const G={};G.Pickups=(()=>{'+body+'return {r}})();';
}
test('native random Pickup rates are reduced to two-thirds and script still parses',()=>{
 const source=fixture(),out=patchPickupDrops(source);
 for(const t of ['.0016666666666666668','.008?','.013333333333333334?','.017333333333333333&&'])
  assert.ok(out.includes(t),t);
 for(const t of ['.0025&&','.012?','.02?','.026&&'])
  assert.ok(!out.includes(t),'legacy threshold '+t);
 assert.match(out,/G\.Pickups=/);
 assert.equal(out.includes('Math.random()<.02&&'),false,'this fixture has no native Orb code');
 assert.notEqual(out,source);
});
test('patch matches differently minified variable names, and cannot silently change unknown bundles',()=>{
 assert.match(patchPickupDrops(fixture('q','u','v')),/q<\.008\?/);
 assert.throws(()=>patchPickupDrops('const G={};'),/Pickup module/);
 assert.throws(()=>patchPickupDrops(fixture().replace('Math.random()<.0025','Math.random()<.03')),/ticket/);
 assert.throws(()=>patchPickupDrops(patchPickupDrops(fixture())),/ticket/,'double patch must fail closed');
});
test('QA and Web packagers install the same pickup balance patch after native Orb patch',()=>{
 const qa=fs.readFileSync(path.join(base,'scripts/patch-qa-compiled-modules.cjs'),'utf8');
 const web=fs.readFileSync(path.join(base,'scripts/promote-web-v20.cjs'),'utf8');
 assert.match(qa,/next=patchPickupDrops\(next\)/);
 assert.match(web,/patchPickupFile\(path\.join\(to,prefix\+'\/js\/app\.min\.js'\)\)/);
 assert.ok(qa.indexOf('next=patchPickupDrops(next)')>qa.indexOf('patchedOrbRolls!==2'),
  'Orb remains 2%; ordinary drops rebalance afterward');
});
