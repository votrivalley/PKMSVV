'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Web patch only, automatic run-end upload and Firestore active session fencing',()=>{
 const build=read('scripts/prepare-web.cjs');
 const patch=read('scripts/patch-web-exclusive-session.cjs');
 const native=read('scripts/prepare-game.cjs');
 const rules=read('firebase/firestore.rules');
 assert.match(build,/patch-web-exclusive-session\.cjs/);
 assert.doesNotMatch(native,/patch-web-exclusive-session\.cjs/);
 assert.match(patch,/G\.DB\.saveNow\(\)\.then/);
 assert.match(patch,/G\.PKMSVVSession\.claim\(fs,uid,auth\)/);
 assert.match(patch,/tx\.get\(fs\.collection\('sessions'\)\.doc\(owner\)\)/);
 assert.match(patch,/merged\._webSession=snapshot\._webSession/);
 assert.match(patch,/MIN_GAP = 3000/);
 assert.match(rules,/match \/sessions\/\{uid\}/);
 assert.match(rules,/activeSaveSession\(uid\)/);
 assert.match(rules,/save\.get\('_webSession'/);
 const workflow=read('.github/workflows/build-web.yml');
 assert.match(workflow,/cp firebase\/firestore\.rules deploy\/firestore\.rules/);
 const js=path.join(root,'vendor/pokesurvivor/js/core/db.js');
 if(fs.existsSync(js)){
  assert.match(read('vendor/pokesurvivor/js/game.js'),/G\.DB\.saveNow\(\)\.then/);
  assert.match(read('vendor/pokesurvivor/js/core/db.js'),/await G\.PKMSVVSession\.claim\(fs,uid,auth\)/);
 }
});

test('Second device takes over: old game is kicked and its local save retained',async()=>{
 let serial=0,latest=null;
 const listeners=new Set();
 const snapshot=()=>({exists:!!latest,data:()=>latest,metadata:{fromCache:false}});
 const db={collection(name){
  assert.equal(name,'sessions');
  return {doc(id){
   assert.equal(id,'tester');
   return {
    async set(data){latest=data;for(const fn of [...listeners])fn(snapshot());},
    onSnapshot(options,fn){listeners.add(fn);fn(snapshot());return()=>listeners.delete(fn);}
   };
  }};
 }};
 const makeDevice=()=>{
  const els=new Map(),logs={quit:0,commit:0,signout:0};
  const makeElement=()=>({style:{},append(){},set textContent(v){},set type(v){},set id(v){this._id=v;if(v==='pkmsvv-session-kick')els.set(v,this);}});
  const ctx={
   G:{Game:{state:'playing',quit(){logs.quit++;this.state='over';}},DB:{save:{coins:17},commit(){logs.commit++;}},
       Net:{open_:false},Social:{room:null}},
   crypto:{getRandomValues(a){a.fill(++serial);return a;}},
   document:{getElementById:id=>els.get(id)||null,createElement:()=>makeElement(),body:{append(){}}},
   window:{location:{replace(){}}},
   firebase:{firestore:{FieldValue:{serverTimestamp:()=>({})}}},
   Uint8Array,Array,console
  };
  vm.runInNewContext(read('src/web/pkmsvv-exclusive-session.js'),ctx);
  const auth={async signOut(){logs.signout++;}};
  return {ctx,auth,logs};
 };
 const a=makeDevice(),b=makeDevice();
 await a.ctx.G.PKMSVVSession.claim(db,'tester',a.auth);
 assert.equal(a.ctx.G.PKMSVVSession.active(),true);
 const first=a.ctx.G.PKMSVVSession.token;
 await b.ctx.G.PKMSVVSession.claim(db,'tester',b.auth);
 await Promise.resolve();await Promise.resolve();
 assert.notEqual(first,b.ctx.G.PKMSVVSession.token);
 assert.equal(a.ctx.G.PKMSVVSession.active(),false);
 assert.equal(b.ctx.G.PKMSVVSession.active(),true);
 assert.equal(a.logs.quit,1);
 assert.equal(a.logs.commit,1);
 assert.equal(a.logs.signout,1);
});
