'use strict';
/* Recover ONLY the exact upstream revision pinned by the PKMSVV build.
 * Prefer the original official remote; use an archival repository solely if
 * Git serves the byte-identical commit and Git tree object. No branch heads,
 * tags, latest-commit substitution or allowlist bypasses are accepted.
 * This script never writes to the PKMSVV working tree outside vendor/.
 */
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const DEST=path.join(ROOT,'vendor','pokesurvivor');
const PIN='11fe868c640b62ac37beacc222e056bc4d9ec892';
const TREE='0a36feb1d9639efd7383bf30d1bfb08830dd8c6e';
const ORIG='https://github.com/JPTER78/pokesurvivor.git';
const ARCHIVE='https://github.com/Tpg590/Pokemon.git';
function git(args,timeout=120000){
 return cp.execFileSync('git',args,{cwd:ROOT,encoding:'utf8',
  stdio:['ignore','pipe','pipe'],timeout,maxBuffer:8*1024*1024}).trim();
}
function must(cond,msg){if(!cond)throw Error('Pinned source verification failed: '+msg);}
function run(){
 must(!fs.existsSync(path.join(DEST,'.git'))&&!fs.existsSync(path.join(DEST,'dev.html')),
  'vendor/pokesurvivor already populated; refuse to overwrite an existing checkout');
 fs.mkdirSync(DEST,{recursive:true});
 git(['init',DEST]);
 const sources=[['author',ORIG],['archival-commit',ARCHIVE]];
 let which=null,errors=[];
 for(const [name,url] of sources){
  try{
   git(['-C',DEST,'remote','add',name,url]);
   git(['-C',DEST,'fetch','--no-tags','--depth','1',name,PIN],140000);
   const actual=git(['-C',DEST,'rev-parse','FETCH_HEAD']);
   must(actual===PIN,name+' returned different commit '+actual);
   const actualTree=git(['-C',DEST,'rev-parse','FETCH_HEAD^{tree}']);
   must(actualTree===TREE,name+' returned different tree '+actualTree);
   which=name;break;
  }catch(e){
   errors.push(name+': '+String(e.message).split('\n')[0].slice(0,180));
   if(name!=='author' && /different commit|different tree/.test(e.message))
    throw e;
   console.log('Source '+name+' unavailable or invalid; refusing unpinned revision');
  }
 }
 must(which!==null,'neither source provided the exact SHA / tree: '+errors.join('; '));
 git(['-C',DEST,'checkout','--detach','FETCH_HEAD']);
 must(git(['-C',DEST,'rev-parse','HEAD'])===PIN,'checkout SHA mismatch');
 must(git(['-C',DEST,'rev-parse','HEAD^{tree}'])===TREE,'checkout tree mismatch');
 for(const file of ['dev.html','LICENSE-NONCOMMERCIAL.md',
  'js/data/moves.js','js/systems/combat.js','js/entities/player.js','tools/build.js'])
  must(fs.statSync(path.join(DEST,file)).size>0,'missing essential source: '+file);
 const notice=fs.readFileSync(path.join(DEST,'LICENSE-NONCOMMERCIAL.md'),'utf8');
 must(notice.includes('Required Notice: Copyright 2026 JPTER78'),
  'upstream license author notice missing');
 console.log('PKMSVV_PINNED_OFFICIAL_COMMIT_RECOVERED source='+which+
  ' sha='+PIN+' tree='+TREE);
}
run();
