'use strict';
const path=require('node:path'),{execFileSync}=require('node:child_process');
module.exports=function compileAI(){
 const root=path.resolve(__dirname,'..'),vendor=path.join(root,'vendor/pokesurvivor');
 const pin='11fe868c640b62ac37beacc222e056bc4d9ec892';
 const current=execFileSync('git',['rev-parse','HEAD'],{cwd:vendor,encoding:'utf8'}).trim();
 if(current!==pin)throw Error('AI build needs pinned upstream checkout');
 execFileSync('git',['restore','--worktree','.'],{cwd:vendor,stdio:'inherit'});
 execFileSync(process.execPath,[path.join(root,'scripts/prepare-lan.cjs')],{
  cwd:root,stdio:'inherit',env:{...process.env,PKMSVV_STANDALONE_AI:'1'}
 });
};
