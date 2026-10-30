'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {TARGETS,resolveVariant,evaluate,searchUnofficial,audit}=
 require('../scripts/audit-champion-mega-upstream.cjs');
const empty={subgroups:{'0001':{name:'Mega',sprite_complete:0,sprite_files:{}},
 '0003':{name:'Cutscene',sprite_complete:2,sprite_files:{Walk:true,Attack:true}}}};
test('Mega folder is exact; Cutscene/Altcolor never masquerade as Mega',()=>{
 const root={'0212':empty};
 const a=evaluate(root,['Scizor-Mega','0212','0001','Mega']);
 assert.equal(a.status,'not_animated_in_source');
 assert.equal(a.animatedEntries,0);
 assert.equal(a.relatedDrawnVariants[0].formName,'Cutscene');
 assert.equal(a.battleReady,false);
});
test('Missing variant is never filled from a different form',()=>{
 const a=evaluate({'0260':{subgroups:{'0002':{name:'Altcolor',sprite_complete:2,sprite_files:{Walk:1}}}}},
 ['Swampert-Mega','0260','0001','Mega']);
 assert.equal(a.status,'missing_form');
});
test('Drawn exact form stays UNVERIFIED, not gameplay-ready',()=>{
 const a=evaluate({'0212':{subgroups:{'0001':{name:'Mega',sprite_complete:2,sprite_files:{Walk:1,Attack:1}}}}},
 ['Scizor-Mega','0212','0001','Mega']);
 assert.equal(a.status,'unverified_candidate');
 assert.equal(a.battleReady,false);
});
test('NotSpriteCollab matches names, not substring Mega from Digimon species',()=>{
 let x=searchUnofficial({'0001':{name:'Megadramon'},'0002':{name:'Mega_Scizor',
 sprite_complete:1,sprite_files:{Walk:1}}});
 assert.equal(x.length,1);
 assert.equal(x[0].name,'Mega_Scizor');
});
test('No source audit can silently promote form to gameplay',()=>{
 let r=audit({'0212':empty},{'0010':{name:'Megalogrowmon'}});
 assert.equal(r.readyToImportCount,0);
 assert.equal(r.results.length,TARGETS.length);
 assert.equal(r.candidateIsNOTBattleReady,true);
});
