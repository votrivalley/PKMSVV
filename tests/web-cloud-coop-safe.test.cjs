'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Cloud Save uses transactional read/merge/write and local snapshot',()=>{
 const p=read('scripts/patch-web-cloud-safe.cjs');
 const b=read('scripts/prepare-web.cjs');
 assert.match(p,/fs\.runTransaction\(async tx/);
 assert.match(p,/const current = await tx\.get\(ref\)/);
 assert.match(p,/const merged = plain\(fold\(merge\(snapshot, remote\)\)\)/);
 assert.match(p,/mergeFields: \['save', 'updatedAt', 'v'\]/);
 assert.match(p,/write\('pkmsvv\.cloudbackup\.' \+ owner, snapshot\)/);
 assert.match(p,/G\.Game\.state !== 'ui'/);
 assert.match(b,/patch-web-cloud-safe\.cjs/);
 const file=path.join(root,'vendor/pokesurvivor/js/core/db.js');
 if(fs.existsSync(file)){
   const s=fs.readFileSync(file,'utf8');
   assert.match(s,/fs\.runTransaction\(async tx/);
   assert.doesNotMatch(s,/const wr = docRef\(\)\.set\(doc/);
 }
});
test('reconnect 45s grace resumes, expires and cleans up',()=>{
 const src=read('src/web/pkmsvv-reconnect-grace.js'),timers=new Map();
 let seq=0,expired=0;
 const ctx={G:{},setTimeout:(fn,ms)=>{const n=++seq;timers.set(n,{fn,ms});return n;},
    clearTimeout:n=>timers.delete(n)};
 vm.runInNewContext(src,ctx);
 const q=ctx.G.PKMSVVGrace;
 assert.equal(q.TIMEOUT_MS,45000);
 assert.equal(q.lost('host',()=>expired++),true);
 assert.equal(q.lost('host',()=>expired++),false);
 assert.equal(timers.size,1);
 assert.equal([...timers.values()][0].ms,45000);
 assert.equal(q.restored('host'),true);
 assert.equal(timers.size,0);
 assert.equal(expired,0);
 q.lost('host',()=>expired++);
 const [id,record]=[...timers.entries()][0];
 timers.delete(id); // The real timer runtime removes fired timeouts automatically.
 record.fn();
 assert.equal(expired,1);
 assert.equal(q.pendingCount(),0);
 q.lost('peer',()=>expired++);
 q.clear();
 assert.equal(timers.size,0);
});
test('Web Co-op is changed only in Web builder; native remains offline',()=>{
 const script=read('scripts/patch-web-coop-reconnect.cjs');
 const web=read('scripts/prepare-web.cjs'),native=read('scripts/prepare-game.cjs');
 assert.match(script,/G\.PKMSVVGrace\.lost/);
 assert.match(script,/G\.PKMSVVGrace\.restored/);
 assert.match(script,/G\.PKMSVVGrace\.clear/);
 assert.match(web,/patch-web-coop-reconnect\.cjs/);
 assert.doesNotMatch(native,/execFileSync\([^)]*patch-web-coop-reconnect\.cjs/);
 assert.doesNotMatch(native,/execFileSync\([^)]*patch-native-online\.cjs/);
});
