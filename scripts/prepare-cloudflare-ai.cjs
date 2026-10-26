'use strict';
const fs=require('node:fs'),path=require('node:path');
const dest=path.resolve(__dirname,'../dist/cloudflare');
if(!fs.existsSync(path.join(dest,'game/js/app.min.js')))
 throw Error('Build ordinary Cloudflare game before standalone AI mode');
require('./compile-standalone-ai.cjs')();
require('./package-standalone-ai.cjs')({dest});
console.log('AI HTML5 mode ready at /ai/ (all 3 modes, in-browser room + engine bots).');
