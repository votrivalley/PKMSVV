'use strict';
// Bundle only the installed MIT QR encoder and its pure-JS dependencies, offline.
const fs=require('node:fs'),path=require('node:path');
module.exports=function bundleQR(){
 const files=[],ids=new Map();
 function visit(file){
  if(ids.has(file))return ids.get(file);
  const id=files.length;ids.set(file,id);files.push('');
  const source=fs.readFileSync(file,'utf8').replace(/require\(['"]([^'"]+)['"]\)/g,(_,name)=>'require('+visit(require.resolve(name,{paths:[path.dirname(file)]}))+')');
  files[id]='function(module,exports,require){\n'+source+'\n}';return id;
 }
 const entry=visit(require.resolve('qrcode/lib/core/qrcode.js'));
 const license=fs.readFileSync(require.resolve('qrcode/license'),'utf8')+'\n'+fs.readFileSync(path.join(path.dirname(require.resolve('dijkstrajs')),'LICENSE.md'),'utf8');
 // Upstream minification strips comments, so preserve the full notices as data.
 return 'window.PKMSVV_QR_LICENSE='+JSON.stringify(license)+';\n'+
 '(function(){const modules=['+files.join(',')+'],cache={};function load(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,load);return m.exports;}window.PKMSVVQR=load('+entry+');})();\n';
};
