'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Web-only Cloud save uses server source and asks before first upload',()=>{
 const p=read('scripts/patch-web-cloud-multidevice.cjs'),web=read('scripts/prepare-web.cjs');
 assert.match(web,/patch-web-cloud-multidevice\.cjs/);
 assert.match(p,/get\(\{ source: 'server' \}\)/);
 assert.match(p,/cloudMissing && !uploadConfirmed/);
 assert.match(p,/if\(!ok\)return \{ok:false,why:'unverified'\}/);
 assert.match(p,/pkmsvv\.cloudbackup\.beforeLogin/);
 assert.match(p,/G\.DB\.commit\(true\)/);
 const native=read('scripts/prepare-game.cjs');
 assert.doesNotMatch(native,/patch-web-cloud-multidevice\.cjs/);
});
test('Fresh device reads authoritative Cloud and cannot overwrite unsynced old device silently',async t=>{
 const file=path.join(root,'vendor/pokesurvivor/js/core/db.js');
 if(!fs.existsSync(file)){t.skip('Pinned upstream Web build not present');return;}
 const source=read('vendor/pokesurvivor/js/core/db.js');
 assert.match(source,/cloudOrigin = !online/);
 assert.match(source,/cloudMissing && !uploadConfirmed/);
 let serverReads=0,cloudWrites=0,confirmCalls=0;
 const store=new Map();
 const saveDoc={
  async get(opts){assert.equal(opts.source,'server');serverReads++;return {exists:false,data:()=>null};},
  set(){cloudWrites++;return Promise.resolve();}
 };
 const auth={
  async setPersistence(){},
  onAuthStateChanged(cb){setImmediate(()=>cb({uid:'tester',displayName:'Tester'}));return ()=>{};}
 };
 const firestore=()=>({
  settings(){},
  collection(name){assert.equal(name,'saves');return {doc(){return saveDoc;}};},
  runTransaction(){cloudWrites++;return Promise.resolve();}
 });
 const firebase={
  initializeApp(){},
  auth:Object.assign(()=>auth,{Auth:{Persistence:{LOCAL:'local'}}}),
  firestore:Object.assign(firestore,{FieldValue:{serverTimestamp:()=>({})}})
 };
 const ctx={
  G:{FIREBASE_CONFIG:{apiKey:'mock',projectId:'pkmsvv-b84d2'},I18n:{lang:'vi'},
    GlobalPower:{legacyLedger:()=>({}),clean:x=>x||{},cleanLedger:x=>x||{},merge:(a,b)=>Object.assign({},b||{},a||{}),LIST:[]},
    PKMSVVSkillTrack:{progress:s=>({marks:s.pkmsvvSkillMarks||{}}),merge:(a,b)=>Object.assign({},b||{},a||{})},
    PKMSVVSession:{claim:async()=>{},active:()=>true,get token(){return 'test-session-token';},stop(){}}},
  firebase,location:{protocol:'https:',hostname:'pkmsvv-b84d2.web.app'},
  document:{createElement(){return {async:true,onload:null,onerror:null};},
    head:{appendChild(el){setImmediate(()=>el.onload());}}},
  localStorage:{getItem(k){return store.get(k)||null;},setItem(k,v){store.set(k,String(v));},removeItem(k){store.delete(k);},
    get length(){return store.size;},key(n){return [...store.keys()][n];}},
  navigator:{onLine:true},Math,Date,console,
  confirm(){confirmCalls++;return false;},
  setTimeout(){return 1;},clearTimeout(){},setImmediate
 };
 vm.runInNewContext(source,ctx);
 assert.equal(await ctx.G.DB.ready(),true);
 assert.equal(ctx.G.DB.mode,'cloud');
 assert.equal(ctx.G.DB.cloudOrigin,'new');
 assert.equal(serverReads,1);
 ctx.G.DB.commit();
 const r=await ctx.G.DB.saveNow();
 assert.equal(r.ok,false);
 assert.equal(r.why,'unverified');
 assert.equal(confirmCalls,1);
 assert.equal(cloudWrites,0);
});
