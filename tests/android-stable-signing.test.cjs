'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../scripts/configure-android-stable-signing.cjs'),'utf8');
const env=()=>({
 PKMSVV_ANDROID_KEYSTORE_FILE:'/secure/temp/pkmsvv-stable.jks',
 PKMSVV_ANDROID_KEYSTORE_PASSWORD:'INTERNAL_DO_NOT_WRITE_STORE',
 PKMSVV_ANDROID_KEY_ALIAS:'pkmsvv-signing-alias',
 PKMSVV_ANDROID_KEY_PASSWORD:'INTERNAL_DO_NOT_WRITE_KEY'
});
const base=`apply plugin: 'com.android.application'
android {
  defaultConfig { applicationId "com.votrivalley.pkmsvv.fulllan"; versionCode 1005023; versionName "1.5.23" }
  buildTypes { release { minifyEnabled false } }
}
`;
function run({vars=env(),gradle=base,keystore=true}={}){
 let result;
 const fakeFs={
  existsSync(name){return String(name).endsWith('build.gradle')||keystore&&name===vars.PKMSVV_ANDROID_KEYSTORE_FILE;},
  readFileSync(){return gradle;},
  writeFileSync(name,content){result={name,content};}
 };
 const sandbox={
  require(name){return name==='node:fs'?fakeFs:name==='node:path'?path:require(name);},
  __dirname:'/repo/scripts',process:{env:vars},console:{log(){}},Error
 };
 vm.runInNewContext(script,sandbox,{filename:'configure-android-stable-signing.cjs'});
 return result;
}
test('Stable signing requires all four protected secrets and the keystore file',()=>{
 const vars=env();delete vars.PKMSVV_ANDROID_KEY_PASSWORD;
 assert.throws(()=>run({vars}),/Missing protected signing environment variable/);
 assert.throws(()=>run({keystore:false}),/keystore file does not exist/);
});
test('Stable APK only signs the expected FULL LAN app ID',()=>{
 assert.throws(()=>run({gradle:base.replace('com.votrivalley.pkmsvv.fulllan','com.other.app')}),/unexpected Android app ID/);
});
test('Stable signing reads passwords at Gradle runtime and never embeds secrets',()=>{
 const signed=run();
 assert.match(signed.content,/signingConfigs\s*\{/);
 assert.match(signed.content,/pkmsvvStable/);
 assert.match(signed.content,/signingConfig signingConfigs.pkmsvvStable/);
 assert.match(signed.content,/System.getenv\('PKMSVV_ANDROID_KEYSTORE_PASSWORD'\)/);
 assert.doesNotMatch(signed.content,/INTERNAL_DO_NOT_WRITE_STORE|INTERNAL_DO_NOT_WRITE_KEY/);
});
test('CI exposes only the stable signed release as updateable, never the debug APK',()=>{
 const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/build-android-full-lan.yml'),'utf8');
 assert.match(workflow,/PKMSVV-Android-FULL-LAN-SIGNED-UPDATE/);
 assert.match(workflow,/configure-android-stable-signing\.cjs/);
 assert.match(workflow,/assembleRelease/);
 assert.match(workflow,/apksigner.*verify/);
 assert.match(workflow,/PKMSVV_ANDROID_KEYSTORE_BASE64/);
 assert.match(workflow,/ready=false/);
});
