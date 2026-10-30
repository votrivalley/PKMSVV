'use strict';
/* Generate an isolated Windows Mega4 QA launcher WITHOUT altering release packaging. */
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
function create(root=ROOT){
 if(process.env.PKMSVV_MEGA_4DIR_PC_QA!=='1')
  throw Error('Refusing QA executable: set PKMSVV_MEGA_4DIR_PC_QA=1');
 const from=path.join(root,'desktop','lan-main.cjs');
 const config=path.join(root,'lan-win.json');
 const site=path.join(root,'dist','lan','game','js','app.min.js');
 for(const p of [from,config,site])if(!fs.existsSync(p))throw Error('Missing prepared LAN QA input: '+p);
 const compiled=fs.readFileSync(site,'utf8');
 if(!compiled.includes('PKMSVV_MEGA_4DIR_QA'))
  throw Error('Compiled QA metadata missing — never produce misleading Mega4 executable');
 const original=fs.readFileSync(from,'utf8'),anchor="smokeTest?'PKMSVV-LAN-QA-'+process.pid:'PKMSVV-LAN-Beta'";
 if(original.split(anchor).length!==2)throw Error('Unexpected LAN launcher; cannot isolate save safely');
 const alt=original.replace(anchor,"smokeTest?'PKMSVV-MEGA4-QA-Smoke-'+process.pid:'PKMSVV-MEGA4-QA-Isolated'");
 if(!alt.includes('PKMSVV-MEGA4-QA-Isolated'))throw Error('Save isolation patch failed');
 const cfg=JSON.parse(fs.readFileSync(config,'utf8'));
 cfg.appId='com.votrivalley.pkmsvv.mega4qa';
 cfg.productName='Pokemon Chuyen Sinh Mega4 QA';
 cfg.extraMetadata.main='desktop/lan-main-mega4-qa.cjs';
 cfg.directories.output='dist/mega4-windows';
 cfg.win.artifactName='PKMSVV-MEGA4-QA-'+'$'+'{version}-Windows-x64.'+'$'+'{ext}';
 if(!cfg.files.includes('desktop/lan-main-mega4-qa.cjs'))
  cfg.files.push('desktop/lan-main-mega4-qa.cjs');
 fs.writeFileSync(path.join(root,'desktop','lan-main-mega4-qa.cjs'),alt);
 fs.writeFileSync(path.join(root,'lan-win-mega4-qa.json'),JSON.stringify(cfg,null,2)+'\n');
 console.log('QA config ready. Save isolation = PKMSVV-MEGA4-QA-Isolated.');
 console.log('npx electron-builder --win portable --x64 --publish never --config lan-win-mega4-qa.json');
 return {main:'desktop/lan-main-mega4-qa.cjs',config:'lan-win-mega4-qa.json'};
}
if(require.main===module)try{create()}catch(e){console.error(e);process.exitCode=1}
module.exports={create};
