'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const http=require('node:http'),{spawn}=require('node:child_process');
const {main,getAddresses}=require('../desktop/lan-browser-host.cjs');
test('Browser Host exports IP address list and setup skips Electron',()=>{
 assert.deepEqual(getAddresses({addresses:['192.168.1.5']}),['192.168.1.5']);
 assert.deepEqual(getAddresses({addresses:[]}),['127.0.0.1']);
 const src=fs.readFileSync(path.join(__dirname,'..','desktop','lan-browser-host.cjs'),'utf8');
 assert.doesNotMatch(src,/require\(['"]electron['"]\)/);
 assert.match(src,/explorer\.exe/);
});
test('Browser Host runs actual LAN game over HTTP without Electron',async()=>{
 const site=path.join(os.tmpdir(),'pkmsvv-browser-host-test-'+process.pid);
 fs.mkdirSync(path.join(site,'game'),{recursive:true});
 fs.writeFileSync(path.join(site,'game','index.html'),'<html><div id="scr-menu">Game</div></html>');
 const child=spawn(process.execPath,[
  path.join(__dirname,'..','desktop','lan-browser-host.cjs'),
  '--site='+site,'--port=0','--no-browser'
 ],{stdio:['ignore','pipe','pipe']});
 let output='',err='';
 child.stdout.on('data',b=>output+=String(b));
 child.stderr.on('data',b=>err+=String(b));
 try{
  const port=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('LAN Browser Host startup timeout: '+output+' '+err)),10000);
   const scan=()=>{
    const m=output.match(/Máy Host chơi ngay: http:\/\/127\.0\.0\.1:(\d+)\/game\//);
    if(m){clearTimeout(timeout);resolve(Number(m[1]));}
   };
   child.stdout.on('data',scan);child.once('exit',code=>{clearTimeout(timeout);reject(Error('Host exited '+code+' '+err));});scan();
  });
  const body=await new Promise((resolve,reject)=>{
   http.get('http://127.0.0.1:'+port+'/game/',res=>{
    let content='';res.on('data',b=>content+=String(b));res.on('end',()=>resolve({status:res.statusCode,content}));
   }).on('error',reject);
  });
  assert.equal(body.status,200);
  assert.match(body.content,/scr-menu/);
 }finally{
  child.kill();fs.rmSync(site,{force:true,recursive:true});
 }
});
