'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','src/shared/local-shell.js'),'utf8');
function setup(){
 const listeners={},overlayEvents={},fields={};
 let legacy=0,navigated='';
 const obj=()=>({style:{setProperty(){}},classList:{add(){},remove(){}},removeAttribute(){},setAttribute(){},appendChild(){},append(){},focus(){},remove(){},addEventListener(){},querySelector(){return null;}});
 const input={...obj(),value:'',addEventListener(k,fn){fields['input:'+k]=fn;}};
 const msg={...obj(),textContent:''};
 const modal={...obj(),querySelector(sel){return {
 '#pkmsvv-lan-ip':input,'#pkmsvv-lan-connect-status':msg,
 '#pkmsvv-lan-cancel':{addEventListener(_k,fn){fields.cancel=fn;}},
 '#pkmsvv-lan-submit':{addEventListener(_k,fn){fields.submit=fn;}}
 }[sel]||null;},addEventListener(){},remove(){}};
 const coop={...obj(),dataset:{go:'multiplayer'},childNodes:[],disabled:true,
 style:{setProperty(){}},querySelector(){return null;},appendChild(){},removeAttribute(){}};
 const menu={...obj(),querySelector(sel){return sel.includes('multiplayer')?coop:null;},querySelectorAll(){return [];}};
 const document={readyState:'complete',body:{appendChild(element){fields.modal=element;}},addEventListener(k,fn,capture){(listeners[k]||=[]).push({fn,capture});},
 removeEventListener(){},getElementById(id){return id==='scr-menu'?menu:null;},
 createElement(){return modal;}};
 const context={document,Node:{TEXT_NODE:3},window:{addEventListener(){},PKMSVV_LOCAL_UI_MODE:'pages',location:{hostname:'pkmsvv-web.pages.dev',assign(url){navigated=url;}},
 G:{MultiplayerUI:{open(){legacy++;}},MenuUI:{open(){}}}},localStorage:{getItem(){return'';},setItem(){}},location:{hostname:'pkmsvv-web.pages.dev'}};
 context.G=context.window.G;
 vm.runInNewContext(source,context);
 return {listeners,fields,coop,input,msg,context,get legacy(){return legacy;},get navigated(){return navigated;}};
}
test('Click Co-op is intercepted in CAPTURE before Online/Firebase gate',()=>{
 const t=setup();
 const handler=t.listeners.click.find(x=>x.capture)?.fn;
 assert.ok(handler,'missing capture phase listener');
 let blocked=0;
 handler({target:{closest(){return t.coop;}},preventDefault(){blocked++;},stopPropagation(){blocked++;},stopImmediatePropagation(){blocked++;}});
 assert.equal(blocked,3);assert.equal(t.legacy,0);
 assert.ok(t.fields.modal,'LAN connection sheet missing');
});
test('Programmatic MultiplayerUI.open is replaced; LAN input navigates directly',()=>{
 const t=setup();
 t.context.G.MultiplayerUI.open();
 assert.equal(t.legacy,0);assert.ok(t.fields.modal);
 t.input.value='192.168.1.168:37817';
 t.fields.submit();
 assert.equal(t.navigated,'http://192.168.1.168:37817/game/');
});
test('Rejects public IP without leaving page or calling old multiplayer service',()=>{
 const t=setup();
 t.context.G.MultiplayerUI.open();
 t.input.value='8.8.8.8:37816';t.fields.submit();
 assert.equal(t.navigated,'');assert.match(t.msg.textContent,/chưa hợp lệ/);
 assert.equal(t.legacy,0);
});
