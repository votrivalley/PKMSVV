'use strict';
/* Source audit: 3DS v1.0.0 generated C++ MoveDef[] against 103 documented PKMSVV moves. */
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
function readNative(src){
 const k=src.match(/kKindId\[K_COUNT\]\s*=\s*\{([^}]+)\};/);
 if(!k)throw Error('Missing 3DS kind names');
 const kinds=[...k[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]);
 const start=src.indexOf('MoveDef kMoves[] = {');
 const end=src.indexOf('\n};',start);
 if(start<0||end<0)throw Error('Missing generated 3DS MoveDef table');
 const moves=[];
 for(const line of src.slice(start+20,end).split('\n')){
  if(!line.trim())continue;
  const m=line.match(/^\s*\{"((?:\\.|[^"\\])*)",\s*"((?:\\.|[^"\\])*)",\s*"(?:\\.|[^"\\])*",\s*(-?\d+),\s*(-?\d+),/);
  if(!m)throw Error('Unexpected 3DS MoveDef row '+line.slice(0,170));
  if(!kinds[Number(m[4])])throw Error('Unknown 3DS kind '+m[4]);
  moves.push({id:m[1],name:m[2],type:Number(m[3]),kind:kinds[Number(m[4])]});
 }
 const n=src.match(/const int kMoveCount = (\d+);/);
 if(!n || Number(n[1])!==moves.length)throw Error('kMoveCount mismatch '+n?.[1]+' != '+moves.length);
 return {kinds,moves};
}
function readCurrent(md){
 const matches=[...md.matchAll(/^\|\s*([a-z][a-z0-9-]+)\s*\|\s*([a-z]+)\s*\|\s*[\d.]+s\s*\|/gm)];
 const moves=matches.map(m=>({id:m[1],kind:m[2]}));
 if(moves.length!==103||new Set(moves.map(x=>x.id)).size!==103)
  throw Error('PKMSVV move list must have 103 unique IDs, got '+moves.length);
 return moves;
}
function compare(native,pkmsvv){
 const original=new Map(pkmsvv.map(m=>[m.id,m]));
 const nativeIds=new Set(native.moves.map(m=>m.id));
 const missing=native.moves.filter(m=>!original.has(m.id));
 const mismatches=native.moves.filter(m=>original.has(m.id)&&original.get(m.id).kind!==m.kind)
    .map(m=>({id:m.id,nativeKind:m.kind,pkmKind:original.get(m.id).kind}));
 const groups=Object.entries(Object.groupBy(missing,m=>m.kind))
   .sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0]))
   .map(([kind,moves])=>({kind,ids:moves.map(m=>m.id)}));
 return {nativeCount:native.moves.length,nativeKinds:native.kinds.length,
  pkmsvvCount:pkmsvv.length,pkmsvvKinds:new Set(pkmsvv.map(m=>m.kind)).size,
  overlap:native.moves.length-missing.length,missingCount:missing.length,
  overlapKindMismatch:mismatches,missingByKind:groups,
  pkmNotIn3ds:pkmsvv.filter(m=>!nativeIds.has(m.id))};
}
function md(a){
 let lines=['# Pokemon Chuyen Sinh - 3DS Skill Registry Audit','','This is a read-only comparison of generated C++ 3DS v1.0.0 MoveDef registry against the documented 103 PKMSVV original skills.','The 3DS source comes from its Nov 13 2026 Gran update; this is not a full PKMSVV release.','',
 '3DS moves: '+a.nativeCount+' across '+a.nativeKinds+' families.',
 'PKMSVV original moves: '+a.pkmsvvCount+' across '+a.pkmsvvKinds+' families.',
 'Shared IDs: '+a.overlap+'. Missing from PKMSVV originals: '+a.missingCount+'.','',
 '## Missing skill IDs by family',''];
 for(const g of a.missingByKind)lines.push('### '+g.kind+' ('+g.ids.length+')',g.ids.join(', '),'');
 lines.push('## Shared IDs with different effect family',JSON.stringify(a.overlapKindMismatch,null,2),'',
  '## Original 103 moves absent from 3DS registry (DO NOT DELETE)',
  a.pkmNotIn3ds.map(x=>x.id).join(', '),'',
  'Safeguards: no overwrite of existing IDs; no Co-op release; retain Bubble evolved Surf; source version differences need human review.');
 return lines.join('\n');
}
if(require.main===module){
 const src=process.argv[2];
 if(!src||!fs.existsSync(src))throw Error('Pass generated 3DS gamedata.cpp path');
 const native=readNative(fs.readFileSync(src,'utf8'));
 const local=readCurrent(fs.readFileSync(path.join(root,'docs','SKILL_BALANCE.md'),'utf8'));
 const result=compare(native,local);
 const out=path.join(root,'dist','3ds-skill-audit');
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(result,null,2));
 fs.writeFileSync(path.join(out,'AUDIT.md'),md(result));
 console.log('PKMSVV_3DS_MOVE_CATALOG_AUDIT_PASS');
 console.log(JSON.stringify(result,null,2));
}
module.exports={readNative,readCurrent,compare,md};
