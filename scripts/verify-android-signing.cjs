'use strict';
const fs=require('node:fs'),path=require('node:path'),{X509Certificate}=require('node:crypto'),{execFileSync}=require('node:child_process');
const APP_ID='com.votrivalley.pkmsvv.fulllan';
function normalized(value){return String(value||'').replace(/:/g,'').toLowerCase();}
function policy(pin){
 if(pin.schema!==1||pin.applicationId!==APP_ID||pin.keyAlias!=='pkmsvv'||!/^[a-f0-9]{64}$/.test(pin.certificateSha256))throw Error('Invalid permanent Android signing policy');
 return pin;
}
function certificate(pin,sha,alias=pin.keyAlias){
 policy(pin);if(normalized(sha)!==pin.certificateSha256||alias!==pin.keyAlias)throw Error('Android signing identity mismatch: do not generate or substitute another key');
}
function versionCode(version){
 if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid Android version');
 const [major,minor,patch]=version.split('.').map(Number),code=major*1000000+minor*1000+patch;
 if(minor>999||patch>999||code<1||code>2100000000)throw Error('Invalid Android versionCode');return code;
}
function apkInfo(pin,text,version){
 policy(pin);const m=text.match(/^package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/m);
 if(!m||m[1]!==pin.applicationId||Number(m[2])!==versionCode(version)||m[3]!==version)throw Error('APK identity/version does not match the release');
 if(/^application-debuggable\s*$/m.test(text))throw Error('Debug APK is not a player update');
}
function apkCertificates(pin,output){
 const found=[...output.matchAll(/^Signer #\d+ certificate SHA-256 digest: ([a-fA-F0-9:]+)\s*$/gm)];
 if(found.length!==1)throw Error('APK must have exactly one pinned signer');certificate(pin,found[0][1]);
}
if(require.main===module){
 try{
  const root=path.resolve(__dirname,'..'),pin=policy(JSON.parse(fs.readFileSync(path.join(root,'config/android-signing-identity.json'),'utf8')));
  const win=process.platform==='win32',java=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin','java'+(win?'.exe':'')):'java';
  if(process.argv[2]==='--keystore'){
   for(const key of ['PKMSVV_ANDROID_KEYSTORE_FILE','PKMSVV_ANDROID_KEYSTORE_PASSWORD','PKMSVV_ANDROID_KEY_ALIAS'])if(!process.env[key])throw Error('Missing signing environment: '+key);
   const keytool=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin','keytool'+(win?'.exe':'')):'keytool';
   const pem=execFileSync(keytool,['-exportcert','-rfc','-alias',process.env.PKMSVV_ANDROID_KEY_ALIAS,'-keystore',process.env.PKMSVV_ANDROID_KEYSTORE_FILE,'-storepass:env','PKMSVV_ANDROID_KEYSTORE_PASSWORD'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
   certificate(pin,new X509Certificate(pem).fingerprint256,process.env.PKMSVV_ANDROID_KEY_ALIAS);
  }else if(process.argv[2]==='--apk'&&process.argv[3]){
   const apk=path.resolve(process.argv[3]),sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT;if(!sdk)throw Error('Android SDK path missing');
   const tools=path.join(sdk,'build-tools','36.0.0');
   const cert=execFileSync(java,['-jar',path.join(tools,'lib/apksigner.jar'),'verify','--print-certs',apk],{encoding:'utf8',stdio:['ignore','pipe','pipe']});apkCertificates(pin,cert);
   const info=execFileSync(path.join(tools,'aapt'+(win?'.exe':'')),['dump','badging',apk],{encoding:'utf8',stdio:['ignore','pipe','pipe']});apkInfo(pin,info,require('../package.json').version);
  }else throw Error('Use --keystore or --apk <file>');
  console.log('Verified permanent Android signer: '+pin.certificateSha256);
 }catch(e){console.error(e.status!==undefined?'Android signing tool verification failed; check protected configuration.':e.message);process.exitCode=1;}
}
module.exports={policy,certificate,versionCode,apkInfo,apkCertificates};
