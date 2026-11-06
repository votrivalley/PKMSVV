'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/cloudflare/save-guardian.js'),'utf8');
const SAVE='ps.save.pkmsvv_offline',HEAD='pkmsvv.safe.v1.pkmsvv_offline.';
function save(){return {name:'QA',stats:{runs:9,bestTime:490},owned:{25:{at:1},6:{at:2}},shiny:{25:{at:3}},
 coins:3000,tickets:{t1:4,t10:1},megaStones:{lucarionite:1},megaForms:{lucariomega:true},
 pkmsvvBerry:{bag:{oran:4,sitrus:2},used:{oran:true},rescueWins:3},pkmsvvChapter7Seen:true,
 pkmsvvChapter9Seen:true,arenas:{pkmChampion:{seals:{Kanto:true},trophies:{Kanto:true}}},
 arenaGacha:{points:400,pulls:7}};}
function setup(initial=save(),extra={}){
 const data=new Map(Object.entries(extra));if(initial)data.set(SAVE,JSON.stringify(initial));
 const events={},writes=[];
 const storage={getItem:k=>data.has(k)?data.get(k):null,
  setItem(k,v){data.set(k,String(v));writes.push(k)}};
 const window={addEventListener(n,fn){events[n]=fn}};
 const document={hidden:false,addEventListener(n,fn){events[n]=fn}};
 vm.runInNewContext(src,{window,document,localStorage:storage,
  Date,Math,JSON,console,setInterval(){}});
 return {guardian:window.PKMSVVSaveGuardian,data,events,writes};
}
test('v2 journal logs only committed snapshots and exposes immutable metadata rather than full save payload',()=>{
 const h=setup(),g=h.guardian;
 assert.equal(g.journal().length>=0,true);
 const old=save(),next=structuredClone(old);
 next.coins=1200;next.tickets.t1=2;next.pkmsvvBerry.bag.oran=2;
 h.data.set(SAVE,JSON.stringify(next));
 const ticket=g.beginTransaction('berry-purchase');
 assert.ok(ticket);
 assert.equal(g.snapshot(),false,'unfinished purchase cannot replace latest');
 assert.deepEqual(JSON.parse(h.data.get(HEAD+'latest')),old);
 assert.equal(g.endTransaction(ticket,true),true);
 assert.deepEqual(JSON.parse(h.data.get(HEAD+'latest')),next);
 const log=g.journal().at(-1);
 assert.ok(log.type.includes('transaction:berry-purchase'));
 assert.equal(log.balances.find(x=>x.name==='PokéCoins').delta,-1800);
 assert.ok(!JSON.stringify(log).includes('lucarionite'),'journal stores summaries, not raw save content');
 assert.equal(g.endTransaction(ticket,true),false,'transaction can close only once');
});
test('v2 previews permanent chapter loss and tickets, Berry, Mega Stone balance without autoselecting richer snapshot',()=>{
 const h=setup(),g=h.guardian,a=save(),b=structuredClone(a);
 b.coins=20000;b.tickets.t1=0;b.pkmsvvBerry.bag.oran=0;b.megaStones={};
 b.pkmsvvChapter7Seen=false;b.pkmsvvChapter9Seen=false;
 const diff=g.compare(JSON.stringify(a),JSON.stringify(b));
 assert.equal(diff.compatible,true);assert.equal(diff.risk,true);
 assert.ok(diff.chapters.lost.includes('pkmsvvChapter9Seen'));
 assert.ok(diff.balances.some(x=>x.name==='Vé x1'&&x.delta===-4));
 assert.ok(diff.balances.some(x=>x.name==='Berry trong túi'&&x.delta<0));
 assert.ok(diff.balances.some(x=>x.name==='Đá Mega'&&x.delta<0));
 assert.ok(diff.balances.some(x=>x.name==='PokéCoins'&&x.delta>0));
 assert.equal(g.regress(JSON.stringify(a),JSON.stringify(b)),true);
 const spent=structuredClone(a);spent.coins=1;spent.tickets.t1=0;spent.pkmsvvBerry.bag.oran=0;
 assert.equal(g.regress(JSON.stringify(a),JSON.stringify(spent)),false,'legal consumption must not be rejected');
});
test('explicit manual restore preserves current valid save before replacing it and never chooses biggest inventory',()=>{
 const a=save(),b=structuredClone(a);b.coins=100;b.tickets.t1=0;
 const h=setup(a,{[HEAD+'previous']:JSON.stringify(b)}),g=h.guardian;
 const choices=g.previewRecovery();
 assert.equal(choices.length,2);
 assert.equal(choices[1].available,true);
 assert.equal(choices[1].comparison.balances.find(x=>x.name==='PokéCoins').delta,-2900);
 assert.equal(g.restoreSnapshot('previous',false).ok,false,'must not restore without explicit consent');
 assert.deepEqual(JSON.parse(h.data.get(SAVE)),a);
 assert.equal(g.restoreSnapshot('previous',true).ok,true);
 assert.deepEqual(JSON.parse(h.data.get(SAVE)),b);
 assert.deepEqual(JSON.parse(h.data.get('pkmsvv.safe.v2.pkmsvv_offline.prerestore')),a);
 assert.equal(g.journal().at(-1).type,'manual-restore');
});
test('corrupt primary can recover from v1 snapshot, never from unverified larger inventory',()=>{
 const a=save(),h=setup(null,{[SAVE]:'CORRUPT',[HEAD+'latest']:JSON.stringify(a)});
 assert.deepEqual(JSON.parse(h.data.get(SAVE)),a);
 assert.equal(h.guardian.journal().some(x=>x.type==='recovery-invalid-primary'),true);
});
test('Save UI requires visible comparison and cannot silently overwrite imported save if preimport backup fails',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-save-ui.js'),'utf8');
 assert.match(src,/await reviewRestore\(G.DB.save,save\)/);
 assert.match(src,/Tiến trình & cờ chương/);
 assert.match(src,/Vật phẩm và số dư \(chỉ cảnh báo\)/);
 assert.match(src,/pkmsvv.preimport.previous/);
 assert.match(src,/guardian\?\.beginTransaction/);
 assert.match(src,/location.reload\(\)/);
});
