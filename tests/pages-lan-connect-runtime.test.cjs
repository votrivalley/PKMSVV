'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
function app(){
 let destination='',legacyCalls=0;
 const listeners={},coop={dataset:{go:'multiplayer'},tagName:'BUTTON',disabled:true,
  style:{setProperty(){}},classList:{add(){}},removeAttribute(){},setAttribute(){},
  childNodes:[],querySelector(){return null},querySelectorAll(){return []},appendChild(){},insertBefore(){}};
 const menu={querySelector(s){return s.includes('multiplayer')?coop:null;},querySelectorAll(){return []}};
 const doc={readyState:'complete',getElementById(id){return id==='scr-menu'?menu:null;},
  addEventListener(name,fn,capture){(listeners[name]||=[]).push({fn,capture})},
  createElement(){return{}},body:{}};
 const win={PKMSVV_LOCAL_UI_MODE:'pages',addEventListener(){},location:{hostname:'pkmsvv-web.pages.dev',assign(url){destination=url}},
  G:{MenuUI:{open(){}},MultiplayerUI:{open(){legacyCalls++}}}};
 const ctx={document:doc,window:win,G:win.G,location:win.location,Node:{TEXT_NODE:3}};
 vm.runInNewContext(read('src/shared/local-shell.js'),ctx);
 return {listeners,coop,win,get dest(){return destination},get legacy(){return legacyCalls}};
}
test('PWA fallback Co-op click never executes old Online handler',()=>{
 const t=app();let prevented=0;
 const click=t.listeners.click.find(x=>x.capture===true)?.fn;
 assert.ok(click);
 click({target:{closest(){return t.coop}},preventDefault(){prevented++},
 stopPropagation(){prevented++},stopImmediatePropagation(){prevented++}});
 assert.equal(prevented,3);
 assert.equal(t.dest,'/lan-connect.html');
 assert.equal(t.legacy,0);
});
test('Keyboard/gamepad legacy MultiplayerUI.open routes to standalone LAN page',()=>{
 const t=app();t.win.G.MultiplayerUI.open();
 assert.equal(t.dest,'/lan-connect.html');assert.equal(t.legacy,0);
});
function form(){
 let destination='',saved=null;
 const fields={},input={value:'',focus(){}},error={textContent:''};
 const node={addEventListener(name,fn){fields[name]=fn}};
 const document={getElementById(id){return {'lan-form':node,'lan-address':input,'error':error}[id]}};
 const ctx={document,window:{location:{assign(url){destination=url}}},
  localStorage:{getItem(){return''},setItem(k,v){saved=[k,v]}}};
 vm.runInNewContext(read('src/ios/lan-connect.js'),ctx);
 return {fields,input,error,get dest(){return destination},get saved(){return saved}};
}
test('LAN form accepts private IP with fallback port and preserves chosen Host',()=>{
 const t=form();t.input.value='192.168.1.168:37817';
 t.fields.submit({preventDefault(){}});
 assert.equal(t.dest,'http://192.168.1.168:37817/game/');
 assert.deepEqual(t.saved,['pkmsvv.lan.host.ip','192.168.1.168:37817']);
});
test('LAN form rejects public IPs and malformed ports',()=>{
 for(const value of ['8.8.8.8:37816','192.168.1.168:99999','example.com']){
  const t=form();t.input.value=value;t.fields.submit({preventDefault(){}});
  assert.equal(t.dest,'');assert.match(t.error.textContent,/IPv4/);
 }
});
