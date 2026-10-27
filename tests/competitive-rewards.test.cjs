'use strict';
/* Execute the actual compiled vendor reward handlers with isolated mock trainers.
 * These tests deliberately never touch a player's real save or cloud data. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const game=path.resolve(__dirname,'..','vendor','pokesurvivor');
function compiled(file){return fs.readFileSync(path.join(game,file),'utf8');}
function extract(file,begin){
 const src=compiled(file),a=src.indexOf(begin);
 assert.ok(a>=0,file+' missing '+begin);
 // Stop at the closing brace of the actual function, rather than catching
 // any later declarations/comments that make new Function() invalid.
 let depth=0,quote='',comment='',escaped=false;
 for(let i=src.indexOf('{',a+begin.length-1);i<src.length;i++){
  const ch=src[i],next=src[i+1];
  if(comment==='line'){if(ch==='\n')comment='';continue;}
  if(comment==='block'){if(ch==='*'&&next==='/'){comment='';i++;}continue;}
  if(quote){
   if(escaped){escaped=false;continue;}
   if(ch==='\\'){escaped=true;continue;}
   if(ch===quote)quote='';
   continue;
  }
  if(ch==='/'&&next==='/'){comment='line';i++;continue;}
  if(ch==='/'&&next==='*'){comment='block';i++;continue;}
  if(ch==='\''||ch==='"'||ch==='\u0060'){quote=ch;continue;}
  if(ch==='{')depth++;
  if(ch==='}'&&--depth===0)return src.slice(a,i+1);
 }
 throw Error('Unbalanced function '+begin+' in '+file);
}
function fixture(mode){
 const local={uid:'host',t1:0,t10:0,x:0,y:0,bodyH:20};
 const guest={uid:'guest',t1:0,t10:0,x:15,y:0,bodyH:20};
 const bot={uid:'bot',t1:0,t10:0,x:20,y:0,bodyH:20,lanBot:true};
 const mates=new Map([[guest.uid,{pl:guest,connected:true,q:[]}],[bot.uid,{pl:bot,connected:true,q:[]}]]);
 const events=[],bank=[];
 const G={Royale:{active:mode==='royale'},EggRush:{active:mode==='eggrush'},
  Coop:{active:true,isHost:true,collected(){}},
  Audio:{sfx(){}},FX:{ring(){},dmgText(){}},Social:{uid:'host'}};
 const emit=ev=>events.push(ev);
 const collected=Function('G','mates','local','emit','return ('+
   extract('js/net/coop.js','function collected(p, who) {','function shinyCaught(e)')+')')(G,mates,local,emit);
 G.Coop.collected=collected;
 const shinyCaught=Function('G','mates','me','emit','return ('+
   extract('js/net/coop.js','function shinyCaught(e){','// ---------------- subida de nivel compartida')+')')(G,mates,'host',emit);
 const onCollect=Function('G','pl','bankTickets','PICK_SFX','pendingLevels','offerItem','return ('+
   extract('js/game.js','function onCollect(p, who = pl) {','// ---------------- teclado')+')')(
    G,local,()=>bank.push('saved'),{ticket:'shiny',ticket10:'legend'},0,()=>{});
 return {G,local,guest,bot,mates,events,bank,collected,shinyCaught,onCollect};
}
for(const mode of ['royale','eggrush']){
 test(mode+' only banks tickets picked by the actual human player',()=>{
  const h=fixture(mode);
  h.onCollect({kind:'ticket',id:1,value:1},h.guest);
  assert.equal(h.local.t1,0);assert.equal(h.guest.t1,1);assert.equal(h.bank.length,0);
  assert.equal(h.mates.get('guest').q.filter(e=>e[0]==='tk').length,1);
  assert.equal(h.mates.get('bot').q.length,0);
  h.onCollect({kind:'ticket10',id:2,value:1},h.bot);
  assert.equal(h.bot.t10,1);assert.equal(h.local.t10,0);
  assert.equal(h.mates.get('bot').q.length,0,'AI reward is not written to a human save');
  h.onCollect({kind:'ticket10',id:3,value:1},h.local);
  assert.equal(h.local.t10,1);assert.deepEqual(h.bank,['saved']);
  assert.equal(h.events.filter(e=>e[0]==='pc').length,3,'shared pickup disappears once');
 });
 test(mode+' Shiny is private to the last-hit trainer, not broadcast',()=>{
  const h=fixture(mode);
  assert.equal(h.shinyCaught({dex:25,pkmsvvLastHitUid:'guest'}),false);
  assert.deepEqual(h.mates.get('guest').q,[['sh',25]]);
  assert.equal(h.mates.get('bot').q.length,0);
  assert.equal(h.events.some(e=>e[0]==='sh'),false,'no room-wide Shiny grant');
  assert.equal(h.shinyCaught({dex:4,pkmsvvLastHitUid:'bot'}),false);
  assert.equal(h.mates.get('guest').q.length,1,'bot kill cannot credit human');
  assert.equal(h.shinyCaught({dex:1,pkmsvvLastHitUid:'host'}),true);
  assert.equal(h.shinyCaught({dex:7}),false,'unattributed deaths cannot grant Shiny');
 });
}
test('standard cooperative mode retains existing shared rewards',()=>{
 const h=fixture('coop');
 h.onCollect({kind:'ticket',id:4,value:1},h.guest);
 assert.equal(h.local.t1,1);assert.deepEqual(h.bank,['saved']);
 assert.equal(h.guest.t1,0);assert.equal(h.mates.get('guest').q.length,0);
 assert.equal(h.shinyCaught({dex:25}),true);
 assert.deepEqual(h.events.filter(e=>e[0]==='sh'),[['sh',25]]);
});
test('guest and host paths protect personal totals from host team snapshots and match-end results',()=>{
 const script=compiled('js/game.js'),coop=compiled('js/net/coop.js'),combat=compiled('js/systems/combat.js');
 assert.match(script,/if\(!\(G\.Royale\?\.active\|\|G\.EggRush\?\.active\)\)/);
 assert.match(script,/if\(G\.Coop\.isHost&&G\.Coop\.shinyCaught\(e\)===false\)return/);
 assert.match(script,/ticket\(kind\)\{/);
 assert.match(script,/bankTickets\(\)/);
 assert.match(coop,/case 'tk': if\(\(G\.Royale\?\.active\|\|G\.EggRush\?\.active\)\)api\.ticket\?\.\(ev\[1\]\)/);
 assert.match(coop,/e\.pkmsvvLastHitUid=from/);
 assert.match(combat,/e\.pkmsvvLastHitUid=pl\.uid/);
});
