'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const check=require('../scripts/verify-android-signing.cjs'),pin=require('../config/android-signing-identity.json');
test('permanent signer is pinned; aliases or substitute keys fail closed',()=>{
 check.certificate(pin,pin.certificateSha256.toUpperCase().match(/../g).join(':'));
 assert.throws(()=>check.certificate(pin,'0'.repeat(64)),/mismatch/);
 assert.throws(()=>check.certificate(pin,pin.certificateSha256,'other'),/mismatch/);
 assert.throws(()=>check.policy({...pin,applicationId:'com.other.app'}),/policy/);
});
test('APK must contain one pinned signer; debug/old/other-app APKs cannot pass',()=>{
 const signature='Signer #1 certificate SHA-256 digest: '+pin.certificateSha256;
 check.apkCertificates(pin,signature);assert.throws(()=>check.apkCertificates(pin,''),/exactly one/);
 assert.throws(()=>check.apkCertificates(pin,signature+'\n'+signature),/exactly one/);
 assert.throws(()=>check.apkCertificates(pin,signature.replace(pin.certificateSha256,'a'.repeat(64))),/mismatch/);
 const info="package: name='com.votrivalley.pkmsvv.fulllan' versionCode='1005029' versionName='1.5.29'";
 check.apkInfo(pin,info,'1.5.29');
 assert.throws(()=>check.apkInfo(pin,info+'\napplication-debuggable','1.5.29'),/Debug/);
 assert.throws(()=>check.apkInfo(pin,info.replace('1005029','1005028'),'1.5.29'),/identity\/version/);
 assert.throws(()=>check.apkInfo(pin,info.replace('com.votrivalley.pkmsvv.fulllan','com.other.app'),'1.5.29'),/identity\/version/);
 assert.equal(check.versionCode('1.5.30'),1005030);
 assert.throws(()=>check.versionCode('1.5.bad'),/version/);
});
