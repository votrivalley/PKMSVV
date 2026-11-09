'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {patchBundle}=require('../scripts/patch-v20-berry-runtime.cjs');
test('Web build replaces original embedded Berry and LanAI modules instead of double-installing',()=>{
 const original='const G={};G.PKMSVVBerryRescue=(()=>{return {legacy:true}})();'+
  'G.LanAI=(()=>{return {legacy:true}})();';
 const out=patchBundle(original);
 assert.equal((out.match(/G\.PKMSVVBerryRescue=/g)||[]).length,1);
 assert.equal((out.match(/G\.LanAI=/g)||[]).length,1);
 assert.match(out,/function chooseBerryAxis\(/);
 assert.match(out,/function rewardBerry\(/);
 assert.match(out,/Math\.round\(\(h-95\)\/2\)/);
 assert.doesNotMatch(out,/legacy:true/);
 new vm.Script(out);
});
test('Malformed or double-embedded Berry modules fail closed, do not alter user saves',()=>{
 const single='const G={};G.LanAI=(()=>{return {}})();';
 assert.throws(()=>patchBundle(single),/PKMSVVBerryRescue/);
 const duplicate='const G={};G.LanAI=(()=>{return {}})();G.LanAI=(()=>{return {}})();G.PKMSVVBerryRescue=(()=>{return {}})();';
 assert.throws(()=>patchBundle(duplicate),/LanAI/);
});
test('Web and isolated Android/PC packages use real Berry Rescue and AI sources plus actual music file',()=>{
 const web=read('scripts/promote-web-v20.cjs'),qa=read('scripts/patch-qa-compiled-modules.cjs');
 assert.match(web,/patchBerryFile\(path\.join\(to,prefix\+'\/js\/app\.min\.js'\)\)/);
 assert.match(qa,/\['PKMSVVBerryRescue','src\/pkmsvv-berry-rescue\.js'\]/);
 assert.match(qa,/\['LanAI','src\/lan\/lan-ai\.js'\]/);
 for(const builder of ['scripts/promote-web-v20.cjs','scripts/patch-pokebox-stage4-apk-qa.cjs','scripts/build-pokebox-stage1-pc-qa.cjs'])
  assert.match(read(builder),/custom-music\/eggrush\.ogg/);
 assert.ok(fs.statSync(path.join(root,'custom-music/eggrush.ogg')).size>100000);
});
test('Berry reward and HUD location are compatible with the corrected LAN bot steering',()=>{
 assert.match(read('src/pkmsvv-berry-rescue.js'),/result\.trees\.slice\(0,3\)\.every\(h=>h===true\|\|Number\(h\)>0\)/);
 assert.match(read('src/pkmsvv-berry-rescue.js'),/const left=Math\.max\(8,Math\.min\(18,Math\.round\(w\*\.012\)\)\)/);
 assert.match(read('src/lan/lan-ai.js'),/function chooseBerryAxis\(/);
 const pack=read('scripts/promote-web-v20.cjs');
 assert.match(pack,/levelup-virtual-focus-v34/);
});

test('Web-only pinned client may omit Host LanAI but still receives Berry rewards',()=>{
 const client='const G={};G.PKMSVVBerryRescue=(()=>{return {legacy:true}})();';
 const out=patchBundle(client);
 assert.match(out,/function rewardBerry\(/);
 assert.doesNotMatch(out,/G\.LanAI=/);
});
