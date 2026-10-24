'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const vm=require('node:vm'),path=require('node:path'),root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Counter tracks unique online accounts, cleans up without heartbeat',async()=>{
 const listeners={},element={textContent:'',classList:{add(){},remove(){}}};
 let goOnline=0,setCount=0,removeCount=0,disconnectRegistered=0;
 const leaf={
  onDisconnect(){return {async remove(){disconnectRegistered++;},async cancel(){}};},
  async set(value){assert.equal(value,123);setCount++;},
  async remove(){removeCount++;}
 };
 const refs={
  presenceLive:{on(name,cb){listeners[name]=cb;},off(){}},
  '.info/connected':{on(name,cb){listeners.connection=cb;},off(){}},
  ['presenceLive/'+ 'own' +'/'+ 'a'.repeat(48)]:leaf
 };
 const db={ref(name){assert.ok(refs[name],name);return refs[name];},goOnline(){goOnline++;}};
 const ctx={G:{},firebase:{database:{ServerValue:{TIMESTAMP:123}}},
  document:{getElementById(){return element;}},console};
 vm.runInNewContext(read('src/web/pkmsvv-online-counter.js'),ctx);
 const counter=ctx.G.PKMSVVOnline;
 counter.start(db,'own','a'.repeat(48));
 assert.equal(goOnline,1);
 assert.equal(counter.count,null);
 listeners.connection({val:()=>true});
 await new Promise(setImmediate);
 assert.equal(setCount,1);
 assert.equal(disconnectRegistered,1);
 const s=(key,v)=>({key,val:()=>v});
 listeners.child_added(s('own',{'abc':123}));
 assert.equal(counter.count,1);
 listeners.child_changed(s('own',{'abc':123,'def':123}));
 assert.equal(counter.count,1);
 listeners.child_added(s('other',{'xyz':123}));
 assert.equal(counter.count,2);
 assert.match(element.textContent,/2$/);
 listeners.child_removed(s('other',null));
 assert.equal(counter.count,1);
 counter.stop();
 assert.equal(counter.count,null);
 assert.equal(removeCount,1);
});
test('RTDB and CI rules support presence with no Firestore heartbeat writes',()=>{
 const p=read('scripts/patch-web-online-counter.cjs');
 const web=read('scripts/prepare-web.cjs');
 const native=read('scripts/prepare-game.cjs');
 assert.match(web,/patch-web-online-counter\.cjs/);
 assert.doesNotMatch(native,/patch-web-online-counter\.cjs/);
 assert.match(p,/G\.PKMSVVOnline\.start/);
 assert.match(p,/G\.PKMSVVOnline\.stop/);
 assert.match(p,/G\.PKMSVVOnline\.active/);
 assert.doesNotMatch(p,/collection\('pres'\)/);
 const rules=JSON.parse(read('firebase/database.rules.json'));
 assert.ok(rules.rules.presenceLive);
 assert.equal(rules.rules.presenceLive['$uid']['$token']['.validate'],'newData.isNumber()');
 const ci=read('.github/workflows/build-web.yml');
 assert.match(ci,/cp firebase\/database\.rules\.json deploy\/database\.rules\.json/);
 assert.match(ci,/"database": \{"rules": "database\.rules\.json"\}/);
});
test('Prepared Web bundle includes counter when available',t=>{
 const file=path.join(root,'vendor/pokesurvivor/js/core/pkmsvv-online-counter.js');
 if(!fs.existsSync(file)){t.skip('Pinned source not downloaded yet');return;}
 const s=read('vendor/pokesurvivor/js/core/pkmsvv-online-counter.js');
 const db=read('vendor/pokesurvivor/js/core/db.js');
 const social=read('vendor/pokesurvivor/js/net/social.js');
 assert.match(s,/G\.PKMSVVOnline/);
 assert.match(db,/G\.PKMSVVOnline\.start/);
 assert.match(social,/G\.PKMSVVOnline && G\.PKMSVVOnline\.active/);
});
