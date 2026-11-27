'use strict';
// Actual patched public Web mirror registry, not complete PKMSVV source.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const G={Coop:{active:false}},ctx={G,Math},read=f=>fs.readFileSync('vendor/pokesurvivor/js/'+f,'utf8');
vm.runInNewContext(read('data/moves.js'),ctx,{filename:'moves.js'});
const original=G.Moves.ALL.length,old=new Map(G.Moves.ALL.map(d=>[d.id,d]));
for(const n of ['pkmsvv-3ds-move-families','pkmsvv-3ds-stage3-moves',
 'pkmsvv-3ds-stage4-moves','pkmsvv-3ds-stage5-moves',
 'pkmsvv-3ds-stage6-projectiles','pkmsvv-3ds-stage7-dash-meteor'])
 vm.runInNewContext(read('systems/'+n+'.js'),ctx,{filename:n+'.js'});
const expected=44+['rapid-spin','whirlpool'].filter(id=>!old.has(id)).length;
assert.equal(G.Moves.ALL.length,original+expected);
assert.equal(G.PKMSVV3DSMoveFamilies.registered.length,expected);
for(const [id,def]of old)assert.equal(G.Moves.BY_ID[id],def,'changed existing move '+id);
const chk=(id,rank,key,want)=>assert.ok(Math.abs(G.Moves.instance(id,rank)[key]-want)<1e-8,
 id+' rank '+rank+' '+key+' != '+want);
chk('megahorn',5,'radius',220*1.3);
chk('megahorn',5,'width',40*1.4);
chk('dragon-ascent',5,'dmg',17.61*1.4*1.6);
chk('volt-tackle',5,'cd',.9*.75);
chk('sacred-fire',5,'count',7);
chk('sacred-fire',5,'radius',58*1.3);
chk('doom-desire',5,'knock',120);
chk('thousand-arrows',5,'count',10);
chk('glacial-lance',5,'slow',.5);
const exclusive=[
 ['dragon-ascent',[384],'flying'],['volt-tackle',[172,25,26],'electric'],
 ['meteor-assault',[865],'fighting'],['sunsteel-strike',[791],'steel'],
 ['sacred-fire',[244,250],'fire'],['diamond-storm',[719],'rock'],
 ['doom-desire',[385],'steel'],['glacial-lance',[898],'ice'],
 ['thousand-arrows',[718],'ground']];
for(const [id,owners,type]of exclusive){
 const def=G.Moves.BY_ID[id];
 assert.equal(JSON.stringify(Array.from(def.only)),JSON.stringify(owners),'owner restriction '+id);
 for(const dex of owners)assert.ok(G.Moves.poolFor({dex,types:[type]}).includes(id),id+' owner '+dex);
 const other=[1,25,26,300,500].find(dex=>!owners.includes(dex));
 assert.ok(!G.Moves.poolFor({dex:other,types:[type]}).includes(id),'unrestricted '+id);
}
G.Coop.active=true;
for(const id of G.PKMSVV3DSStage7Moves.defs.map(x=>x.id))
 assert.ok(!G.Moves.poolFor({dex:384,types:['normal','fire','flying','electric','steel','ground','ice','rock','fighting']}).includes(id),'Co-op gate '+id);
const combat=read('systems/combat.js');
assert.ok(combat.includes('["projectile","dash","meteor"].includes(m.kind)'),'new source route missing');
assert.ok(combat.includes('!["projectile","dash","meteor"].includes(m.kind)'),'old source route conflict');
assert.ok(combat.includes('fields.filter(f=>f.kind==="meteor"&&f.m?.pkmsvv3dsNative).length>=32'),'field cap missing');
console.log('PKMSVV_3DS_STAGE7_REAL_WEB_DASH_METEOR_PASS base='+original+' staged='+G.Moves.ALL.length+' new='+expected+' productionNew=44');
