'use strict';
/* Static HTML5/PWA distribution for iPhone/iPad. Not an IPA or App Store upload. */
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),web=path.join(root,'dist','web'),ios=path.join(root,'dist','ios');
const env={...process.env,PKMSVV_WEB_PREVIEW:'1',PKMSVV_IOS_BUILD:'1',PKMSVV_LOCAL_PWA:'1'};
delete env.PKMSVV_FIREBASE_CONFIG_JSON; // Never package authenticated cloud services.
execFileSync(process.execPath,[path.join(root,'scripts','prepare-web.cjs')],{cwd:root,env,stdio:'inherit'});
fs.rmSync(ios,{force:true,recursive:true});
fs.cpSync(web,ios,{recursive:true});
fs.copyFileSync(path.join(root,'src','ios','index.html'),path.join(ios,'index.html'));
fs.copyFileSync(path.join(root,'src','ios','entry.js'),path.join(ios,'entry.js'));
fs.copyFileSync(path.join(root,'src','ios','sw.js'),path.join(ios,'sw.js'));
for(const file of ['lan-connect.html','lan-connect.js'])
 fs.copyFileSync(path.join(root,'src','ios',file),path.join(ios,file));
// iOS is a LOCAL standalone web app; hide disabled cloud/friends/matchmaking
// controls only in this build, never delete shared gameplay source or saves.
const gameIndex=path.join(ios,'game','index.html');
let gameHTML=fs.readFileSync(gameIndex,'utf8');
if(!gameHTML.includes('</head>'))throw Error('Missing compiled iOS HTML head');
gameHTML=gameHTML.replace('</head>',[
 '<style id="pkmsvv-ios-local-only">',
 '#scr-menu [data-go="friends"],#scr-menu [data-go="rank"],',
 '#pkmsvv-menu-google,',
 '#btn-google,#pkmsvv-login-google,#pkmsvv-online-counter,',
 '#scr-friends,#scr-rank,#scr-multiplayer{display:none!important}',
 '</style></head>'
].join('\n'));
fs.copyFileSync(path.join(root,'src/shared/local-shell.js'),
 path.join(ios,'game/js/ui/pkmsvv-local-shell.js'));
const localCSS=fs.readFileSync(path.join(root,'src/shared/local-shell.css'),'utf8');
const coopCSS=fs.readFileSync(path.join(root,'src/shared/coop-unified.css'),'utf8');
fs.copyFileSync(path.join(root,'src/shared/coop-unified.js'),path.join(ios,'game/js/ui/pkmsvv-coop-unified.js'));
gameHTML=gameHTML.replace('</head>','<style id="pkmsvv-local-shell-style">'+localCSS+'</style><style id="pkmsvv-unified-coop-style">'+coopCSS+'</style></head>');
gameHTML=gameHTML.replace('</body>',
 '<script>window.PKMSVV_LOCAL_UI_MODE="pages"</script>\n<script defer src="js/ui/pkmsvv-local-shell.js"></script>\n<script defer src="js/ui/pkmsvv-coop-unified.js"></script>\n</body>');
fs.writeFileSync(gameIndex,gameHTML,'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(ios,'manifest.webmanifest'),'utf8'));
Object.assign(manifest,{id:'/',start_url:'/?source=ios-home',scope:'/',display:'standalone',
 name:'Pokémon Chuyển Sinh',short_name:'Pokémon Chuyển Sinh',orientation:'landscape'});
fs.writeFileSync(path.join(ios,'manifest.webmanifest'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(ios,'game','manifest.webmanifest'),JSON.stringify(manifest,null,2)+'\n');
// Preserve actual save storage keys; installed PWA and Safari may have separate storage.
for(const file of ['index.html','entry.js','sw.js','game/index.html','game/js/app.min.js','manifest.webmanifest','lan-connect.html','lan-connect.js']){
 if(!fs.statSync(path.join(ios,file)).isFile())throw Error('Missing iOS web output '+file);
}
const bundled=fs.readFileSync(path.join(ios,'game','js','app.min.js'),'utf8');
if(/pkmsvv-b84d2-default-rtdb|AIza[A-Za-z0-9_-]{35}/.test(bundled))
 throw Error('iOS offline bundle contains Firebase credentials or RTDB URL');
console.log('PKMSVV iOS PWA ready in dist/ios — host over HTTPS. No Firebase or App Store.');
