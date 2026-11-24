'use strict';
// Strict per-line source integrity: Beta may change ONLY the Vietnamese spoken
// dialogue inside Pippi's authored arrays. Keep English, gameplay, Pippi AI,
// save, stats, portrait, data and all guide flow byte-for-byte unchanged.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const oldRoot=path.resolve(process.argv[2]||'dist/old');
const newRoot=path.resolve(process.argv[3]||'dist/new');
const files=[
 {file:'game/js/ui/pkmsvv-pippi.js',
  faces:'smile|proud|wink|love|happy|angry|panic|mega|sleep|shock|sparkle|thinking|teary|sigh',expected:64},
 {file:'game/js/ui/pkmsvv-pippi-guide.js',
  faces:'Normal|Happy|Joyous|Determined|Angry|Crying|Dizzy|Inspired|Pain|Sad|Shouting|Sigh|Stunned|Surprised|Teary-Eyed|Worried',expected:70}
];
for(const {file,faces,expected} of files){
 const original=fs.readFileSync(path.join(oldRoot,file),'utf8');
 const current=fs.readFileSync(path.join(newRoot,file),'utf8');
 const regex=new RegExp("(\\[\\s*'(?:("+faces+"))'\\s*,\\s*)'[^'\\n]*'(?=\\s*[,\\]])","g");
 const normalized=s=>s.replace(regex,"$1'__VI_DIALOGUE__'");
 const before=normalized(original),after=normalized(current);
 const b=(before.match(/__VI_DIALOGUE__/g)||[]).length;
 const a=(after.match(/__VI_DIALOGUE__/g)||[]).length;
 assert.equal(b,expected,'Original Pippi voice array changed; must audit');
 assert.equal(a,expected,'New Pippi voice array changed; must audit');
 assert.equal(after,before,'Non-dialogue Pippi logic/English/assets/code MUST remain byte-identical');
 assert.notEqual(current,original,'The requested Southern Vietnamese dialogue has not been ported');
 const southern=(current.match(/Mèn đét ơi|Mèn ơi|U là trời|nghen|hổng|ní/g)||[]).length;
 assert.ok(southern>=8,'Insufficient Southern Vietnamese expressions: '+southern);
 if(file.includes('guide')){
  for(const marker of ['Golurk','Rotom','phút 4','phút 8','9 mảnh','Co-op','Mega'])
   assert.ok(current.includes(marker),'Gameplay instruction was accidentally lost: '+marker);
 }
 console.log('PIPPI_SOUTHERN_VI_DIALOGUE_ONLY_PASS='+JSON.stringify({file,voices:expected,southernMentions:southern,nonDialogueByteIdentical:true}));
}
