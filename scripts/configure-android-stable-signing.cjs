'use strict';
/**
 * Configure repeatable APK release signing without writing any passwords to
 * Gradle scripts or the repository. Call after Capacitor generates android/.
 * The keystore must be provided in temporary storage by the CI runner.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'android','app','build.gradle');
const keys=[
 'PKMSVV_ANDROID_KEYSTORE_FILE',
 'PKMSVV_ANDROID_KEYSTORE_PASSWORD',
 'PKMSVV_ANDROID_KEY_ALIAS',
 'PKMSVV_ANDROID_KEY_PASSWORD'
];
for(const key of keys)if(!process.env[key])throw Error('Missing protected signing environment variable: '+key);
if(!fs.existsSync(process.env.PKMSVV_ANDROID_KEYSTORE_FILE))
 throw Error('The signing keystore file does not exist.');
if(!fs.existsSync(file))throw Error('Capacitor Android project was not generated.');
const start='// PKMSVV_STABLE_SIGNING_BEGIN';
const end='// PKMSVV_STABLE_SIGNING_END';
let script=fs.readFileSync(file,'utf8');
if(script.includes(start))throw Error('Stable signing already configured: do not append twice.');
if(!/applicationId\s+["']com\.votrivalley\.pkmsvv\.fulllan["']/.test(script))
 throw Error('Refusing to sign an unexpected Android app ID.');
if(!/buildTypes\s*\{/.test(script)||!/release\s*\{/.test(script))
 throw Error('Android release buildType is missing.');
script+=`
\n${start}
// Values are only read from protected runner environment at Gradle execution.
android {
    signingConfigs {
        pkmsvvStable {
            storeFile file(System.getenv('PKMSVV_ANDROID_KEYSTORE_FILE'))
            storePassword System.getenv('PKMSVV_ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('PKMSVV_ANDROID_KEY_ALIAS')
            keyPassword System.getenv('PKMSVV_ANDROID_KEY_PASSWORD')
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.pkmsvvStable
        }
    }
}
${end}
`;
fs.writeFileSync(file,script,'utf8');
console.log('Stable Android release signing configured for FULL LAN; credentials are not written to Gradle.');
