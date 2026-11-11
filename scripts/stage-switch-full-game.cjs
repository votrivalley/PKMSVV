'use strict';
/**
 * Stage REAL compiled PKMSVV game from the signed Android build's assets/public.
 * The original upstream repository is currently unavailable. Do not substitute
 * the independent Switch tech demo for the production HTML5 engine.
 *
 * Usage: node scripts/stage-switch-full-game.cjs <extracted-apk-assets-public>
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=path.resolve(process.argv[2]||'');
const dst=path.join(root,'mobile','www');
const required=['index.html','js/app.min.js'];
for(const file of required){
 if(!fs.statSync(path.join(src,file),{throwIfNoEntry:false})?.isFile())
  throw Error('Compiled full-game baseline missing '+file+'; refusing fake Switch build');
}
const originalHtml=fs.readFileSync(path.join(src,'index.html'),'utf8');
if(!/app\.min\.js/.test(originalHtml)||
 !/favicon|pok[eé]mon|pkmsvv|surviv/i.test(originalHtml))
 throw Error('Source HTML does not look like a compiled Pokémon Chuyển Sinh game');
fs.rmSync(dst,{recursive:true,force:true});
fs.mkdirSync(dst,{recursive:true});
fs.cpSync(src,dst,{recursive:true,dereference:false});
let html=fs.readFileSync(path.join(dst,'index.html'),'utf8');
html=html.replace(/<title>[^<]*<\/title>/i,'<title>Pokémon Chuyển Sinh — Switch FULL Game</title>');
// The existing Switch boot packager supports a versioned app.min.js script.
// Normalize without duplicating a second copy of the game engine.
html=html.replace(
 /<script(?:\s+defer)?\s+src="(js\/app\.min\.js(?:\?v=[^"]*)?)"><\/script>/i,
 (_,ref)=>'<script defer src="'+(ref.includes('?v=')?ref:ref+'?v=switch-full')+'"></script>'
);
if(!/<script defer src="js\/app\.min\.js\?v=[^"]+"><\/script>/i.test(html))
 throw Error('Compiled script entry changed; review before packaging');
// Files from Android are compiled assets, not Android native APIs. The
// Switch wrapper uses local storage and only mounts offline Web app content.
fs.writeFileSync(path.join(dst,'index.html'),html);
const icon=path.join(dst,'assets/icons/icon-512.png');
if(!fs.statSync(icon,{throwIfNoEntry:false})?.isFile()){
 const fallback=path.join(root,'build/icon.png');
 if(!fs.existsSync(fallback))throw Error('Compiled game icon missing; no branding fallback');
 fs.mkdirSync(path.dirname(icon),{recursive:true});
 fs.copyFileSync(fallback,icon);
}
const nFiles=(()=>{
 let count=0,bytes=0;const stack=[dst];
 while(stack.length){
  for(const item of fs.readdirSync(stack.pop(),{withFileTypes:true})){
   if(item.isDirectory())stack.push(path.join(item.parentPath,item.name));
   else if(item.isFile()){count++;bytes+=fs.statSync(path.join(item.parentPath,item.name)).size;}
  }
 }
 return {count,bytes};
})();
if(nFiles.count<500||nFiles.bytes<10_000_000)
 throw Error('Too few production files/bytes: '+JSON.stringify(nFiles));
for(const rel of ['index.html','js/app.min.js','assets/icons/icon-512.png']){
 if(!fs.existsSync(path.join(dst,rel)))throw Error('Missing full-game file after stage: '+rel);
}
const manifest={
 kind:'pkmsvv-real-compiled-game-switch',
 appEngine:'HTML5 game (real PKMSVV; Brewser runtime, not nx.js native)',
 sourceApp:'PKMSVV PokeBox Stage4 Android QA / release 2.0 branch',
 sourceRunId:42868942245,
 sourceArtifact:'PKMSVV-PokeBox-Stage4-Android-QA-SEPARATE-APP',
 embeddedFileCount:nFiles.count,
 embeddedBytes:nFiles.bytes,
 note:'This is the full compiled HTML5 gameplay, not a native reimplementation. Offline works where upstream mobile bundle supports it; LAN and networking require separate validation.',
};
fs.writeFileSync(path.join(dst,'pkmsvv-switch-full-provenance.json'),
 JSON.stringify(manifest,null,2)+'\n');
console.log('STAGED FULL GAME',JSON.stringify(manifest,null,2));
