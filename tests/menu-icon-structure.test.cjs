'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

class TextNode {
 constructor(value){this.nodeType=3;this.textContent=value;this.parentNode=null;}
 remove(){this.parentNode?.removeChild(this);}
}
class Element {
 constructor(tag='span',cls='',text=''){
  this.nodeType=1;this.tagName=tag.toUpperCase();this.className=cls;
  this.id='';this.dataset={};this.childNodes=[];this.parentNode=null;
  this.classList={contains:name=>this.className.split(/\s+/).includes(name)};
  if(text)this.appendChild(new TextNode(text));
 }
 get children(){return this.childNodes.filter(n=>n.nodeType===1);}
 get firstElementChild(){return this.children[0]||null;}
 get textContent(){return this.childNodes.map(n=>n.textContent).join('');}
 set textContent(value){for(const n of this.childNodes)n.parentNode=null;this.childNodes=[];if(value)this.appendChild(new TextNode(value));}
 matches(selectors){return selectors.split(',').some(s=>{s=s.trim();return s[0]==='.'?this.classList.contains(s.slice(1)):this.tagName.toLowerCase()===s;});}
 appendChild(node){node.remove?.();node.parentNode=this;this.childNodes.push(node);return node;}
 insertBefore(node,before){node.remove?.();node.parentNode=this;const pos=this.childNodes.indexOf(before);this.childNodes.splice(pos<0?this.childNodes.length:pos,0,node);return node;}
 removeChild(node){const i=this.childNodes.indexOf(node);if(i>=0)this.childNodes.splice(i,1);node.parentNode=null;}
 remove(){this.parentNode?.removeChild(this);}
 setAttribute(){}
 querySelector(selector){
  if(selector===':scope > small')return this.children.find(n=>n.tagName==='SMALL')||null;
  const select=selector.split(',').map(s=>s.trim());
  const scan=node=>{for(const el of node.children){if(select.some(s=>el.matches(s)))return el;const descendant=scan(el);if(descendant)return descendant;}return null;};
  return scan(this);
 }
 querySelectorAll(selector){
  if(selector===':scope > .menu-item')return this.children.filter(n=>n.classList.contains('menu-item'));
  return [];
 }
}
function loadNormalizer(){
 const code=fs.readFileSync(path.join(__dirname,'../src/shared/local-shell.js'),'utf8');
 const from=code.indexOf(' function normalizeNavigationLayout(menu){');
 const to=code.indexOf(' function refresh(){',from);
 assert.ok(from>=0&&to>from,'normalizer must be declared before menu refresh');
 const createElement=tag=>new Element(tag);
 return vm.runInNewContext(code.slice(from,to)+';normalizeNavigationLayout',{document:{createElement}});
}
test('PC / Co-op / Arena keep their original icon nodes and align the menu layout',()=>{
 const normal=loadNormalizer();
 const list=new Element('div','menu-list');
 const menu={querySelector:selector=>selector==='.menu-right .menu-list'?list:null};
 const pc=new Element('button','menu-item');pc.dataset.go='pc';
 const pcIcon=new Element('span','mi-ico');const artPC=new Element('svg');pcIcon.appendChild(artPC);
 pc.appendChild(pcIcon);pc.appendChild(new TextNode(' PC'));
 const desc=new Element('small','','Pokémon hỗ trợ · Mega · Berry');pc.appendChild(desc);
 const coop=new Element('button','menu-item');coop.dataset.go='multiplayer';
 const coopIcon=new Element('span','mi-ico');const artCoop=new Element('img');coopIcon.appendChild(artCoop);coop.appendChild(coopIcon);
 const duplicate=new Element('span','mi-ico','🤝');coop.appendChild(duplicate);
 const coopCopy=new Element('span','pkmsvv-menu-copy');
 coopCopy.appendChild(new Element('span','pkmsvv-menu-label','Co-op'));coop.appendChild(coopCopy);
 coop.appendChild(new TextNode('🤝 Co-op'));
 const arena=new Element('button','menu-item');arena.id='pkmsvv-champion-entry';
 const arenaIcon=new Element('span','pkmsvv-champion-menu-icon','🏆');arena.appendChild(arenaIcon);
 const arenaCopy=new Element('span','pkmsvv-menu-copy');arenaCopy.appendChild(new Element('span','pkmsvv-menu-label','Arena'));arena.appendChild(arenaCopy);
 list.appendChild(pc);list.appendChild(coop);list.appendChild(arena);
 normal(menu);normal(menu);
 assert.equal(pc.firstElementChild,pcIcon);
 assert.equal(pcIcon.firstElementChild,artPC,'original PC art must not be replaced');
 assert.equal(pc.querySelector('.pkmsvv-menu-copy').querySelector('small'),desc,'PC subtitle stays attached to label');
 assert.equal(pc.children.filter(n=>n.classList.contains('pkmsvv-menu-copy')).length,1,'PC copy is idempotent');
 assert.equal(coop.firstElementChild,coopIcon);
 assert.equal(coopIcon.firstElementChild,artCoop,'Co-op keeps the designed pixel icon');
 assert.equal(coop.children.filter(n=>n.classList.contains('mi-ico')).length,1,'duplicate Co-op icon removed');
 assert.ok(!coop.childNodes.some(n=>n.nodeType===3&&n.textContent.trim()),'Co-op has no bare emoji or anonymous text');
 assert.equal(arena.firstElementChild,arenaIcon,'Arena keeps its original icon slot');
 assert.equal(arena.firstElementChild.textContent,'🏆','Arena art content is never overwritten');
});
