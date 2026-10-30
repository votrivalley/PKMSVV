'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const qa=require('../scripts/prepare-mega4-pc-qa-launcher.cjs');
function temp(fn){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pkmsvv-pcqa-'));
 const src=path.join(root,'desktop','lan-main.cjs'),cfg=path.join(root,'lan-win.json');
 const game=path.join(root,'dist','lan','game','js','app.min.js');
 fs.mkdirSync(path.dirname(src),{recursive:true});
 fs.mkdirSync(path.dirname(game),{recursive:true});
 const origin="app.setPath('userData',smokeTest?'PKMSVV-LAN-QA-'+process.pid:'PKMSVV-LAN-Beta')";
 fs.writeFileSync(src,origin+'\n');
 fs.writeFileSync(cfg,JSON.stringify({appId:'com.votrivalley.pkmsvv.lan',
 productName:'Pokemon Chuyen Sinh LAN',files:['desktop/lan-main.cjs'],win:{artifactName:'LAN.exe'},
 directories:{output:'dist/lan-windows'},extraMetadata:{main:'desktop/lan-main.cjs'}}));
 fs.writeFileSync(game,'G.PKMSVV_MEGA_4DIR_QA={enabled:true};');
 try{return fn({root,src,cfg,game,origin})}finally{fs.rmSync(root,{recursive:true,force:true})}
}
test('QA launcher requires explicit opt-in, even if PNG files happen to exist',()=>{
 temp(f=>{
  const was=process.env.PKMSVV_MEGA_4DIR_PC_QA;
  delete process.env.PKMSVV_MEGA_4DIR_PC_QA;
  try{assert.throws(()=>qa.create(f.root),/set PKMSVV_MEGA_4DIR_PC_QA/)}
  finally{if(was!==undefined)process.env.PKMSVV_MEGA_4DIR_PC_QA=was}
 })
});
test('QA launcher uses a completely separate Electron userData and unique Windows app ID',()=>{
 temp(f=>{
  const was=process.env.PKMSVV_MEGA_4DIR_PC_QA;
  process.env.PKMSVV_MEGA_4DIR_PC_QA='1';
  try{
   const result=qa.create(f.root);
   const release=fs.readFileSync(f.src,'utf8');
   assert.equal(release,f.origin+'\n','normal release main MUST stay byte-identical');
   const merged=fs.readFileSync(path.join(f.root,result.main),'utf8');
   assert.match(merged,/PKMSVV-MEGA4-QA-Isolated/);
   const config=JSON.parse(fs.readFileSync(path.join(f.root,result.config),'utf8'));
   assert.equal(config.appId,'com.votrivalley.pkmsvv.mega4qa');
   assert.equal(config.directories.output,'dist/mega4-windows');
   assert.equal(config.extraMetadata.main,result.main);
   assert.ok(config.files.includes(result.main));
   assert.match(config.win.artifactName,/MEGA4-QA/);
   assert.equal(JSON.parse(fs.readFileSync(f.cfg,'utf8')).appId,'com.votrivalley.pkmsvv.lan');
  }finally{if(was===undefined)delete process.env.PKMSVV_MEGA_4DIR_PC_QA;else process.env.PKMSVV_MEGA_4DIR_PC_QA=was}
 });
});
test('QA package generation blocks accidental normal build without the QA marker',()=>{
 temp(f=>{
  fs.writeFileSync(f.game,'G.PKMSVV_MEGA_READY=[];');
  const was=process.env.PKMSVV_MEGA_4DIR_PC_QA;
  process.env.PKMSVV_MEGA_4DIR_PC_QA='1';
  try{assert.throws(()=>qa.create(f.root),/Compiled QA metadata missing/)}
  finally{if(was===undefined)delete process.env.PKMSVV_MEGA_4DIR_PC_QA;else process.env.PKMSVV_MEGA_4DIR_PC_QA=was}
 });
});
