'use strict';
/* QA packaging isolation: ALWAYS separate save/userData and Android app ID.
 * Only run inside a temporary GitHub Actions checkout, never mutate deployed
 * executables or overwrite an installed PKMSVV/Full-LAN application ID.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),mode=process.argv[2];
if(!['windows','android'].includes(mode))
 throw Error('Usage: node scripts/isolate-3ds-qa-packages.cjs windows|android');
function exact(file,old,next){
 const p=path.join(root,file),s=fs.readFileSync(p,'utf8');
 if(s.split(old).length!==2)throw Error('QA isolation source drift '+file+' '+old.slice(0,90));
 fs.writeFileSync(p,s.replace(old,next),'utf8');
}
if(mode==='windows'){
 const pkgPath=path.join(root,'package.json'),pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));
 pkg.productName='PKMSVV 176 Skill QA';
 pkg.build.productName='PKMSVV 176 Skill QA';
 pkg.build.appId='com.ronvotri.pkmsvv.qa';
 pkg.build.win.artifactName='PKMSVV-176-Skill-QA-${version}-Windows-x64.${ext}';
 fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n','utf8');
 exact('desktop/main.cjs',"app.setAppUserModelId('com.ronvotri.pkmsvv');",
   "app.setAppUserModelId('com.ronvotri.pkmsvv.qa');");
 exact('desktop/main.cjs',"path.join(app.getPath('appData'), 'PKMSVV-Offline')",
   "path.join(app.getPath('appData'), 'PKMSVV-176-Skill-QA')");
 const m=fs.readFileSync(path.join(root,'desktop/main.cjs'),'utf8');
 if(m.includes("'PKMSVV-Offline'")||!m.includes("'PKMSVV-176-Skill-QA'"))
  throw Error('Windows QA would reuse existing game save folder');
 console.log('PKMSVV_QA_WINDOWS_SAVE_ISOLATED: dedicated userData and appId');
}else{
 const file=path.join(root,'android/app/build.gradle');
 const src=fs.readFileSync(file,'utf8'),re=/\bapplicationId\s+(["'])([^"']+)\1/g;
 const match=[...src.matchAll(re)];
 if(match.length!==1)throw Error('Android QA applicationId source drift: '+match.length);
 const old=match[0][0],oldId=match[0][2];
 if(oldId.endsWith('.qa'))throw Error('Android QA appId already isolated; refuse repeated patch');
 const appId=oldId+'.qa';
 fs.writeFileSync(file,src.replace(old,'applicationId "'+appId+'"'),'utf8');
 const strings=path.join(root,'android/app/src/main/res/values/strings.xml');
 if(fs.existsSync(strings)){
  const s=fs.readFileSync(strings,'utf8');
  const reName=/<string name="app_name">[^<]+<\/string>/;
  if(reName.test(s))fs.writeFileSync(strings,
   s.replace(reName,'<string name="app_name">PKMSVV 176 Skill QA</string>'),'utf8');
 }
 if(!fs.readFileSync(file,'utf8').includes('applicationId "'+appId+'"'))
  throw Error('Android QA app ID verification failed');
 console.log('PKMSVV_QA_ANDROID_SAVE_ISOLATED appId='+appId);
}
