'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {startOnAvailablePort,launchUrl}=require('../desktop/lan-startup.cjs');
test('Electron loads /game/ directly (avoids ERR_ABORTED by '/' page redirect)',()=>{
 assert.equal(launchUrl(37816),'http://127.0.0.1:37816/game/');
 assert.equal(launchUrl(37817),'http://127.0.0.1:37817/game/');
 assert.throws(()=>launchUrl(0),/invalid/);
});
test('Busy port fallback allows second Host without killing unrelated processes',async()=>{
 const attempts=[],fake=async({port})=>{
  attempts.push(port);
  if(port===37816){const e=new Error('busy');e.code='EADDRINUSE';throw e;}
  return {port,addresses:['192.168.1.168']};
 };
 const result=await startOnAvailablePort(fake,{root:'/tmp/game',ports:[37816,37817]});
 assert.deepEqual(attempts,[37816,37817]);assert.equal(result.server.port,37817);
 assert.equal(result.fallback,true);
});
test('Unexpected server errors are reported, not hidden by port retry',async()=>{
 const fake=async()=>{const e=new Error('bad resources');e.code='ENOENT';throw e;};
 await assert.rejects(()=>startOnAvailablePort(fake,{root:'bad'}),/bad resources/);
});
test('If all reserved ports busy user sees practical error',async()=>{
 const fake=async()=>{const e=new Error('in use');e.code='EADDRINUSE';throw e;};
 await assert.rejects(()=>startOnAvailablePort(fake,{root:'bad',ports:[37816,37817]}),/37816, 37817/);
});

test('Windows launcher stays in native EXE window and never opens browser',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'..','desktop/lan-main.cjs'),'utf8');
 assert.match(src,/autoHideMenuBar:true,show:!smokeTest/);
 assert.doesNotMatch(src,/shell\.openExternal|explorer\.exe|Browser fallback/);
 assert.match(src,/Game UI ready after/);
});
